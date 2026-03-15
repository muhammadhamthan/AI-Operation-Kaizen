"""
Table: chat_sessions
Each row = one conversation session (like ChatGPT sidebar items).
A session contains multiple chat_history messages.
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, Index, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import relationship

from app.db.base import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="Owner of this conversation session",
    )

    title = Column(
        String(200),
        nullable=False,
        default="New Chat",
        comment="Auto-generated from first user message",
    )

    # Optional: link session to an issue context
    issue_id = Column(
        Integer,
        ForeignKey("issues.id", ondelete="SET NULL"),
        nullable=True,
        comment="If this session is about a specific issue",
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="False = archived/deleted session",
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
    user = relationship("User", back_populates="chat_sessions", lazy="selectin")
    messages = relationship(
        "ChatHistory",
        back_populates="session",
        lazy="dynamic",
        order_by="ChatHistory.created_at.asc()",
    )
    issue = relationship("Issue", lazy="selectin")

    # ── Indexes ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_chat_sessions_user", "user_id"),
        Index("idx_chat_sessions_updated", "updated_at"),
        Index("idx_chat_sessions_active", "is_active"),
    )

    def __repr__(self):
        return f"<ChatSession(id={self.id}, user_id={self.user_id}, title='{self.title}')>"