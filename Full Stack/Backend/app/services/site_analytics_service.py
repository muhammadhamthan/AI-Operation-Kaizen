"""
PURPOSE: Compute site analytics on the backend.
Replaces frontend computeSiteAnalytics() entirely.
All data comes from PostgreSQL — no mock data.
"""

import logging
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sql_func , select , case

from app.models.user import User
from app.models.site import Site
from app.models.issue import Issue
from app.models.issue_assignment import IssueAssignment
from app.models.complaint import Complaint
from app.models.problem_solver_skill import ProblemSolverSkill
from app.models.supervisor_site import SupervisorSite
from app.core.enums import IssueStatus, AssignmentStatus, UserRole
from app.schemas.site_analytics_schema import (
    SiteAnalytics,
    SiteSolverBrief,
    SiteWithAnalytics,
    SiteAnalyticsListResponse,
)

logger = logging.getLogger(__name__)


class SiteAnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════
    # MAIN: Get all sites with analytics (role-filtered)
    # ══════════════════════════════════════════════════════

    async def get_sites_with_analytics(
        self, current_user: User
    ) -> SiteAnalyticsListResponse:
        """
        Returns sites visible to this user + computed analytics.
        Replaces frontend fetchSitesWithAnalytics thunk.
        """
        sites = await self._get_visible_sites(current_user)

        enriched = []
        for site in sites:
            analytics = await self._compute_analytics(site.id)
            enriched.append(SiteWithAnalytics(
                id=site.id,
                name=site.name,
                location=site.location,
                latitude=float(site.latitude) if site.latitude else None,
                longitude=float(site.longitude) if site.longitude else None,
                analytics=analytics,
                created_at=site.created_at,
                updated_at=site.updated_at,
            ))

        return SiteAnalyticsListResponse(
            total=len(enriched),
            sites=enriched,
        )

    # ══════════════════════════════════════════════════════
    # SINGLE SITE DETAIL
    # ══════════════════════════════════════════════════════

    async def get_site_analytics(self, site_id: int) -> Optional[SiteWithAnalytics]:
        site = (
            await self.db.execute(select(Site).where(Site.id == site_id))
        ).scalar_one_or_none()

        if not site:
            return None

        return SiteWithAnalytics(
            id=site.id,
            name=site.name,
            location=site.location,
            latitude=float(site.latitude) if site.latitude else None,
            longitude=float(site.longitude) if site.longitude else None,
            analytics=await self._compute_analytics(site_id),
            created_at=site.created_at,
            updated_at=site.updated_at,
        )

    # ══════════════════════════════════════════════════════
    # CORE: Compute analytics for one site
    # ══════════════════════════════════════════════════════

    async def _compute_analytics(self, site_id: int) -> SiteAnalytics:

        now = datetime.now(timezone.utc)

        # ─────────────────────────────────────
        # 1️⃣ Issue statistics (single query)
        # ─────────────────────────────────────
        stmt = select(
            sql_func.count(Issue.id).label("total"),

            sql_func.sum(case((Issue.status == IssueStatus.OPEN, 1), else_=0)).label("open"),
            sql_func.sum(case((Issue.status == IssueStatus.ASSIGNED, 1), else_=0)).label("assigned"),
            sql_func.sum(case((Issue.status == IssueStatus.IN_PROGRESS, 1), else_=0)).label("in_progress"),
            sql_func.sum(case((Issue.status == IssueStatus.RESOLVED_PENDING_REVIEW, 1), else_=0)).label("resolved_pending"),
            sql_func.sum(case((Issue.status == IssueStatus.COMPLETED, 1), else_=0)).label("completed"),
            sql_func.sum(case((Issue.status == IssueStatus.ESCALATED, 1), else_=0)).label("escalated"),
            sql_func.sum(case((Issue.status == IssueStatus.REOPENED, 1), else_=0)).label("reopened"),

            sql_func.sum(
                case(
                    (
                        (Issue.deadline_at < now) &
                        (Issue.status != IssueStatus.COMPLETED),
                        1
                    ),
                    else_=0
                )
            ).label("overdue")
        ).where(Issue.site_id == site_id)

        result = await self.db.execute(stmt)
        stats = result.mappings().first()

        total = stats["total"] or 0
        open_count = stats["open"] or 0
        assigned = stats["assigned"] or 0
        in_progress = stats["in_progress"] or 0
        resolved_pending = stats["resolved_pending"] or 0
        completed = stats["completed"] or 0
        escalated = stats["escalated"] or 0
        reopened = stats["reopened"] or 0
        overdue = stats["overdue"] or 0

        # ─────────────────────────────────────
        # 2️⃣ Complaint count (JOIN)
        # ─────────────────────────────────────
        complaint_stmt = (
            select(sql_func.count(Complaint.id))
            .join(Issue, Complaint.issue_id == Issue.id)
            .where(Issue.site_id == site_id)
        )

        complaints_count = (await self.db.execute(complaint_stmt)).scalar() or 0

        # ─────────────────────────────────────
        # 3️⃣ Site performance score
        # ─────────────────────────────────────
        score = 100

        if total > 0:
            penalty = (overdue * 5) + (escalated * 5) + (complaints_count * 10)
            bonus = completed * 2
            score = max(0, min(100, round(100 - penalty + bonus)))

        if score < 50:
            health = "Critical"
        elif score < 80:
            health = "Needs Attention"
        else:
            health = "Healthy"

        # ─────────────────────────────────────
        # 4️⃣ Solvers for site
        # ─────────────────────────────────────
        solver_stmt = (
            select(
                User.id,
                User.name,
                User.phone,
                sql_func.count(IssueAssignment.id).label("active_assignments")
            )
            .join(ProblemSolverSkill, ProblemSolverSkill.solver_id == User.id)
            .outerjoin(
                IssueAssignment,
                (IssueAssignment.assigned_to_solver_id == User.id) &
                (IssueAssignment.status.in_([
                    AssignmentStatus.ACTIVE,
                    AssignmentStatus.REOPENED
                ]))
            )
            .where(ProblemSolverSkill.site_id == site_id)
            .group_by(User.id)
        )

        solver_result = await self.db.execute(solver_stmt)

        solvers = [
            SiteSolverBrief(
                id=row.id,
                name=row.name,
                phone=row.phone,
                active_assignments=row.active_assignments
            )
            for row in solver_result
        ]

        # ─────────────────────────────────────
        # 5️⃣ Optional ML predictions
        # ─────────────────────────────────────
        predicted_issues = None
        escalation_risk = None

        try:
            from app.ml.predictor import MLPredictor

            predictor = MLPredictor()

            predicted_issues = predictor.predict_site_issues(
                site_id=site_id,
                current_open=open_count,
                current_overdue=overdue,
                total_historical=total,
                avg_weekly_issues=total / max(1, 4),
            )

            escalation_risk = predictor.predict_site_escalation_risk(
                overdue_count=overdue,
                escalated_count=escalated,
                complaints_count=complaints_count,
                open_count=open_count,
            )

        except Exception as e:
            logger.debug(f"ML prediction skipped: {e}")

        # ─────────────────────────────────────
        # 6️⃣ Return schema
        # ─────────────────────────────────────
        return SiteAnalytics(
            total_issues=total,
            open_issues=open_count,
            assigned_issues=assigned,
            in_progress_issues=in_progress,
            resolved_pending_review=resolved_pending,
            completed_issues=completed,
            escalated_issues=escalated,
            reopened_issues=reopened,
            overdue_count=overdue,
            complaints_count=complaints_count,
            score=score,
            health=health,
            solvers=solvers,
            predicted_issues_next_week=predicted_issues,
            escalation_risk=escalation_risk,
        )

    # ══════════════════════════════════════════════════════
    # ROLE-BASED SITE FILTERING
    # ══════════════════════════════════════════════════════

    async def _get_visible_sites(self, user: User) -> List[Site]:

        # MANAGER → all sites
        if user.role == UserRole.MANAGER:
            return (
                await self.db.execute(select(Site).order_by(Site.id))
            ).scalars().all()

        # SUPERVISOR → assigned sites
        elif user.role == UserRole.SUPERVISOR:
            site_ids = (
                await self.db.execute(
                    select(SupervisorSite.c.site_id).where(
                        SupervisorSite.c.supervisor_id == user.id
                    )
                )
            ).scalars().all()

            return [] if not site_ids else (
                await self.db.execute(select(Site).where(Site.id.in_(site_ids)))
            ).scalars().all()

        # SOLVER → sites where they have skill
        elif user.role == UserRole.PROBLEMSOLVER:
            site_ids = (
                await self.db.execute(
                    select(ProblemSolverSkill.site_id)
                    .where(
                        ProblemSolverSkill.solver_id == user.id,
                        ProblemSolverSkill.site_id.is_not(None),
                    )
                    .distinct()
                )
            ).scalars().all()

            return [] if not site_ids else (
                await self.db.execute(select(Site).where(Site.id.in_(site_ids)))
            ).scalars().all()

        return []