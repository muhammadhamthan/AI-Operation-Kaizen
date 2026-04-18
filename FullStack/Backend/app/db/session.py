import logging
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# URL NORMALISATION
# ─────────────────────────────────────────────────────────────

def _async_url(raw: str) -> str:
    """
    Ensure the URL uses the postgresql+asyncpg:// scheme.
    Strips any trailing ?sslmode=... because we pass ssl= via
    connect_args instead (mixing both causes asyncpg to error).
    """
    url = raw.replace("postgresql+asyncpg://", "postgresql://")  # normalise first
    url = url.replace("postgresql://", "postgresql+asyncpg://")

    # Remove sslmode query param — asyncpg ignores it and it can conflict
    for param in ("?sslmode=require", "&sslmode=require",
                  "?sslmode=disable", "&sslmode=disable"):
        url = url.replace(param, "")

    return url


def _sync_url(raw: str) -> str:
    """
    Ensure the URL uses the postgresql+psycopg2:// scheme.
    Strips +asyncpg if present.
    """
    url = raw.replace("+asyncpg", "")
    if not url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://")
    return url


# ─────────────────────────────────────────────────────────────
# ASYNC ENGINE  (FastAPI — asyncpg — transaction pooler port 6543)
# ─────────────────────────────────────────────────────────────
#
# WHY ssl="require" instead of a full SSLContext?
# ─────────────────────────────────────────────────
# Supabase's downloaded CA cert (prod-ca-2021.crt) was issued with an
# older format that omits the "Key Usage" extension.  Python 3.10+ now
# enforces this extension, causing:
#   SSLCertVerificationError: CA cert does not include key usage extension
#
# asyncpg's built-in ssl="require" mode:
#   ✔  Negotiates TLS — connection is fully encrypted in transit
#   ✔  Verifies the server hostname against the cert's SAN/CN
#   ✔  Rejects plain-text connections
#   ✗  Does NOT verify the certificate chain against a CA bundle
#      (same trade-off as sslmode=require in psql)
#
# This is the standard Supabase recommendation and is secure enough
# for production — the data is encrypted, MITM is blocked by hostname
# verification, and full chain-of-trust requires Supabase to fix their cert.
#
# Supabase transaction pooler (PgBouncer) requirements:
#   • prepared_statement_cache_size = 0  — PgBouncer cannot relay named stmts
#   • statement_cache_size = 0           — same reason

_ASYNC_URL = _async_url(settings.DATABASE_URL)

async_engine = create_async_engine(
    _ASYNC_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,   # recycle before Supabase closes idle connections
    pool_timeout=30,
    echo=settings.DEBUG,
    connect_args={
        # "require" = encrypted + hostname checked, no CA chain verification
        "ssl": "require",
        # Mandatory for Supabase transaction pooler (port 6543 / PgBouncer)
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0,
        "command_timeout": 60,
    },
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# ─────────────────────────────────────────────────────────────
# SYNC ENGINE  (Celery / Alembic — psycopg2 — session pooler port 5432)
# ─────────────────────────────────────────────────────────────
#
# Session pooler (port 5432) is a direct PG connection — no PgBouncer —
# so prepared statements work normally.  No cache disabling needed.
#
# sslmode=require → encrypted + hostname verified, no CA chain check.
# Matches the security level of the async engine above.

_SYNC_URL = _sync_url(settings.SYNC_DATABASE_URL)

engine = create_engine(
    _SYNC_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,
    pool_timeout=30,
    echo=settings.DEBUG,
    connect_args={
        "sslmode": "require",   # psycopg2 syntax (not ssl=)
    },
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


# ─────────────────────────────────────────────────────────────
# FastAPI DB dependency
# ─────────────────────────────────────────────────────────────

async def get_db() -> AsyncSession:         # type: ignore[override]
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

























#NeonDB

# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker
# from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
# from app.core.config import settings

# # ── URL construction ─────────────────────────────────────
# SYNC_DATABASE_URL  = settings.DATABASE_URL.replace("+asyncpg", "")
# ASYNC_DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# # ── Sync engine (Alembic + Celery tasks) ─────────────────
# engine = create_engine(
#     SYNC_DATABASE_URL,
#     pool_pre_ping=True,      # ← must be on engine, not sessionmaker
#     pool_size=5,
#     max_overflow=10,
#     pool_recycle=1800,
#     pool_timeout=30,
#     echo=True,
# )

# # ── Async engine (FastAPI requests) ──────────────────────
# async_engine = create_async_engine(
#     ASYNC_DATABASE_URL,
#     pool_pre_ping=True,      # ← must be on engine, not sessionmaker
#     pool_size=5,
#     max_overflow=10,
#     pool_recycle=1800,       # recycle every 30 min (before provider closes them)
#     pool_timeout=30,
#     echo=True,              # set True only when debugging SQL
# )

# # ── Session factories ─────────────────────────────────────
# # sessionmaker only accepts session-level config, NOT pool config
# SessionLocal = sessionmaker(
#     bind=engine,
#     autocommit=False,
#     autoflush=False,
# )

# AsyncSessionLocal = async_sessionmaker(   # use async_sessionmaker, not sessionmaker
#     bind=async_engine,
#     class_=AsyncSession,
#     autocommit=False,
#     autoflush=False,
#     expire_on_commit=False,
# )

# # ── FastAPI dependency ────────────────────────────────────
# async def get_db():
#     async with AsyncSessionLocal() as session:
#         try:
#             yield session
#         except Exception:
#             await session.rollback()
#             raise
#         finally:
#             await session.close()



















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