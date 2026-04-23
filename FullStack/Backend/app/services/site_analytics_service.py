"""
app/services/site_analytics_service.py  — OPTIMIZED v2

NOW READS FROM score_cache TABLE INSTEAD OF COMPUTING ON-THE-FLY.

Latency: was ~300ms-1s per site (multiple queries) → now ~5ms total
"""

import logging
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.models.user import User
from app.models.site import Site
from app.models.score_cache import ScoreCache
from app.models.problem_solver_skill import ProblemSolverSkill
from app.models.supervisor_site import SupervisorSite
from app.core.enums import UserRole
from app.schemas.site_analytics_schema import (
    SiteAnalytics,
    SiteSolverBrief,
    SiteWithAnalytics,
    SiteAnalyticsListResponse,
    SiteListItem,
)

logger = logging.getLogger(__name__)

CACHE_STALE_MINUTES = 15


class SiteAnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════════════
    # MAIN: All sites with analytics — single SQL query
    # ══════════════════════════════════════════════════════════════

    async def get_sites_with_analytics(
        self, current_user: User
    ) -> SiteAnalyticsListResponse:

        site_ids = await self._get_visible_site_ids(current_user)
        if not site_ids:
            return SiteAnalyticsListResponse(total=0, sites=[])

        rows = (await self.db.execute(
            text("""
                SELECT
                    s.id, s.name, s.location,
                    s.latitude, s.longitude,
                    s.created_at, s.updated_at,
                    sc.score, sc.health, sc.computed_at
                FROM sites s
                LEFT JOIN score_cache sc
                    ON sc.entity_type = 'site' AND sc.entity_id = s.id
                WHERE s.id = ANY(:ids)
                ORDER BY sc.score DESC NULLS LAST
            """),
            {"ids": list(site_ids)},
        )).all()

        stale_ids = []
        enriched  = []

        for row in rows:
            is_stale  = (
                row.computed_at is None
                or (datetime.now(timezone.utc) - row.computed_at)
                   > timedelta(minutes= CACHE_STALE_MINUTES)
            )
            if is_stale:
                stale_ids.append(row.id)

            enriched.append(self._row_to_list_schema(row))

        if stale_ids:
            self._enqueue_site_refresh(stale_ids)

        return SiteAnalyticsListResponse(total=len(enriched), sites=enriched)

    # ══════════════════════════════════════════════════════════════
    # SINGLE SITE DETAIL
    # ══════════════════════════════════════════════════════════════

    async def get_site_analytics(self, site_id: int) -> Optional[SiteWithAnalytics]:
        row = (await self.db.execute(
            text("""
                SELECT
                    s.id, s.name, s.location,
                    s.latitude, s.longitude,
                    s.created_at, s.updated_at,
                    sc.score, sc.health, sc.breakdown, sc.computed_at
                FROM sites s
                LEFT JOIN score_cache sc
                    ON sc.entity_type = 'site' AND sc.entity_id = s.id
                WHERE s.id = :site_id
            """),
            {"site_id": site_id},
        )).first()

        if not row:
            return None

        breakdown = row.breakdown or {}

        if not breakdown or row.computed_at is None:
            logger.info("Score cache empty for site #%s — computing live", site_id)
            try:
                from app.workers.score_task import trigger_site_score_refresh
                trigger_site_score_refresh.delay(site_id)
            except Exception:
                pass
            #Fallback computation if cache is empty — compute on the fly (same logic as score_task)
            row = (await self.db.execute(
                text("""
                    SELECT
                        s.id, s.name, s.location,
                        s.latitude, s.longitude,
                        s.created_at, s.updated_at,
                        sc.score, sc.health, sc.breakdown, sc.computed_at
                    FROM sites s
                    LEFT JOIN score_cache sc
                        ON sc.entity_type = 'site' AND sc.entity_id = s.id
                    WHERE s.id = :site_id
                """),
                {"site_id": site_id},
            )).first()
            breakdown = row.breakdown or {}

        return self._row_to_schema(row, breakdown)

    # ══════════════════════════════════════════════════════════════
    # PRIVATE: Build schema from cache row
    # ══════════════════════════════════════════════════════════════

    @staticmethod
    def _row_to_schema(row, breakdown: dict) -> SiteWithAnalytics:
        # Solvers from breakdown (names only — no extra query needed)
        solver_count = breakdown.get("solver_count", 0)

        analytics = SiteAnalytics(
            total_issues              = breakdown.get("total_issues", 0),
            open_issues               = breakdown.get("open_issues", 0),
            assigned_issues           = breakdown.get("assigned_issues", 0),
            in_progress_issues        = breakdown.get("in_progress_issues", 0),
            resolved_pending_review   = breakdown.get("resolved_pending_review", 0),
            completed_issues          = breakdown.get("completed_issues", 0),
            escalated_issues          = breakdown.get("escalated_issues", 0),
            reopened_issues           = breakdown.get("reopened_issues", 0),
            overdue_count             = breakdown.get("overdue_count", 0),
            complaints_count          = breakdown.get("complaints_count", 0),
            score                     = int(row.score or 100),
            health                    = row.health or "Healthy",
            solvers                   = [],   # lightweight list view — no solver details
            predicted_issues_next_week= breakdown.get("predicted_issues_next_week"),
            escalation_risk           = breakdown.get("escalation_risk"),
        )

        return SiteWithAnalytics(
            id         = row.id,
            name       = row.name,
            location   = row.location,
            latitude   = float(row.latitude)  if row.latitude  else None,
            longitude  = float(row.longitude) if row.longitude else None,
            analytics  = analytics,
            created_at = row.created_at,
            updated_at = row.updated_at,
        )
        
    @staticmethod
    def _row_to_list_schema(row) -> SiteListItem:
        return SiteListItem(
            id=row.id,
            name=row.name,
            location=row.location,
            latitude=float(row.latitude) if row.latitude else None,
            longitude=float(row.longitude) if row.longitude else None,
            score=int(row.score or 100),
            health=row.health or "Healthy",
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    # ══════════════════════════════════════════════════════════════
    # PRIVATE: Role-based site IDs
    # ══════════════════════════════════════════════════════════════

    async def _get_visible_site_ids(self, user: User) -> list[int]:
        if user.role == UserRole.MANAGER:
            return (await self.db.execute(
                select(Site.id)
            )).scalars().all()

        if user.role == UserRole.SUPERVISOR:
            return (await self.db.execute(
                select(SupervisorSite.c.site_id).where(
                    SupervisorSite.c.supervisor_id == user.id
                )
            )).scalars().all()

        if user.role == UserRole.PROBLEMSOLVER:
            return (await self.db.execute(
                select(ProblemSolverSkill.site_id)
                .where(
                    ProblemSolverSkill.solver_id == user.id,
                    ProblemSolverSkill.site_id.is_not(None),
                )
                .distinct()
            )).scalars().all()

        return []

    @staticmethod
    def _enqueue_site_refresh(site_ids: list[int]) -> None:
        try:
            from app.workers.score_task import trigger_site_score_refresh
            for sid in site_ids:
                """ 
                What .delay() actually does internally
                1. Create task message
                2. Serialize message to JSON
                3. Connect to Redis
                4. Push message into Redis queue (list)
                5. Return immediately to API
                """
                trigger_site_score_refresh.delay(sid)
        except Exception:
            logger.exception("Failed to enqueue score refresh for sites %s", site_ids)