"""
Table: sites
Stores facility locations with GPS coordinates.
"""

from sqlalchemy import (
    Column, Integer, String, Numeric, Index,
    func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import relationship

from app.db.base import Base


class Site(Base):
    __tablename__ = "sites"

    # ── Columns ──────────────────────────────────────────
    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    name = Column(
        String(100),
        nullable=False,
        comment="Site identification name",
    )
    location = Column(
        String(200),
        nullable=True,
        comment="Human-readable address",
    )
    latitude = Column(
        Numeric(precision=10, scale=8),
        nullable=True,
        comment="GPS latitude for location matching",
    )
    longitude = Column(
        Numeric(precision=11, scale=8),
        nullable=True,
        comment="GPS longitude for location matching",
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ────────────────────────────────────
    # Supervisors managing this site (many-to-many)
    supervisors = relationship(
        "User",
        secondary="supervisor_sites",
        back_populates="supervised_sites",
        lazy="selectin",
    )

    # Issues reported at this site
    issues = relationship(
        "Issue",
        back_populates="site",
        lazy="dynamic",
    )

    # Solver skills linked to this site
    solver_skills = relationship(
        "ProblemSolverSkill",
        back_populates="site",
        lazy="dynamic",
    )

    # ── Indexes ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_sites_location", "location"),
        Index("idx_sites_name", "name"),
    )

    #which help us to print the object values instead of numbers
    def __repr__(self) -> str:
        return f"<Site(id={self.id}, name='{self.name}')>"
