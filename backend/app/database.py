"""
database.py — SQLAlchemy async engine, session factory, and Base model.
Connects to Supabase PostgreSQL using asyncpg driver.
PgBouncer-compatible: statement_cache_size=0 + NullPool.
"""
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.config import get_settings

settings = get_settings()


def _build_async_url(url: str) -> str:
    """Transform sync PostgreSQL URL to async asyncpg URL."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


ASYNC_DATABASE_URL = _build_async_url(settings.database_url)

# Create the async engine — NullPool + statement_cache_size=0 required for PgBouncer
engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=settings.environment == "development",
    poolclass=NullPool,          # Let PgBouncer manage the pool, not SQLAlchemy
    connect_args={
        "statement_cache_size": 0,          # Disable asyncpg prepared statement cache
        "prepared_statement_cache_size": 0, # Belt-and-suspenders for older asyncpg
    },
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
    Called on app startup. In production, prefer running schema.sql directly on Supabase.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)