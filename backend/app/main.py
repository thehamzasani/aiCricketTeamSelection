"""
main.py — FastAPI application entry point.
Serves static player images from backend/static/player_images/
"""
from contextlib import asynccontextmanager
import os

from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import engine, get_db
from app.routers import history, players, selection, squads
from app.models import player, squad, venue  # noqa: F401
from app.models import selection as selection_model  # noqa: F401
from app.models.venue import Venue

# Ensure the static images folder exists on startup
IMAGES_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "player_images")
os.makedirs(IMAGES_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("✅ CricketAI API starting up.")
    yield
    await engine.dispose()
    print("🛑 Database connection pool closed.")


app = FastAPI(
    title="CricketAI — Team Selection API",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Static files — serves /static/player_images/filename.jpg
# ---------------------------------------------------------------------------
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "https://*.vercel.app",
        "https://cricketai.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Core routers
# ---------------------------------------------------------------------------
app.include_router(players.router)
app.include_router(squads.router)
app.include_router(selection.router)
app.include_router(history.router)

# ---------------------------------------------------------------------------
# Venues router (inline)
# ---------------------------------------------------------------------------
venue_router = APIRouter(prefix="/api/venues", tags=["Venues"])


@venue_router.get("")
async def list_venues(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Venue).order_by(Venue.country, Venue.name))
    return result.scalars().all()


@venue_router.get("/{venue_id}")
async def get_venue(venue_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Venue).where(Venue.id == venue_id))
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail=f"Venue {venue_id} not found.")
    return v


app.include_router(venue_router)

# ---------------------------------------------------------------------------
# Admin router
# ---------------------------------------------------------------------------
admin_router = APIRouter(prefix="/api/admin", tags=["Admin"])


@admin_router.post("/seed")
async def seed_database(db: AsyncSession = Depends(get_db)):
    from app.seed.seed_data import run_seed
    await run_seed(db)
    return {"message": "✅ Database seeded successfully."}


app.include_router(admin_router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "✅ CricketAI API is running",
        "version": "1.0.0",
        "docs": "/docs",
        "environment": settings.environment,
    }