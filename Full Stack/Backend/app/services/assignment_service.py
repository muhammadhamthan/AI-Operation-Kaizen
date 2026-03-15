"""
PURPOSE: Solver assignment + matching logic.
─────────────────────────────────────────────
Called by:
  - issue_service.py      (auto_assign after issue creation)
  - chatbot_service.py    (reassign, solver chat actions)
  - api/assignments.py    (dashboard read endpoints)

Write / mutation actions:
  1. auto_assign               — Stage 2: smart skill+workload matching
  2. reassign_from_chat        — Manager manually reassigns a solver

Dashboard read actions (role-aware, no N+1):
  3. list_assignments          — Paginated list with filters
  4. get_assignment            — Single assignment detail
  5. get_call_logs             — All call attempts for an assignment
  6. query_solver_performance  — Aggregate stats per solver (manager)

Rules:
  - AsyncSession only: always use select() + await db.execute()
  - Never use db.query()
  - auto_assign stays sync-compatible (called from Celery-compatible
    context via issue_service which is async — we make it async here
    to match the await call in issue_service)
  - Eager-load related rows with selectinload() to avoid N+1
  - All public methods are async
"""

import logging
from typing import Optional, Tuple

from sqlalchemy import select, func as sql_func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.issue import Issue
from app.models.issue_assignment import IssueAssignment
from app.models.issue_history import IssueHistory
from app.models.call_log import CallLog
from app.models.complaint import Complaint
from app.models.problem_solver_skill import ProblemSolverSkill
from app.core.enums import (
    IssueStatus, AssignmentStatus, ActionType, UserRole,
)
from app.schemas.chatbot_schema import ChatResponse
from app.schemas.assignment_schema import AssignmentResponse, AssignmentListResponse
from app.schemas.call_log_schema import CallLogListResponse, CallLogResponse

logger = logging.getLogger(__name__)


class AssignmentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════
    # 1. AUTO-ASSIGN SOLVER  (Stage 2)
    # ══════════════════════════════════════════════════════

    async def auto_assign(
        self,
        issue: Issue,
        problem_type: str,
        site_id: int,
        supervisor: User,
    ) -> Tuple[Optional[User], Optional[IssueAssignment]]:
        """
        Picks the best available solver for a given skill + site.

        Matching strategy:
          1. Skill must match problem_type and is_available = True
          2. Site-specific skill is preferred over global (site_id=NULL)
          3. Among candidates, pick the one with the lowest active workload
             (fewest ACTIVE assignments) — two separate DB calls, not N+1,
             because we load all candidates first then aggregate in one query

        After picking:
          - Creates IssueAssignment
          - Transitions issue → ASSIGNED
          - Writes IssueHistory
          - Does NOT enqueue the Twilio call — caller (issue_service) does
            that AFTER commit so the assignment row exists in the DB.
        """
        # ── Step 1: Find all matching skill rows ─────────────────
        # Order: site-specific first (site_id IS NOT NULL), then by priority DESC
        skills_stmt = (
            select(ProblemSolverSkill)
            .where(
                ProblemSolverSkill.skill_type == problem_type,
                ProblemSolverSkill.is_available == True,
                ProblemSolverSkill.site_id == site_id,   # exact site match only
            )
            .order_by(ProblemSolverSkill.priority.desc())
        )
        result = await self.db.execute(skills_stmt)
        site_skills = result.scalars().all()

        # Fall back to global solvers (site_id = NULL) if no site-specific match
        if not site_skills:
            skills_stmt = (
                select(ProblemSolverSkill)
                .where(
                    ProblemSolverSkill.skill_type == problem_type.lower(),
                    ProblemSolverSkill.is_available == True,
                    ProblemSolverSkill.site_id.is_(None),
                )
                .order_by(ProblemSolverSkill.priority.desc())
            )
            result = await self.db.execute(skills_stmt)
            site_skills = result.scalars().all()

        if not site_skills:
            logger.info(
                "No available solver for skill='%s' site_id=%s", problem_type, site_id
            )
            return None, None

        # ── Step 2: Get active workload for all candidates in one query ──
        candidate_ids = [s.solver_id for s in site_skills]

        workload_stmt = (
            select(
                IssueAssignment.assigned_to_solver_id,
                sql_func.count(IssueAssignment.id).label("active_count"),
            )
            .where(
                IssueAssignment.assigned_to_solver_id.in_(candidate_ids),
                IssueAssignment.status == AssignmentStatus.ACTIVE,
            )
            .group_by(IssueAssignment.assigned_to_solver_id)
        )
        workload_result = await self.db.execute(workload_stmt)
        workload_map: dict[int, int] = {
            row.assigned_to_solver_id: row.active_count
            for row in workload_result.all()
        }

        # ── Step 3: Pick solver with lowest workload ─────────────
        # Preserve skill priority ordering within same workload count
        best_skill: Optional[ProblemSolverSkill] = None
        lowest = float("inf")
        for skill in site_skills:
            count = workload_map.get(skill.solver_id, 0)  # 0 if not in map = no active
            if count < lowest:
                lowest = count
                best_skill = skill

        if not best_skill:
            return None, None

        # ── Step 4: Fetch the solver User row ────────────────────
        solver: Optional[User] = (
            await self.db.execute(
                select(User).where(User.id == best_skill.solver_id)
            )
        ).scalar_one_or_none()

        if not solver:
            logger.error("Solver user #%s not found despite having skills", best_skill.solver_id)
            return None, None

        # ── Step 5: Create assignment + update issue ──────────────
        assignment = IssueAssignment(
            issue_id=issue.id,
            assigned_to_solver_id=solver.id,
            assigned_by_supervisor_id=supervisor.id,
            due_date=issue.deadline_at,
            status=AssignmentStatus.ACTIVE,
        )
        self.db.add(assignment)

        old_status = issue.status.value
        issue.status = IssueStatus.ASSIGNED
        issue.track_status = "awaiting_solver"

        self.db.add(IssueHistory(
            issue_id=issue.id,
            changed_by_user_id=supervisor.id,
            old_status=old_status,
            new_status="ASSIGNED",
            action_type=ActionType.ASSIGN,
            details=(
                f"Auto-assigned to {solver.name} "
                f"(skill: {best_skill.skill_type}, "
                f"priority: {best_skill.priority}, "
                f"active workload: {lowest})"
            ),
        ))

        # flush to get assignment.id — caller commits the full transaction
        await self.db.flush()

        logger.info(
            "Auto-assigned issue #%s → solver '%s' (#%s), workload=%d",
            issue.id, solver.name, solver.id, lowest,
        )
        return solver, assignment

    # ══════════════════════════════════════════════════════
    # 2. REASSIGN SOLVER  (Manager via chat)
    # ══════════════════════════════════════════════════════

    async def reassign_from_chat(
        self,
        user: User,
        issue_id: Optional[int],
        solver_name: Optional[str],
    ) -> ChatResponse:
        if not issue_id or not solver_name:
            return ChatResponse(
                message="Specify: 'reassign issue 7 to Suresh'",
                intent="reassign_solver", actions_taken=[],
            )

        issue = await self._get_issue_or_none(issue_id)
        if not issue:
            return ChatResponse(
                message=f"Issue #{issue_id} not found.",
                intent="reassign_solver", actions_taken=[],
            )

        # Case-insensitive name search among active solvers
        solver: Optional[User] = (
            await self.db.execute(
                select(User).where(
                    User.role == UserRole.PROBLEMSOLVER,
                    User.is_active == True,
                    User.name.ilike(f"%{solver_name}%"),
                )
            )
        ).scalars().first()

        if not solver:
            return ChatResponse(
                message=f"No active solver matching '{solver_name}'.",
                intent="reassign_solver", actions_taken=[],
            )

        new_assignment = IssueAssignment(
            issue_id=issue_id,
            assigned_to_solver_id=solver.id,
            assigned_by_supervisor_id=user.id,
            due_date=issue.deadline_at,
            status=AssignmentStatus.ACTIVE,
        )
        self.db.add(new_assignment)

        old_status = issue.status.value
        issue.status = IssueStatus.ASSIGNED
        issue.track_status = "awaiting_solver"

        self.db.add(IssueHistory(
            issue_id=issue.id,
            changed_by_user_id=user.id,
            old_status=old_status,
            new_status="ASSIGNED",
            action_type=ActionType.ASSIGN,
            details=f"Reassigned to {solver.name} by {user.name}",
        ))

        await self.db.commit()
        await self.db.refresh(new_assignment)

        # Enqueue call chain after commit (assignment.id now exists in DB)
        self._enqueue_call(new_assignment.id)

        return ChatResponse(
            message=f"✅ Issue #{issue_id} reassigned to {solver.name}.\n📞 Calling solver now...",
            intent="reassign_solver",
            issue_id=issue_id,
            assignment_id=new_assignment.id,
            actions_taken=[
                f"New assignment #{new_assignment.id}",
                f"Assigned to {solver.name}",
                "Call chain queued",
            ],
        )

    # ══════════════════════════════════════════════════════
    # 3. DASHBOARD: Paginated assignment list  (API read)
    # ══════════════════════════════════════════════════════

    async def list_assignments(
        self,
        current_user: User,
        status_filter: Optional[AssignmentStatus] = None,
        solver_id: Optional[int] = None,
        issue_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> AssignmentListResponse:
        """
        Role-aware paginated list.
        PROBLEMSOLVER → only their own assignments
        SUPERVISOR    → only assignments they created
        MANAGER/ADMIN → all assignments

        Eager-loads issue, solvers, supervisor, call_logs in one pass.
        """
        stmt = (
            select(IssueAssignment)
            .options(
                selectinload(IssueAssignment.issue),
                selectinload(IssueAssignment.assigned_solver),
                selectinload(IssueAssignment.assigned_by_supervisor),
                selectinload(IssueAssignment.call_logs),
            )
        )

        # Role scope
        if current_user.role == UserRole.PROBLEMSOLVER:
            stmt = stmt.where(IssueAssignment.assigned_to_solver_id == current_user.id)
        elif current_user.role == UserRole.SUPERVISOR:
            stmt = stmt.where(IssueAssignment.assigned_by_supervisor_id == current_user.id)

        # Filters
        if status_filter:
            stmt = stmt.where(IssueAssignment.status == status_filter)
        if solver_id:
            stmt = stmt.where(IssueAssignment.assigned_to_solver_id == solver_id)
        if issue_id:
            stmt = stmt.where(IssueAssignment.issue_id == issue_id)

        # Count
        count_stmt = select(sql_func.count()).select_from(stmt.subquery())
        total: int = (await self.db.execute(count_stmt)).scalar()

        # Paginated fetch
        stmt = stmt.order_by(IssueAssignment.created_at.desc()).offset(skip).limit(limit)
        assignments = (await self.db.execute(stmt)).scalars().all()

        return AssignmentListResponse(
            total=total,
            assignments=[self._to_response(a) for a in assignments],
        )

    # ══════════════════════════════════════════════════════
    # 4. DASHBOARD: Single assignment detail  (API read)
    # ══════════════════════════════════════════════════════

    async def get_assignment(self, assignment_id: int) -> Optional[AssignmentResponse]:
        stmt = (
            select(IssueAssignment)
            .where(IssueAssignment.id == assignment_id)
            .options(
                selectinload(IssueAssignment.issue),
                selectinload(IssueAssignment.assigned_solver),
                selectinload(IssueAssignment.assigned_by_supervisor),
                selectinload(IssueAssignment.call_logs),
            )
        )
        assignment = (await self.db.execute(stmt)).scalar_one_or_none()
        return self._to_response(assignment) if assignment else None

    # ══════════════════════════════════════════════════════
    # 5. DASHBOARD: Call logs for one assignment  (API read)
    # ══════════════════════════════════════════════════════

    async def get_call_logs(self, assignment_id: int) -> CallLogListResponse:
        """
        All call attempts for an assignment, ordered by attempt number.
        Eager-loads solver to avoid N+1 per log row.
        """
        stmt = (
            select(CallLog)
            .where(CallLog.assignment_id == assignment_id)
            .options(selectinload(CallLog.solver))
            .order_by(CallLog.attempt_number)
        )
        logs = (await self.db.execute(stmt)).scalars().all()

        return CallLogListResponse(
            total=len(logs),
            assignment_id=assignment_id,
            call_logs=[
                CallLogResponse(
                    id=log.id,
                    assignment_id=log.assignment_id,
                    solver_id=log.solver_id,
                    solver_name=log.solver.name if log.solver else None,
                    solver_phone=log.solver.phone if log.solver else None,
                    attempt_number=log.attempt_number,
                    initiated_at=log.initiated_at,
                    answered_at=log.answered_at,
                    ended_at=log.ended_at,
                    status=log.status,
                    updated_at=log.updated_at,
                )
                for log in logs
            ],
        )

    # ══════════════════════════════════════════════════════
    # 6. DASHBOARD: Solver performance stats  (Manager)
    # ══════════════════════════════════════════════════════

    async def query_solver_performance(
        self,
        solver_name: Optional[str] = None,
    ) -> list[dict]:
        """
        Returns aggregate performance stats for all active solvers
        (or a single solver by name).

        All counts are computed in ONE query using conditional aggregation
        (SQL CASE/SUM) rather than one query per solver per metric.

        Returns a list of dicts — caller (chatbot or API) formats as needed.
        """
        # ── 1. Resolve solver(s) ─────────────────────────────────
        solver_stmt = select(User).where(
            User.role == UserRole.PROBLEMSOLVER,
            User.is_active == True,
        )
        if solver_name:
            solver_stmt = solver_stmt.where(User.name.ilike(f"%{solver_name}%"))

        solvers = (await self.db.execute(solver_stmt)).scalars().all()

        if not solvers:
            return []

        solver_ids = [s.id for s in solvers]
        solver_map = {s.id: s for s in solvers}

        # ── 2. Assignment counts — one aggregate query ────────────
        from sqlalchemy import case
        asgn_stmt = (
            select(
                IssueAssignment.assigned_to_solver_id.label("solver_id"),
                sql_func.count(IssueAssignment.id).label("total"),
                sql_func.sum(
                    case((IssueAssignment.status == AssignmentStatus.ACTIVE, 1), else_=0)
                ).label("active"),
                sql_func.sum(
                    case((IssueAssignment.status == AssignmentStatus.COMPLETED, 1), else_=0)
                ).label("completed"),
                sql_func.sum(
                    case((IssueAssignment.status == AssignmentStatus.REOPENED, 1), else_=0)
                ).label("reopened"),
            )
            .where(IssueAssignment.assigned_to_solver_id.in_(solver_ids))
            .group_by(IssueAssignment.assigned_to_solver_id)
        )
        asgn_rows = (await self.db.execute(asgn_stmt)).all()
        asgn_map = {row.solver_id: row for row in asgn_rows}

        # ── 3. Complaint counts — one aggregate query ─────────────
        complaint_stmt = (
            select(
                Complaint.target_solver_id.label("solver_id"),
                sql_func.count(Complaint.id).label("complaints"),
            )
            .where(Complaint.target_solver_id.in_(solver_ids))
            .group_by(Complaint.target_solver_id)
        )
        complaint_rows = (await self.db.execute(complaint_stmt)).all()
        complaint_map = {row.solver_id: row.complaints for row in complaint_rows}

        # ── 4. Assemble results ───────────────────────────────────
        results = []
        for sid in solver_ids:
            solver = solver_map[sid]
            asgn = asgn_map.get(sid)
            results.append({
                "solver_id": sid,
                "solver_name": solver.name,
                "total": int(asgn.total) if asgn else 0,
                "active": int(asgn.active) if asgn else 0,
                "completed": int(asgn.completed) if asgn else 0,
                "reopened": int(asgn.reopened) if asgn else 0,
                "complaints": complaint_map.get(sid, 0),
            })

        return results

    # ══════════════════════════════════════════════════════
    # PRIVATE HELPERS
    # ══════════════════════════════════════════════════════

    async def _get_issue_or_none(self, issue_id: int) -> Optional[Issue]:
        return (
            await self.db.execute(select(Issue).where(Issue.id == issue_id))
        ).scalar_one_or_none()

    @staticmethod
    def _enqueue_call(assignment_id: int) -> None:
        """
        Enqueues the Celery call chain.
        Must be called AFTER db.commit() so the assignment row exists in DB.
        """
        try:
            from app.workers.call_tasks import schedule_solver_call
            schedule_solver_call.delay(assignment_id)
            logger.info("Celery call chain queued for assignment #%s", assignment_id)
        except Exception:
            logger.exception(
                "Failed to queue Celery task for assignment #%s", assignment_id
            )

    @staticmethod
    def _to_response(assignment: IssueAssignment) -> AssignmentResponse:
        """
        Serialise an IssueAssignment ORM object to AssignmentResponse.
        Caller must have eager-loaded all relationships before calling this.
        """
        logs = assignment.call_logs or []
        return AssignmentResponse(
            id=assignment.id,
            issue_id=assignment.issue_id,
            issue_title=assignment.issue.title if assignment.issue else None,
            assigned_to_solver_id=assignment.assigned_to_solver_id,
            solver_name=assignment.assigned_solver.name if assignment.assigned_solver else None,
            solver_phone=assignment.assigned_solver.phone if assignment.assigned_solver else None,
            assigned_by_supervisor_id=assignment.assigned_by_supervisor_id,
            supervisor_name=assignment.assigned_by_supervisor.name if assignment.assigned_by_supervisor else None,
            due_date=assignment.due_date,
            status=assignment.status,
            call_attempts=len(logs),
            last_call_status=logs[-1].status.value if logs else None,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
        )
























# """
# PURPOSE: Solver assignment + matching logic.
# ─────────────────────────────────────────────
# Handles:
#   - Auto-assign solver (Stage 2)
#   - Reassign solver (Manager via chat)
#   - Get solver assignments (Solver via chat)
#   - Query solver performance (Manager via chat)
#   - Read-only list/detail for API
# """

# import logging
# from typing import Optional, Tuple

# from sqlalchemy.orm import Session
# from sqlalchemy import func as sql_func

# from app.models.user import User
# from app.models.issue import Issue
# from app.models.issue_assignment import IssueAssignment
# from app.models.issue_history import IssueHistory
# from app.models.complaint import Complaint
# from app.models.problem_solver_skill import ProblemSolverSkill 
# from app.core.enums import (
#     IssueStatus, AssignmentStatus, ActionType, UserRole,
# )
# from app.schemas.chatbot_schema import ChatResponse
# from app.schemas.assignment_schema import (
#     AssignmentResponse, AssignmentListResponse,
# )
# from app.schemas.call_log_schema import CallLogListResponse, CallLogResponse

# logger = logging.getLogger(__name__)


# class AssignmentService:
#     def __init__(self, db: Session):
#         self.db = db

#     # ══════════════════════════════════════════════════════
#     # AUTO-ASSIGN SOLVER (Stage 2)
#     # ══════════════════════════════════════════════════════

#     def auto_assign(
#         self, issue: Issue, problem_type: str,
#         site_id: int, supervisor: User,
#     ) -> Tuple[Optional[User], Optional[IssueAssignment]]:
#         """
#         Smart matching:
#         1. Find skills matching problem_type
#         2. Filter: exact site match OR NULL (works all sites)
#         3. Filter: is_available = True
#         4. Sort: site match first → priority DESC
#         5. Pick: lowest active workload
#         6. Create assignment → queue call
#         """
#         matching = (
#             self.db.query(ProblemSolverSkill)
#             .filter(
#                 ProblemSolverSkill.skill_type == problem_type,
#                 ProblemSolverSkill.is_available == True,
#                 (
#                     (ProblemSolverSkill.site_id == site_id) |
#                     (ProblemSolverSkill.site_id.is_(None))
#                 ),
#             )
#             .order_by(
#                 ProblemSolverSkill.site_id.is_(None).asc(),
#                 ProblemSolverSkill.priority.desc(),
#             )
#             .all()
#         )

#         if not matching:
#             return None, None

#         # Pick solver with lowest workload
#         best_id, best_skill = None, None
#         lowest = float("inf")

#         for skill in matching:
#             workload = self.db.query(sql_func.count(IssueAssignment.id)).filter(
#                 IssueAssignment.assigned_to_solver_id == skill.solver_id,
#                 IssueAssignment.status == AssignmentStatus.ACTIVE,
#             ).scalar()

#             if workload < lowest:
#                 lowest, best_id, best_skill = workload, skill.solver_id, skill

#         if not best_id:
#             return None, None

#         solver = self.db.query(User).filter(User.id == best_id).first()

#         assignment = IssueAssignment(
#             issue_id=issue.id,
#             assigned_to_solver_id=best_id,
#             assigned_by_supervisor_id=supervisor.id,
#             due_date=issue.deadline_at,
#             status=AssignmentStatus.ACTIVE,
#         )
#         self.db.add(assignment)

#         issue.status = IssueStatus.ASSIGNED
#         issue.track_status = "awaiting_solver"

#         self.db.add(IssueHistory(
#             issue_id=issue.id, changed_by_user_id=supervisor.id,
#             old_status="OPEN", new_status="ASSIGNED",
#             action_type=ActionType.ASSIGN,
#             details=f"Auto-assigned to {solver.name} (skill: {best_skill.skill_type}, priority: {best_skill.priority})",
#         ))

#         self.db.flush()

#         # Queue Twilio call
#         # try:
#         #     from app.workers.scheduler import schedule_solver_call
#         #     schedule_solver_call.delay(assignment.id)
#         # except Exception as e:
#         #     logger.warning(f"Call queue failed (Celery may not be running): {e}")

#         # return solver, assignment

#     # ══════════════════════════════════════════════════════
#     # SOLVER: Get assignments via chat
#     # ══════════════════════════════════════════════════════

#     async def get_solver_assignments_chat(self, solver: User) -> ChatResponse:
#         assignments = (
#             self.db.query(IssueAssignment)
#             .filter(
#                 IssueAssignment.assigned_to_solver_id == solver.id,
#                 IssueAssignment.status.in_([AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED]),
#             )
#             .order_by(IssueAssignment.created_at.desc())
#             .all()
#         )

#         if not assignments:
#             return ChatResponse(message="👷 No active assignments.", intent="check_assignment", actions_taken=[])

#         lines = [f"👷 {len(assignments)} active assignment(s):\n"]
#         for a in assignments:
#             i = a.issue
#             due = a.due_date.strftime('%Y-%m-%d') if a.due_date else 'N/A'
#             lines.append(
#                 f"📌 #{a.id} — Issue #{i.id}: {i.title}\n"
#                 f"   📍 {i.site.name if i.site else 'N/A'} | "
#                 f"⚡ {i.priority.value} | 📅 Due: {due} | {a.status.value}"
#             )

#         return ChatResponse(
#             message="\n".join(lines), intent="check_assignment",
#             actions_taken=[f"{len(assignments)} assignments"],
#         )

#     # ══════════════════════════════════════════════════════
#     # MANAGER: Reassign via chat
#     # ══════════════════════════════════════════════════════

#     async def reassign_from_chat(
#         self, user: User, issue_id: Optional[int], solver_name: Optional[str],
#     ) -> ChatResponse:
#         if not issue_id or not solver_name:
#             return ChatResponse(message="Specify: 'reassign issue 7 to Suresh'", intent="reassign_solver", actions_taken=[])

#         issue = self.db.query(Issue).filter(Issue.id == issue_id).first()
#         if not issue:
#             return ChatResponse(message=f"Issue #{issue_id} not found.", intent="reassign_solver", actions_taken=[])

#         solver = self.db.query(User).filter(
#             User.role == UserRole.PROBLEMSOLVER,
#             User.name.ilike(f"%{solver_name}%"),
#             User.is_active == True,
#         ).first()
#         if not solver:
#             return ChatResponse(message=f"Solver '{solver_name}' not found.", intent="reassign_solver", actions_taken=[])

#         new_assgn = IssueAssignment(
#             issue_id=issue_id, assigned_to_solver_id=solver.id,
#             assigned_by_supervisor_id=user.id, due_date=issue.deadline_at,
#             status=AssignmentStatus.ACTIVE,
#         )
#         self.db.add(new_assgn)

#         issue.status = IssueStatus.ASSIGNED
#         issue.track_status = "awaiting_solver"

#         self.db.add(IssueHistory(
#             issue_id=issue.id, changed_by_user_id=user.id,
#             old_status=issue.status.value, new_status="ASSIGNED",
#             action_type=ActionType.ASSIGN,
#             details=f"Reassigned to {solver.name} by {user.name}",
#         ))
#         self.db.commit()
#         self.db.refresh(new_assgn)

#         # try:
#         #     from app.workers.scheduler import schedule_solver_call
#         #     schedule_solver_call.delay(new_assgn.id)
#         # except Exception:
#         #     pass

#         return ChatResponse(
#             message=f"✅ Issue #{issue_id} reassigned to {solver.name}.\n📞 Calling solver...",
#             intent="reassign_solver", issue_id=issue_id, assignment_id=new_assgn.id,
#             actions_taken=[f"New assignment #{new_assgn.id}", f"Assigned to {solver.name}"],
#         )

#     # ══════════════════════════════════════════════════════
#     # MANAGER: Solver performance via chat
#     # ══════════════════════════════════════════════════════

#     async def query_solver_performance_chat(
#         self, user: User, solver_name: Optional[str],
#     ) -> ChatResponse:
#         query = self.db.query(User).filter(
#             User.role == UserRole.PROBLEMSOLVER, User.is_active == True,
#         )
#         if solver_name:
#             query = query.filter(User.name.ilike(f"%{solver_name}%"))

#         solvers = query.all()
#         if not solvers:
#             return ChatResponse(message=f"No solver matching '{solver_name}'.", intent="query_solver_performance", actions_taken=[])

#         lines = ["📊 Solver Performance:\n"]
#         for s in solvers:
#             total = self.db.query(IssueAssignment).filter(IssueAssignment.assigned_to_solver_id == s.id).count()
#             done = self.db.query(IssueAssignment).filter(IssueAssignment.assigned_to_solver_id == s.id, IssueAssignment.status == AssignmentStatus.COMPLETED).count()
#             reopen = self.db.query(IssueAssignment).filter(IssueAssignment.assigned_to_solver_id == s.id, IssueAssignment.status == AssignmentStatus.REOPENED).count()
#             complaints = self.db.query(Complaint).filter(Complaint.target_solver_id == s.id).count()
#             active = self.db.query(IssueAssignment).filter(IssueAssignment.assigned_to_solver_id == s.id, IssueAssignment.status == AssignmentStatus.ACTIVE).count()

#             lines.append(f"👷 {s.name}: {done}✅ {active}🔵 {reopen}🔄 {complaints}⚠️ (total: {total})")

#         return ChatResponse(message="\n".join(lines), intent="query_solver_performance", actions_taken=[f"{len(solvers)} solver(s)"])

#     # ══════════════════════════════════════════════════════
#     # READ-ONLY: For API endpoints
#     # ══════════════════════════════════════════════════════

#     def list_assignments(self, current_user, status_filter=None, solver_id=None, issue_id=None, skip=0, limit=20):
#         q = self.db.query(IssueAssignment)

#         if current_user.role == UserRole.PROBLEMSOLVER:
#             q = q.filter(IssueAssignment.assigned_to_solver_id == current_user.id)
#         elif current_user.role == UserRole.SUPERVISOR:
#             q = q.filter(IssueAssignment.assigned_by_supervisor_id == current_user.id)

#         if status_filter:
#             q = q.filter(IssueAssignment.status == status_filter)
#         if solver_id:
#             q = q.filter(IssueAssignment.assigned_to_solver_id == solver_id)
#         if issue_id:
#             q = q.filter(IssueAssignment.issue_id == issue_id)

#         total = q.count()
#         items = q.order_by(IssueAssignment.created_at.desc()).offset(skip).limit(limit).all()

#         return AssignmentListResponse(
#             total=total,
#             assignments=[self._to_response(a) for a in items],
#         )

#     def get_assignment(self, assignment_id: int):
#         a = self.db.query(IssueAssignment).filter(IssueAssignment.id == assignment_id).first()
#         return self._to_response(a) if a else None

#     def get_call_logs(self, assignment_id: int):
#         from app.models.call_log import CallLog
#         logs = self.db.query(CallLog).filter(CallLog.assignment_id == assignment_id).order_by(CallLog.attempt_number).all()
#         return CallLogListResponse(
#             total=len(logs), assignment_id=assignment_id,
#             call_logs=[CallLogResponse(
#                 id=l.id, assignment_id=l.assignment_id, solver_id=l.solver_id,
#                 solver_name=l.solver.name if l.solver else None,
#                 solver_phone=l.solver.phone if l.solver else None,
#                 attempt_number=l.attempt_number, initiated_at=l.initiated_at,
#                 answered_at=l.answered_at, ended_at=l.ended_at,
#                 status=l.status, updated_at=l.updated_at,
#             ) for l in logs],
#         )

#     def _to_response(self, a):
#         return AssignmentResponse(
#             id=a.id, issue_id=a.issue_id,
#             issue_title=a.issue.title if a.issue else None,
#             assigned_to_solver_id=a.assigned_to_solver_id,
#             solver_name=a.assigned_solver.name if a.assigned_solver else None,
#             solver_phone=a.assigned_solver.phone if a.assigned_solver else None,
#             assigned_by_supervisor_id=a.assigned_by_supervisor_id,
#             supervisor_name=a.assigned_by_supervisor.name if a.assigned_by_supervisor else None,
#             due_date=a.due_date, status=a.status,
#             call_attempts=len(a.call_logs) if a.call_logs else 0,
#             last_call_status=a.call_logs[-1].status.value if a.call_logs else None,
#             created_at=a.created_at, updated_at=a.updated_at,
#         )