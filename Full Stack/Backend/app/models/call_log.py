"""
Table: call_logs
Logs every Twilio call attempt to solvers.
Each retry gets a separate row with incrementing attempt_number.
Used for escalation checking (count MISSED, time since first call).
"""

from sqlalchemy import (
    Column, Integer, Index, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import ENUM, TIMESTAMP
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.core.enums import CallStatus


class CallLog(Base):
    __tablename__ = "call_logs"

    # ── Columns ──────────────────────────────────────────
    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    assignment_id = Column(
        Integer,
        ForeignKey("issue_assignments.id", ondelete="CASCADE"),
        nullable=False,
        comment="Links call to the specific assignment",
    )
    solver_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        comment="The problem solver who was called",
    )
    attempt_number = Column(
        Integer,
        default=1,
        nullable=False,
        comment="Retry sequence: 1, 2, 3...",
    )
    initiated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        comment="When the Twilio call was placed",
    )
    answered_at = Column(
        TIMESTAMP(timezone=True),
        nullable=True,
        comment="When solver picked up (NULL if missed)",
    )
    ended_at = Column(
        TIMESTAMP(timezone=True),
        nullable=True,
        comment="When call terminated (NULL if still ongoing)",
    )
    status = Column(
        ENUM(CallStatus, name="call_status_enum", create_type=True),
        nullable=False,
        comment="INITIATED | MISSED | ANSWERED",
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ────────────────────────────────────
    # Parent assignment
    assignment = relationship(
        "IssueAssignment",
        back_populates="call_logs",
        lazy="selectin",
    )

    # The solver who was called
    solver = relationship(
        "User",
        back_populates="call_logs",
        lazy="selectin",
    )

    # ── Indexes ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_call_logs_assignment", "assignment_id"),
        Index("idx_call_logs_solver", "solver_id"),
        Index("idx_call_logs_status", "status"),
        Index("idx_call_logs_initiated", "initiated_at"),
        Index("idx_call_logs_attempt", "attempt_number"),
    )

    def __repr__(self) -> str:
        return (
            f"<CallLog(id={self.id}, assignment_id={self.assignment_id}, "
            f"attempt={self.attempt_number}, status={self.status})>"
        )