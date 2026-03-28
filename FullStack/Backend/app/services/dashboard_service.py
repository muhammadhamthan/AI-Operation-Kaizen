"""
dashboard_service.py  —  OPTIMIZED
Key fixes vs original:
  1. get_manager_dashboard(): was N*4 queries (total/done/reopen/complaints per solver).
     Now 2 queries total using conditional aggregation (SQL CASE/SUM).
  2. get_solver_dashboard(): was loading all assignments then doing Python loops.
     Now uses single aggregate queries.
  3. _build_summary(): was 8 separate COUNT queries.
     Now 1 conditional aggregation query.
  4. get_supervisor_dashboard(): reuses _build_summary() improvement.
  5. All async/await correct (original was mixing sync Session with async patterns).
"""
import time
import logging
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, case

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
        # Supervisor's site IDs
        site_result = await self.db.execute(
            select(SupervisorSite.c.site_id).where(
                SupervisorSite.c.supervisor_id == user.id
            )
        )
        site_ids = site_result.scalars().all()

        # All stats in one query
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

        # 10 most recent issues
        recent_result = await self.db.execute(
            select(Issue)
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
                Issue.status.notin_([IssueStatus.COMPLETED, IssueStatus.ESCALATED, IssueStatus.REOPENED]),
            )
        )
        approaching = approaching_result.scalar() or 0

        # Site names
        sites_result = await self.db.execute(
            select(Site).where(Site.id.in_(site_ids))
        )
        sites = sites_result.scalars().all()

        return SupervisorDashboard(
            summary=summary,
            pending_reviews=pending,
            my_sites=[s.name for s in sites],
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
    # Was: N*4 DB queries (one per solver per metric).
    # Now: 2 queries total (assignments agg + complaints agg).
    # ══════════════════════════════════════════════════════════

    async def get_manager_dashboard(self, user: User) -> ManagerDashboard:
        summary = await self._build_summary()

        # Active unresolved escalations
        esc_result = await self.db.execute(
            select(func.count()).select_from(Escalation).where(
                Escalation.resolved == False
            )
        )
        escalated = esc_result.scalar() or 0

        now = datetime.now(timezone.utc)

        # Overdue issues
        overdue_result = await self.db.execute(
            select(func.count()).select_from(Issue).where(
                Issue.deadline_at < now,
                Issue.status.notin_([IssueStatus.COMPLETED]),
            )
        )
        overdue = overdue_result.scalar() or 0

        # All active solvers in one query
        solvers_result = await self.db.execute(
            select(User).where(
                User.role == UserRole.PROBLEMSOLVER,
                User.is_active == True,
            )
        )
        solvers = solvers_result.scalars().all()
        solver_ids = [s.id for s in solvers]

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
        # Active assignments
        # 1️⃣ Total active count
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


        # 2️⃣ Get only 10 assignments for dashboard
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

        # Completed count
        completed_result = await self.db.execute(
            select(func.count()).select_from(IssueAssignment).where(
                IssueAssignment.assigned_to_solver_id == user.id,
                IssueAssignment.status == AssignmentStatus.COMPLETED,
            )
        )
        completed = completed_result.scalar() or 0

        # Complaints against solver
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
    # Was: 8 separate COUNT queries.
    # Now: 1 conditional aggregation query.
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





















# """
# PURPOSE: Role-based dashboard aggregation — read only.
# """

# from sqlalchemy.orm import Session
# from sqlalchemy import func, select

# from app.models.user import User
# from app.models.issue import Issue
# from app.models.site import Site
# from app.models.issue_assignment import IssueAssignment
# from app.models.escalation import Escalation
# from app.models.complaint import Complaint
# from app.models.supervisor_site import SupervisorSite
# from app.core.enums import IssueStatus, AssignmentStatus, UserRole
# from app.schemas.dashboard_schema import (
#     DashboardSummary, SupervisorDashboard, ManagerDashboard,
#     SolverDashboard, SolverPerformance, RecentIssue, SolverAssignment,
# )
# from datetime import datetime, timezone, timedelta


# class DashboardService:
#     def __init__(self, db: Session):
#         self.db = db
        
#     async def get_supervisor_dashboard(self, user: User) -> SupervisorDashboard:#like problem solver detail we have to add super visor detail as well

#         # Get all site_ids assigned to this supervisor
#         # SELECT site_id FROM supervisor_sites WHERE supervisor_id = user.id
#         site_stmt = select(SupervisorSite.c.site_id).where(
#             SupervisorSite.c.supervisor_id == user.id
#         )

#         # Execute the query using AsyncSession
#         site_result = await self.db.execute(site_stmt)

#         # Extract values from result rows
#         # scalars() returns only the column values instead of Row objects
#         site_ids = site_result.scalars().all()

#         # Build issue summary statistics
#         summary = await self._build_summary(site_ids)

#         # Count issues waiting for supervisor approval
#         pending_stmt = select(func.count()).select_from(Issue).where(
#             Issue.site_id.in_(site_ids),
#             Issue.status == IssueStatus.RESOLVED_PENDING_REVIEW
#         )

#         # scalar() returns single value (count)
#         pending = (await self.db.execute(pending_stmt)).scalar()

#         # Fetch 10 most recent issues
#         recent_stmt = (
#             select(Issue)
#             .where(Issue.site_id.in_(site_ids))
#             .order_by(Issue.created_at.desc())   # newest first
#             .limit(10)
#         )

#         recent = (await self.db.execute(recent_stmt)).scalars().all()

#         # Count active escalations
#         # JOIN issues because escalation table references issues
#         escalated_stmt = (
#             select(func.count())
#             .select_from(Escalation)
#             .join(Issue)
#             .where(
#                 Issue.site_id.in_(site_ids),
#                 Escalation.resolved == False
#             )
#         )

#         escalated = (await self.db.execute(escalated_stmt)).scalar()

#         # Count issues that will reach deadline within next 24 hours
#         approaching_stmt = select(func.count()).select_from(Issue).where(
#             Issue.site_id.in_(site_ids),
#             Issue.deadline_at < datetime.now(timezone.utc) + timedelta(hours=24),
#             Issue.status.notin_([IssueStatus.COMPLETED])
#         )

#         approaching = (await self.db.execute(approaching_stmt)).scalar()

#         # Get supervisor site names
#         sites_stmt = select(Site).where(Site.id.in_(site_ids))

#         sites = (await self.db.execute(sites_stmt)).scalars().all()

#         # Construct API response
#         return SupervisorDashboard(
#             summary=summary,
#             pending_reviews=pending,

#             # convert Site objects into names
#             my_sites=[s.name for s in sites],

#             # convert Issue objects into response schema
#             recent_issues=[
#                 RecentIssue(
#                     id=i.id,
#                     title=i.title,
#                     status=i.status.value,
#                     priority=i.priority.value,
#                     site_name=i.site.name if i.site else None,
#                     created_at=i.created_at,
#                 )
#                 for i in recent
#             ],

#             active_escalations=escalated,
#             issues_approaching_deadline=approaching,
#         )

#     async def get_manager_dashboard(self, user: User) -> ManagerDashboard: #like problem solver detail we have to add super visor detail as well

#         # Manager can see all issues in system
#         summary = await self._build_summary()

#         # Count unresolved escalations
#         escalated_stmt = select(func.count()).select_from(Escalation).where(
#             Escalation.resolved == False
#         )

#         escalated = (await self.db.execute(escalated_stmt)).scalar()

#         # Count overdue issues (deadline passed but not completed)
#         overdue_stmt = select(func.count()).select_from(Issue).where(
#             Issue.deadline_at < datetime.now(timezone.utc),
#             Issue.status.notin_([IssueStatus.COMPLETED])
#         )

#         overdue = (await self.db.execute(overdue_stmt)).scalar()#s().all()

#         # Get all active problem solvers
#         solvers_stmt = select(User).where(
#             User.role == UserRole.PROBLEMSOLVER,
#             User.is_active == True
#         )

#         solvers = (await self.db.execute(solvers_stmt)).scalars().all()

#         perf = []

#         # Build performance stats for each solver
#         for s in solvers:

#             # total assignments given to solver
#             total_stmt = select(func.count()).select_from(IssueAssignment).where(
#                 IssueAssignment.assigned_to_solver_id == s.id
#             )

#             total = (await self.db.execute(total_stmt)).scalar()

#             # completed assignments
#             done_stmt = select(func.count()).select_from(IssueAssignment).where(
#                 IssueAssignment.assigned_to_solver_id == s.id,
#                 IssueAssignment.status == AssignmentStatus.COMPLETED
#             )

#             done = (await self.db.execute(done_stmt)).scalar()

#             # reopened assignments
#             reopen_stmt = select(func.count()).select_from(IssueAssignment).where(
#                 IssueAssignment.assigned_to_solver_id == s.id,
#                 IssueAssignment.status == AssignmentStatus.REOPENED
#             )

#             reopen = (await self.db.execute(reopen_stmt)).scalar()

#             # complaints against solver
#             comp_stmt = select(func.count()).select_from(Complaint).where(
#                 Complaint.target_solver_id == s.id
#             )

#             comps = (await self.db.execute(comp_stmt)).scalar()

#             # append solver performance summary
#             perf.append(
#                 SolverPerformance(
#                     solver_id=s.id,
#                     solver_name=s.name,
#                     total_assignments=total,
#                     completed=done,
#                     reopened=reopen,
#                     complaints_count=comps,
#                 )
#             )

#         return ManagerDashboard(
#             summary=summary,
#             active_escalations=escalated,
#             overdue_issues=overdue,
#             solver_performance=perf,
#         )

#     async def get_solver_dashboard(self, user: User) -> SolverDashboard:

#         # Get active assignments for this solver
#         assign_stmt = select(IssueAssignment).where(
#             IssueAssignment.assigned_to_solver_id == user.id,
#             IssueAssignment.status.in_(
#                 [AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED]
#             ),
#         )

#         assignments = (await self.db.execute(assign_stmt)).scalars().all()

#         # Count completed assignments
#         completed_stmt = select(func.count()).select_from(IssueAssignment).where(
#             IssueAssignment.assigned_to_solver_id == user.id,
#             IssueAssignment.status == AssignmentStatus.COMPLETED,
#         )

#         completed = (await self.db.execute(completed_stmt)).scalar()

#         # Count complaints against solver
#         complaints_stmt = select(func.count()).select_from(Complaint).where(
#             Complaint.target_solver_id == user.id
#         )

#         complaints = (await self.db.execute(complaints_stmt)).scalar()

#         return SolverDashboard(
#             active_assignments=[
#                 SolverAssignment(
#                     assignment_id=a.id,
#                     issue_id=a.issue_id,
#                     issue_title=a.issue.title if a.issue else "",
#                     site_name=a.issue.site.name if a.issue and a.issue.site else None,
#                     priority=a.issue.priority.value if a.issue else "medium",
#                     due_date=a.due_date,
#                 )
#                 for a in assignments
#             ],
#             total_active=len(assignments),
#             total_completed=completed,
#             complaints_against=complaints,
#         )

#     async def _build_summary(self, site_ids=None) -> DashboardSummary:

#         # Base filter depending on role
#         if site_ids:
#             base = Issue.site_id.in_(site_ids)
#         else:
#             base = True

#         # Total issues
#         total = (
#             await self.db.execute(
#                 select(func.count()).select_from(Issue).where(base)
#             )
#         ).scalar()

#         # Open issues
#         open_count = (
#             await self.db.execute(
#                 select(func.count()).select_from(Issue).where(
#                     Issue.status == IssueStatus.OPEN,
#                     base
#                 )
#             )
#         ).scalar()

#         # Assigned issues
#         assigned = (
#             await self.db.execute(
#                 select(func.count()).select_from(Issue).where(
#                     Issue.status == IssueStatus.ASSIGNED,
#                     base
#                 )
#             )
#         ).scalar()

#         # In progress issues
#         in_progress = (
#             await self.db.execute(
#                 select(func.count()).select_from(Issue).where(
#                     Issue.status == IssueStatus.IN_PROGRESS,
#                     base
#                 )
#             )
#         ).scalar()

#         # Completed issues
#         completed = (
#             await self.db.execute(
#                 select(func.count()).select_from(Issue).where(
#                     Issue.status == IssueStatus.COMPLETED,
#                     base
#                 )
#             )
#         ).scalar()

#         # Reopened issues
#         reopened = (
#             await self.db.execute(
#                 select(func.count()).select_from(Issue).where(
#                     Issue.status == IssueStatus.REOPENED,
#                     base
#                 )
#             )
#         ).scalar()

#         # Escalated issues
#         escalated = (
#             await self.db.execute(
#                 select(func.count()).select_from(Issue).where(
#                     Issue.status == IssueStatus.ESCALATED,
#                     base
#                 )
#             )
#         ).scalar()

#         # Resolved but waiting for supervisor review
#         resolved_pending = (
#             await self.db.execute(
#                 select(func.count()).select_from(Issue).where(
#                     Issue.status == IssueStatus.RESOLVED_PENDING_REVIEW,
#                     base
#                 )
#             )
#         ).scalar()

#         return DashboardSummary(
#             total_issues=total,
#             open_issues=open_count,
#             assigned_issues=assigned,
#             in_progress_issues=in_progress,
#             completed_issues=completed,
#             reopened_issues=reopened,
#             escalated_issues=escalated,
#             resolved_pending_review=resolved_pending,
#         )