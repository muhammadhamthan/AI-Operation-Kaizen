"""
dashboard_service.py

Existing optimizations (pre-Wave B):
  1. get_manager_dashboard: 2 queries total using conditional aggregation
  2. get_solver_dashboard: single aggregate queries
  3. _build_summary: 1 conditional aggregation query
  4. get_supervisor_dashboard: reuses _build_summary

WAVE B CHANGES:
  - get_supervisor_dashboard's "recent_issues" query now eagerly loads
    Issue.site via selectinload. Previously it relied on the model-level
    selectin default which Wave B removed (Issue.site is now lazy="raise").
"""
import logging
from typing import Optional
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, case
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models.issue import Issue
from app.models.site import Site
from app.models.issue_assignment import IssueAssignment
from app.models.escalation import Escalation
from app.models.complaint import Complaint
from app.models.supervisor_site import SupervisorSite
from app.core.enums import IssueStatus, AssignmentStatus, UserRole
from app.schemas.dashboard_schema import (
    DashboardSummary,
    SupervisorDashboard,
    ManagerDashboard,
    SolverDashboard,
    SolverPerformance,
    RecentIssue,
    SolverAssignment,
)

logger = logging.getLogger(__name__)


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════════
    # SUPERVISOR DASHBOARD
    # ══════════════════════════════════════════════════════════

    async def get_supervisor_dashboard(self, user: User) -> SupervisorDashboard:
        site_result = await self.db.execute(
            select(SupervisorSite.c.site_id).where(
                SupervisorSite.c.supervisor_id == user.id
            )
        )
        site_ids = site_result.scalars().all()

        summary = await self._build_summary(site_ids)

        now = datetime.now(timezone.utc)

        # Pending reviews
        pending_result = await self.db.execute(
            select(func.count()).select_from(Issue).where(
                Issue.site_id.in_(site_ids),
                Issue.status == IssueStatus.RESOLVED_PENDING_REVIEW,
            )
        )
        pending = pending_result.scalar() or 0

        # WAVE B: explicit selectinload(Issue.site) — was implicit via selectin default.
        # Only 10 rows max, so the cost of eager loading is trivial.
        recent_result = await self.db.execute(
            select(Issue)
            .options(selectinload(Issue.site))
            .where(Issue.site_id.in_(site_ids))
            .order_by(Issue.created_at.desc())
            .limit(10)
        )
        recent = recent_result.scalars().all()

        escalated_result = await self.db.execute(
            select(func.count(func.distinct(Escalation.issue_id)))
            .join(Issue, Issue.id == Escalation.issue_id)
            .where(
                Issue.site_id.in_(site_ids),
                Escalation.resolved == False,
            )
        )
        escalated = escalated_result.scalar() or 0

        # Issues approaching deadline in next 24 hours
        approaching_result = await self.db.execute(
            select(func.count()).select_from(Issue).where(
                Issue.site_id.in_(site_ids),
                Issue.deadline_at < now + timedelta(hours=24),
                Issue.status.notin_([
                    IssueStatus.COMPLETED,
                    IssueStatus.ESCALATED,
                    IssueStatus.REOPENED,
                ]),
            )
        )
        approaching = approaching_result.scalar() or 0

        # WAVE B speed-up: we only need site names. Narrow the SELECT
        # (was `select(Site)` which materialises the full row including
        # lat/lng + JSON). For 10s of sites this saves a few KB.
        sites_result = await self.db.execute(
            select(Site.name).where(Site.id.in_(site_ids))
        )
        site_names = sites_result.scalars().all()

        return SupervisorDashboard(
            summary=summary,
            pending_reviews=pending,
            my_sites=list(site_names),
            recent_issues=[
                RecentIssue(
                    id=i.id,
                    title=i.title,
                    status=i.status.value,
                    priority=i.priority.value,
                    site_name=i.site.name if i.site else None,
                    created_at=i.created_at,
                )
                for i in recent
            ],
            active_escalations=escalated,
            issues_approaching_deadline=approaching,
        )

    # ══════════════════════════════════════════════════════════
    # MANAGER DASHBOARD
    # 2 queries total (assignments agg + complaints agg).
    # ══════════════════════════════════════════════════════════

    async def get_manager_dashboard(self, user: User) -> ManagerDashboard:
        summary = await self._build_summary()

        esc_result = await self.db.execute(
            select(func.count()).select_from(Escalation).where(
                Escalation.resolved == False
            )
        )
        escalated = esc_result.scalar() or 0

        now = datetime.now(timezone.utc)

        overdue_result = await self.db.execute(
            select(func.count()).select_from(Issue).where(
                Issue.deadline_at < now,
                Issue.status.notin_([IssueStatus.COMPLETED]),
            )
        )
        overdue = overdue_result.scalar() or 0

        # WAVE B speed-up: narrow solver fetch to (id, name) — was `select(User)`
        # (whole row). For 100 solvers this noticeably reduces payload size.
        solvers_result = await self.db.execute(
            select(User.id, User.name).where(
                User.role == UserRole.PROBLEMSOLVER,
                User.is_active == True,
            )
        )
        solvers = solvers_result.all()# list of (id, name) rows
        solver_ids = [s.id for s in solvers]

        if not solver_ids:
            return ManagerDashboard(
                summary=summary,
                active_escalations=escalated,
                overdue_issues=overdue,
                solver_performance=[],
            )

        # ── Assignment counts — ONE query with conditional aggregation ──
        asgn_result = await self.db.execute(
            select(
                IssueAssignment.assigned_to_solver_id,
                func.count(IssueAssignment.id).label("total"),
                func.sum(
                    case((IssueAssignment.status == AssignmentStatus.COMPLETED, 1), else_=0)
                ).label("completed"),
                func.sum(
                    case((IssueAssignment.status == AssignmentStatus.REOPENED, 1), else_=0)
                ).label("reopened"),
            )
            .where(IssueAssignment.assigned_to_solver_id.in_(solver_ids))
            .group_by(IssueAssignment.assigned_to_solver_id)
        )
        asgn_map = {row.assigned_to_solver_id: row for row in asgn_result.all()}

        # ── Complaint counts — ONE query ──
        comp_result = await self.db.execute(
            select(
                Complaint.target_solver_id,
                func.count(Complaint.id).label("complaints"),
            )
            .where(Complaint.target_solver_id.in_(solver_ids))
            .group_by(Complaint.target_solver_id)
        )
        comp_map = {row.target_solver_id: row.complaints for row in comp_result.all()}

        perf = [
            SolverPerformance(
                solver_id=s.id,
                solver_name=s.name,
                total_assignments=int(asgn_map[s.id].total) if s.id in asgn_map else 0,
                completed=int(asgn_map[s.id].completed) if s.id in asgn_map else 0,
                reopened=int(asgn_map[s.id].reopened) if s.id in asgn_map else 0,
                complaints_count=comp_map.get(s.id, 0),
            )
            for s in solvers
        ]

        return ManagerDashboard(
            summary=summary,
            active_escalations=escalated,
            overdue_issues=overdue,
            solver_performance=perf,
        )

    # ══════════════════════════════════════════════════════════
    # SOLVER DASHBOARD
    # ══════════════════════════════════════════════════════════

    async def get_solver_dashboard(self, user: User) -> SolverDashboard:
        # 1. Total active count
        count_result = await self.db.execute(
            select(func.count())
            .select_from(IssueAssignment)
            .where(
                IssueAssignment.assigned_to_solver_id == user.id,
                IssueAssignment.status.in_(
                    [AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED]
                ),
            )
        )
        total_active = count_result.scalar() or 0

        # 2. Get only 10 assignments for dashboard — JOINed, so no relationships needed
        assign_result = await self.db.execute(
            select(
                IssueAssignment.id.label("assignment_id"),
                IssueAssignment.issue_id,
                Issue.title.label("issue_title"),
                Site.name.label("site_name"),
                Issue.priority,
                IssueAssignment.due_date,
            )
            .join(Issue, Issue.id == IssueAssignment.issue_id)
            .join(Site, Site.id == Issue.site_id)
            .where(
                IssueAssignment.assigned_to_solver_id == user.id,
                IssueAssignment.status.in_(
                    [AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED]
                ),
            )
            .order_by(IssueAssignment.due_date.asc())
            .limit(10)
        )
        assignments = assign_result.all()

        completed_result = await self.db.execute(
            select(func.count()).select_from(IssueAssignment).where(
                IssueAssignment.assigned_to_solver_id == user.id,
                IssueAssignment.status == AssignmentStatus.COMPLETED,
            )
        )
        completed = completed_result.scalar() or 0

        comp_result = await self.db.execute(
            select(func.count()).select_from(Complaint).where(
                Complaint.target_solver_id == user.id
            )
        )
        complaints = comp_result.scalar() or 0

        return SolverDashboard(
            active_assignments=[
                SolverAssignment(
                    assignment_id=a.assignment_id,
                    issue_id=a.issue_id,
                    issue_title=a.issue_title,
                    site_name=a.site_name,
                    priority=a.priority.value if a.priority else None,
                    due_date=a.due_date,
                )
                for a in assignments
            ],
            total_active=total_active,
            total_completed=completed,
            complaints_against=complaints,
        )

    # ══════════════════════════════════════════════════════════
    # SHARED: Build summary stats
    # 1 conditional aggregation query.
    # ══════════════════════════════════════════════════════════

    async def _build_summary(self, site_ids: Optional[list] = None) -> DashboardSummary:
        where_clauses = []
        if site_ids:
            where_clauses.append(Issue.site_id.in_(site_ids))

        stmt = select(
            func.count(Issue.id).label("total"),
            func.sum(case((Issue.status == IssueStatus.OPEN, 1), else_=0)).label("open"),
            func.sum(case((Issue.status == IssueStatus.ASSIGNED, 1), else_=0)).label("assigned"),
            func.sum(case((Issue.status == IssueStatus.IN_PROGRESS, 1), else_=0)).label("in_progress"),
            func.sum(case((Issue.status == IssueStatus.RESOLVED_PENDING_REVIEW, 1), else_=0)).label("resolved_pending"),
            func.sum(case((Issue.status == IssueStatus.COMPLETED, 1), else_=0)).label("completed"),
            func.sum(case((Issue.status == IssueStatus.REOPENED, 1), else_=0)).label("reopened"),
            func.sum(case((Issue.status == IssueStatus.ESCALATED, 1), else_=0)).label("escalated"),
        )
        if where_clauses:
            stmt = stmt.where(*where_clauses)

        result = await self.db.execute(stmt)
        row = result.mappings().first()

        return DashboardSummary(
            total_issues=row["total"] or 0,
            open_issues=row["open"] or 0,
            assigned_issues=row["assigned"] or 0,
            in_progress_issues=row["in_progress"] or 0,
            resolved_pending_review=row["resolved_pending"] or 0,
            completed_issues=row["completed"] or 0,
            reopened_issues=row["reopened"] or 0,
            escalated_issues=row["escalated"] or 0,
        )