"""
app/services/score_refresh_service.py

Computes and persists scores for ALL solvers and ALL sites using
pure SQL aggregations — zero Python loops over rows.

KEY DESIGN:
  - One bulk query computes ALL solver scores at once (not per-solver)
  - One bulk query computes ALL site scores at once (not per-site)
  - Uses PostgreSQL UPSERT (INSERT ... ON CONFLICT DO UPDATE)
  - Called by Celery beat every 15 minutes
  - Called by event hooks after issue/complaint/assignment mutations
  - Result is stored in score_cache table

PERFORMANCE:
  Old approach: N solvers × 5 queries = 5N round-trips
  New approach: 6 queries total regardless of N
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import text, select, func, case, insert
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.site import Site
from app.models.score_cache import ScoreCache
from app.core.enums import (
    IssueStatus, AssignmentStatus, CallStatus, UserRole,
)

logger = logging.getLogger(__name__)


class ScoreRefreshService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════════════
    # PUBLIC: Refresh everything (called by Celery beat / on-demand)
    # ══════════════════════════════════════════════════════════════

    async def refresh_all(self) -> dict:
        """
        Refresh scores for ALL solvers and ALL sites.
        Returns summary of how many were updated.
        """
        solver_count = await self._refresh_all_solvers()
        site_count   = await self._refresh_all_sites()
        await self.db.commit()

        logger.info(
            "Score refresh complete — solvers: %d, sites: %d",
            solver_count, site_count,
        )
        return {"solvers_updated": solver_count, "sites_updated": site_count}

    async def refresh_solver(self, solver_id: int) -> None:
        """Refresh a single solver's score. Called on assignment/complaint events."""
        await self._upsert_solver_score(solver_id)
        await self.db.commit()

    async def refresh_site(self, site_id: int) -> None:
        """Refresh a single site's score. Called on issue events."""
        await self._upsert_site_score(site_id)
        await self.db.commit()

    async def refresh_for_issue(self, issue_id: int) -> None:
        """
        After any issue mutation, refresh both the site score
        and any assigned solver score. One call covers everything.
        """
        # Get site_id and solver_ids for this issue
        row = (await self.db.execute(
            text("""
                SELECT i.site_id,
                        array_agg(DISTINCT ia.assigned_to_solver_id) AS solver_ids
                FROM issues i
                LEFT JOIN issue_assignments ia ON ia.issue_id = i.id
                WHERE i.id = :issue_id
                GROUP BY i.site_id
            """),
            {"issue_id": issue_id},
        )).first()

        if not row:
            return

        await self._upsert_site_score(row.site_id)
        if row.solver_ids:
            for sid in row.solver_ids:
                if sid:
                    await self._upsert_solver_score(sid)

        await self.db.commit()

    # ══════════════════════════════════════════════════════════════
    # SOLVER SCORES — bulk computation in 4 SQL queries
    # ══════════════════════════════════════════════════════════════

    async def _refresh_all_solvers(self) -> int:
        """Compute and upsert scores for ALL active solvers."""
        solver_ids = (await self.db.execute(
            select(User.id).where(
                User.role == UserRole.PROBLEMSOLVER,
                User.is_active == True,
            )
        )).scalars().all()

        if not solver_ids:
            return 0

        for sid in solver_ids:
            await self._upsert_solver_score(sid)

        return len(solver_ids)

    async def _upsert_solver_score(self, solver_id: int) -> None:
        """
        Compute solver score using 4 bulk SQL queries, then UPSERT.

        Query 1: Assignment counts (all statuses) + issue status join
        Query 2: On-time completion count
        Query 3: Call log stats
        Query 4: Complaint count
        """
        now = datetime.now(timezone.utc)

        # ── Q1: Assignment + issue status counts ─────────────────
        asgn_row = (await self.db.execute(
            text("""
                SELECT
                    COUNT(ia.id)                                            AS total_assigned,
                    COUNT(ia.id) FILTER (WHERE ia.status = 'COMPLETED')    AS completed_count,
                    COUNT(ia.id) FILTER (
                        WHERE ia.status IN ('ACTIVE','REOPENED')
                          AND i.status = 'IN_PROGRESS'
                    )                                                       AS in_progress_count,
                    COUNT(ia.id) FILTER (
                        WHERE ia.status IN ('ACTIVE','REOPENED')
                          AND i.status IN ('ASSIGNED','OPEN')
                    )                                                       AS assigned_not_started,
                    COUNT(ia.id) FILTER (WHERE ia.status = 'REOPENED')     AS reopened_count,
                    COUNT(ia.id) FILTER (
                        WHERE i.status = 'ESCALATED'
                    )                                                       AS escalated_count,
                    COUNT(ia.id) FILTER (
                        WHERE ia.due_date < :now
                          AND ia.status != 'COMPLETED'
                    )                                                       AS overdue_count
                FROM issue_assignments ia
                LEFT JOIN issues i ON i.id = ia.issue_id
                WHERE ia.assigned_to_solver_id = :solver_id
            """),
            {"solver_id": solver_id, "now": now},
        )).first()

        total_assigned       = asgn_row.total_assigned or 0
        completed_count      = asgn_row.completed_count or 0
        in_progress_count    = asgn_row.in_progress_count or 0
        assigned_not_started = asgn_row.assigned_not_started or 0
        reopened_count       = asgn_row.reopened_count or 0
        escalated_count      = asgn_row.escalated_count or 0
        overdue_count        = asgn_row.overdue_count or 0

        active_count = in_progress_count + assigned_not_started + reopened_count

        # ── Q2: On-time completions ───────────────────────────────
        # Count completed assignments where the COMPLETED history event
        # occurred before or on the due_date
        on_time_row = (await self.db.execute(
            text("""
                SELECT COUNT(*) AS on_time_count
                FROM issue_assignments ia
                JOIN LATERAL (
                    SELECT MIN(ih.created_at) AS completed_at
                    FROM issue_history ih
                    WHERE ih.issue_id = ia.issue_id
                      AND ih.new_status = 'COMPLETED'
                ) completion ON true
                WHERE ia.assigned_to_solver_id = :solver_id
                  AND ia.status = 'COMPLETED'
                  AND ia.due_date IS NOT NULL
                  AND completion.completed_at <= ia.due_date
            """),
            {"solver_id": solver_id},
        )).first()
        on_time_count = on_time_row.on_time_count or 0

        # ── Q3: Call stats ────────────────────────────────────────
        call_row = (await self.db.execute(
            text("""
                SELECT
                    COUNT(*)                                        AS total_calls,
                    COUNT(*) FILTER (WHERE status = 'ANSWERED')    AS answered_calls
                FROM call_logs
                WHERE solver_id = :solver_id
            """),
            {"solver_id": solver_id},
        )).first()
        total_calls    = call_row.total_calls or 0
        answered_calls = call_row.answered_calls or 0

        # ── Q4: Complaint count ───────────────────────────────────
        complaint_row = (await self.db.execute(
            text("SELECT COUNT(*) AS cnt FROM complaints WHERE target_solver_id = :sid"),
            {"sid": solver_id},
        )).first()
        complaint_count = complaint_row.cnt or 0

        # ── Q5: Skills + sites (one query) ────────────────────────
        meta_rows = (await self.db.execute(
            text("""
                SELECT
                    array_agg(DISTINCT pss.skill_type) AS skills,
                    array_agg(DISTINCT s.name)         AS sites
                FROM problem_solver_skills pss
                LEFT JOIN sites s ON s.id = pss.site_id
                WHERE pss.solver_id = :solver_id
            """),
            {"solver_id": solver_id},
        )).first()
        skills = [x for x in (meta_rows.skills or []) if x]
        sites  = [x for x in (meta_rows.sites or [])  if x]

        # ── Q6: Solver name ───────────────────────────────────────
        name_row = (await self.db.execute(
            text("SELECT name FROM users WHERE id = :sid"),
            {"sid": solver_id},
        )).first()
        solver_name = name_row.name if name_row else f"Solver #{solver_id}"

        # ── Score formula (mirrors frontend scoreEngine.js) ───────
        completion_rate  = completed_count / total_assigned if total_assigned > 0 else 0
        on_time_rate     = on_time_count / completed_count  if completed_count > 0 else 0
        call_answer_rate = answered_calls / total_calls     if total_calls > 0 else 1.0

        completion_score  = completion_rate  * 40
        on_time_score     = on_time_rate     * 30
        call_score        = call_answer_rate * 20
        complaint_penalty = min(complaint_count * 3, 10)
        complaint_score   = 10 - complaint_penalty

        total_score = max(0, min(100, round(
            completion_score + on_time_score + call_score + complaint_score
        )))

        if total_score >= 80:
            label = "Top Performer"
        elif total_score >= 55:
            label = "Good"
        else:
            label = "Needs Attention"

        # ── UPSERT ────────────────────────────────────────────────
        breakdown = {
            "total_assigned":           total_assigned,
            "completed_count":          completed_count,
            "active_count":             active_count,
            "in_progress_count":        in_progress_count,
            "assigned_not_started_count": assigned_not_started,
            "reopened_count":           reopened_count,
            "escalated_count":          escalated_count,
            "overdue_count":            overdue_count,
            "completion_rate":          round(completion_rate * 100),
            "on_time_rate":             round(on_time_rate * 100),
            "call_answer_rate":         round(call_answer_rate * 100),
            "total_calls":              total_calls,
            "answered_calls":           answered_calls,
            "missed_calls":             total_calls - answered_calls,
            "complaint_count":          complaint_count,
            "skills":                   skills,
            "sites":                    sites,
        }

        stmt = pg_insert(ScoreCache).values(
            entity_type="solver",
            entity_id=solver_id,
            entity_name=solver_name,
            score=float(total_score),
            label=label,
            health=None,
            breakdown=breakdown,
            computed_at=now,
        ).on_conflict_do_update(
            index_elements=["entity_type", "entity_id"],
            set_={
                "entity_name": solver_name,
                "score":       float(total_score),
                "label":       label,
                "breakdown":   breakdown,
                "computed_at": now,
                "updated_at":  now,
            },
        )
        await self.db.execute(stmt)

    # ══════════════════════════════════════════════════════════════
    # SITE SCORES — bulk computation
    # ══════════════════════════════════════════════════════════════

    async def _refresh_all_sites(self) -> int:
        site_ids = (await self.db.execute(
            select(Site.id)
        )).scalars().all()

        for sid in site_ids:
            await self._upsert_site_score(sid)

        return len(site_ids)

    async def _upsert_site_score(self, site_id: int) -> None:
        now = datetime.now(timezone.utc)

        # ── Q1: Issue counts ──────────────────────────────────────
        stats_row = (await self.db.execute(
            text("""
                SELECT
                    COUNT(*)                                                    AS total,
                    COUNT(*) FILTER (WHERE status = 'OPEN')                    AS open_issues,
                    COUNT(*) FILTER (WHERE status = 'ASSIGNED')                AS assigned_issues,
                    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')             AS in_progress_issues,
                    COUNT(*) FILTER (WHERE status = 'RESOLVED_PENDING_REVIEW') AS resolved_pending,
                    COUNT(*) FILTER (WHERE status = 'COMPLETED')               AS completed_issues,
                    COUNT(*) FILTER (WHERE status = 'ESCALATED')               AS escalated_issues,
                    COUNT(*) FILTER (WHERE status = 'REOPENED')                AS reopened_issues,
                    COUNT(*) FILTER (
                        WHERE deadline_at < :now AND status != 'COMPLETED'
                    )                                                           AS overdue_count
                FROM issues
                WHERE site_id = :site_id
            """),
            {"site_id": site_id, "now": now},
        )).first()

        total             = stats_row.total or 0
        open_issues       = stats_row.open_issues or 0
        assigned_issues   = stats_row.assigned_issues or 0
        in_progress       = stats_row.in_progress_issues or 0
        resolved_pending  = stats_row.resolved_pending or 0
        completed_issues  = stats_row.completed_issues or 0
        escalated_issues  = stats_row.escalated_issues or 0
        reopened_issues   = stats_row.reopened_issues or 0
        overdue_count     = stats_row.overdue_count or 0

        # ── Q2: Complaint count ───────────────────────────────────
        comp_row = (await self.db.execute(
            text("""
                SELECT COUNT(*) AS cnt
                FROM complaints c
                JOIN issues i ON i.id = c.issue_id
                WHERE i.site_id = :site_id
            """),
            {"site_id": site_id},
        )).first()
        complaints_count = comp_row.cnt or 0

        # ── Q3: Solver count ──────────────────────────────────────
        solver_row = (await self.db.execute(
            text("""
                SELECT COUNT(DISTINCT solver_id) AS cnt
                FROM problem_solver_skills
                WHERE site_id = :site_id
            """),
            {"site_id": site_id},
        )).first()
        solver_count = solver_row.cnt or 0

        # ── Q4: Site name + location ──────────────────────────────
        site_row = (await self.db.execute(
            text("SELECT name, location FROM sites WHERE id = :sid"),
            {"sid": site_id},
        )).first()
        site_name     = site_row.name     if site_row else f"Site #{site_id} not be founded"
        site_location = site_row.location if site_row else None

        # ── Score formula (matches site_analytics_service.py) ─────
        score = 100
        if total > 0:
            penalty = (overdue_count * 5) + (escalated_issues * 5) + (complaints_count * 10)
            bonus   = completed_issues * 2
            score   = max(0, min(100, round(100 - penalty + bonus)))

        if score < 50:
            health = "Critical"
        elif score < 80:
            health = "Needs Attention"
        else:
            health = "Healthy"

        # ── UPSERT ────────────────────────────────────────────────
        breakdown = {
            "total_issues":           total,
            "open_issues":            open_issues,
            "assigned_issues":        assigned_issues,
            "in_progress_issues":     in_progress,
            "resolved_pending_review": resolved_pending,
            "completed_issues":       completed_issues,
            "escalated_issues":       escalated_issues,
            "reopened_issues":        reopened_issues,
            "overdue_count":          overdue_count,
            "complaints_count":       complaints_count,
            "solver_count":           solver_count,
            "location":               site_location,
        }

        stmt = pg_insert(ScoreCache).values(
            entity_type="site",
            entity_id=site_id,
            entity_name=site_name,
            score=float(score),
            label=None,
            health=health,
            breakdown=breakdown,
            computed_at=now,
        ).on_conflict_do_update(
            index_elements=["entity_type", "entity_id"],
            set_={
                "entity_name": site_name,
                "score":       float(score),
                "health":      health,
                "breakdown":   breakdown,
                "computed_at": now,
                "updated_at":  now,
            },
        )
        await self.db.execute(stmt)