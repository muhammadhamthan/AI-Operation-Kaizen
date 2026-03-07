"""
PURPOSE: Compute solver performance scores on the backend.
Replaces frontend scoreEngine.js entirely.
Same formula — but queries PostgreSQL instead of mock arrays.
"""

import logging
from typing import List, Optional
from datetime import datetime, timezone

# from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sql_func,select

from app.models.user import User
from app.models.issue import Issue
from app.models.issue_assignment import IssueAssignment
from app.models.call_log import CallLog
from app.models.complaint import Complaint
from app.models.problem_solver_skill import ProblemSolverSkill
from app.models.supervisor_site import SupervisorSite
from app.core.enums import (
    IssueStatus, AssignmentStatus, CallStatus, UserRole,
)
from app.schemas.solver_performance_schema import (
    SolverPerformanceDetail,
    SolverWithPerformance,
    SolverPerformanceListResponse,
)

logger = logging.getLogger(__name__)

FIXED_STATUSES = [AssignmentStatus.COMPLETED]


class SolverPerformanceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════
    # MAIN: Get all solvers with performance (role-filtered)
    # ══════════════════════════════════════════════════════

    async def get_solvers_with_performance(
        self, current_user: User
    ) -> SolverPerformanceListResponse:

        solvers = await self._get_visible_solvers(current_user)

        results = []

        for solver in solvers:
            perf = await self._calculate_score(solver.id)
            skills = await self._get_solver_skills(solver.id)
            sites = await self._get_solver_sites(solver.id)

            results.append(
                SolverWithPerformance(
                    id=solver.id,
                    name=solver.name,
                    phone=solver.phone,
                    email=solver.email,
                    role=solver.role.value,
                    is_active=solver.is_active,
                    performance=perf,
                    sites=sites,
                    skills=skills,
                )
            )

        return SolverPerformanceListResponse(
            total=len(results),
            solvers=results,
        )

    # ══════════════════════════════════════════════════════
    # SINGLE SOLVER
    # ══════════════════════════════════════════════════════

    async def get_solver_performance(
        self, solver_id: int
    ) -> Optional[SolverWithPerformance]:

        result = await self.db.execute(
            select(User).where(
                User.id == solver_id,
                User.role == UserRole.PROBLEMSOLVER
            )
        )

        solver = result.scalar_one_or_none()

        if not solver:
            return None

        perf = await self._calculate_score(solver_id)
        skills = await self._get_solver_skills(solver_id)
        sites = await self._get_solver_sites(solver_id)

        return SolverWithPerformance(
            id=solver.id,
            name=solver.name,
            phone=solver.phone,
            email=solver.email,
            role=solver.role.value,
            is_active=solver.is_active,
            performance=perf,
            sites=sites,
            skills=skills,
        )

    # ══════════════════════════════════════════════════════
    # CORE: Calculate solver score
    # Same formula as frontend scoreEngine.js
    # ══════════════════════════════════════════════════════

    async def _calculate_score(self, solver_id: int) -> SolverPerformanceDetail:
        now = datetime.now(timezone.utc)

        # ── All assignments for this solver ─────────────
        result = (await self.db.execute(
            select(IssueAssignment).where(
                IssueAssignment.assigned_to_solver_id == solver_id
            )
        )
        ).scalars().all()

        all_assignments = result
        total_assigned = len(all_assignments)

        # ── Completed assignments ────────────────────────
        completed_assignments = [
            a for a in all_assignments
            if a.status == AssignmentStatus.COMPLETED
        ]
        completed_count = len(completed_assignments)

        # ── Completion rate (40% weight) ─────────────────
        completion_rate = completed_count / total_assigned if total_assigned > 0 else 0
        completion_score = completion_rate * 40

        # ── On-time rate (30% weight) ────────────────────
        on_time_count = 0
        for a in completed_assignments:
            if a.due_date and a.updated_at:
                if a.updated_at <= a.due_date:
                    on_time_count += 1

        on_time_rate = on_time_count / completed_count if completed_count > 0 else 0
        on_time_score = on_time_rate * 30

        # ── Call answer rate (20% weight) ────────────────
        solver_calls = (
            await self.db.execute(
                select(CallLog).where(CallLog.solver_id == solver_id)
            )
        ).scalars().all()
        total_calls = len(solver_calls)
        answered_calls = len([c for c in solver_calls if c.status == CallStatus.ANSWERED])
        call_answer_rate = answered_calls / total_calls if total_calls > 0 else 1.0
        call_score = call_answer_rate * 20

        # ── Complaint penalty (10% weight) ───────────────
        result = await self.db.execute(
            select(sql_func.count()).where(
                Complaint.target_solver_id == solver_id
            )
        )

        complaint_count = result.scalar() or 0
        complaint_penalty = min(complaint_count * 3, 10)
        complaint_score = 10 - complaint_penalty

        # ── Total score ──────────────────────────────────
        total_score = round(completion_score + on_time_score + call_score + complaint_score)
        total_score = max(0, min(100, total_score))

        # ── Label ────────────────────────────────────────
        if total_score >= 80:
            label, label_color = "Top Performer", "#10a37f"
        elif total_score >= 55:
            label, label_color = "Good", "#f59e0b"
        else:
            label, label_color = "Needs Attention", "#ef4444"

        # ── Status counts ────────────────────────────────
        in_progress = len([a for a in all_assignments if a.status == AssignmentStatus.ACTIVE
                           and self._get_issue_status(a.issue_id) == IssueStatus.IN_PROGRESS])
        assigned_not_started = len([a for a in all_assignments if a.status == AssignmentStatus.ACTIVE
                                     and self._get_issue_status(a.issue_id) in [IssueStatus.ASSIGNED, IssueStatus.OPEN]])
        reopened = len([a for a in all_assignments if a.status == AssignmentStatus.REOPENED])

        escalated = len([
            a for a in all_assignments
            if self._get_issue_status(a.issue_id) == IssueStatus.ESCALATED
        ])

        overdue = len([
            a for a in all_assignments
            if a.due_date and a.due_date < now
            and a.status != AssignmentStatus.COMPLETED
        ])

        active_count = in_progress + assigned_not_started + reopened

        # ── ML predictions ───────────────────────────────
        predicted_days = None
        escalation_prob = None
        try:
            from app.ml.predictor import MLPredictor
            predictor = MLPredictor()
            predicted_days = predictor.predict_completion_time(
                solver_id=solver_id,
                completion_rate=round(completion_rate * 100),
                on_time_rate=round(on_time_rate * 100),
                call_answer_rate=round(call_answer_rate * 100),
                active_count=active_count,
                complaint_count=complaint_count,
            )
            escalation_prob = predictor.predict_solver_escalation(
                score=total_score,
                active_count=active_count,
                overdue_count=overdue,
                missed_calls=total_calls - answered_calls,
                complaint_count=complaint_count,
            )
        except Exception as e:
            logger.debug(f"ML prediction skipped: {e}")

        return SolverPerformanceDetail(
            solver_id=solver_id,
            score=total_score,
            label=label,
            label_color=label_color,
            total_assigned=total_assigned,
            completed_count=completed_count,
            active_count=active_count,
            in_progress_count=in_progress,
            assigned_not_started_count=assigned_not_started,
            reopened_count=reopened,
            escalated_count=escalated,
            overdue_count=overdue,
            completion_rate=round(completion_rate * 100),
            on_time_rate=round(on_time_rate * 100),
            call_answer_rate=round(call_answer_rate * 100),
            total_calls=total_calls,
            answered_calls=answered_calls,
            missed_calls=total_calls - answered_calls,
            complaint_count=complaint_count,
            predicted_completion_days=predicted_days,
            escalation_probability=escalation_prob,
        )

    # ══════════════════════════════════════════════════════
    # HELPERS
    # ══════════════════════════════════════════════════════

    async def _get_issue_status(self, issue_id: int):

        result = await self.db.execute(
            select(Issue.status).where(Issue.id == issue_id)
        )

        return result.scalar_one_or_none()

    async def _get_solver_skills(self, solver_id: int) -> List[str]:
        result = await self.db.execute(
            select(ProblemSolverSkill.skill_type)
            .where(ProblemSolverSkill.solver_id == solver_id)
            .distinct()
        )

        return result.scalars().all()

    async def _get_solver_sites(self, solver_id: int) -> List[str]:

        from app.models.site import Site

        result = await self.db.execute(
            select(ProblemSolverSkill.site_id)
            .where(
                ProblemSolverSkill.solver_id == solver_id,
                ProblemSolverSkill.site_id.is_not(None),
            )
            .distinct()
        )

        site_ids = result.scalars().all()

        if not site_ids:
            return []

        result = await self.db.execute(
            select(Site.name).where(Site.id.in_(site_ids))
        )

        return result.scalars().all()

    async def _get_visible_solvers(self, user: User) -> List[User]:

        # ── Get all active solvers ───────────────────────────
        result = await self.db.execute(
            select(User).where(
                User.role == UserRole.PROBLEMSOLVER,
                User.is_active == True
            )
        )

        all_solvers = result.scalars().all()

        # ── Manager sees all solvers ─────────────────────────
        if user.role == UserRole.MANAGER:
            return all_solvers

        # ── Supervisor sees solvers from their sites ─────────
        if user.role == UserRole.SUPERVISOR:

            site_result = await self.db.execute(
                select(SupervisorSite.c.site_id).where(
                    SupervisorSite.c.supervisor_id == user.id
                )
            )

            site_ids = site_result.scalars().all()

            if not site_ids:
                return []

            solver_result = await self.db.execute(
                select(ProblemSolverSkill.solver_id)
                .where(ProblemSolverSkill.site_id.in_(site_ids))
                .distinct()
            )

            solver_ids = solver_result.scalars().all()

            return [s for s in all_solvers if s.id in solver_ids]

        # ── Solver sees only themselves ──────────────────────
        if user.role == UserRole.PROBLEMSOLVER:
            return [s for s in all_solvers if s.id == user.id]

        return all_solvers