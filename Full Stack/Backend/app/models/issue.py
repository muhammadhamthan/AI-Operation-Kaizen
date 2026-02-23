"""
Table: issues
"""

from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Index,
    ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import ENUM, TIMESTAMP
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.core.enums import Priority, IssueStatus


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, autoincrement=True)
    site_id = Column(
        Integer, ForeignKey("sites.id", ondelete="RESTRICT"), nullable=False,
    )
    raised_by_supervisor_id = Column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False,
    )
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(
        ENUM(Priority, name="priority_enum", create_type=True),
        default=Priority.MEDIUM, nullable=False,
    )
    deadline_at = Column(TIMESTAMP(timezone=True), nullable=True)
    status = Column(
        ENUM(IssueStatus, name="issue_status_enum", create_type=True),
        default=IssueStatus.OPEN, nullable=False,
    )
    track_status = Column(String(100), nullable=True)
    latitude = Column(Numeric(precision=10, scale=8), nullable=True)
    longitude = Column(Numeric(precision=11, scale=8), nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False,
    )

    # ── Relationships ────────────────────────────────────
    site = relationship("Site", back_populates="issues", lazy="selectin")

    raised_by_supervisor = relationship(
        "User", back_populates="raised_issues",
        foreign_keys=[raised_by_supervisor_id], lazy="selectin",
    )

    assignments = relationship(
        "IssueAssignment", back_populates="issue", lazy="selectin",
        order_by="IssueAssignment.created_at.desc()",
    )

    images = relationship(
        "IssueImage", back_populates="issue", lazy="selectin",
        order_by="IssueImage.created_at",
    )

    complaints = relationship("Complaint", back_populates="issue", lazy="dynamic")

    history = relationship(
        "IssueHistory", back_populates="issue", lazy="dynamic",
        order_by="IssueHistory.created_at",
    )

    chat_messages = relationship("ChatHistory", back_populates="issue", lazy="dynamic")

    # THIS MUST POINT TO "Escalation" (events table)
    # NOT "EscalationRule" (config table)
    escalations = relationship("Escalation", back_populates="issue", lazy="dynamic")

    __table_args__ = (
        Index("idx_issues_status", "status"),
        Index("idx_issues_priority", "priority"),
        Index("idx_issues_site", "site_id"),
        Index("idx_issues_supervisor", "raised_by_supervisor_id"),
        Index("idx_issues_deadline", "deadline_at"),
    )

    def __repr__(self):
        return f"<Issue(id={self.id}, title='{self.title}', status={self.status})>"