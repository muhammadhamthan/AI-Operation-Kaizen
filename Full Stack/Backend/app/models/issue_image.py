"""
Table: issue_images
Stores BEFORE and AFTER photos as SEPARATE rows (never same row).
BEFORE = supervisor uploads when creating issue.
AFTER  = solver uploads when completing repair.
AI vision verification updates ai_flag and ai_details.
"""

from sqlalchemy import (
    Column, Integer, String, Index, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import ENUM, TIMESTAMP, JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.core.enums import ImageType, AIFlag


class IssueImage(Base):
    __tablename__ = "issue_images"

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
        comment="Which issue this image belongs to",
    )
    uploaded_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        comment="Supervisor (BEFORE) or solver (AFTER)",
    )
    image_url = Column(
        String(500),
        nullable=False,
        comment="ImageKit CDN URL",
    )
    image_type = Column(
        ENUM(ImageType, name="image_type_enum", create_type=True),
        default=ImageType.AFTER,
        nullable=False,
        comment="BEFORE = initial problem photo, AFTER = completion photo",
    )
    ai_flag = Column(
        ENUM(AIFlag, name="ai_flag_enum", create_type=True),
        default=AIFlag.NOT_CHECKED,
        nullable=False,
        comment="OK | SUSPECT | NOT_CHECKED — AI verification result",
    )
    ai_details = Column(
        JSONB,
        default={},
        nullable=True,
        comment='AI analysis: {"confidence": 0.92, "leak_detected": false}',
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
    # Parent issue
    issue = relationship(
        "Issue",
        back_populates="images",
        lazy="selectin",
    )

    # User who uploaded
    uploaded_by_user = relationship(
        "User",
        back_populates="uploaded_images",
        lazy="selectin",
    )

    # ── Indexes ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_issue_images_issue", "issue_id"),
        Index("idx_issue_images_type", "image_type"),
        Index("idx_issue_images_flag", "ai_flag"),
        Index("idx_issue_images_user", "uploaded_by_user_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<IssueImage(id={self.id}, issue_id={self.issue_id}, "
            f"type={self.image_type}, ai_flag={self.ai_flag})>"
        )