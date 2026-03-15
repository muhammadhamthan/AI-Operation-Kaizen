from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

# ── URL construction ─────────────────────────────────────
SYNC_DATABASE_URL  = settings.DATABASE_URL.replace("+asyncpg", "")
ASYNC_DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# ── Sync engine (Alembic + Celery tasks) ─────────────────
engine = create_engine(
    SYNC_DATABASE_URL,
    pool_pre_ping=True,      # ← must be on engine, not sessionmaker
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,
    pool_timeout=30,
    echo=True,
)

# ── Async engine (FastAPI requests) ──────────────────────
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_pre_ping=True,      # ← must be on engine, not sessionmaker
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,       # recycle every 30 min (before provider closes them)
    pool_timeout=30,
    echo=True,              # set True only when debugging SQL
)

# ── Session factories ─────────────────────────────────────
# sessionmaker only accepts session-level config, NOT pool config
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

AsyncSessionLocal = async_sessionmaker(   # use async_sessionmaker, not sessionmaker
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# ── FastAPI dependency ────────────────────────────────────
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


















# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker
# from typing import Generator

# from app.core.config import settings

# # ── Engine ───────────────────────────────────────────────
# # pool_pre_ping=True ensures stale connections are recycled
# engine = create_engine(
#     settings.DATABASE_URL,
#     pool_pre_ping=True,
#     pool_size=20,
#     max_overflow=10,
#     echo=settings.SQL_ECHO,          # True in dev, False in prod
# )

# # ── Session Factory ──────────────────────────────────────
# SessionLocal = sessionmaker(
#     bind=engine,
#     autocommit=False,
#     autoflush=False,
# )


# # ── FastAPI Dependency ───────────────────────────────────
# def get_db() -> Generator:
#     """
#     Yields a database session per request.
#     Automatically closes when the request finishes.
#     Usage:  db: Session = Depends(get_db)
#     """
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()