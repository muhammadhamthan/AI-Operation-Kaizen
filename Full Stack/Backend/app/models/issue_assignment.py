"""
Table: issue_assignments
"""

from sqlalchemy import (
    Column, Integer, Index, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import ENUM, TIMESTAMP
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.core.enums import AssignmentStatus


class IssueAssignment(Base):
    __tablename__ = "issue_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    issue_id = Column(
        Integer, ForeignKey("issues.id", ondelete="CASCADE"), nullable=False,
    )
    assigned_to_solver_id = Column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False,
    )
    assigned_by_supervisor_id = Column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False,
    )
    due_date = Column(TIMESTAMP(timezone=True), nullable=True)
    status = Column(
        ENUM(AssignmentStatus, name="assignment_status_enum", create_type=True),
        default=AssignmentStatus.ACTIVE, nullable=False,
    )
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False,
    )

    # ── Relationships ────────────────────────────────────
    issue = relationship("Issue", back_populates="assignments", lazy="selectin")

    assigned_solver = relationship(
        "User", back_populates="solver_assignments",
        foreign_keys=[assigned_to_solver_id], lazy="selectin",
    )

    assigned_by_supervisor = relationship(
        "User", back_populates="created_assignments",
        foreign_keys=[assigned_by_supervisor_id], lazy="selectin",
    )

    call_logs = relationship(
        "CallLog", back_populates="assignment", lazy="selectin",
        order_by="CallLog.attempt_number",
    )

    complaints = relationship("Complaint", back_populates="assignment", lazy="dynamic")

    # THIS MUST POINT TO "Escalation" (events table)
    # NOT "EscalationRule" (config table)
    escalations = relationship("Escalation", back_populates="assignment", lazy="dynamic")

    __table_args__ = (
        Index("idx_assignments_issue", "issue_id"),
        Index("idx_assignments_solver", "assigned_to_solver_id"),
        Index("idx_assignments_status", "status"),
        Index("idx_assignments_due_date", "due_date"),
    )

    def __repr__(self):
        return f"<IssueAssignment(id={self.id}, issue_id={self.issue_id}, status={self.status})>"