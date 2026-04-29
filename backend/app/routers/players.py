"""
routers/players.py
------------------
Player management endpoints:
  GET    /api/players                        → list all active players (filterable)
  POST   /api/players                        → create a new player
  PUT    /api/players/{player_id}            → update player info
  DELETE /api/players/{player_id}            → soft delete (is_active = False)
  GET    /api/players/{player_id}/stats      → fetch stats (cached via CricAPI service)
  POST   /api/players/{player_id}/stats      → upsert stats for a given format
  POST   /api/players/{player_id}/assign-squad → assign player to a squad
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.player import Player, PlayerStats
from app.models.squad import Squad
from app.schemas.player import (
    PlayerResponse,
    PlayerStatsResponse,
    PlayerCreate,
    PlayerUpdate,
    PlayerStatsUpsert,
    SquadAssign,
)

router = APIRouter(prefix="/api/players", tags=["Players"])


# ---------------------------------------------------------------------------
# GET /api/players — list all active players
# ---------------------------------------------------------------------------

@router.get("", response_model=List[PlayerResponse])
async def list_players(
    country: Optional[str] = Query(None, description="Filter by country"),
    role: Optional[str] = Query(None, description="Filter by role"),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all active players from the DB.
    Eagerly loads stats to avoid async lazy-load errors.
    Optionally filter by country and/or role.
    Computes overall_score as a simple composite for the UI score meter.
    """
    query = (
        select(Player)
        .options(selectinload(Player.stats))
        .where(Player.is_active == True)
    )
    if country:
        query = query.where(Player.country.ilike(f"%{country}%"))
    if role:
        query = query.where(Player.role.ilike(f"%{role}%"))

    result = await db.execute(query)
    players = result.scalars().all()

    # Build response list — attach a denormalised overall_score and primary stats
    response = []
    for p in players:
        # Pick T20 stats first, fall back to ODI, then Test, then None
        stats_map = {s.format: s for s in (p.stats or [])}
        active_stats = (
            stats_map.get("T20")
            or stats_map.get("ODI")
            or stats_map.get("Test")
        )

        # Compute a simplified overall score so the UI score meter works
        overall_score = _quick_score(p, active_stats)

        response.append(
            PlayerResponse(
                id=p.id,
                name=p.name,
                country=p.country,
                role=p.role,
                batting_style=p.batting_style,
                bowling_style=p.bowling_style,
                cricapi_id=p.cricapi_id,
                image_url=p.image_url,
                is_active=p.is_active,
                overall_score=round(overall_score, 1),
                stats=[
                    PlayerStatsResponse.model_validate(s)
                    for s in (p.stats or [])
                ],
            )
        )

    return response


def _quick_score(player: Player, stats) -> float:
    """
    Lightweight version of scoring_service.calculate_player_score for list views.
    Uses T20 defaults with a balanced pitch so every player gets a comparable score.
    Full scoring happens in selection_service only.
    """
    if not stats:
        return 0.0

    score = 0.0
    # Batting
    if stats.batting_avg:
        score += min(float(stats.batting_avg) * 0.5, 20.0)
    if stats.strike_rate:
        score += min(max((float(stats.strike_rate) - 100) * 0.15, 0), 15.0)
    # Bowling
    if stats.wickets_total:
        score += min(float(stats.wickets_total) * 0.10, 10.0)
    if stats.bowling_economy:
        score += min(max((10 - float(stats.bowling_economy)) * 2, 0), 15.0)
    # Recent form
    if stats.recent_form:
        weights = [0.35, 0.25, 0.20, 0.12, 0.08]
        form = stats.recent_form[:5]
        w = weights[: len(form)]
        ws = sum(w)
        form_score = sum(r * (wi / ws) for r, wi in zip(form, w))
        score += min(form_score / 10, 20.0)
    return min(score, 100.0)


# ---------------------------------------------------------------------------
# POST /api/players — create a new player
# ---------------------------------------------------------------------------

@router.post("", response_model=PlayerResponse, status_code=201)
async def create_player(
    payload: PlayerCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Insert a new player row.
    Returns the created player with an empty stats list.
    """
    # Prevent duplicate names (case-insensitive) for the same country
    existing = await db.execute(
        select(Player).where(
            and_(
                Player.name.ilike(payload.name.strip()),
                Player.country.ilike(payload.country.strip()),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Player '{payload.name}' from {payload.country} already exists.",
        )

    new_player = Player(
        name=payload.name.strip(),
        country=payload.country.strip(),
        role=payload.role,
        batting_style=payload.batting_style,
        bowling_style=payload.bowling_style,
        cricapi_id=payload.cricapi_id,
        image_url=payload.image_url,
        is_active=True,
    )
    db.add(new_player)
    await db.flush()   # get the generated ID before commit
    await db.refresh(new_player)

    return PlayerResponse(
        id=new_player.id,
        name=new_player.name,
        country=new_player.country,
        role=new_player.role,
        batting_style=new_player.batting_style,
        bowling_style=new_player.bowling_style,
        cricapi_id=new_player.cricapi_id,
        image_url=new_player.image_url,
        is_active=new_player.is_active,
        overall_score=0.0,
        stats=[],
    )


# ---------------------------------------------------------------------------
# PUT /api/players/{player_id} — update player info
# ---------------------------------------------------------------------------

@router.put("/{player_id}", response_model=PlayerResponse)
async def update_player(
    player_id: int,
    payload: PlayerUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Partially update a player's profile fields.
    Only provided (non-None) fields are updated.
    """
    result = await db.execute(
        select(Player)
        .options(selectinload(Player.stats))
        .where(Player.id == player_id)
    )
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(player, field, value)

    await db.flush()
    await db.refresh(player)

    overall_score = _quick_score(
        player,
        next((s for s in player.stats if s.format == "T20"), None)
        or (player.stats[0] if player.stats else None),
    )

    return PlayerResponse(
        id=player.id,
        name=player.name,
        country=player.country,
        role=player.role,
        batting_style=player.batting_style,
        bowling_style=player.bowling_style,
        cricapi_id=player.cricapi_id,
        image_url=player.image_url,
        is_active=player.is_active,
        overall_score=round(overall_score, 1),
        stats=[PlayerStatsResponse.model_validate(s) for s in player.stats],
    )


# ---------------------------------------------------------------------------
# DELETE /api/players/{player_id} — soft delete
# ---------------------------------------------------------------------------

@router.delete("/{player_id}", status_code=200)
async def delete_player(
    player_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Soft-delete a player by setting is_active = False.
    The row is retained for historical selection records.
    """
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found.")

    player.is_active = False
    await db.flush()
    return {"message": f"Player '{player.name}' deactivated successfully."}


# ---------------------------------------------------------------------------
# GET /api/players/{player_id}/stats — fetch cached stats
# ---------------------------------------------------------------------------

@router.get("/{player_id}/stats", response_model=PlayerStatsResponse)
async def get_player_stats(
    player_id: int,
    format: str = Query("T20", description="Match format: T20 / ODI / Test"),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch stats for a single player in a given format from DB cache.
    Falls back to CricAPI fetch if the player has a cricapi_id and cache is stale.
    """
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found.")

    # Check DB cache first
    stats_result = await db.execute(
        select(PlayerStats).where(
            and_(PlayerStats.player_id == player_id, PlayerStats.format == format)
        )
    )
    stats = stats_result.scalar_one_or_none()

    # If player has a cricapi_id, try live fetch (service handles 24-hr cache)
    if not stats and player.cricapi_id:
        try:
            from app.services.cricapi_service import fetch_player_stats
            stats = await fetch_player_stats(player_id, player.cricapi_id, format, db)
        except Exception as e:
            print(f"⚠️ CricAPI fetch failed for {player.name}: {e}")

    if not stats:
        raise HTTPException(
            status_code=404,
            detail=f"No {format} stats found for {player.name}. Add stats manually.",
        )

    return PlayerStatsResponse.model_validate(stats)


# ---------------------------------------------------------------------------
# POST /api/players/{player_id}/stats — upsert stats for a format
# ---------------------------------------------------------------------------

@router.post("/{player_id}/stats", response_model=PlayerStatsResponse, status_code=200)
async def upsert_player_stats(
    player_id: int,
    payload: PlayerStatsUpsert,
    db: AsyncSession = Depends(get_db),
):
    """
    Create or update stats for a player in a specific format (T20 / ODI / Test).
    Uses upsert logic: if a row exists for (player_id, format), update it;
    otherwise insert a new row.
    """
    # Verify player exists
    player_result = await db.execute(select(Player).where(Player.id == player_id))
    player = player_result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found.")

    # Try to find existing stats row
    stats_result = await db.execute(
        select(PlayerStats).where(
            and_(
                PlayerStats.player_id == player_id,
                PlayerStats.format == payload.format,
            )
        )
    )
    stats = stats_result.scalar_one_or_none()

    if stats:
        # Update existing row
        for field, value in payload.model_dump(exclude={"format"}).items():
            if value is not None:
                setattr(stats, field, value)
        stats.last_updated = datetime.utcnow()
    else:
        # Insert new row
        stats = PlayerStats(
            player_id=player_id,
            format=payload.format,
            matches=payload.matches or 0,
            batting_avg=payload.batting_avg or 0.0,
            strike_rate=payload.strike_rate or 0.0,
            runs_total=payload.runs_total or 0,
            highest_score=payload.highest_score or 0,
            centuries=payload.centuries or 0,
            fifties=payload.fifties or 0,
            bowling_avg=payload.bowling_avg or 0.0,
            bowling_economy=payload.bowling_economy or 0.0,
            bowling_strike_rate=payload.bowling_strike_rate or 0.0,
            wickets_total=payload.wickets_total or 0,
            best_bowling=payload.best_bowling,
            recent_form=payload.recent_form or [],
            recent_wickets=payload.recent_wickets or [],
            last_updated=datetime.utcnow(),
        )
        db.add(stats)

    await db.flush()
    await db.refresh(stats)
    return PlayerStatsResponse.model_validate(stats)


# ---------------------------------------------------------------------------
# POST /api/players/{player_id}/assign-squad — assign player to a team squad
# ---------------------------------------------------------------------------

@router.post("/{player_id}/assign-squad", status_code=200)
async def assign_to_squad(
    player_id: int,
    payload: SquadAssign,
    db: AsyncSession = Depends(get_db),
):
    """
    Assign a player to a named squad.
    Idempotent — safe to call multiple times (ignores duplicates).
    """
    # Verify player exists
    player_result = await db.execute(select(Player).where(Player.id == player_id))
    player = player_result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found.")

    # Check if assignment already exists
    existing = await db.execute(
        select(Squad).where(
            and_(
                Squad.player_id == player_id,
                Squad.team_name.ilike(payload.team_name),
            )
        )
    )
    if existing.scalar_one_or_none():
        return {
            "message": f"'{player.name}' is already in the {payload.team_name} squad.",
            "player_id": player_id,
            "team_name": payload.team_name,
        }

    new_assignment = Squad(
        team_name=payload.team_name.strip(),
        player_id=player_id,
        squad_type=payload.squad_type or "all_format",
    )
    db.add(new_assignment)
    await db.flush()

    return {
        "message": f"'{player.name}' successfully added to {payload.team_name} squad.",
        "player_id": player_id,
        "team_name": payload.team_name,
    }