# """
# Players router — handles player listing and individual stat fetching.
# Endpoints:
#   GET /api/players           → list all active players (optionally filter by country/role)
#   GET /api/players/{id}/stats → fetch stats for a player (cached via CricAPI service)
# """

# from fastapi import APIRouter, Depends, HTTPException, Query
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy import select
# from typing import Optional, List

# from app.database import get_db
# from app.models.player import Player, PlayerStats
# from app.schemas.player import PlayerResponse, PlayerStatsResponse
# from app.services.cricapi_service import fetch_player_stats

# router = APIRouter(prefix="/api/players", tags=["Players"])


# @router.get("", response_model=List[PlayerResponse])
# async def list_players(
#     country: Optional[str] = Query(None, description="Filter by country name"),
#     role: Optional[str] = Query(None, description="Filter by role: batsman/bowler/allrounder/wicketkeeper"),
#     db: AsyncSession = Depends(get_db),
# ):
#     """
#     Return all active players from the DB.
#     Optionally filter by country and/or role.
#     """
#     query = select(Player).where(Player.is_active == True)

#     if country:
#         query = query.where(Player.country.ilike(f"%{country}%"))
#     if role:
#         query = query.where(Player.role.ilike(f"%{role}%"))

#     result = await db.execute(query)
#     players = result.scalars().all()
#     return players


# @router.get("/{player_id}/stats", response_model=PlayerStatsResponse)
# async def get_player_stats(
#     player_id: int,
#     format: str = Query("T20", description="Match format: T20/ODI/Test"),
#     db: AsyncSession = Depends(get_db),
# ):
#     """
#     Fetch stats for a single player in a given format.
#     Uses CricAPI service which checks the DB cache first (24-hour TTL).
#     """
#     # Verify the player exists
#     result = await db.execute(select(Player).where(Player.id == player_id))
#     player = result.scalar_one_or_none()

#     if not player:
#         raise HTTPException(status_code=404, detail=f"Player with id {player_id} not found.")

#     # Delegate to the caching service
#     stats = await fetch_player_stats(
#         player_id=player_id,
#         cricapi_id=player.cricapi_id,
#         format=format,
#         db=db,
#     )

#     if not stats:
#         raise HTTPException(
#             status_code=404,
#             detail=f"No stats found for player {player.name} in format {format}.",
#         )

#     return stats









from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from app.database import get_db
from app.models.player import Player
from app.schemas.player import PlayerResponse

router = APIRouter(prefix="/api/players", tags=["Players"])

@router.get("", response_model=List[PlayerResponse])
async def list_players(
    country: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Return all active players. Eagerly loads stats to avoid lazy-load errors."""
    query = (
        select(Player)
        .options(selectinload(Player.stats))   # ← eager load, fixes MissingGreenlet
        .where(Player.is_active == True)
    )
    if country:
        query = query.where(Player.country.ilike(f"%{country}%"))
    if role:
        query = query.where(Player.role.ilike(f"%{role}%"))

    result = await db.execute(query)
    return result.scalars().all()