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
from difflib import SequenceMatcher


from sqlalchemy import select, func as sql_func, case
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
            .where(ProblemSolverSkill.is_available == True)
            .order_by(
                case(
                    (ProblemSolverSkill.site_id == site_id, 0),
                    else_=1,
                ),
                ProblemSolverSkill.priority.desc(),
            )
        )
        result = await self.db.execute(skills_stmt)
        all_skills = result.scalars().all()

        if not all_skills:
            logger.info("No available solvers in system")
            return None, None

        # Split — already priority-sorted from DB
        site_skills   = [s for s in all_skills if s.site_id == site_id]
        global_skills = [s for s in all_skills if s.site_id is None]

        # ── Step 2: Fuzzy match — site-specific first, fallback global ──
        matched = self._match_skill_type(problem_type, site_skills)
        pool = site_skills
        if not matched:
            matched = self._match_skill_type(problem_type, global_skills)
            pool = global_skills

        if not matched:
            logger.info(
                "No skill match for '%s' site_id=%s", problem_type, site_id
            )
            return None, None
        
                # Candidates are already priority-sorted from the DB query
        site_skills = [s for s in pool if s.skill_type == matched]

        # ── Step 3: Get active workload for all candidates in one query ──
        candidate_ids = [s.solver_id for s in site_skills]

        workload_stmt = (
            select(
                IssueAssignment.assigned_to_solver_id,
                sql_func.count(IssueAssignment.id).label("active_count"),
            )
            .where(
                IssueAssignment.assigned_to_solver_id.in_(candidate_ids),
                IssueAssignment.status.in_([AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED]),
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
        self._trigger_score_refresh_for_issue(issue_id)

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
        
    def _match_skill_type(
        self,
        problem_type: str,
        skills: list[ProblemSolverSkill],
    ) -> Optional[str]:
        """
        Multi-strategy matcher (fastest to slowest):
        1. Exact match
        2. Prefix match         — 'network' matches 'network engineer'
        3. Word subset match    — 'electrical work' matches 'electrical'
        4. Fuzzy ratio          — typo tolerance ('electrcal' → 'electrical')
        """
        if not skills:
            return None

        pt = problem_type.lower().strip()
        pt_words = set(pt.split())
        sm = SequenceMatcher(None, pt, "")
        best, best_score = None, 0.0

        for s in skills:
            name = s.skill_type.lower().strip()
            name_words = set(name.split())

            # 1. Exact
            if name == pt:
                return s.skill_type

            # 2. Prefix — 'network' in 'network engineer' or vice versa
            if name.startswith(pt) or pt.startswith(name):
                return s.skill_type

            # 3. Word subset — any word from DB skill found in problem_type
            #    'electrical work urgent' → skill 'electrical' → match
            if name_words & pt_words:
                return s.skill_type

            # 4. Fuzzy — handles typos, keep best score across all skills
            sm.set_seq2(name)
            score = sm.ratio()
            if score > best_score:
                best_score, best = score, s.skill_type

        return best if best_score > 0.6 else None  # lowered from 0.75 for better recall
    
    def _trigger_score_refresh_for_issue(self, issue_id: int) -> None:
        """
        Fire-and-forget: enqueue Celery task to refresh site + solver scores
        for this issue. Must be called AFTER db.commit().
        """
        try:
            from app.workers.score_task import trigger_issue_score_refresh
            trigger_issue_score_refresh.delay(issue_id)
        except Exception:
            logger.exception("Failed to enqueue score refresh for issue #%s", issue_id)