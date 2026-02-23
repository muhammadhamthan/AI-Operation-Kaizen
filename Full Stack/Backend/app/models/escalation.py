"""
Table: escalations
EVENT LOG — records when escalations actually happen.
HAS foreign keys to issues and issue_assignments.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Index,
    ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP, INTERVAL
from sqlalchemy.orm import relationship

from app.db.base import Base


class Escalation(Base):
    __tablename__ = "escalations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    issue_id = Column(
        Integer, ForeignKey("issues.id", ondelete="CASCADE"), nullable=False,
    )
    assignment_id = Column(
        Integer, ForeignKey("issue_assignments.id", ondelete="SET NULL"),
        nullable=True,
    )
    escalation_type = Column(String(30), nullable=False)
    escalated_to_role = Column(String(20), nullable=False)
    escalated_by_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    reason = Column(Text, nullable=False)
    total_missed_calls = Column(Integer, nullable=True)
    time_elapsed_without_response = Column(INTERVAL, nullable=True)
    notification_sent = Column(Boolean, default=False, nullable=False)
    notification_sent_at = Column(TIMESTAMP(timezone=True), nullable=True)
    resolved = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False,
    )

    # ── Relationships ────────────────────────────────────
    issue = relationship("Issue", back_populates="escalations", lazy="selectin")
    assignment = relationship("IssueAssignment", back_populates="escalations", lazy="selectin")
    escalated_by_user = relationship("User", lazy="selectin")

    __table_args__ = (
        Index("idx_escalations_issue", "issue_id"),
        Index("idx_escalations_type", "escalation_type"),
        Index("idx_escalations_resolved", "resolved"),
        Index("idx_escalations_created", "created_at"),
    )

    def __repr__(self):
        return f"<Escalation(id={self.id}, issue_id={self.issue_id}, type={self.escalation_type})>"