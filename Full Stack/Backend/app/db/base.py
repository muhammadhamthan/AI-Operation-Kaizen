from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.
    Every model inherits from this so Alembic can auto-detect tables.
    """
    pass