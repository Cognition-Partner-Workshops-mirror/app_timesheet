"""
CareAI Database Module
Handles database connection, session management, and base model configuration
using SQLAlchemy async engine. Supports PostgreSQL (primary) and SQLite (fallback).
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.config import settings

# Determine connection pool strategy based on database type
# PostgreSQL uses connection pooling; SQLite uses NullPool
engine_kwargs = {
    "echo": settings.DEBUG,
    "future": True,
}

# Use NullPool for SQLite to avoid threading issues
if settings.USE_SQLITE:
    engine_kwargs["poolclass"] = NullPool
else:
    # PostgreSQL connection pool settings for production performance
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_timeout"] = 30
    engine_kwargs["pool_recycle"] = 1800  # Recycle connections every 30 minutes

# Create async engine using the effective database URL (PostgreSQL or SQLite)
engine = create_async_engine(
    settings.effective_database_url,
    **engine_kwargs,
)

# Session factory for creating database sessions
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


async def get_db():
    """Dependency injection for database sessions in FastAPI routes."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables from ORM models.
    Creates all tables defined in Base.metadata if they don't exist.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Dispose of database engine connections on shutdown."""
    await engine.dispose()
