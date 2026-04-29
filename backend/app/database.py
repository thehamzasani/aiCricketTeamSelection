"""
database.py — SQLAlchemy async engine, session factory, and Base model.
Connects to Supabase PostgreSQL via asyncpg.
Supabase uses PgBouncer in transaction mode — requires:
  1. statement_cache_size=0 in connect_args
  2. NullPool (no SQLAlchemy-side pooling)
  3. prepared_statement_cache_size=0
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
    """Transform sync PostgreSQL URL to asyncpg URL."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


ASYNC_DATABASE_URL = _build_async_url(settings.database_url)

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=settings.environment == "development",
    poolclass=NullPool,
    connect_args={
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0,
    },
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()