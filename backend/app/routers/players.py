"""
routers/players.py
------------------
GET    /api/players                          → list all active players
POST   /api/players                          → create a new player
PUT    /api/players/{player_id}              → update player info
DELETE /api/players/{player_id}              → soft delete
GET    /api/players/{player_id}/stats        → fetch stats from DB
POST   /api/players/{player_id}/stats        → upsert stats for a format
POST   /api/players/{player_id}/assign-squad → assign to a squad
POST   /api/players/{player_id}/upload-image → save image to local static folder
"""

import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.player import Player, PlayerStats
from app.models.squad import Squad
from app.schemas.player import (
    PlayerCreate,
    PlayerResponse,
    PlayerStatsResponse,
    PlayerStatsUpsert,
    PlayerUpdate,
    SquadAssign,
)

router = APIRouter(prefix="/api/players", tags=["Players"])

# ---------------------------------------------------------------------------
# Image upload config
# ---------------------------------------------------------------------------

# Absolute path to backend/static/player_images/
IMAGES_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "static", "player_images"
)
os.makedirs(IMAGES_DIR, exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


# ---------------------------------------------------------------------------
# Scoring helper
# ---------------------------------------------------------------------------

def _quick_score(player: Player, stats) -> float:
    """Lightweight scoring for list views — T20/balanced defaults."""
    if not stats:
        return 0.0
    score = 0.0
    if stats.batting_avg:
        score += min(float(stats.batting_avg) * 0.5, 20.0)
    if stats.strike_rate:
        score += min(max((float(stats.strike_rate) - 100) * 0.15, 0), 15.0)
    if stats.wickets_total:
        score += min(float(stats.wickets_total) * 0.10, 10.0)
    if stats.bowling_economy:
        score += min(max((10 - float(stats.bowling_economy)) * 2, 0), 15.0)
    if stats.recent_form:
        weights = [0.35, 0.25, 0.20, 0.12, 0.08]
        form = stats.recent_form[:5]
        w = weights[: len(form)]
        ws = sum(w)
        form_score = sum(r * (wi / ws) for r, wi in zip(form, w))
        score += min(form_score / 10, 20.0)
    return min(score, 100.0)


def _build_player_response(p: Player) -> PlayerResponse:
    """Build PlayerResponse from ORM object (stats must be eagerly loaded)."""
    stats_map = {s.format: s for s in (p.stats or [])}
    active_stats = (
        stats_map.get("T20")
        or stats_map.get("ODI")
        or stats_map.get("Test")
    )
    return PlayerResponse(
        id=p.id,
        name=p.name,
        country=p.country,
        role=p.role,
        batting_style=p.batting_style,
        bowling_style=p.bowling_style,
        cricapi_id=p.cricapi_id,
        image_url=p.image_url,
        is_active=p.is_active,
        overall_score=round(_quick_score(p, active_stats), 1),
        stats=[PlayerStatsResponse.model_validate(s) for s in (p.stats or [])],
    )


# ---------------------------------------------------------------------------
# GET /api/players
# ---------------------------------------------------------------------------

@router.get("", response_model=List[PlayerResponse])
async def list_players(
    country: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Return all active players with stats and computed overall_score."""
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
    return [_build_player_response(p) for p in result.scalars().all()]


# ---------------------------------------------------------------------------
# POST /api/players
# ---------------------------------------------------------------------------

@router.post("", response_model=PlayerResponse, status_code=201)
async def create_player(
    payload: PlayerCreate,
    db: AsyncSession = Depends(get_db),
):
    """Insert a new player row."""
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
    await db.flush()
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
# PUT /api/players/{player_id}
# ---------------------------------------------------------------------------

@router.put("/{player_id}", response_model=PlayerResponse)
async def update_player(
    player_id: int,
    payload: PlayerUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Partially update a player's profile fields."""
    result = await db.execute(
        select(Player)
        .options(selectinload(Player.stats))
        .where(Player.id == player_id)
    )
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(player, field, value)

    await db.flush()
    await db.refresh(player)
    return _build_player_response(player)


# ---------------------------------------------------------------------------
# DELETE /api/players/{player_id}
# ---------------------------------------------------------------------------

@router.delete("/{player_id}", status_code=200)
async def delete_player(
    player_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete by setting is_active = False."""
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found.")

    player.is_active = False
    await db.flush()
    return {"message": f"Player '{player.name}' deactivated successfully."}


# ---------------------------------------------------------------------------
# GET /api/players/{player_id}/stats
# ---------------------------------------------------------------------------

@router.get("/{player_id}/stats", response_model=PlayerStatsResponse)
async def get_player_stats(
    player_id: int,
    format: str = Query("T20"),
    db: AsyncSession = Depends(get_db),
):
    """Fetch stats for a single player in a given format from the DB."""
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found.")

    stats_result = await db.execute(
        select(PlayerStats).where(
            and_(PlayerStats.player_id == player_id, PlayerStats.format == format)
        )
    )
    stats = stats_result.scalar_one_or_none()
    if not stats:
        raise HTTPException(
            status_code=404,
            detail=f"No {format} stats found for {player.name}. Add stats manually.",
        )
    return PlayerStatsResponse.model_validate(stats)


# ---------------------------------------------------------------------------
# POST /api/players/{player_id}/stats
# ---------------------------------------------------------------------------

@router.post("/{player_id}/stats", response_model=PlayerStatsResponse, status_code=200)
async def upsert_player_stats(
    player_id: int,
    payload: PlayerStatsUpsert,
    db: AsyncSession = Depends(get_db),
):
    """Create or update stats for a player in a specific format."""
    player_result = await db.execute(select(Player).where(Player.id == player_id))
    if not player_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found.")

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
        for field, value in payload.model_dump(exclude={"format"}).items():
            if value is not None:
                setattr(stats, field, value)
        stats.last_updated = datetime.utcnow()
    else:
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
# POST /api/players/{player_id}/assign-squad
# ---------------------------------------------------------------------------

@router.post("/{player_id}/assign-squad", status_code=200)
async def assign_to_squad(
    player_id: int,
    payload: SquadAssign,
    db: AsyncSession = Depends(get_db),
):
    """Assign a player to a named squad (idempotent)."""
    player_result = await db.execute(select(Player).where(Player.id == player_id))
    player = player_result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found.")

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

    db.add(Squad(
        team_name=payload.team_name.strip(),
        player_id=player_id,
        squad_type=payload.squad_type or "all_format",
    ))
    await db.flush()
    return {
        "message": f"'{player.name}' added to {payload.team_name} squad.",
        "player_id": player_id,
        "team_name": payload.team_name,
    }


# ---------------------------------------------------------------------------
# POST /api/players/{player_id}/upload-image
# ---------------------------------------------------------------------------

@router.post("/{player_id}/upload-image", status_code=200)
async def upload_player_image(
    player_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Save a player photo to backend/static/player_images/ and update
    the player's image_url in the DB with the public URL path.

    Frontend accesses the image at:
      http://localhost:8000/static/player_images/{filename}

    Accepts: JPEG, PNG, WebP — max 5 MB.
    """

    # Verify player exists
    result = await db.execute(select(Player).where(Player.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail=f"Player {player_id} not found.")

    # Validate file type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, WebP.",
        )

    # Read and validate size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(file_bytes) / 1024 / 1024:.1f} MB). Max 5 MB.",
        )

    # Generate unique filename — keeps old files from clashing
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    filename = f"player_{player_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(IMAGES_DIR, filename)

    # Delete old image file if it exists (keep folder clean)
    if player.image_url:
        try:
            old_filename = player.image_url.split("/")[-1]
            old_path = os.path.join(IMAGES_DIR, old_filename)
            if os.path.exists(old_path):
                os.remove(old_path)
        except Exception:
            pass  # Non-critical — continue even if old file deletion fails

    # Save new file to disk
    try:
        with open(filepath, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save image file: {str(e)}",
        )

    # Build the public URL the frontend will use to fetch the image
    # In dev:  http://localhost:8000/static/player_images/player_1_abc123.jpg
    # In prod: https://your-railway-app.up.railway.app/static/player_images/...
    image_url = f"/static/player_images/{filename}"

    # Update image_url in DB
    player.image_url = image_url
    await db.flush()
    await db.refresh(player)

    return {
        "message": f"Image uploaded successfully for {player.name}.",
        "image_url": image_url,
        "player_id": player_id,
    }