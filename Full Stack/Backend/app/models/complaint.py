"""
Table: complaints
Raised by supervisors when solver's work is unsatisfactory.
Triggers issue REOPENING and re-calling of the solver.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Index, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import relationship

from app.db.base import Base


class Complaint(Base):
    __tablename__ = "complaints"

    # ── Columns ──────────────────────────────────────────
    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    issue_id = Column(
        Integer,
        ForeignKey("issues.id", ondelete="CASCADE"),
        nullable=False,
    )
    assignment_id = Column(
        Integer,
        ForeignKey("issue_assignments.id", ondelete="CASCADE"),
        nullable=False,
    )
    raised_by_supervisor_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Supervisor who filed the complaint",
    )
    target_solver_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Solver whose work is being contested",
    )
    complaint_details = Column(
        Text,
        nullable=False,
        comment="Description of what is wrong with the repair",
    )
    complaint_image_url = Column(
        String(500),
        nullable=True,
        comment="Optional evidence photo URL",
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
    issue = relationship(
        "Issue",
        back_populates="complaints",
        lazy="selectin",
    )
    assignment = relationship(
        "IssueAssignment",
        back_populates="complaints",
        lazy="selectin",
    )
    raised_by_supervisor = relationship(
        "User",
        back_populates="raised_complaints",
        foreign_keys=[raised_by_supervisor_id],
        lazy="selectin",
    )
    target_solver = relationship(
        "User",
        back_populates="complaints_against",
        foreign_keys=[target_solver_id],
        lazy="selectin",
    )

    # ── Indexes ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_complaints_issue", "issue_id"),
        Index("idx_complaints_assignment", "assignment_id"),
        Index("idx_complaints_solver", "target_solver_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<Complaint(id={self.id}, issue_id={self.issue_id}, "
            f"solver_id={self.target_solver_id})>"
        )