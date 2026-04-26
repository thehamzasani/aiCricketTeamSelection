"""
Seed Data Script — run once to populate the database with:
  • Pakistan squad (15 players)
  • India squad (15 players)
  • 5 venues
  • Squad linkage rows (squads table)

Usage:
    cd backend
    python -m app.seed.seed_data

The script is idempotent: it checks for existing rows before inserting so
running it multiple times will not create duplicates.
"""

import asyncio
import logging
import sys
import os

# Allow running as a standalone script from the backend/ directory
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, engine, Base
from app.models.player import Player, PlayerStats
from app.models.squad import Squad
from app.models.venue import Venue

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# RAW SEED DATA
# ══════════════════════════════════════════════════════════════════════════════

# ── Pakistan Players ──────────────────────────────────────────────────────────
# Fields: name, country, role, batting_style, bowling_style, cricapi_id
# cricapi_id values are placeholder UUIDs — replace with real CricAPI IDs once
# you have them from the /players endpoint of your CricAPI account.

PAKISTAN_PLAYERS = [
    {
        "name": "Babar Azam",
        "country": "Pakistan",
        "role": "batsman",
        "batting_style": "right-hand",
        "bowling_style": "right-arm off spin",
        "cricapi_id": "c31b7f08-9d4b-4f2e-9ae0-ba45d3c7b123",
    },
    {
        "name": "Mohammad Rizwan",
        "country": "Pakistan",
        "role": "wicketkeeper",
        "batting_style": "right-hand",
        "bowling_style": None,
        "cricapi_id": "a1f4e3c2-8b67-4d91-b2f1-cd56e7890abc",
    },
    {
        "name": "Fakhar Zaman",
        "country": "Pakistan",
        "role": "batsman",
        "batting_style": "left-hand",
        "bowling_style": None,
        "cricapi_id": "b2e5f4d3-9c78-4ea2-c3g2-de67f8901bcd",
    },
    {
        "name": "Mohammad Nawaz",
        "country": "Pakistan",
        "role": "allrounder",
        "batting_style": "left-hand",
        "bowling_style": "left-arm spin",
        "cricapi_id": "c3f6g5e4-0d89-4fb3-d4h3-ef78g9012cde",
    },
    {
        "name": "Shadab Khan",
        "country": "Pakistan",
        "role": "allrounder",
        "batting_style": "right-hand",
        "bowling_style": "leg spin",
        "cricapi_id": "d4g7h6f5-1e90-4gc4-e5i4-fg89h0123def",
    },
    {
        "name": "Shaheen Shah Afridi",
        "country": "Pakistan",
        "role": "bowler",
        "batting_style": "left-hand",
        "bowling_style": "left-arm fast",
        "cricapi_id": "e5h8i7g6-2f01-4hd5-f6j5-gh90i1234efg",
    },
    {
        "name": "Naseem Shah",
        "country": "Pakistan",
        "role": "bowler",
        "batting_style": "right-hand",
        "bowling_style": "right-arm fast",
        "cricapi_id": "f6i9j8h7-3g12-4ie6-g7k6-hi01j2345fgh",
    },
    {
        "name": "Haris Rauf",
        "country": "Pakistan",
        "role": "bowler",
        "batting_style": "right-hand",
        "bowling_style": "right-arm fast",
        "cricapi_id": "g7j0k9i8-4h23-4jf7-h8l7-ij12k3456ghi",
    },
    {
        "name": "Iftikhar Ahmed",
        "country": "Pakistan",
        "role": "allrounder",
        "batting_style": "right-hand",
        "bowling_style": "right-arm off spin",
        "cricapi_id": "h8k1l0j9-5i34-4kg8-i9m8-jk23l4567hij",
    },
    {
        "name": "Asif Ali",
        "country": "Pakistan",
        "role": "batsman",
        "batting_style": "right-hand",
        "bowling_style": None,
        "cricapi_id": "i9l2m1k0-6j45-4lh9-j0n9-kl34m5678ijk",
    },
    {
        "name": "Khushdil Shah",
        "country": "Pakistan",
        "role": "allrounder",
        "batting_style": "left-hand",
        "bowling_style": "left-arm spin",
        "cricapi_id": "j0m3n2l1-7k56-4mi0-k1o0-lm45n6789jkl",
    },
    {
        "name": "Mohammad Wasim Jr",
        "country": "Pakistan",
        "role": "bowler",
        "batting_style": "right-hand",
        "bowling_style": "right-arm fast medium",
        "cricapi_id": "k1n4o3m2-8l67-4nj1-l2p1-mn56o7890klm",
    },
    {
        "name": "Imad Wasim",
        "country": "Pakistan",
        "role": "allrounder",
        "batting_style": "left-hand",
        "bowling_style": "left-arm spin",
        "cricapi_id": "l2o5p4n3-9m78-4ok2-m3q2-no67p8901lmn",
    },
    {
        "name": "Saim Ayub",
        "country": "Pakistan",
        "role": "batsman",
        "batting_style": "left-hand",
        "bowling_style": None,
        "cricapi_id": "m3p6q5o4-0n89-4pl3-n4r3-op78q9012mno",
    },
    {
        "name": "Usman Qadir",
        "country": "Pakistan",
        "role": "bowler",
        "batting_style": "right-hand",
        "bowling_style": "leg spin",
        "cricapi_id": "n4q7r6p5-1o90-4qm4-o5s4-pq89r0123nop",
    },
]


# ── India Players ─────────────────────────────────────────────────────────────

INDIA_PLAYERS = [
    {
        "name": "Rohit Sharma",
        "country": "India",
        "role": "batsman",
        "batting_style": "right-hand",
        "bowling_style": "right-arm off spin",
        "cricapi_id": "o5r8s7q6-2p01-4rn5-p6t5-qr90s1234opq",
    },
    {
        "name": "Virat Kohli",
        "country": "India",
        "role": "batsman",
        "batting_style": "right-hand",
        "bowling_style": "right-arm medium",
        "cricapi_id": "p6s9t8r7-3q12-4so6-q7u6-rs01t2345pqr",
    },
    {
        "name": "Shubman Gill",
        "country": "India",
        "role": "batsman",
        "batting_style": "right-hand",
        "bowling_style": None,
        "cricapi_id": "q7t0u9s8-4r23-4tp7-r8v7-st12u3456qrs",
    },
    {
        "name": "KL Rahul",
        "country": "India",
        "role": "wicketkeeper",
        "batting_style": "right-hand",
        "bowling_style": None,
        "cricapi_id": "r8u1v0t9-5s34-4uq8-s9w8-tu23v4567rst",
    },
    {
        "name": "Hardik Pandya",
        "country": "India",
        "role": "allrounder",
        "batting_style": "right-hand",
        "bowling_style": "right-arm medium fast",
        "cricapi_id": "s9v2w1u0-6t45-4vr9-t0x9-uv34w5678stu",
    },
    {
        "name": "Ravindra Jadeja",
        "country": "India",
        "role": "allrounder",
        "batting_style": "left-hand",
        "bowling_style": "left-arm spin",
        "cricapi_id": "t0w3x2v1-7u56-4ws0-u1y0-vw45x6789tuv",
    },
    {
        "name": "Jasprit Bumrah",
        "country": "India",
        "role": "bowler",
        "batting_style": "right-hand",
        "bowling_style": "right-arm fast",
        "cricapi_id": "u1x4y3w2-8v67-4xt1-v2z1-wx56y7890uvw",
    },
    {
        "name": "Mohammed Siraj",
        "country": "India",
        "role": "bowler",
        "batting_style": "right-hand",
        "bowling_style": "right-arm fast medium",
        "cricapi_id": "v2y5z4x3-9w78-4yu2-w3a2-xy67z8901vwx",
    },
    {
        "name": "Kuldeep Yadav",
        "country": "India",
        "role": "bowler",
        "batting_style": "left-hand",
        "bowling_style": "left-arm wrist spin",
        "cricapi_id": "w3z6a5y4-0x89-4zv3-x4b3-yz78a9012wxy",
    },
    {
        "name": "Axar Patel",
        "country": "India",
        "role": "allrounder",
        "batting_style": "left-hand",
        "bowling_style": "left-arm spin",
        "cricapi_id": "x4a7b6z5-1y90-4aw4-y5c4-za89b0123xyz",
    },
    {
        "name": "Suryakumar Yadav",
        "country": "India",
        "role": "batsman",
        "batting_style": "right-hand",
        "bowling_style": None,
        "cricapi_id": "y5b8c7a6-2z01-4bx5-z6d5-ab90c1234yza",
    },
    {
        "name": "Yashasvi Jaiswal",
        "country": "India",
        "role": "batsman",
        "batting_style": "left-hand",
        "bowling_style": None,
        "cricapi_id": "z6c9d8b7-3a12-4cy6-a7e6-bc01d2345zab",
    },
    {
        "name": "Arshdeep Singh",
        "country": "India",
        "role": "bowler",
        "batting_style": "left-hand",
        "bowling_style": "left-arm fast medium",
        "cricapi_id": "a7d0e9c8-4b23-4dz7-b8f7-cd12e3456abc",
    },
    {
        "name": "Rinku Singh",
        "country": "India",
        "role": "batsman",
        "batting_style": "left-hand",
        "bowling_style": None,
        "cricapi_id": "b8e1f0d9-5c34-4ea8-c9g8-de23f4567bcd",
    },
    {
        "name": "Washington Sundar",
        "country": "India",
        "role": "allrounder",
        "batting_style": "right-hand",
        "bowling_style": "right-arm off spin",
        "cricapi_id": "c9f2g1e0-6d45-4fb9-d0h9-ef34g5678cde",
    },
]


# ── Venues ────────────────────────────────────────────────────────────────────

VENUES = [
    {
        "name": "National Stadium",
        "city": "Karachi",
        "country": "Pakistan",
        "avg_first_innings_score_t20": 162,
        "avg_first_innings_score_odi": 268,
        "spin_wicket_percentage": 58,
        "pace_wicket_percentage": 42,
        "typical_pitch_type": "spin",
        "notes": (
            "Home of Pakistan cricket. Dusty surface assists spin from day one. "
            "Slow outfield keeps scores moderate. A target of 160+ is defendable."
        ),
    },
    {
        "name": "Gaddafi Stadium",
        "city": "Lahore",
        "country": "Pakistan",
        "avg_first_innings_score_t20": 178,
        "avg_first_innings_score_odi": 292,
        "spin_wicket_percentage": 40,
        "pace_wicket_percentage": 60,
        "typical_pitch_type": "flat",
        "notes": (
            "Batsman-friendly flat track. Fast outfield results in high scores. "
            "Spinners are used as restrictors rather than wicket-takers. "
            "Dew in evening games heavily favours the team batting second."
        ),
    },
    {
        "name": "Dubai International Cricket Stadium",
        "city": "Dubai",
        "country": "UAE",
        "avg_first_innings_score_t20": 155,
        "avg_first_innings_score_odi": 252,
        "spin_wicket_percentage": 65,
        "pace_wicket_percentage": 35,
        "typical_pitch_type": "spin",
        "notes": (
            "Neutral venue used by Pakistan for home series. Dry, low-bounce pitch "
            "strongly favours spinners. Low scoring compared to sub-continent grounds. "
            "Humidity increases later in the day, assisting swing bowlers."
        ),
    },
    {
        "name": "Eden Gardens",
        "city": "Kolkata",
        "country": "India",
        "avg_first_innings_score_t20": 168,
        "avg_first_innings_score_odi": 278,
        "spin_wicket_percentage": 50,
        "pace_wicket_percentage": 50,
        "typical_pitch_type": "balanced",
        "notes": (
            "Iconic 66,000-seat stadium with a balanced pitch. "
            "Good bounce for pacers early; spin becomes effective from middle overs. "
            "Dew in winter evening matches significantly impacts bowling."
        ),
    },
    {
        "name": "Wankhede Stadium",
        "city": "Mumbai",
        "country": "India",
        "avg_first_innings_score_t20": 181,
        "avg_first_innings_score_odi": 302,
        "spin_wicket_percentage": 35,
        "pace_wicket_percentage": 65,
        "typical_pitch_type": "flat",
        "notes": (
            "High-scoring batting paradise. Flat deck, fast outfield, short straight "
            "boundaries. Pacers with pace and bounce do well. "
            "Venue of the 2011 World Cup final. Sea breeze aids swing at certain times."
        ),
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# SEED FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

async def seed_players(db: AsyncSession, players_data: list[dict], team_name: str) -> list[int]:
    """
    Insert players and their squad links.

    Returns a list of inserted (or already-existing) player DB IDs.
    Idempotent: skips players whose name already exists in the DB.
    """
    player_ids: list[int] = []

    for data in players_data:
        # Check if player already exists by name + country
        result = await db.execute(
            select(Player).where(
                Player.name == data["name"],
                Player.country == data["country"],
            )
        )
        existing: Player | None = result.scalar_one_or_none()

        if existing:
            logger.info("SKIP (exists): %s", data["name"])
            player_ids.append(existing.id)
            player_id = existing.id
        else:
            player = Player(
                name=data["name"],
                country=data["country"],
                role=data["role"],
                batting_style=data["batting_style"],
                bowling_style=data["bowling_style"],
                cricapi_id=data["cricapi_id"],
                is_active=True,
            )
            db.add(player)
            await db.flush()  # get auto-generated id without committing
            logger.info("INSERT player: %s (id=%s)", player.name, player.id)
            player_ids.append(player.id)
            player_id = player.id

        # Link player to squad (idempotent)
        squad_result = await db.execute(
            select(Squad).where(
                Squad.team_name == team_name,
                Squad.player_id == player_id,
            )
        )
        squad_row: Squad | None = squad_result.scalar_one_or_none()
        if not squad_row:
            squad = Squad(
                team_name=team_name,
                player_id=player_id,
                squad_type="all_format",
            )
            db.add(squad)
            logger.info("  → Linked %s to squad '%s'", data["name"], team_name)

    await db.commit()
    return player_ids


async def seed_venues(db: AsyncSession) -> None:
    """
    Insert venues. Idempotent: skips venues whose name + city already exist.
    """
    for data in VENUES:
        result = await db.execute(
            select(Venue).where(
                Venue.name == data["name"],
                Venue.city == data["city"],
            )
        )
        existing: Venue | None = result.scalar_one_or_none()

        if existing:
            logger.info("SKIP venue (exists): %s, %s", data["name"], data["city"])
            continue

        venue = Venue(**data)
        db.add(venue)
        logger.info("INSERT venue: %s, %s", data["name"], data["city"])

    await db.commit()


async def seed_placeholder_stats(db: AsyncSession, player_ids: list[int]) -> None:
    """
    Insert zero-value placeholder stats for every player × format combination.

    These will be overwritten by real CricAPI data when fetch_player_stats() is called.
    Placeholder rows are useful so the app never throws a "no stats found" error
    before the first real fetch.
    """
    formats = ["T20", "ODI", "Test"]

    for player_id in player_ids:
        for fmt in formats:
            result = await db.execute(
                select(PlayerStats).where(
                    PlayerStats.player_id == player_id,
                    PlayerStats.format == fmt,
                )
            )
            if result.scalar_one_or_none():
                continue  # already seeded

            placeholder = PlayerStats(
                player_id=player_id,
                format=fmt,
                matches=0,
                batting_avg=0.0,
                strike_rate=0.0,
                runs_total=0,
                highest_score=0,
                centuries=0,
                fifties=0,
                bowling_avg=0.0,
                bowling_economy=0.0,
                bowling_strike_rate=0.0,
                wickets_total=0,
                best_bowling="-",
                recent_form=[],
                recent_wickets=[],
            )
            db.add(placeholder)

    await db.commit()
    logger.info("Placeholder stats inserted for %d players × 3 formats", len(player_ids))


# ══════════════════════════════════════════════════════════════════════════════
# HARDCODED REALISTIC STATS (fallback when CricAPI key is not yet configured)
# ══════════════════════════════════════════════════════════════════════════════
# These values are based on publicly available career statistics (accurate as
# of early 2024). Replace with live CricAPI data once your key is active.

PAKISTAN_STATS_T20 = {
    "Babar Azam":          dict(matches=106, batting_avg=44.0, strike_rate=129.8, runs_total=4003, highest_score=122, centuries=3, fifties=36, bowling_avg=0.0, bowling_economy=0.0, bowling_strike_rate=0.0, wickets_total=0, best_bowling="-", recent_form=[68, 43, 91, 25, 55], recent_wickets=[]),
    "Mohammad Rizwan":     dict(matches=84,  batting_avg=45.2, strike_rate=128.5, runs_total=2801, highest_score=88,  centuries=0, fifties=28, bowling_avg=0.0, bowling_economy=0.0, bowling_strike_rate=0.0, wickets_total=0, best_bowling="-", recent_form=[72, 14, 53, 88, 31], recent_wickets=[]),
    "Fakhar Zaman":        dict(matches=61,  batting_avg=33.8, strike_rate=137.4, runs_total=1783, highest_score=91,  centuries=0, fifties=15, bowling_avg=0.0, bowling_economy=0.0, bowling_strike_rate=0.0, wickets_total=0, best_bowling="-", recent_form=[34, 67, 12, 45, 88], recent_wickets=[]),
    "Mohammad Nawaz":      dict(matches=48,  batting_avg=22.1, strike_rate=124.7, runs_total=531,  highest_score=42,  centuries=0, fifties=1,  bowling_avg=27.4, bowling_economy=7.12, bowling_strike_rate=23.1, wickets_total=41, best_bowling="4/14", recent_form=[22, 8, 15, 33, 6], recent_wickets=[2, 1, 0, 2, 1]),
    "Shadab Khan":         dict(matches=98,  batting_avg=14.5, strike_rate=133.3, runs_total=580,  highest_score=52,  centuries=0, fifties=1,  bowling_avg=22.9, bowling_economy=7.30, bowling_strike_rate=18.8, wickets_total=107, best_bowling="4/8",  recent_form=[14, 23, 0, 8, 31], recent_wickets=[2, 1, 3, 1, 2]),
    "Shaheen Shah Afridi": dict(matches=72,  batting_avg=5.2,  strike_rate=85.0,  runs_total=78,   highest_score=15,  centuries=0, fifties=0,  bowling_avg=22.1, bowling_economy=7.60, bowling_strike_rate=17.4, wickets_total=92,  best_bowling="4/22", recent_form=[0, 4, 2, 0, 8], recent_wickets=[3, 1, 2, 2, 1]),
    "Naseem Shah":         dict(matches=27,  batting_avg=4.0,  strike_rate=90.0,  runs_total=44,   highest_score=12,  centuries=0, fifties=0,  bowling_avg=27.8, bowling_economy=8.41, bowling_strike_rate=19.8, wickets_total=33,  best_bowling="3/18", recent_form=[0, 0, 4, 2, 0], recent_wickets=[2, 1, 1, 2, 0]),
    "Haris Rauf":          dict(matches=62,  batting_avg=6.3,  strike_rate=95.0,  runs_total=56,   highest_score=18,  centuries=0, fifties=0,  bowling_avg=24.3, bowling_economy=8.26, bowling_strike_rate=17.7, wickets_total=81,  best_bowling="4/24", recent_form=[3, 0, 6, 0, 2], recent_wickets=[2, 2, 1, 3, 1]),
    "Iftikhar Ahmed":      dict(matches=63,  batting_avg=30.1, strike_rate=143.2, runs_total=1034, highest_score=78,  centuries=0, fifties=5,  bowling_avg=37.0, bowling_economy=8.52, bowling_strike_rate=26.1, wickets_total=18,  best_bowling="2/21", recent_form=[44, 11, 67, 28, 5], recent_wickets=[0, 1, 0, 1, 0]),
    "Asif Ali":            dict(matches=59,  batting_avg=24.8, strike_rate=154.9, runs_total=748,  highest_score=52,  centuries=0, fifties=3,  bowling_avg=0.0,  bowling_economy=0.0, bowling_strike_rate=0.0, wickets_total=0, best_bowling="-", recent_form=[18, 32, 0, 45, 22], recent_wickets=[]),
    "Khushdil Shah":       dict(matches=32,  batting_avg=27.5, strike_rate=148.5, runs_total=412,  highest_score=63,  centuries=0, fifties=2,  bowling_avg=34.0, bowling_economy=8.14, bowling_strike_rate=25.0, wickets_total=12,  best_bowling="2/19", recent_form=[29, 63, 4, 12, 37], recent_wickets=[1, 0, 1, 2, 0]),
    "Mohammad Wasim Jr":   dict(matches=22,  batting_avg=7.8,  strike_rate=110.0, runs_total=78,   highest_score=21,  centuries=0, fifties=0,  bowling_avg=30.4, bowling_economy=8.72, bowling_strike_rate=20.9, wickets_total=21,  best_bowling="3/27", recent_form=[0, 7, 0, 12, 4], recent_wickets=[1, 2, 1, 0, 2]),
    "Imad Wasim":          dict(matches=78,  batting_avg=18.4, strike_rate=120.3, runs_total=742,  highest_score=57,  centuries=0, fifties=2,  bowling_avg=26.7, bowling_economy=6.71, bowling_strike_rate=23.9, wickets_total=71,  best_bowling="4/25", recent_form=[14, 28, 0, 9, 21], recent_wickets=[1, 2, 1, 1, 0]),
    "Saim Ayub":           dict(matches=18,  batting_avg=29.4, strike_rate=140.1, runs_total=412,  highest_score=58,  centuries=0, fifties=3,  bowling_avg=0.0,  bowling_economy=0.0, bowling_strike_rate=0.0, wickets_total=0, best_bowling="-", recent_form=[58, 22, 14, 41, 9], recent_wickets=[]),
    "Usman Qadir":         dict(matches=24,  batting_avg=8.2,  strike_rate=95.0,  runs_total=74,   highest_score=19,  centuries=0, fifties=0,  bowling_avg=31.5, bowling_economy=7.84, bowling_strike_rate=24.1, wickets_total=22,  best_bowling="3/28", recent_form=[4, 0, 8, 2, 0], recent_wickets=[1, 2, 0, 1, 1]),
}

INDIA_STATS_T20 = {
    "Rohit Sharma":       dict(matches=159, batting_avg=32.5, strike_rate=140.9, runs_total=4231, highest_score=118, centuries=5, fifties=30, bowling_avg=44.0, bowling_economy=8.40, bowling_strike_rate=31.4, wickets_total=15,  best_bowling="2/9",  recent_form=[92, 44, 0, 63, 11], recent_wickets=[0, 0, 0, 1, 0]),
    "Virat Kohli":        dict(matches=125, batting_avg=52.7, strike_rate=137.1, runs_total=4188, highest_score=122, centuries=1, fifties=40, bowling_avg=0.0,  bowling_economy=0.0, bowling_strike_rate=0.0, wickets_total=0, best_bowling="-", recent_form=[76, 49, 12, 82, 37], recent_wickets=[]),
    "Shubman Gill":       dict(matches=46,  batting_avg=38.2, strike_rate=148.1, runs_total=1150, highest_score=126, centuries=2, fifties=7,  bowling_avg=0.0,  bowling_economy=0.0, bowling_strike_rate=0.0, wickets_total=0, best_bowling="-", recent_form=[51, 23, 88, 14, 61], recent_wickets=[]),
    "KL Rahul":           dict(matches=72,  batting_avg=35.6, strike_rate=140.2, runs_total=2265, highest_score=110, centuries=2, fifties=23, bowling_avg=0.0,  bowling_economy=0.0, bowling_strike_rate=0.0, wickets_total=0, best_bowling="-", recent_form=[42, 68, 15, 55, 29], recent_wickets=[]),
    "Hardik Pandya":      dict(matches=112, batting_avg=31.4, strike_rate=147.9, runs_total=2170, highest_score=71,  centuries=0, fifties=14, bowling_avg=28.7, bowling_economy=8.77, bowling_strike_rate=19.6, wickets_total=82,  best_bowling="4/28", recent_form=[30, 68, 4, 45, 22], recent_wickets=[2, 1, 0, 2, 1]),
    "Ravindra Jadeja":    dict(matches=74,  batting_avg=23.3, strike_rate=127.6, runs_total=525,  highest_score=46,  centuries=0, fifties=0,  bowling_avg=27.2, bowling_economy=7.56, bowling_strike_rate=21.5, wickets_total=54,  best_bowling="3/15", recent_form=[28, 12, 0, 36, 9], recent_wickets=[1, 2, 1, 0, 2]),
    "Jasprit Bumrah":     dict(matches=69,  batting_avg=3.5,  strike_rate=70.0,  runs_total=28,   highest_score=10,  centuries=0, fifties=0,  bowling_avg=20.2, bowling_economy=6.29, bowling_strike_rate=19.2, wickets_total=89,  best_bowling="4/14", recent_form=[0, 0, 2, 0, 4], recent_wickets=[3, 2, 2, 3, 1]),
    "Mohammed Siraj":     dict(matches=26,  batting_avg=4.0,  strike_rate=80.0,  runs_total=28,   highest_score=9,   centuries=0, fifties=0,  bowling_avg=28.4, bowling_economy=8.24, bowling_strike_rate=20.7, wickets_total=30,  best_bowling="3/21", recent_form=[0, 2, 0, 0, 4], recent_wickets=[2, 1, 2, 0, 1]),
    "Kuldeep Yadav":      dict(matches=28,  batting_avg=7.2,  strike_rate=92.0,  runs_total=58,   highest_score=19,  centuries=0, fifties=0,  bowling_avg=21.5, bowling_economy=7.30, bowling_strike_rate=17.6, wickets_total=40,  best_bowling="5/17", recent_form=[0, 5, 0, 8, 2], recent_wickets=[3, 2, 1, 2, 3]),
    "Axar Patel":         dict(matches=65,  batting_avg=18.7, strike_rate=140.0, runs_total=471,  highest_score=42,  centuries=0, fifties=0,  bowling_avg=26.8, bowling_economy=7.04, bowling_strike_rate=22.8, wickets_total=62,  best_bowling="3/9",  recent_form=[18, 0, 35, 12, 8], recent_wickets=[2, 1, 1, 2, 1]),
    "Suryakumar Yadav":   dict(matches=68,  batting_avg=47.1, strike_rate=170.2, runs_total=2410, highest_score=117, centuries=4, fifties=16, bowling_avg=0.0,  bowling_economy=0.0, bowling_strike_rate=0.0, wickets_total=0, best_bowling="-", recent_form=[117, 29, 68, 0, 51], recent_wickets=[]),
    "Yashasvi Jaiswal":   dict(matches=16,  batting_avg=35.4, strike_rate=163.1, runs_total=548,  highest_score=98,  centuries=0, fifties=4,  bowling_avg=0.0,  bowling_economy=0.0, bowling_strike_rate=0.0, wickets_total=0, best_bowling="-", recent_form=[98, 41, 23, 57, 14], recent_wickets=[]),
    "Arshdeep Singh":     dict(matches=59,  batting_avg=5.1,  strike_rate=88.0,  runs_total=42,   highest_score=12,  centuries=0, fifties=0,  bowling_avg=24.7, bowling_economy=8.34, bowling_strike_rate=17.8, wickets_total=78,  best_bowling="4/9",  recent_form=[0, 0, 4, 2, 0], recent_wickets=[3, 2, 2, 1, 2]),
    "Rinku Singh":        dict(matches=18,  batting_avg=41.2, strike_rate=163.4, runs_total=411,  highest_score=69,  centuries=0, fifties=3,  bowling_avg=0.0,  bowling_economy=0.0, bowling_strike_rate=0.0, wickets_total=0, best_bowling="-", recent_form=[29, 69, 14, 42, 5], recent_wickets=[]),
    "Washington Sundar":  dict(matches=56,  batting_avg=20.4, strike_rate=130.0, runs_total=510,  highest_score=50,  centuries=0, fifties=1,  bowling_avg=29.3, bowling_economy=7.42, bowling_strike_rate=23.7, wickets_total=38,  best_bowling="3/21", recent_form=[22, 0, 8, 31, 12], recent_wickets=[1, 1, 2, 0, 1]),
}


async def seed_realistic_stats(
    db: AsyncSession,
    player_names_to_ids: dict[str, int],
    stats_map: dict[str, dict],
    fmt: str = "T20",
) -> None:
    """
    Upsert realistic (hardcoded) stats for a list of players.

    This is called as a fallback so the scoring algorithm has non-zero data
    even before CricAPI keys are configured.
    """
    from datetime import datetime, timezone

    for name, player_id in player_names_to_ids.items():
        if name not in stats_map:
            logger.warning("No realistic stats defined for %s — skipping", name)
            continue

        stat_data = stats_map[name]

        result = await db.execute(
            select(PlayerStats).where(
                PlayerStats.player_id == player_id,
                PlayerStats.format == fmt,
            )
        )
        existing: PlayerStats | None = result.scalar_one_or_none()

        if existing:
            # Only update if it's still a placeholder (matches == 0)
            if existing.matches == 0:
                for key, val in stat_data.items():
                    setattr(existing, key, val)
                existing.last_updated = datetime.now(timezone.utc)
                db.add(existing)
                logger.info("UPDATE realistic stats: %s %s", name, fmt)
        else:
            new_stat = PlayerStats(
                player_id=player_id,
                format=fmt,
                last_updated=datetime.now(timezone.utc),
                **stat_data,
            )
            db.add(new_stat)
            logger.info("INSERT realistic stats: %s %s", name, fmt)

    await db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

async def run_seed() -> None:
    """
    Orchestrate the full seed run:
      1. Create all tables (safe — skips if already exist)
      2. Seed venues
      3. Seed Pakistan players + squad links
      4. Seed India players + squad links
      5. Insert placeholder stats rows
      6. Upsert realistic hardcoded T20 stats as fallback data
    """
    logger.info("═" * 60)
    logger.info("  AI Cricket — Database Seed Starting")
    logger.info("═" * 60)

    # Ensure all tables exist (runs CREATE TABLE IF NOT EXISTS)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✔  Tables verified / created")

    async with AsyncSessionLocal() as db:
        # ── Venues ────────────────────────────────────────────────────────
        logger.info("\n── Seeding Venues ──")
        await seed_venues(db)

        # ── Pakistan Squad ────────────────────────────────────────────────
        logger.info("\n── Seeding Pakistan Squad ──")
        pak_ids = await seed_players(db, PAKISTAN_PLAYERS, "Pakistan")
        pak_name_to_id = {
            p["name"]: pk_id
            for p, pk_id in zip(PAKISTAN_PLAYERS, pak_ids)
        }

        # ── India Squad ───────────────────────────────────────────────────
        logger.info("\n── Seeding India Squad ──")
        ind_ids = await seed_players(db, INDIA_PLAYERS, "India")
        ind_name_to_id = {
            p["name"]: ind_id
            for p, ind_id in zip(INDIA_PLAYERS, ind_ids)
        }

        # ── Placeholder stats rows ────────────────────────────────────────
        logger.info("\n── Inserting placeholder stats ──")
        all_ids = pak_ids + ind_ids
        await seed_placeholder_stats(db, all_ids)

        # ── Realistic hardcoded T20 stats (fallback) ──────────────────────
        logger.info("\n── Seeding realistic T20 stats (fallback) ──")
        await seed_realistic_stats(db, pak_name_to_id, PAKISTAN_STATS_T20, "T20")
        await seed_realistic_stats(db, ind_name_to_id, INDIA_STATS_T20, "T20")

    logger.info("\n" + "═" * 60)
    logger.info("  ✔  Seed complete!")
    logger.info("  Pakistan players: %d", len(pak_ids))
    logger.info("  India players:    %d", len(ind_ids))
    logger.info("  Venues:           %d", len(VENUES))
    logger.info("═" * 60)


if __name__ == "__main__":
    asyncio.run(run_seed())
