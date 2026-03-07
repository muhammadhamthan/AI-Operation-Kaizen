"""
PURPOSE: Role-based dashboard aggregation — read only.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, select

from app.models.user import User
from app.models.issue import Issue
from app.models.site import Site
from app.models.issue_assignment import IssueAssignment
from app.models.escalation import Escalation
from app.models.complaint import Complaint
from app.models.supervisor_site import SupervisorSite
from app.core.enums import IssueStatus, AssignmentStatus, UserRole
from app.schemas.dashboard_schema import (
    DashboardSummary, SupervisorDashboard, ManagerDashboard,
    SolverDashboard, SolverPerformance, RecentIssue, SolverAssignment,
)
from datetime import datetime, timezone, timedelta


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        
    async def get_supervisor_dashboard(self, user: User) -> SupervisorDashboard:#like problem solver detail we have to add super visor detail as well

        # Get all site_ids assigned to this supervisor
        # SELECT site_id FROM supervisor_sites WHERE supervisor_id = user.id
        site_stmt = select(SupervisorSite.c.site_id).where(
            SupervisorSite.c.supervisor_id == user.id
        )

        # Execute the query using AsyncSession
        site_result = await self.db.execute(site_stmt)

        # Extract values from result rows
        # scalars() returns only the column values instead of Row objects
        site_ids = site_result.scalars().all()

        # Build issue summary statistics
        summary = await self._build_summary(site_ids)

        # Count issues waiting for supervisor approval
        pending_stmt = select(func.count()).select_from(Issue).where(
            Issue.site_id.in_(site_ids),
            Issue.status == IssueStatus.RESOLVED_PENDING_REVIEW
        )

        # scalar() returns single value (count)
        pending = (await self.db.execute(pending_stmt)).scalar()

        # Fetch 10 most recent issues
        recent_stmt = (
            select(Issue)
            .where(Issue.site_id.in_(site_ids))
            .order_by(Issue.created_at.desc())   # newest first
            .limit(10)
        )

        recent = (await self.db.execute(recent_stmt)).scalars().all()

        # Count active escalations
        # JOIN issues because escalation table references issues
        escalated_stmt = (
            select(func.count())
            .select_from(Escalation)
            .join(Issue)
            .where(
                Issue.site_id.in_(site_ids),
                Escalation.resolved == False
            )
        )

        escalated = (await self.db.execute(escalated_stmt)).scalar()

        # Count issues that will reach deadline within next 24 hours
        approaching_stmt = select(func.count()).select_from(Issue).where(
            Issue.site_id.in_(site_ids),
            Issue.deadline_at < datetime.now(timezone.utc) + timedelta(hours=24),
            Issue.status.notin_([IssueStatus.COMPLETED])
        )

        approaching = (await self.db.execute(approaching_stmt)).scalar()

        # Get supervisor site names
        sites_stmt = select(Site).where(Site.id.in_(site_ids))

        sites = (await self.db.execute(sites_stmt)).scalars().all()

        # Construct API response
        return SupervisorDashboard(
            summary=summary,
            pending_reviews=pending,

            # convert Site objects into names
            my_sites=[s.name for s in sites],

            # convert Issue objects into response schema
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

    async def get_manager_dashboard(self, user: User) -> ManagerDashboard: #like problem solver detail we have to add super visor detail as well

        # Manager can see all issues in system
        summary = await self._build_summary()

        # Count unresolved escalations
        escalated_stmt = select(func.count()).select_from(Escalation).where(
            Escalation.resolved == False
        )

        escalated = (await self.db.execute(escalated_stmt)).scalar()

        # Count overdue issues (deadline passed but not completed)
        overdue_stmt = select(func.count()).select_from(Issue).where(
            Issue.deadline_at < datetime.now(timezone.utc),
            Issue.status.notin_([IssueStatus.COMPLETED])
        )

        overdue = (await self.db.execute(overdue_stmt)).scalar#s().all()

        # Get all active problem solvers
        solvers_stmt = select(User).where(
            User.role == UserRole.PROBLEMSOLVER,
            User.is_active == True
        )

        solvers = (await self.db.execute(solvers_stmt)).scalars().all()

        perf = []

        # Build performance stats for each solver
        for s in solvers:

            # total assignments given to solver
            total_stmt = select(func.count()).select_from(IssueAssignment).where(
                IssueAssignment.assigned_to_solver_id == s.id
            )

            total = (await self.db.execute(total_stmt)).scalar()

            # completed assignments
            done_stmt = select(func.count()).select_from(IssueAssignment).where(
                IssueAssignment.assigned_to_solver_id == s.id,
                IssueAssignment.status == AssignmentStatus.COMPLETED
            )

            done = (await self.db.execute(done_stmt)).scalar()

            # reopened assignments
            reopen_stmt = select(func.count()).select_from(IssueAssignment).where(
                IssueAssignment.assigned_to_solver_id == s.id,
                IssueAssignment.status == AssignmentStatus.REOPENED
            )

            reopen = (await self.db.execute(reopen_stmt)).scalar()

            # complaints against solver
            comp_stmt = select(func.count()).select_from(Complaint).where(
                Complaint.target_solver_id == s.id
            )

            comps = (await self.db.execute(comp_stmt)).scalar()

            # append solver performance summary
            perf.append(
                SolverPerformance(
                    solver_id=s.id,
                    solver_name=s.name,
                    total_assignments=total,
                    completed=done,
                    reopened=reopen,
                    complaints_count=comps,
                )
            )

        return ManagerDashboard(
            summary=summary,
            active_escalations=escalated,
            overdue_issues=overdue,
            solver_performance=perf,
        )

    async def get_solver_dashboard(self, user: User) -> SolverDashboard:

        # Get active assignments for this solver
        assign_stmt = select(IssueAssignment).where(
            IssueAssignment.assigned_to_solver_id == user.id,
            IssueAssignment.status.in_(
                [AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED]
            ),
        )

        assignments = (await self.db.execute(assign_stmt)).scalars().all()

        # Count completed assignments
        completed_stmt = select(func.count()).select_from(IssueAssignment).where(
            IssueAssignment.assigned_to_solver_id == user.id,
            IssueAssignment.status == AssignmentStatus.COMPLETED,
        )

        completed = (await self.db.execute(completed_stmt)).scalar()

        # Count complaints against solver
        complaints_stmt = select(func.count()).select_from(Complaint).where(
            Complaint.target_solver_id == user.id
        )

        complaints = (await self.db.execute(complaints_stmt)).scalar()

        return SolverDashboard(
            active_assignments=[
                SolverAssignment(
                    assignment_id=a.id,
                    issue_id=a.issue_id,
                    issue_title=a.issue.title if a.issue else "",
                    site_name=a.issue.site.name if a.issue and a.issue.site else None,
                    priority=a.issue.priority.value if a.issue else "medium",
                    due_date=a.due_date,
                )
                for a in assignments
            ],
            total_active=len(assignments),
            total_completed=completed,
            complaints_against=complaints,
        )

    async def _build_summary(self, site_ids=None) -> DashboardSummary:

        # Base query depending on role
        if site_ids:
            base = Issue.site_id.in_(site_ids)
        else:
            base = True

        # Total issues
        total = (
            await self.db.execute(
                select(func.count()).select_from(Issue).where(base)
            )
        ).scalar()

        # Count open issues
        open_count = (
            await self.db.execute(
                select(func.count()).where(
                    Issue.status == IssueStatus.OPEN, base
                )
            )
        ).scalar()

        # Count assigned issues
        assigned = (
            await self.db.execute(
                select(func.count()).where(
                    Issue.status == IssueStatus.ASSIGNED, base
                )
            )
        ).scalar()

        # Count issues in progress
        in_progress = (
            await self.db.execute(
                select(func.count()).where(
                    Issue.status == IssueStatus.IN_PROGRESS, base
                )
            )
        ).scalar()

        # Count completed issues
        completed = (
            await self.db.execute(
                select(func.count()).where(
                    Issue.status == IssueStatus.COMPLETED, base
                )
            )
        ).scalar()

        return DashboardSummary(
            total_issues=total,
            open_issues=open_count,
            assigned_issues=assigned,
            in_progress_issues=in_progress,
            completed_issues=completed,
        )