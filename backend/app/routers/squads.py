"""
Squads router — returns all players belonging to a named squad/team.
Endpoint:
  GET /api/squads/{team_name} → list players in that squad with their basic info
  GET /api/squads             → list all unique team names
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, distinct
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models.player import Player
from app.models.squad import Squad
from app.schemas.player import PlayerResponse

router = APIRouter(prefix="/api/squads", tags=["Squads"])


@router.get("", response_model=List[str])
async def list_teams(db: AsyncSession = Depends(get_db)):
    """Return all unique team names that have squads in the DB."""
    result = await db.execute(
        select(distinct(Squad.team_name)).order_by(Squad.team_name)
    )
    return [row[0] for row in result.all()]


@router.get("/{team_name}", response_model=List[PlayerResponse])
async def get_squad(team_name: str, db: AsyncSession = Depends(get_db)):
    """
    Return all active players registered under a given team name.
    Eagerly loads stats to avoid MissingGreenlet async errors.
    team_name is case-insensitive (e.g. 'Pakistan', 'India').
    """
    result = await db.execute(
        select(Player)
        .options(selectinload(Player.stats))   # ← THIS is what was missing
        .join(Squad, Squad.player_id == Player.id)
        .where(Squad.team_name.ilike(team_name))
        .where(Player.is_active == True)
        .order_by(Player.role, Player.name)
    )
    players = result.scalars().all()

    if not players:
        raise HTTPException(
            status_code=404,
            detail=f"No squad found for '{team_name}'. Check spelling or seed the database.",
        )

    # Build response manually so overall_score is computed correctly
    from app.routers.players import _quick_score
    return [
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
            overall_score=round(_quick_score(p, next(
                (s for s in p.stats if s.format == "T20"), None
            ) or (p.stats[0] if p.stats else None)), 1),
            stats=[s for s in p.stats],
        )
        for p in players
    ]