"""
Table: problem_solver_skills
Maps solvers → skills → sites with priority scoring.
NULL site_id means the solver works across ALL sites.
Used by the smart matching algorithm in Stage 2.
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, Index, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import relationship

from app.db.base import Base


class ProblemSolverSkill(Base):
    __tablename__ = "problem_solver_skills"

    # ── Columns ──────────────────────────────────────────
    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    solver_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="The problem solver",
    )
    skill_type = Column(
        String(50),
        nullable=False,
        comment="plumber, electrician, hvac, carpentry, painting, network, mechanical, etc.",
    )
    site_id = Column(
        Integer,
        ForeignKey("sites.id", ondelete="SET NULL"),
        nullable=True,
        comment="NULL = works at all sites",
    )
    priority = Column(
        Integer,
        default=1,
        nullable=False,
        comment="1-10 scale, higher = preferred solver for this skill+site",
    )
    is_available = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="FALSE when solver is on leave or unavailable",
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
    solver = relationship(
        "User",
        back_populates="skills",
        lazy="selectin",
    )
    site = relationship(
        "Site",
        back_populates="solver_skills",
        lazy="selectin",
    )

    # ── Indexes ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_solver_skills_skill", "skill_type"),
        Index("idx_solver_skills_site", "site_id"),
        Index("idx_solver_skills_solver", "solver_id"),
        Index("idx_solver_skills_skill_site", "skill_type", "site_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<ProblemSolverSkill(id={self.id}, solver_id={self.solver_id}, "
            f"skill='{self.skill_type}', site_id={self.site_id}, "
            f"priority={self.priority})>"
        )