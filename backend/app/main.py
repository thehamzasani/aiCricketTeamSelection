"""
FastAPI application entry point.
- Configures CORS for frontend access
- Registers all API routers
- Startup event: verifies DB connectivity and creates tables if needed
- Health check endpoint at GET /
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.routers import players, squads, selection, history

# ── Optional: import all models here so SQLAlchemy registers them before create_all ──
from app.models import player, squad, venue, selection as selection_model  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    On startup: create all DB tables (safe — skips existing tables).
    On shutdown: dispose DB connection pool.
    """
    async with engine.begin() as conn:
        # Creates tables that don't exist yet — safe to run on every startup
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables verified / created.")
    yield
    await engine.dispose()
    print("🛑 Database connection pool closed.")


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CricketAI — Team Selection API",
    description="AI-powered cricket team selection backend using FastAPI, PostgreSQL, CricAPI, and Google Gemini.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url ,          # e.g. http://localhost:5173
        "https://*.vercel.app",         # deployed Vercel previews
        "https://cricketai.vercel.app", # your production Vercel URL (update this)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(players.router)
app.include_router(squads.router)
app.include_router(selection.router)
app.include_router(history.router)

# ── Venue router (inline — simple enough to not need its own file) ────────────
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.venue import Venue
from fastapi import APIRouter

venue_router = APIRouter(prefix="/api/venues", tags=["Venues"])

@venue_router.get("")
async def list_venues(db: AsyncSession = Depends(get_db)):
    """Return all venues from the DB."""
    result = await db.execute(select(Venue).order_by(Venue.country, Venue.name))
    venues = result.scalars().all()
    return venues

@venue_router.get("/{venue_id}")
async def get_venue(venue_id: int, db: AsyncSession = Depends(get_db)):
    """Return a single venue by ID."""
    result = await db.execute(select(Venue).where(Venue.id == venue_id))
    venue = result.scalar_one_or_none()
    if not venue:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Venue {venue_id} not found.")
    return venue

app.include_router(venue_router)

# ── Admin / Dev endpoints ──────────────────────────────────────────────────────
from fastapi import BackgroundTasks

admin_router = APIRouter(prefix="/api/admin", tags=["Admin"])

@admin_router.post("/seed")
async def seed_database(db: AsyncSession = Depends(get_db)):
    """
    Seed the database with initial squads and venues.
    Run once in development. Safe to call multiple times (uses upsert logic in seed script).
    """
    from app.seed.seed_data import run_seed
    await run_seed(db)
    return {"message": "✅ Database seeded successfully."}

@admin_router.post("/precache/{team_name}")
async def precache_team_stats(
    team_name: str,
    background_tasks: BackgroundTasks,
    format: str = "T20",
    db: AsyncSession = Depends(get_db),
):
    """
    Pre-cache CricAPI stats for all players in a squad.
    Runs as a background task — returns immediately.
    Use this the night before a demo to warm the cache.
    """
    from app.models.squad import Squad
    from app.services.cricapi_service import fetch_player_stats

    result = await db.execute(
        select(player.Player)
        .join(Squad, Squad.player_id == player.Player.id)
        .where(Squad.team_name.ilike(team_name))
    )
    players_list = result.scalars().all()

    async def _cache_all():
        for p in players_list:
            try:
                await fetch_player_stats(p.id, p.cricapi_id, format, db)
            except Exception as e:
                print(f"⚠️  Pre-cache failed for {p.name}: {e}")

    background_tasks.add_task(_cache_all)
    return {
        "message": f"🔄 Pre-caching {len(players_list)} players for {team_name} ({format}) in background."
    }

app.include_router(admin_router)

# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    """Health check — confirms API is running."""
    return {
        "status": "✅ CricketAI API is running",
        "version": "1.0.0",
        "docs": "/docs",
    }