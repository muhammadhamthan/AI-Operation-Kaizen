from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.core.config import settings

# Sync engine (for Alembic migrations)
SYNC_DATABASE_URL = settings.DATABASE_URL
engine = create_engine(SYNC_DATABASE_URL)

# Async engine (for FastAPI)
ASYNC_DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=True)

# Session factories
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False, #Flase help we have a object state in memory even after commit , so no db reload needed
)

# Dependency to get DB session
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
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