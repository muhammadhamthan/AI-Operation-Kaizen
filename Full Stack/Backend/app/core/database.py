# from sqlalchemy import create_engine
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker
# from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
# from core.config import settings

# # Sync engine (for Alembic migrations)
# SYNC_DATABASE_URL = settings.DATABASE_URL
# engine = create_engine(SYNC_DATABASE_URL)

# # Async engine (for FastAPI)
# ASYNC_DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
# async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=True)

# # Session factories
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# AsyncSessionLocal = sessionmaker(
#     bind=async_engine,
#     class_=AsyncSession,
#     autocommit=False,
#     autoflush=False,
#     expire_on_commit=False,
# )

# # Base class for models
# Base = declarative_base()

# # Dependency to get DB session
# async def get_db():
#     async with AsyncSessionLocal() as session:
#         try:
#             yield session
#             await session.commit()
#         except Exception:
#             await session.rollback()
#             raise
#         finally:
#             await session.close()
