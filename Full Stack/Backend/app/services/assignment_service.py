"""
PURPOSE: Solver assignment + matching logic.
─────────────────────────────────────────────
Handles:
  - Auto-assign solver (Stage 2)
  - Reassign solver (Manager via chat)
  - Get solver assignments (Solver via chat)
  - Query solver performance (Manager via chat)
  - Read-only list/detail for API
"""

import logging
from typing import Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from app.models.user import User
from app.models.issue import Issue
from app.models.issue_assignment import IssueAssignment
from app.models.issue_history import IssueHistory
from app.models.complaint import Complaint
from app.models.problem_solver_skill import ProblemSolverSkill 
from app.core.enums import (
    IssueStatus, AssignmentStatus, ActionType, UserRole,
)
from app.schemas.chatbot_schema import ChatResponse
from app.schemas.assignment_schema import (
    AssignmentResponse, AssignmentListResponse,
)
from app.schemas.call_log_schema import CallLogListResponse, CallLogResponse

logger = logging.getLogger(__name__)


class AssignmentService:
    def __init__(self, db: Session):
        self.db = db

    # ══════════════════════════════════════════════════════
    # AUTO-ASSIGN SOLVER (Stage 2)
    # ══════════════════════════════════════════════════════

    def auto_assign(
        self, issue: Issue, problem_type: str,
        site_id: int, supervisor: User,
    ) -> Tuple[Optional[User], Optional[IssueAssignment]]:
        """
        Smart matching:
        1. Find skills matching problem_type
        2. Filter: exact site match OR NULL (works all sites)
        3. Filter: is_available = True
        4. Sort: site match first → priority DESC
        5. Pick: lowest active workload
        6. Create assignment → queue call
        """
        matching = (
            self.db.query(ProblemSolverSkill)
            .filter(
                ProblemSolverSkill.skill_type == problem_type,
                ProblemSolverSkill.is_available == True,
                (
                    (ProblemSolverSkill.site_id == site_id) |
                    (ProblemSolverSkill.site_id.is_(None))
                ),
            )
            .order_by(
                ProblemSolverSkill.site_id.is_(None).asc(),
                ProblemSolverSkill.priority.desc(),
            )
            .all()
        )

        if not matching:
            return None, None

        # Pick solver with lowest workload
        best_id, best_skill = None, None
        lowest = float("inf")

        for skill in matching:
            workload = self.db.query(sql_func.count(IssueAssignment.id)).filter(
                IssueAssignment.assigned_to_solver_id == skill.solver_id,
                IssueAssignment.status == AssignmentStatus.ACTIVE,
            ).scalar()

            if workload < lowest:
                lowest, best_id, best_skill = workload, skill.solver_id, skill

        if not best_id:
            return None, None

        solver = self.db.query(User).filter(User.id == best_id).first()

        assignment = IssueAssignment(
            issue_id=issue.id,
            assigned_to_solver_id=best_id,
            assigned_by_supervisor_id=supervisor.id,
            due_date=issue.deadline_at,
            status=AssignmentStatus.ACTIVE,
        )
        self.db.add(assignment)

        issue.status = IssueStatus.ASSIGNED
        issue.track_status = "awaiting_solver"

        self.db.add(IssueHistory(
            issue_id=issue.id, changed_by_user_id=supervisor.id,
            old_status="OPEN", new_status="ASSIGNED",
            action_type=ActionType.ASSIGN,
            details=f"Auto-assigned to {solver.name} (skill: {best_skill.skill_type}, priority: {best_skill.priority})",
        ))

        self.db.flush()

        # Queue Twilio call
        # try:
        #     from app.workers.scheduler import schedule_solver_call
        #     schedule_solver_call.delay(assignment.id)
        # except Exception as e:
        #     logger.warning(f"Call queue failed (Celery may not be running): {e}")

        # return solver, assignment

    # ══════════════════════════════════════════════════════
    # SOLVER: Get assignments via chat
    # ══════════════════════════════════════════════════════

    async def get_solver_assignments_chat(self, solver: User) -> ChatResponse:
        assignments = (
            self.db.query(IssueAssignment)
            .filter(
                IssueAssignment.assigned_to_solver_id == solver.id,
                IssueAssignment.status.in_([AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED]),
            )
            .order_by(IssueAssignment.created_at.desc())
            .all()
        )

        if not assignments:
            return ChatResponse(message="👷 No active assignments.", intent="check_assignment", actions_taken=[])

        lines = [f"👷 {len(assignments)} active assignment(s):\n"]
        for a in assignments:
            i = a.issue
            due = a.due_date.strftime('%Y-%m-%d') if a.due_date else 'N/A'
            lines.append(
                f"📌 #{a.id} — Issue #{i.id}: {i.title}\n"
                f"   📍 {i.site.name if i.site else 'N/A'} | "
                f"⚡ {i.priority.value} | 📅 Due: {due} | {a.status.value}"
            )

        return ChatResponse(
            message="\n".join(lines), intent="check_assignment",
            actions_taken=[f"{len(assignments)} assignments"],
        )

    # ══════════════════════════════════════════════════════
    # MANAGER: Reassign via chat
    # ══════════════════════════════════════════════════════

    async def reassign_from_chat(
        self, user: User, issue_id: Optional[int], solver_name: Optional[str],
    ) -> ChatResponse:
        if not issue_id or not solver_name:
            return ChatResponse(message="Specify: 'reassign issue 7 to Suresh'", intent="reassign_solver", actions_taken=[])

        issue = self.db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            return ChatResponse(message=f"Issue #{issue_id} not found.", intent="reassign_solver", actions_taken=[])

        solver = self.db.query(User).filter(
            User.role == UserRole.PROBLEMSOLVER,
            User.name.ilike(f"%{solver_name}%"),
            User.is_active == True,
        ).first()
        if not solver:
            return ChatResponse(message=f"Solver '{solver_name}' not found.", intent="reassign_solver", actions_taken=[])

        new_assgn = IssueAssignment(
            issue_id=issue_id, assigned_to_solver_id=solver.id,
            assigned_by_supervisor_id=user.id, due_date=issue.deadline_at,
            status=AssignmentStatus.ACTIVE,
        )
        self.db.add(new_assgn)

        issue.status = IssueStatus.ASSIGNED
        issue.track_status = "awaiting_solver"

        self.db.add(IssueHistory(
            issue_id=issue.id, changed_by_user_id=user.id,
            old_status=issue.status.value, new_status="ASSIGNED",
            action_type=ActionType.ASSIGN,
            details=f"Reassigned to {solver.name} by {user.name}",
        ))
        self.db.commit()
        self.db.refresh(new_assgn)

        # try:
        #     from app.workers.scheduler import schedule_solver_call
        #     schedule_solver_call.delay(new_assgn.id)
        # except Exception:
        #     pass

        return ChatResponse(
            message=f"✅ Issue #{issue_id} reassigned to {solver.name}.\n📞 Calling solver...",
            intent="reassign_solver", issue_id=issue_id, assignment_id=new_assgn.id,
            actions_taken=[f"New assignment #{new_assgn.id}", f"Assigned to {solver.name}"],
        )

    # ══════════════════════════════════════════════════════
    # MANAGER: Solver performance via chat
    # ══════════════════════════════════════════════════════

    async def query_solver_performance_chat(
        self, user: User, solver_name: Optional[str],
    ) -> ChatResponse:
        query = self.db.query(User).filter(
            User.role == UserRole.PROBLEMSOLVER, User.is_active == True,
        )
        if solver_name:
            query = query.filter(User.name.ilike(f"%{solver_name}%"))

        solvers = query.all()
        if not solvers:
            return ChatResponse(message=f"No solver matching '{solver_name}'.", intent="query_solver_performance", actions_taken=[])

        lines = ["📊 Solver Performance:\n"]
        for s in solvers:
            total = self.db.query(IssueAssignment).filter(IssueAssignment.assigned_to_solver_id == s.id).count()
            done = self.db.query(IssueAssignment).filter(IssueAssignment.assigned_to_solver_id == s.id, IssueAssignment.status == AssignmentStatus.COMPLETED).count()
            reopen = self.db.query(IssueAssignment).filter(IssueAssignment.assigned_to_solver_id == s.id, IssueAssignment.status == AssignmentStatus.REOPENED).count()
            complaints = self.db.query(Complaint).filter(Complaint.target_solver_id == s.id).count()
            active = self.db.query(IssueAssignment).filter(IssueAssignment.assigned_to_solver_id == s.id, IssueAssignment.status == AssignmentStatus.ACTIVE).count()

            lines.append(f"👷 {s.name}: {done}✅ {active}🔵 {reopen}🔄 {complaints}⚠️ (total: {total})")

        return ChatResponse(message="\n".join(lines), intent="query_solver_performance", actions_taken=[f"{len(solvers)} solver(s)"])

    # ══════════════════════════════════════════════════════
    # READ-ONLY: For API endpoints
    # ══════════════════════════════════════════════════════

    def list_assignments(self, current_user, status_filter=None, solver_id=None, issue_id=None, skip=0, limit=20):
        q = self.db.query(IssueAssignment)

        if current_user.role == UserRole.PROBLEMSOLVER:
            q = q.filter(IssueAssignment.assigned_to_solver_id == current_user.id)
        elif current_user.role == UserRole.SUPERVISOR:
            q = q.filter(IssueAssignment.assigned_by_supervisor_id == current_user.id)

        if status_filter:
            q = q.filter(IssueAssignment.status == status_filter)
        if solver_id:
            q = q.filter(IssueAssignment.assigned_to_solver_id == solver_id)
        if issue_id:
            q = q.filter(IssueAssignment.issue_id == issue_id)

        total = q.count()
        items = q.order_by(IssueAssignment.created_at.desc()).offset(skip).limit(limit).all()

        return AssignmentListResponse(
            total=total,
            assignments=[self._to_response(a) for a in items],
        )

    def get_assignment(self, assignment_id: int):
        a = self.db.query(IssueAssignment).filter(IssueAssignment.id == assignment_id).first()
        return self._to_response(a) if a else None

    def get_call_logs(self, assignment_id: int):
        from app.models.call_log import CallLog
        logs = self.db.query(CallLog).filter(CallLog.assignment_id == assignment_id).order_by(CallLog.attempt_number).all()
        return CallLogListResponse(
            total=len(logs), assignment_id=assignment_id,
            call_logs=[CallLogResponse(
                id=l.id, assignment_id=l.assignment_id, solver_id=l.solver_id,
                solver_name=l.solver.name if l.solver else None,
                solver_phone=l.solver.phone if l.solver else None,
                attempt_number=l.attempt_number, initiated_at=l.initiated_at,
                answered_at=l.answered_at, ended_at=l.ended_at,
                status=l.status, updated_at=l.updated_at,
            ) for l in logs],
        )

    def _to_response(self, a):
        return AssignmentResponse(
            id=a.id, issue_id=a.issue_id,
            issue_title=a.issue.title if a.issue else None,
            assigned_to_solver_id=a.assigned_to_solver_id,
            solver_name=a.assigned_solver.name if a.assigned_solver else None,
            solver_phone=a.assigned_solver.phone if a.assigned_solver else None,
            assigned_by_supervisor_id=a.assigned_by_supervisor_id,
            supervisor_name=a.assigned_by_supervisor.name if a.assigned_by_supervisor else None,
            due_date=a.due_date, status=a.status,
            call_attempts=len(a.call_logs) if a.call_logs else 0,
            last_call_status=a.call_logs[-1].status.value if a.call_logs else None,
            created_at=a.created_at, updated_at=a.updated_at,
        )