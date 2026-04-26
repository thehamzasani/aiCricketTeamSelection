"""
CricAPI Service — fetches player stats from CricAPI v1 with 24-hour DB caching.

Flow:
  1. Check player_stats table for a fresh record (updated within 24 hours).
  2. If fresh → return cached stats immediately (protects CricAPI free tier limits).
  3. If stale or missing → fetch from CricAPI, upsert into DB, return fresh data.
  4. On any CricAPI error → return cached data if available, else return None.
"""

import httpx
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.player import PlayerStats

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

CRICAPI_BASE_URL = "https://api.cricapi.com/v1"
CACHE_TTL_HOURS = 24  # hours before a cached stat record is considered stale
REQUEST_TIMEOUT = 10  # seconds


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_fresh(last_updated: datetime) -> bool:
    """Return True if the cached record is younger than CACHE_TTL_HOURS."""
    if last_updated.tzinfo is None:
        # Make naive datetime timezone-aware (assume UTC stored in DB)
        last_updated = last_updated.replace(tzinfo=timezone.utc)
    age = datetime.now(timezone.utc) - last_updated
    return age < timedelta(hours=CACHE_TTL_HOURS)


def _parse_bowling_figures(figures: str) -> tuple[int, int]:
    """
    Parse a bowling best-figures string like '5/23' into (wickets, runs).
    Returns (0, 0) on any parse failure.
    """
    try:
        parts = figures.split("/")
        return int(parts[0]), int(parts[1])
    except Exception:
        return 0, 0


def _extract_stats_from_cricapi(data: dict, fmt: str) -> dict:
    """
    Transform raw CricAPI player-info payload into a flat dict that matches
    the player_stats table columns.

    CricAPI returns nested dicts keyed by format under `data.stats`.
    We gracefully default everything to 0 / [] if the key is absent.
    """
    fmt_key = fmt.lower()  # cricapi uses lowercase keys: "t20", "odi", "test"

    stats_block: dict = {}

    # CricAPI v1 player-info endpoint returns a `stats` list of dicts
    # Each dict has keys: type (batting/bowling), fn (format), and metric dicts.
    batting: dict = {}
    bowling: dict = {}

    raw_stats: list = data.get("stats", [])
    for block in raw_stats:
        block_type = block.get("type", "").lower()
        block_fn = block.get("fn", "").lower()
        if block_fn != fmt_key:
            continue
        if block_type == "batting":
            batting = block
        elif block_type == "bowling":
            bowling = block

    # ── Batting metrics ────────────────────────────────────────────────────
    def safe_float(val, default=0.0) -> float:
        try:
            return float(val) if val not in (None, "-", "") else default
        except (TypeError, ValueError):
            return default

    def safe_int(val, default=0) -> int:
        try:
            return int(val) if val not in (None, "-", "") else default
        except (TypeError, ValueError):
            return default

    stats_block["matches"] = safe_int(batting.get("mat") or bowling.get("mat"))
    stats_block["batting_avg"] = safe_float(batting.get("ave"))
    stats_block["strike_rate"] = safe_float(batting.get("sr"))
    stats_block["runs_total"] = safe_int(batting.get("runs"))
    stats_block["highest_score"] = safe_int(batting.get("hs", "0").replace("*", ""))
    stats_block["centuries"] = safe_int(batting.get("100"))
    stats_block["fifties"] = safe_int(batting.get("50"))

    # ── Bowling metrics ────────────────────────────────────────────────────
    stats_block["bowling_avg"] = safe_float(bowling.get("ave"))
    stats_block["bowling_economy"] = safe_float(bowling.get("econ"))
    stats_block["bowling_strike_rate"] = safe_float(bowling.get("sr"))
    stats_block["wickets_total"] = safe_int(bowling.get("wkts"))
    stats_block["best_bowling"] = bowling.get("bbi", "-")

    # ── Recent form (not provided by CricAPI; we leave as empty list) ──────
    stats_block["recent_form"] = []
    stats_block["recent_wickets"] = []

    return stats_block


# ── Main public function ──────────────────────────────────────────────────────

async def fetch_player_stats(
    player_id: int,
    cricapi_id: Optional[str],
    fmt: str,
    db: AsyncSession,
) -> Optional[PlayerStats]:
    """
    Return a PlayerStats ORM object for the given player and format.

    Steps:
      1. Query DB cache → return if fresh.
      2. Fetch from CricAPI → upsert into DB → return fresh record.
      3. On error → return stale cache if available, else None.

    Args:
        player_id:  Internal DB player ID (FK into players table).
        cricapi_id: The CricAPI player UUID used in API calls. If None,
                    we can only serve from cache (no external fetch).
        fmt:        Match format — "T20", "ODI", or "Test".
        db:         SQLAlchemy async session (injected by FastAPI dependency).

    Returns:
        PlayerStats ORM instance, or None if no data is available at all.
    """

    fmt = fmt.upper()

    # ── Step 1: Check DB cache ─────────────────────────────────────────────
    result = await db.execute(
        select(PlayerStats).where(
            PlayerStats.player_id == player_id,
            PlayerStats.format == fmt,
        )
    )
    cached: Optional[PlayerStats] = result.scalar_one_or_none()

    if cached and _is_fresh(cached.last_updated):
        logger.info(
            "Cache HIT for player_id=%s format=%s (updated %s)",
            player_id, fmt, cached.last_updated,
        )
        return cached

    # ── Step 2: Fetch from CricAPI ─────────────────────────────────────────
    if not cricapi_id:
        logger.warning(
            "No cricapi_id for player_id=%s — cannot fetch from API. "
            "Returning stale cache if available.",
            player_id,
        )
        return cached  # could be None

    logger.info("Cache MISS for player_id=%s format=%s — fetching from CricAPI", player_id, fmt)

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.get(
                f"{CRICAPI_BASE_URL}/players_info",
                params={"apikey": settings.CRICAPI_KEY, "id": cricapi_id},
            )
            response.raise_for_status()
            payload = response.json()

        if payload.get("status") != "success":
            raise ValueError(f"CricAPI returned non-success status: {payload.get('status')}")

        api_data = payload.get("data", {})
        stats_dict = _extract_stats_from_cricapi(api_data, fmt)

    except httpx.HTTPStatusError as exc:
        logger.error("CricAPI HTTP error for player_id=%s: %s", player_id, exc)
        return cached
    except httpx.RequestError as exc:
        logger.error("CricAPI request error for player_id=%s: %s", player_id, exc)
        return cached
    except Exception as exc:
        logger.error("Unexpected error fetching CricAPI for player_id=%s: %s", player_id, exc)
        return cached

    # ── Step 3: Upsert into DB ─────────────────────────────────────────────
    try:
        if cached:
            # Update existing record in-place
            cached.matches = stats_dict["matches"]
            cached.batting_avg = stats_dict["batting_avg"]
            cached.strike_rate = stats_dict["strike_rate"]
            cached.runs_total = stats_dict["runs_total"]
            cached.highest_score = stats_dict["highest_score"]
            cached.centuries = stats_dict["centuries"]
            cached.fifties = stats_dict["fifties"]
            cached.bowling_avg = stats_dict["bowling_avg"]
            cached.bowling_economy = stats_dict["bowling_economy"]
            cached.bowling_strike_rate = stats_dict["bowling_strike_rate"]
            cached.wickets_total = stats_dict["wickets_total"]
            cached.best_bowling = stats_dict["best_bowling"]
            cached.recent_form = stats_dict["recent_form"]
            cached.recent_wickets = stats_dict["recent_wickets"]
            cached.last_updated = datetime.now(timezone.utc)
            db.add(cached)
            await db.commit()
            await db.refresh(cached)
            logger.info("Updated DB cache for player_id=%s format=%s", player_id, fmt)
            return cached
        else:
            # Insert brand-new record
            new_stats = PlayerStats(
                player_id=player_id,
                format=fmt,
                last_updated=datetime.now(timezone.utc),
                **stats_dict,
            )
            db.add(new_stats)
            await db.commit()
            await db.refresh(new_stats)
            logger.info("Inserted new DB cache for player_id=%s format=%s", player_id, fmt)
            return new_stats

    except Exception as exc:
        await db.rollback()
        logger.error("DB upsert failed for player_id=%s format=%s: %s", player_id, fmt, exc)
        return cached  # return whatever we had before


# ── Pre-cache utility ─────────────────────────────────────────────────────────

async def precache_team_stats(team_name: str, db: AsyncSession) -> dict:
    """
    Pre-fetch and cache stats for every player in a squad across all formats.

    Designed to be called the night before a demo so all stats are warm and
    no live CricAPI calls are made during the presentation.

    Args:
        team_name:  e.g. "Pakistan" or "India" — must match squads.team_name.
        db:         SQLAlchemy async session.

    Returns:
        A summary dict: {"fetched": int, "cached": int, "errors": int}
    """
    from app.models.squad import Squad
    from app.models.player import Player

    # Join squads → players to get all players for the team
    result = await db.execute(
        select(Player)
        .join(Squad, Squad.player_id == Player.id)
        .where(Squad.team_name == team_name)
    )
    players: list[Player] = result.scalars().all()

    summary = {"fetched": 0, "cached": 0, "errors": 0}

    for player in players:
        for fmt in ["T20", "ODI", "Test"]:
            try:
                # Check if already fresh
                res = await db.execute(
                    select(PlayerStats).where(
                        PlayerStats.player_id == player.id,
                        PlayerStats.format == fmt,
                    )
                )
                cached = res.scalar_one_or_none()

                if cached and _is_fresh(cached.last_updated):
                    logger.info("Pre-cache SKIP (fresh): %s %s", player.name, fmt)
                    summary["cached"] += 1
                    continue

                stats = await fetch_player_stats(player.id, player.cricapi_id, fmt, db)
                if stats:
                    summary["fetched"] += 1
                    logger.info("Pre-cache OK: %s %s", player.name, fmt)
                else:
                    summary["errors"] += 1
                    logger.warning("Pre-cache NO DATA: %s %s", player.name, fmt)

            except Exception as exc:
                summary["errors"] += 1
                logger.error("Pre-cache ERROR: %s %s — %s", player.name, fmt, exc)

    logger.info("Pre-cache complete for %s: %s", team_name, summary)
    return summary
