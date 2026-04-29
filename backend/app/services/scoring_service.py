"""
scoring_service.py
------------------
Player scoring algorithm for AI Cricket Team Selection System.
Calculates a weighted score (0-100) for each player based on:
  - Batting performance
  - Bowling performance
  - Recent form
  - Pitch/condition bonuses
  - Format-specific bonuses

Each score component is capped to prevent any single factor from dominating,
and a detailed breakdown dict is returned alongside the final score.
"""

from dataclasses import dataclass
from typing import Optional


# ---------------------------------------------------------------------------
# Data transfer objects (lightweight, no DB dependency)
# These mirror the SQLAlchemy models but are plain Python for easy unit testing.
# ---------------------------------------------------------------------------

@dataclass
class PlayerContext:
    """Minimal player info needed by the scoring algorithm."""
    player_id: int
    name: str
    role: str                          # batsman / bowler / allrounder / wicketkeeper
    bowling_style: Optional[str] = ""  # e.g. "left-arm spin", "right-arm fast"
    batting_style: Optional[str] = ""  # e.g. "right-hand", "left-hand"


@dataclass
class StatsContext:
    """Flattened player stats for one format (T20 / ODI / Test)."""
    matches: int = 0
    batting_avg: float = 0.0
    strike_rate: float = 0.0
    runs_total: int = 0
    highest_score: int = 0
    centuries: int = 0
    fifties: int = 0
    bowling_avg: float = 0.0
    bowling_economy: float = 0.0
    bowling_strike_rate: float = 0.0
    wickets_total: int = 0
    best_bowling: Optional[str] = None
    recent_form: list[int] = None      # last 5 batting scores
    recent_wickets: list[int] = None   # last 5 match wickets taken

    def __post_init__(self):
        if self.recent_form is None:
            self.recent_form = []
        if self.recent_wickets is None:
            self.recent_wickets = []


@dataclass
class MatchContext:
    """Conditions for the upcoming match."""
    format: str        # T20 / ODI / Test
    pitch_type: str    # spin / pace / flat / balanced
    weather: str       # clear / overcast / humid
    toss_decision: str # bat / bowl
    venue_name: str = ""
    opposition: str = ""
    team_name: str = ""  # ← add this line


# ---------------------------------------------------------------------------
# Scoring constants — tweak these without touching algorithm logic
# ---------------------------------------------------------------------------

MAX_BATTING_AVG_POINTS  = 20.0   # max points from batting average
MAX_SR_BONUS_T20        = 15.0   # max points from T20 strike rate
MAX_SR_BONUS_ODI        = 10.0   # max points from ODI strike rate
MAX_WICKETS_POINTS      = 10.0   # max points from total wickets
MAX_ECONOMY_POINTS      = 15.0   # max points from bowling economy
MAX_FORM_POINTS         = 20.0   # max points from recent form
MAX_CONDITION_BONUS     = 15.0   # max points from pitch conditions
MAX_FORMAT_BONUS        = 5.0    # max points from format suitability

# Recent-form weights (most recent match weighted highest)
FORM_WEIGHTS = [0.35, 0.25, 0.20, 0.12, 0.08]


# ---------------------------------------------------------------------------
# Core algorithm
# ---------------------------------------------------------------------------

def calculate_player_score(
    player: PlayerContext,
    stats: StatsContext,
    match_context: MatchContext,
) -> dict:
    """
    Calculate a composite performance score (0-100) for a player given
    their stats and the upcoming match conditions.

    Parameters
    ----------
    player       : PlayerContext  — static player attributes (role, styles)
    stats        : StatsContext   — format-specific career & recent stats
    match_context: MatchContext   — pitch, weather, format, toss

    Returns
    -------
    dict with keys:
        "total_score"        : float  — final score (0-100)
        "breakdown"          : dict   — per-component contributions
        "selection_reason"   : str    — human-readable justification
    """

    breakdown = {
        "batting_avg_points":   0.0,
        "strike_rate_points":   0.0,
        "wickets_points":       0.0,
        "economy_points":       0.0,
        "recent_form_points":   0.0,
        "condition_bonus":      0.0,
        "format_bonus":         0.0,
    }
    reasons = []

    # -----------------------------------------------------------------------
    # 1. BATTING SCORE  (max 40 points)
    # -----------------------------------------------------------------------

    # Average contribution — scaled linearly, capped at MAX_BATTING_AVG_POINTS
    if stats.batting_avg > 0:
        avg_points = min(stats.batting_avg * 0.5, MAX_BATTING_AVG_POINTS)
        breakdown["batting_avg_points"] = round(avg_points, 2)
        reasons.append(f"Batting avg {stats.batting_avg:.1f}")

    # Strike rate contribution — format-dependent
    if stats.strike_rate > 0:
        if match_context.format == "T20":
            # SR > 100 earns bonus; SR < 100 contributes nothing
            sr_points = min(
                max((stats.strike_rate - 100) * 0.15, 0),
                MAX_SR_BONUS_T20,
            )
            breakdown["strike_rate_points"] = round(sr_points, 2)
            reasons.append(f"T20 SR {stats.strike_rate:.1f}")

        elif match_context.format == "ODI":
            sr_points = min(
                max((stats.strike_rate - 70) * 0.10, 0),
                MAX_SR_BONUS_ODI,
            )
            breakdown["strike_rate_points"] = round(sr_points, 2)
            reasons.append(f"ODI SR {stats.strike_rate:.1f}")

        # Test format: strike rate matters far less — no explicit bonus here

    # -----------------------------------------------------------------------
    # 2. BOWLING SCORE  (max 30 points)
    # -----------------------------------------------------------------------

    if stats.wickets_total > 0:
        wickets_points = min(stats.wickets_total * 0.10, MAX_WICKETS_POINTS)
        breakdown["wickets_points"] = round(wickets_points, 2)
        reasons.append(f"{stats.wickets_total} wickets")

    if stats.bowling_economy > 0:
        # Lower economy = higher bonus; economy 0-10 mapped to 0-MAX
        economy_raw = max(0, (10 - stats.bowling_economy) * 2)
        economy_points = min(economy_raw, MAX_ECONOMY_POINTS)
        breakdown["economy_points"] = round(economy_points, 2)
        reasons.append(f"Economy {stats.bowling_economy:.2f}")

    # -----------------------------------------------------------------------
    # 3. RECENT FORM  (max 20 points)
    # -----------------------------------------------------------------------

    # Combine batting scores and wickets into a unified form signal
    combined_form = list(stats.recent_form or [])
    # Convert wickets → equivalent batting score for form signal (5 wkts ≈ 50 pts)
    wicket_form = [w * 10 for w in (stats.recent_wickets or [])]

    # Merge lists up to 5 entries, preferring batting for batting specialists
    if player.role in ("batsman", "wicketkeeper"):
        form_data = (combined_form + wicket_form)[:5]
    elif player.role == "bowler":
        form_data = (wicket_form + combined_form)[:5]
    else:
        # Allrounders — interleave
        interleaved = []
        for pair in zip(combined_form, wicket_form):
            interleaved.extend(pair)
        form_data = interleaved[:5]

    if form_data:
        weights = FORM_WEIGHTS[: len(form_data)]
        # Normalise weights so they still sum to 1 if fewer than 5 entries
        weight_sum = sum(weights)
        norm_weights = [w / weight_sum for w in weights]
        form_score = sum(r * w for r, w in zip(form_data, norm_weights))
        form_points = min(form_score / 10, MAX_FORM_POINTS)
        breakdown["recent_form_points"] = round(form_points, 2)
        if stats.recent_form:
            reasons.append(f"Recent scores {stats.recent_form[:3]}")

    # -----------------------------------------------------------------------
    # 4. CONDITION BONUS  (max 15 points)
    # -----------------------------------------------------------------------

    pitch = match_context.pitch_type.lower()
    role = player.role.lower()
    bowling_style = (player.bowling_style or "").lower()

    condition_bonus = 0.0

    if pitch == "spin":
        if "spin" in bowling_style:
            condition_bonus = MAX_CONDITION_BONUS       # spinner on spin track — full bonus
            reasons.append("Spinner on spin pitch")
        elif role == "batsman" and "left" in (player.batting_style or "").lower():
            condition_bonus = 5.0                       # left-handers can be awkward vs spin
            reasons.append("Left-hand bat vs spin")

    elif pitch == "pace":
        if "fast" in bowling_style or (role == "bowler" and "spin" not in bowling_style):
            condition_bonus = MAX_CONDITION_BONUS       # pacer on green top — full bonus
            reasons.append("Pace bowler on pace pitch")
        elif role == "batsman":
            condition_bonus = 3.0                       # batsmen still needed
            reasons.append("Batsman on pace pitch")

    elif pitch == "flat":
        if role == "batsman":
            condition_bonus = 8.0                       # batting paradise
            reasons.append("Batsman on flat pitch")
        elif role == "wicketkeeper":
            condition_bonus = 5.0

    elif pitch == "balanced":
        # Allrounders thrive on balanced pitches
        if role == "allrounder":
            condition_bonus = 8.0
            reasons.append("Allrounder on balanced pitch")
        else:
            condition_bonus = 4.0                       # everyone gets a small bonus

    breakdown["condition_bonus"] = round(condition_bonus, 2)

    # -----------------------------------------------------------------------
    # 5. FORMAT BONUS  (max 5 points)
    # -----------------------------------------------------------------------

    format_bonus = 0.0
    fmt = match_context.format

    if fmt == "T20" and role == "allrounder":
        format_bonus = MAX_FORMAT_BONUS   # allrounders most valuable in T20
        reasons.append("Allrounder in T20")
    elif fmt == "T20" and role == "wicketkeeper":
        format_bonus = 3.0               # WK-batsmen often aggressive in T20
    elif fmt == "ODI" and role in ("allrounder", "wicketkeeper"):
        format_bonus = 3.0
    elif fmt == "Test" and role == "batsman":
        format_bonus = MAX_FORMAT_BONUS   # pure batsmen most valued in Tests
        reasons.append("Specialist batsman in Test")
    elif fmt == "Test" and role == "bowler":
        format_bonus = 3.0               # five-day bowling matters too

    breakdown["format_bonus"] = round(format_bonus, 2)

    # -----------------------------------------------------------------------
    # 6. COMPILE TOTAL (hard cap at 100)
    # -----------------------------------------------------------------------

    total = (
        breakdown["batting_avg_points"]
        + breakdown["strike_rate_points"]
        + breakdown["wickets_points"]
        + breakdown["economy_points"]
        + breakdown["recent_form_points"]
        + breakdown["condition_bonus"]
        + breakdown["format_bonus"]
    )

    total_score = round(min(total, 100.0), 2)

    # Build a short selection reason string for the API response
    selection_reason = "; ".join(reasons) if reasons else "Included for team balance"

    return {
        "total_score": total_score,
        "breakdown": breakdown,
        "selection_reason": selection_reason,
    }
