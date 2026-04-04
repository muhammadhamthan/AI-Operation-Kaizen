"""
app/services/solver_performance_service.py  — OPTIMIZED v2

NOW READS FROM score_cache TABLE INSTEAD OF COMPUTING ON-THE-FLY.

Latency: was ~500ms-2s per solver (N queries) → now ~5ms total (single SELECT)

Falls back to live computation if cache is empty/stale (e.g. first boot).
"""


"""

SO NOW THERE ARE ONE PROBLEM SO FAR I FOUND IT 
ONE IS WHEN EVER THE UPDATE IN DB IT SHOULD IMMEDIATELY UPDATE INTO THE DASHBOARD / RELEVENT SCREEN , 
IT IS HAPPENING IN _enqueue_solver_refresh THIS FUNCTION AND 
WHEN EVER THE CREATE ISSUE OR ANY UPDATES IN THE DATA IT SHOULD TIGGER A IMMEDIATE CHAGE INTO RELEVENT SCREEN RIUGHT AND ALSO INSTEAD OF ALL() use cursor pagination?
"""


import logging
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.models.user import User
from app.models.score_cache import ScoreCache
from app.models.problem_solver_skill import ProblemSolverSkill
from app.models.supervisor_site import SupervisorSite
from app.core.enums import UserRole
from app.schemas.solver_performance_schema import (
    SolverPerformanceDetail,
    SolverWithPerformance,
    SolverPerformanceListResponse,
    SolverListItem,
)

logger = logging.getLogger(__name__)

# Cache is considered stale after 30 minutes — triggers live recompute fallback
CACHE_STALE_MINUTES = 10


class SolverPerformanceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════════════
    # MAIN: Get all solvers with performance (role-filtered)
    # Single DB query + cache read. Was: N×5 queries.
    # ══════════════════════════════════════════════════════════════

    async def get_solvers_with_performance(
        self, current_user: User
    ) -> SolverPerformanceListResponse:

        solver_ids = await self._get_visible_solver_ids(current_user)
        if not solver_ids:
            return SolverPerformanceListResponse(total=0, solvers=[])

        # ── Single query: solver rows + cache rows ───────────────
        # JOIN users with score_cache in one round-trip
        rows = (await self.db.execute(
            text("""
                SELECT
                    u.id, u.name, u.phone, u.email, u.role, u.is_active,
                    sc.score, sc.label, sc.computed_at
                FROM users u
                LEFT JOIN score_cache sc
                    ON sc.entity_type = 'solver' AND sc.entity_id = u.id
                WHERE u.id = ANY(:ids)
                ORDER BY sc.score DESC NULLS LAST
            """),
            {"ids": list(solver_ids)},
        )).all() 

        stale_ids = []
        results = []
        
         # HERE USED LOGIC IS Stale-While-Revalidate (SWR)
        for row in rows:
            is_stale  = (
                row.computed_at is None
                or (datetime.now(timezone.utc) - row.computed_at)
                   >= timedelta(minutes=CACHE_STALE_MINUTES)
            )
            if is_stale:
                stale_ids.append(row.id)

            results.append(self._row_to_list_schema(row))

        # Background refresh for stale entries (fire-and-forget)
        if stale_ids:
            self._enqueue_solver_refresh(stale_ids)

        return SolverPerformanceListResponse(
            total=len(results),
            solvers=results,
        )

    # ══════════════════════════════════════════════════════════════
    # SINGLE SOLVER DETAIL
    # ══════════════════════════════════════════════════════════════

    async def get_solver_performance(
        self, solver_id: int
    ) -> Optional[SolverWithPerformance]:

        row = (await self.db.execute(
            text("""
                SELECT
                    u.id, u.name, u.phone, u.email, u.role, u.is_active,
                    sc.score, sc.label, sc.breakdown, sc.computed_at
                FROM users u
                LEFT JOIN score_cache sc
                    ON sc.entity_type = 'solver' AND sc.entity_id = u.id
                WHERE u.id = :solver_id
                  AND u.role = 'problemsolver'
            """),
            {"solver_id": solver_id},
        )).first()

        if not row:
            return None

        breakdown = row.breakdown or {}

        # If cache is empty or stale, compute live and persist
        if not breakdown or row.computed_at is None:
            logger.info(
                "Score cache empty for solver #%s — computing live", solver_id
            )
            from app.services.score_refresh import ScoreRefreshService
            await ScoreRefreshService(self.db).refresh_solver(solver_id)
            # Re-fetch after refresh
            row = (await self.db.execute(
                text("""
                    SELECT
                        u.id, u.name, u.phone, u.email, u.role, u.is_active,
                        sc.score, sc.label, sc.breakdown, sc.computed_at
                    FROM users u
                    LEFT JOIN score_cache sc
                        ON sc.entity_type = 'solver' AND sc.entity_id = u.id
                    WHERE u.id = :solver_id
                """),
                {"solver_id": solver_id},
            )).first()
            breakdown = row.breakdown or {}

        return self._row_to_schema(row, breakdown)

    # ══════════════════════════════════════════════════════════════
    # PRIVATE: Build response schema from cache row
    # ══════════════════════════════════════════════════════════════

    @staticmethod
    def _row_to_schema(row, breakdown: dict) -> SolverWithPerformance:
        perf = SolverPerformanceDetail(
            solver_id=row.id,
            score=int(row.score or 0),
            label=row.label or "Evaluating",
            label_color=(
                "#10a37f" if (row.score or 0) >= 80
                else "#f59e0b" if (row.score or 0) >= 55
                else "#ef4444"
            ),
            total_assigned           = breakdown.get("total_assigned", 0),
            completed_count          = breakdown.get("completed_count", 0),
            active_count             = breakdown.get("active_count", 0),
            in_progress_count        = breakdown.get("in_progress_count", 0),
            assigned_not_started_count = breakdown.get("assigned_not_started_count", 0),
            reopened_count           = breakdown.get("reopened_count", 0),
            escalated_count          = breakdown.get("escalated_count", 0),
            overdue_count            = breakdown.get("overdue_count", 0),
            completion_rate          = breakdown.get("completion_rate", 0),
            on_time_rate             = breakdown.get("on_time_rate", 0),
            call_answer_rate         = breakdown.get("call_answer_rate", 0),
            total_calls              = breakdown.get("total_calls", 0),
            answered_calls           = breakdown.get("answered_calls", 0),
            missed_calls             = breakdown.get("missed_calls", 0),
            complaint_count          = breakdown.get("complaint_count", 0),
        )
        return SolverWithPerformance(
            id=row.id,
            name=row.name,
            phone=row.phone,
            email=row.email,
            role=row.role if isinstance(row.role, str) else row.role.value,
            is_active=row.is_active,
            performance=perf,
            sites=breakdown.get("sites", []),
            skills=breakdown.get("skills", []),
        )
        
        
    @staticmethod
    def _row_to_list_schema(row) -> SolverListItem:
        score = int(row.score or 0)
        return SolverListItem(
            id=row.id,
            name=row.name,
            phone=row.phone,
            email=row.email,
            role=row.role if isinstance(row.role, str) else row.role.value,
            is_active=row.is_active,
            score=score,
            label=row.label or "Evaluating",
            label_color=(
                "#10a37f" if score >= 80
                else "#f59e0b" if score >= 55
                else "#ef4444"
            ),
        )    
    

    # ══════════════════════════════════════════════════════════════
    # PRIVATE: Role-based solver ID list (no full User objects)
    # ══════════════════════════════════════════════════════════════

    async def _get_visible_solver_ids(self, user: User) -> list[int]:
        if user.role == UserRole.MANAGER:
            return (await self.db.execute(
                select(User.id).where(
                    User.role == UserRole.PROBLEMSOLVER,
                    User.is_active == True,
                )
            )).scalars().all()

        if user.role == UserRole.SUPERVISOR:
            site_ids = (await self.db.execute(
                select(SupervisorSite.c.site_id).where(
                    SupervisorSite.c.supervisor_id == user.id
                )
            )).scalars().all()
            if not site_ids:
                return []
            return (await self.db.execute(
                select(ProblemSolverSkill.solver_id)
                .where(ProblemSolverSkill.site_id.in_(site_ids))
                .distinct()
            )).scalars().all()

        if user.role == UserRole.PROBLEMSOLVER:
            return [user.id]

        return []

    @staticmethod
    def _enqueue_solver_refresh(solver_ids: list[int]) -> None:
        try:
            from app.workers.score_task import trigger_solver_score_refresh
            for sid in solver_ids:
                trigger_solver_score_refresh.delay(sid)
        except Exception:
            logger.exception("Failed to enqueue score refresh for solvers %s", solver_ids)
            
            
            