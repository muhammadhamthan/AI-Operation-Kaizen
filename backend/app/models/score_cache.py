"""
app/models/score_cache.py

Materialized score table — stores pre-computed performance scores
for both solvers and sites. Refreshed by:
  1. Celery beat task every 15 minutes
  2. Event-driven refresh on issue/complaint/assignment change
  3. On-demand refresh via API

WHY THIS EXISTS:
  - SQL agent (LangChain) cannot run Python functions
  - Score computation is too heavy for real-time per-request calculation
  - Dashboard loads instantly — reads from this table, not from 4+ queries
  - Chatbot can do: "SELECT score FROM score_cache WHERE entity_type='solver' AND entity_id=3"
"""

from sqlalchemy import (
    Column, Integer, String, Float, JSON, Index, func,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from app.db.base import Base


class ScoreCache(Base):
    __tablename__ = "score_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)

    entity_type = Column(
        String(20),
        nullable=False,
        comment="'solver' or 'site'",
    )
    entity_id = Column(
        Integer,
        nullable=False,
        comment="user.id for solver, site.id for site",
    )
    entity_name = Column(
        String(100),
        nullable=True,
        comment="Denormalized name for fast chatbot display",
    )

    # ── Core score ─────────────────────────────────────────────
    score = Column(Float, nullable=False, default=0.0)
    label = Column(String(30), nullable=True)       # "Top Performer" / "Healthy"
    health = Column(String(30), nullable=True)       # site health label

    # ── Detailed breakdown (stored as JSON for chatbot queries) ─
    breakdown = Column(
        JSON,
        nullable=False,
        default=dict,
        comment="Full metric breakdown — chatbot can read individual fields",
    )
    # breakdown shape for SOLVER:
    # {
    #   "total_assigned": 12,
    #   "completed_count": 9,
    #   "active_count": 3,
    #   "reopened_count": 1,
    #   "escalated_count": 0,
    #   "overdue_count": 1,
    #   "completion_rate": 75,
    #   "on_time_rate": 67,
    #   "call_answer_rate": 90,
    #   "total_calls": 10,
    #   "answered_calls": 9,
    #   "missed_calls": 1,
    #   "complaint_count": 0,
    #   "skills": ["plumbing", "hvac"],
    #   "sites": ["Vepery Site", "Anna Nagar"]
    # }

    # breakdown shape for SITE:
    # {
    #   "total_issues": 20,
    #   "open_issues": 3,
    #   "assigned_issues": 4,
    #   "in_progress_issues": 2,
    #   "resolved_pending_review": 1,
    #   "completed_issues": 8,
    #   "escalated_issues": 1,
    #   "reopened_issues": 1,
    #   "overdue_count": 2,
    #   "complaints_count": 3,
    #   "solver_count": 4,
    #   "location": "Vepery, Chennai"
    # }

    computed_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="When this score was last computed",
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        # Unique: one row per entity
        Index(
            "uix_score_cache_entity",
            "entity_type", "entity_id",
            unique=True,
        ),
        Index("idx_score_cache_type", "entity_type"),
        Index("idx_score_cache_score", "score"),
        Index("idx_score_cache_computed", "computed_at"),
    )

    def __repr__(self):
        return (
            f"<ScoreCache({self.entity_type} #{self.entity_id} "
            f"'{self.entity_name}' score={self.score})>"
        )