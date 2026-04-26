"""
database.py — SQLAlchemy async engine, session factory, and Base model.
Connects to Supabase PostgreSQL using asyncpg driver.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# Convert standard postgres:// URL to asyncpg-compatible postgresql+asyncpg://
def _build_async_url(url: str) -> str:
    """Transform sync PostgreSQL URL to async asyncpg URL."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


ASYNC_DATABASE_URL = _build_async_url(settings.database_url)

# Create the async engine
engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=settings.environment == "development",  # log SQL in dev
    pool_pre_ping=True,                           # verify connections before use
    pool_size=10,
    max_overflow=20,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    """Declarative base class for all SQLAlchemy ORM models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides an async DB session.
    Yields a session and guarantees it is closed after the request.

    Usage:
        @router.get("/example")
        async def endpoint(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_all_tables():
    """
    Create all tables defined via ORM models.
    Called on app startup in development. In production, use schema.sql on Supabase.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)