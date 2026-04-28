"""
Squads router — returns all players belonging to a named squad/team.
Endpoint:
  GET /api/squads/{team_name} → list players in that squad with their basic info
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models.player import Player
from app.models.squad import Squad
from app.schemas.player import PlayerResponse

router = APIRouter(prefix="/api/squads", tags=["Squads"])


@router.get("/{team_name}", response_model=List[PlayerResponse])
async def get_squad(team_name: str, db: AsyncSession = Depends(get_db)):
    """
    Return all active players registered under a given team name.
    team_name is case-insensitive (e.g. 'Pakistan', 'India').
    """
    # Join squads → players and filter by team name
    result = await db.execute(
        select(Player)
        .join(Squad, Squad.player_id == Player.id)
        .where(Squad.team_name.ilike(team_name))
        .where(Player.is_active == True)
        .order_by(Player.role, Player.name)
    )
    players = result.scalars().all()

    if not players:
        raise HTTPException(
            status_code=404,
            detail=f"No squad found for team '{team_name}'. Check spelling or seed the database.",
        )

    return players