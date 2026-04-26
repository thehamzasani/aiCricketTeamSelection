"""
gemini_service.py — Google Gemini 1.5 Flash AI integration for cricket team selection analysis.

Responsibilities:
  - Build prompt from match context, selected XI, and venue data
  - Call Gemini 1.5 Flash API with retry logic (max 2 retries)
  - Parse structured JSON response from Gemini
  - Return fallback response gracefully if Gemini fails
"""

import asyncio
import json
import logging
import re
from typing import Any

import google.generativeai as genai

from app.config import settings

# ── Logger ────────────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# ── Gemini client initialisation ──────────────────────────────────────────────
genai.configure(api_key=settings.GEMINI_API_KEY)
_model = genai.GenerativeModel("gemini-1.5-flash")

# ── Retry configuration ───────────────────────────────────────────────────────
MAX_RETRIES = 2
RETRY_DELAY_SECONDS = 2.0

# ── Prompt template (verbatim from project instructions) ──────────────────────
GEMINI_PROMPT_TEMPLATE = """
You are an expert cricket analyst and team selector with 20 years of experience.

MATCH CONTEXT:
- Format: {format}
- Venue: {venue_name}, {venue_city}
- Pitch Type: {pitch_type}
- Weather: {weather}
- Toss: {team_name} won the toss and chose to {toss_decision}
- Opposition: {opposition}

SELECTED XI (by algorithm):
{selected_xi_json}

VENUE STATISTICS:
- Average first innings score ({format}): {avg_score}
- Spin wicket percentage: {spin_pct}%
- Pace wicket percentage: {pace_pct}%

Your task:
1. Provide a 3-4 sentence overall team selection analysis
2. Explain why each player was selected (1 sentence each)
3. Suggest the batting order with brief reasoning
4. Suggest the bowling combination and over allocation
5. Explain captain and vice-captain choice
6. Give one key match-winning strategy

Respond in this exact JSON format:
{{
  "overall_analysis": "...",
  "player_reasons": {{"player_name": "reason", ...}},
  "batting_order_reasoning": "...",
  "bowling_plan": "...",
  "captain_reason": "...",
  "key_strategy": "..."
}}
"""

# ── Fallback response (returned when Gemini is unavailable) ───────────────────
FALLBACK_RESPONSE: dict[str, Any] = {
    "overall_analysis": (
        "The selected XI represents a balanced combination of batting depth and bowling variety "
        "suited to the match conditions. The team covers all essential roles with at least one "
        "specialist in each department. The selection algorithm has prioritised recent form and "
        "condition-specific strengths. This line-up gives the team a strong chance of success."
    ),
    "player_reasons": {},
    "batting_order_reasoning": (
        "The batting order has been arranged to place the most reliable batsmen at the top, "
        "with aggressive hitters in the middle order and lower-order batting support from allrounders."
    ),
    "bowling_plan": (
        "The bowling attack is split between pace and spin to exploit the conditions. "
        "Each frontline bowler is allocated four overs with support options available to manage the innings."
    ),
    "captain_reason": (
        "The captain has been chosen for their leadership record, consistency in the format, "
        "and ability to perform under pressure."
    ),
    "key_strategy": (
        "Utilise the powerplay aggressively with the top order, consolidate in the middle overs, "
        "and target the final five overs for maximum acceleration."
    ),
    "_fallback": True,  # internal flag — strip before sending to frontend if desired
}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _build_prompt(
    selected_xi: list[dict[str, Any]],
    match_context: dict[str, Any],
    venue: dict[str, Any],
) -> str:
    """
    Fill the Gemini prompt template with live match and venue data.

    Args:
        selected_xi:    List of selected player dicts (from selection_service output).
        match_context:  Dict with keys: format, team_name, opposition, pitch_type,
                        weather, toss_decision.
        venue:          Dict with keys: name, city, avg_first_innings_score_t20,
                        avg_first_innings_score_odi, spin_wicket_percentage,
                        pace_wicket_percentage.

    Returns:
        Formatted prompt string ready to send to Gemini.
    """
    fmt: str = match_context.get("format", "T20")

    # Choose the correct average score key for the format
    if fmt == "T20":
        avg_score = venue.get("avg_first_innings_score_t20", "N/A")
    elif fmt == "ODI":
        avg_score = venue.get("avg_first_innings_score_odi", "N/A")
    else:  # Test — no single-innings average available in schema
        avg_score = "N/A (Test match)"

    return GEMINI_PROMPT_TEMPLATE.format(
        format=fmt,
        venue_name=venue.get("name", "Unknown Venue"),
        venue_city=venue.get("city", "Unknown City"),
        pitch_type=match_context.get("pitch_type", "balanced"),
        weather=match_context.get("weather", "clear"),
        team_name=match_context.get("team_name", "Team"),
        toss_decision=match_context.get("toss_decision", "bat"),
        opposition=match_context.get("opposition", "Opposition"),
        selected_xi_json=json.dumps(selected_xi, indent=2),
        avg_score=avg_score,
        spin_pct=venue.get("spin_wicket_percentage", "N/A"),
        pace_pct=venue.get("pace_wicket_percentage", "N/A"),
    )


def _extract_json_from_text(text: str) -> dict[str, Any]:
    """
    Robustly extract a JSON object from Gemini's raw text response.

    Gemini sometimes wraps JSON in markdown code fences (```json ... ```).
    This helper strips fences and parses the first valid JSON object found.

    Args:
        text: Raw string returned by Gemini.

    Returns:
        Parsed dict.

    Raises:
        ValueError: If no valid JSON object is found in the text.
    """
    # 1. Strip markdown code fences
    cleaned = re.sub(r"```(?:json)?", "", text).strip()

    # 2. Attempt direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # 3. Fallback: find the first {...} block
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No valid JSON object found in Gemini response. Raw text:\n{text[:500]}")


async def _call_gemini_with_retry(prompt: str) -> str:
    """
    Send a prompt to Gemini 1.5 Flash with up to MAX_RETRIES retries.

    Uses asyncio.to_thread because the google-generativeai SDK is synchronous.

    Args:
        prompt: The fully formatted prompt string.

    Returns:
        The raw text content of Gemini's response.

    Raises:
        Exception: Re-raises the last exception after all retries are exhausted.
    """
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 2):  # attempts: 1, 2, 3
        try:
            logger.info("Gemini API call — attempt %d / %d", attempt, MAX_RETRIES + 1)

            # Run the blocking SDK call in a thread to keep FastAPI async-safe
            response = await asyncio.to_thread(_model.generate_content, prompt)

            raw_text: str = response.text
            logger.debug("Gemini raw response length: %d chars", len(raw_text))
            return raw_text

        except Exception as exc:
            last_error = exc
            logger.warning(
                "Gemini attempt %d failed: %s",
                attempt,
                str(exc),
                exc_info=False,
            )
            if attempt <= MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY_SECONDS)

    raise last_error  # type: ignore[misc]


# ── Public API ────────────────────────────────────────────────────────────────

async def generate_selection_analysis(
    selected_xi: list[dict[str, Any]],
    match_context: dict[str, Any],
    venue: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate AI-powered cricket team selection analysis using Google Gemini 1.5 Flash.

    This is the primary public function called by selection_service.py after the
    Playing XI has been chosen by the scoring/balance algorithm.

    Flow:
        1. Build a rich prompt from match context, selected XI, and venue stats.
        2. Call Gemini with up to 2 retries on failure.
        3. Parse the structured JSON from Gemini's response.
        4. Return the parsed dict — or a graceful fallback if anything fails.

    Args:
        selected_xi:    List of player dicts, each containing at minimum:
                            {
                                "player_id": int,
                                "name": str,
                                "role": str,
                                "score": float,
                                "batting_position": int | None,
                                "is_captain": bool,
                                "is_vice_captain": bool,
                                "selection_reason": str
                            }
        match_context:  Dict with the following keys:
                            {
                                "format": "T20" | "ODI" | "Test",
                                "team_name": str,
                                "opposition": str,
                                "pitch_type": "spin" | "pace" | "flat" | "balanced",
                                "weather": "clear" | "overcast" | "humid",
                                "toss_decision": "bat" | "bowl"
                            }
        venue:          SQLAlchemy Venue model instance or equivalent dict with keys:
                            name, city, avg_first_innings_score_t20,
                            avg_first_innings_score_odi, spin_wicket_percentage,
                            pace_wicket_percentage.

    Returns:
        A dict with the following structure (mirrors Gemini's JSON response):
        {
            "overall_analysis": str,
            "player_reasons": {player_name: reason_str, ...},
            "batting_order_reasoning": str,
            "bowling_plan": str,
            "captain_reason": str,
            "key_strategy": str
        }

        If Gemini is unavailable or returns invalid JSON, the FALLBACK_RESPONSE
        is returned instead (with "_fallback": True for internal diagnostics).
    """
    # ── Normalise venue to plain dict (handles both ORM objects and dicts) ──
    if not isinstance(venue, dict):
        venue = {
            "name": getattr(venue, "name", "Unknown Venue"),
            "city": getattr(venue, "city", "Unknown City"),
            "avg_first_innings_score_t20": getattr(venue, "avg_first_innings_score_t20", None),
            "avg_first_innings_score_odi": getattr(venue, "avg_first_innings_score_odi", None),
            "spin_wicket_percentage": getattr(venue, "spin_wicket_percentage", None),
            "pace_wicket_percentage": getattr(venue, "pace_wicket_percentage", None),
        }

    try:
        # Step 1 — Build prompt
        prompt = _build_prompt(selected_xi, match_context, venue)
        logger.info(
            "Sending Gemini request for %s vs %s (%s) at %s",
            match_context.get("team_name"),
            match_context.get("opposition"),
            match_context.get("format"),
            venue.get("name"),
        )

        # Step 2 — Call Gemini with retry logic
        raw_text = await _call_gemini_with_retry(prompt)

        # Step 3 — Parse JSON from Gemini response
        parsed = _extract_json_from_text(raw_text)

        # Step 4 — Validate required keys are present; fill missing with fallback values
        required_keys = [
            "overall_analysis",
            "player_reasons",
            "batting_order_reasoning",
            "bowling_plan",
            "captain_reason",
            "key_strategy",
        ]
        for key in required_keys:
            if key not in parsed:
                logger.warning("Gemini response missing key '%s' — using fallback value.", key)
                parsed[key] = FALLBACK_RESPONSE[key]

        logger.info("Gemini analysis generated successfully.")
        return parsed

    except Exception as exc:
        logger.error(
            "Gemini service failed after %d attempts. Returning fallback. Error: %s",
            MAX_RETRIES + 1,
            str(exc),
            exc_info=True,
        )
        return FALLBACK_RESPONSE.copy()
