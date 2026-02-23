"""
Table: issue_history
Audit trail tracking every status change and action on an issue.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Index, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import ENUM, TIMESTAMP
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.core.enums import ActionType


class IssueHistory(Base):
    __tablename__ = "issue_history"

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
    changed_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who made the change (NULL for system actions)",
    )
    old_status = Column(
        String(50),
        nullable=True,
        comment="Previous status (NULL for creation)",
    )
    new_status = Column(
        String(50),
        nullable=True,
        comment="New status after the action",
    )
    action_type = Column(
        ENUM(ActionType, name="action_type_enum", create_type=True),
        nullable=False,
        comment="ASSIGN | UPDATE | COMPLETE | REOPEN | COMPLAINT",
    )
    details = Column(
        Text,
        nullable=True,
        comment="Human-readable description of what happened",
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
        back_populates="history",
        lazy="selectin",
    )
    changed_by_user = relationship(
        "User",
        back_populates="history_entries",
        lazy="selectin",
    )

    # ── Indexes ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_issue_history_issue", "issue_id"),
        Index("idx_issue_history_user", "changed_by_user_id"),
        Index("idx_issue_history_action", "action_type"),
    )

    def __repr__(self) -> str:
        return (
            f"<IssueHistory(id={self.id}, issue_id={self.issue_id}, "
            f"action={self.action_type}, {self.old_status} → {self.new_status})>"
        )