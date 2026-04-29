"""
History router — retrieves past AI selection records.
Endpoints:
  GET /api/history          → paginated list of all past selections
  GET /api/history/{id}     → full detail for a single selection
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional

from app.database import get_db
from app.models.selection import Selection
from app.models.venue import Venue
from app.schemas.selection import SelectionDetail, SelectionHistoryItem

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("", response_model=List[SelectionHistoryItem])
async def list_history(
    team: Optional[str] = Query(None, description="Filter by team name"),
    format: Optional[str] = Query(None, description="Filter by format: T20/ODI/Test"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Return a paginated list of past selections, newest first.
    Supports optional filtering by team name and format.
    """
    query = (
        select(Selection)
        .order_by(desc(Selection.created_at))
        .limit(limit)
        .offset(offset)
    )
    if team:
        query = query.where(Selection.team_name.ilike(f"%{team}%"))
    if format:
        query = query.where(Selection.format == format.upper())

    result = await db.execute(query)
    selections = result.scalars().all()

    # Manually serialize so we can extract 'captain' from the JSONB selected_xi
    items = []
    for s in selections:
        # Pull captain info out of the stored JSONB selected_xi list
        captain_info = None
        if s.selected_xi:
            captain_entry = next(
                (p for p in s.selected_xi if p.get("is_captain")), None
            )
            if captain_entry:
                captain_info = {
                    "player_id": captain_entry["player_id"],
                    "name": captain_entry["name"],
                }

        items.append({
            "id": s.id,
            "format": s.format,
            "team_name": s.team_name,
            "opposition": s.opposition,
            "pitch_type": s.pitch_type,
            "weather": s.weather,
            "toss_decision": s.toss_decision,
            "captain": captain_info,
            "created_at": s.created_at,
        })

    return items


@router.get("/{selection_id}", response_model=SelectionDetail)
async def get_selection_detail(
    selection_id: int, db: AsyncSession = Depends(get_db)
):
    """
    Return full detail for a single past selection, including AI analysis,
    batting order, bowling plan, and venue info.
    """
    result = await db.execute(
        select(Selection).where(Selection.id == selection_id)
    )
    selection = result.scalar_one_or_none()

    if not selection:
        raise HTTPException(
            status_code=404,
            detail=f"Selection with id {selection_id} not found.",
        )

    # Optionally attach venue info
    venue = None
    if selection.venue_id:
        venue_result = await db.execute(
            select(Venue).where(Venue.id == selection.venue_id)
        )
        venue = venue_result.scalar_one_or_none()

    # ✅ Key fix: return 'id' not 'selection_id' — matches SelectionDetail schema
    return {
        "id": selection.id,                    # ← was "selection_id", caused the 500
        "format": selection.format,
        "team_name": selection.team_name,
        "opposition": selection.opposition,
        "venue_id": selection.venue_id,
        "venue": {
            "id": venue.id,
            "name": venue.name,
            "city": venue.city,
            "country": venue.country,
        } if venue else None,
        "pitch_type": selection.pitch_type,
        "weather": selection.weather,
        "toss_decision": selection.toss_decision,
        "selected_xi": selection.selected_xi or [],
        "batting_order": selection.batting_order or [],
        "bowling_combination": selection.bowling_combination or [],
        "captain_id": selection.captain_id,
        "vice_captain_id": selection.vice_captain_id,
        "ai_analysis": selection.ai_analysis,
        "ai_strategy": selection.ai_strategy,
        "created_at": selection.created_at,
    }