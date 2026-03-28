"""
Table: escalation_rules
STANDALONE CONFIG TABLE — NO foreign keys to any other table.
"""

from sqlalchemy import (
    Column, Integer, String, Index, func,
)
from sqlalchemy.dialects.postgresql import ENUM, TIMESTAMP, INTERVAL

from app.db.base import Base
from app.core.enums import Priority


class EscalationRule(Base):
    __tablename__ = "escalation_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    priority = Column(
        ENUM(Priority, name="priority_enum", create_type=True),
        nullable=False,
    )
    max_call_attempts = Column(Integer, nullable=False)
    max_time_without_response = Column(INTERVAL, nullable=False)
    escalate_to_role = Column(String(50), nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False,
    )

    # ── NO RELATIONSHIPS — standalone config table ───────

    __table_args__ = (
        Index("idx_escalation_rules_priority", "priority"),
    )

    def __repr__(self):
        return f"<EscalationRule(id={self.id}, priority={self.priority})>"