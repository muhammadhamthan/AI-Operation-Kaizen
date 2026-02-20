"""
PURPOSE: Role-based dashboard aggregation — read only.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from app.models.user import User
from app.models.issue import Issue
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

    def get_supervisor_dashboard(self, user: User) -> SupervisorDashboard:
        site_ids = [r[0] for r in self.db.query(SupervisorSite.c.site_id).filter(SupervisorSite.c.supervisor_id == user.id).all()]
        query = self.db.query(Issue).filter(Issue.site_id.in_(site_ids))

        summary = self._build_summary(query)
        pending = query.filter(Issue.status == IssueStatus.RESOLVED_PENDING_REVIEW).count()
        recent = query.order_by(Issue.created_at.desc()).limit(10).all()
        escalated = self.db.query(Escalation).join(Issue).filter(Issue.site_id.in_(site_ids), Escalation.resolved == False).count()
        approaching = query.filter(Issue.deadline_at < datetime.now(timezone.utc) + timedelta(hours=24), Issue.status.notin_([IssueStatus.COMPLETED])).count()

        from app.models.site import Site
        sites = self.db.query(Site).filter(Site.id.in_(site_ids)).all()

        return SupervisorDashboard(
            summary=summary, pending_reviews=pending,
            my_sites=[s.name for s in sites],
            recent_issues=[RecentIssue(id=i.id, title=i.title, status=i.status.value, priority=i.priority.value, site_name=i.site.name if i.site else None, created_at=i.created_at) for i in recent],
            active_escalations=escalated, issues_approaching_deadline=approaching,
        )

    def get_manager_dashboard(self, user: User) -> ManagerDashboard:
        query = self.db.query(Issue)
        summary = self._build_summary(query)
        escalated = self.db.query(Escalation).filter(Escalation.resolved == False).count()
        overdue = query.filter(Issue.deadline_at < datetime.now(timezone.utc), Issue.status.notin_([IssueStatus.COMPLETED])).count()

        solvers = self.db.query(User).filter(User.role == UserRole.PROBLEMSOLVER, User.is_active == True).all()
        perf = []
        for s in solvers:
            total = self.db.query(IssueAssignment).filter(IssueAssignment.assigned_to_solver_id == s.id).count()
            done = self.db.query(IssueAssignment).filter(IssueAssignment.assigned_to_solver_id == s.id, IssueAssignment.status == AssignmentStatus.COMPLETED).count()
            reopen = self.db.query(IssueAssignment).filter(IssueAssignment.assigned_to_solver_id == s.id, IssueAssignment.status == AssignmentStatus.REOPENED).count()
            comps = self.db.query(Complaint).filter(Complaint.target_solver_id == s.id).count()
            perf.append(SolverPerformance(solver_id=s.id, solver_name=s.name, total_assignments=total, completed=done, reopened=reopen, complaints_count=comps))

        return ManagerDashboard(
            summary=summary, active_escalations=escalated, overdue_issues=overdue,
            solver_performance=perf,
        )

    def get_solver_dashboard(self, user: User) -> SolverDashboard:
        assignments = self.db.query(IssueAssignment).filter(
            IssueAssignment.assigned_to_solver_id == user.id,
            IssueAssignment.status.in_([AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED]),
        ).all()

        completed = self.db.query(IssueAssignment).filter(
            IssueAssignment.assigned_to_solver_id == user.id,
            IssueAssignment.status == AssignmentStatus.COMPLETED,
        ).count()

        return SolverDashboard(
            active_assignments=[SolverAssignment(
                assignment_id=a.id, issue_id=a.issue_id,
                issue_title=a.issue.title if a.issue else "",
                site_name=a.issue.site.name if a.issue and a.issue.site else None,
                priority=a.issue.priority.value if a.issue else "medium",
                due_date=a.due_date,
            ) for a in assignments],
            total_active=len(assignments),
            total_completed=completed,
            complaints_against=self.db.query(Complaint).filter(Complaint.target_solver_id == user.id).count(),
        )

    def _build_summary(self, query) -> DashboardSummary:
        return DashboardSummary(
            total_issues=query.count(),
            open_issues=query.filter(Issue.status == IssueStatus.OPEN).count(),
            assigned_issues=query.filter(Issue.status == IssueStatus.ASSIGNED).count(),
            in_progress_issues=query.filter(Issue.status == IssueStatus.IN_PROGRESS).count(),
            resolved_pending_review=query.filter(Issue.status == IssueStatus.RESOLVED_PENDING_REVIEW).count(),
            completed_issues=query.filter(Issue.status == IssueStatus.COMPLETED).count(),
            reopened_issues=query.filter(Issue.status == IssueStatus.REOPENED).count(),
            escalated_issues=query.filter(Issue.status == IssueStatus.ESCALATED).count(),
        )