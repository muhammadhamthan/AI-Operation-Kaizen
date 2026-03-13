"""
Table: chat_history
Stores all chat messages: USER (supervisor/solver), AI (Groq responses),
and SYSTEM (escalation alerts, assignment notifications).
"""

from sqlalchemy import (
    Column, Integer, Text, Index, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import ENUM, TIMESTAMP, JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.core.enums import ChatRole


class ChatHistory(Base):
    __tablename__ = "chat_history"

    # ── Columns ──────────────────────────────────────────
    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    # ── Link to session ─────────────────────────────
    session_id = Column(
        Integer,
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),# CASCADE , If the parent row is deleted, automatically delete all related child rows.
        nullable=True,
        comment="Which conversation session this message belongs to",
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="NULL for SYSTEM or AI messages",
    )
    issue_id = Column(
        Integer,
        ForeignKey("issues.id", ondelete="SET NULL"),
        nullable=True,
        comment="NULL for general chat not tied to an issue",
    )
    role_in_chat = Column(
        ENUM(ChatRole, name="chat_role_enum", create_type=True),
        nullable=False,
        comment="USER | AI | SYSTEM",
    )
    message = Column(
        Text,
        nullable=False,
        comment="Message content",
    )
    attachments = Column(
        JSONB,
        default=[],
        nullable=False,
        comment='Array of file URLs: ["s3://bucket/photo.jpg"]',
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
    user = relationship(
        "User",
        back_populates="chat_messages",
        lazy="selectin",
    )
    issue = relationship(
        "Issue",
        back_populates="chat_messages",
        lazy="selectin",
    )
    session = relationship("ChatSession", back_populates="messages", lazy="selectin")

    # ── Indexes ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_chat_issue", "issue_id"),
        Index("idx_chat_user", "user_id"),
        Index("idx_chat_created", created_at.desc()),
    )

    def __repr__(self) -> str:
        preview = self.message[:40] if self.message else ""
        return (
            f"<ChatHistory(id={self.id}, role={self.role_in_chat}, "
            f"msg='{preview}...')>"
        )