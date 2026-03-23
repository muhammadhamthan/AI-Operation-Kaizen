"""
PURPOSE: Complaint handling + issue reopening.
───────────────────────────────────────────────
Called by chatbot_service when supervisor raises a complaint.
Also provides read-only list/detail for API.
"""

import logging
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.user import User
from app.models.issue import Issue
from app.models.issue_assignment import IssueAssignment
from app.models.complaint import Complaint
from app.models.issue_history import IssueHistory
from app.models.chat_history import ChatHistory
from app.core.enums import (
    IssueStatus, AssignmentStatus, ActionType, ChatRole, UserRole,
)
from app.schemas.chatbot_schema import ChatResponse
from app.schemas.complaint_schema import (
    ComplaintResponse, ComplaintListResponse,
)

logger = logging.getLogger(__name__)


class ComplaintService:
    def __init__(self, db: Session):
        self.db = db

    # ══════════════════════════════════════════════════════
    # CREATE COMPLAINT FROM CHAT (Stage 6)
    # ══════════════════════════════════════════════════════

    async def create_from_chat(
        self, user: User, message: str,
        image_url: Optional[str], issue_id: Optional[int],
    ) -> ChatResponse:
        """
        1. Find issue
        2. Find active assignment
        3. Create complaint
        4. Issue → REOPENED
        5. Assignment → REOPENED
        6. Queue re-call
        """
        # Find issue
        if not issue_id:
            recent = (
                self.db.query(Issue)
                .filter(
                    Issue.raised_by_supervisor_id == user.id,
                    Issue.status.in_([
                        IssueStatus.RESOLVED_PENDING_REVIEW,
                        IssueStatus.COMPLETED,
                        IssueStatus.IN_PROGRESS,
                    ]),
                )
                .order_by(Issue.updated_at.desc())
                .first()
            )
            if not recent:
                return ChatResponse(
                    message="Specify: 'complaint about issue 5'",
                    intent="raise_complaint", actions_taken=[],
                )
            issue_id = recent.id

        issue = self.db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            return ChatResponse(message=f"Issue #{issue_id} not found.", intent="raise_complaint", actions_taken=[])

        assgn = (
            self.db.query(IssueAssignment)
            .filter(
                IssueAssignment.issue_id == issue_id,
                IssueAssignment.status.in_([AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED]),
            )
            .order_by(IssueAssignment.created_at.desc())
            .first()
        )
        if not assgn:
            return ChatResponse(message=f"No assignment for issue #{issue_id}.", intent="raise_complaint", actions_taken=[])

        # Create complaint
        complaint = Complaint(
            issue_id=issue_id, assignment_id=assgn.id,
            raised_by_supervisor_id=user.id,
            target_solver_id=assgn.assigned_to_solver_id,
            complaint_details=message,
            complaint_image_url=image_url,
        )
        self.db.add(complaint)

        # Reopen
        old_status = issue.status
        issue.status = IssueStatus.REOPENED
        issue.track_status = "in_progress"
        assgn.status = AssignmentStatus.REOPENED

        self.db.add(IssueHistory(
            issue_id=issue.id, changed_by_user_id=user.id,
            old_status=old_status.value, new_status="REOPENED",
            action_type=ActionType.COMPLAINT,
            details=f"Complaint by {user.name}: {message[:100]}",
        ))

        # System message
        self.db.add(ChatHistory(
            user_id=None, issue_id=issue_id, role_in_chat=ChatRole.SYSTEM,
            message=f"⚠️ Complaint filed. Assignment #{assgn.id} reopened.",
            attachments=[],
        ))

        self.db.commit()
        self.db.refresh(complaint)

        # Re-call solver
        try:
            from app.workers.scheduler import schedule_solver_call
            schedule_solver_call.delay(assgn.id)
        except Exception as e:
            logger.error(f"Re-call queue failed: {e}")

        return ChatResponse(
            message=f"⚠️ Complaint #{complaint.id} filed for Issue #{issue_id}.\nReopened. Calling solver again.",
            intent="raise_complaint",
            issue_id=issue_id,
            assignment_id=assgn.id,
            complaint_id=complaint.id,
            actions_taken=[
                f"Complaint #{complaint.id}", f"Issue → REOPENED",
                f"Assignment → REOPENED", "Re-calling solver",
            ],
        )

    # ══════════════════════════════════════════════════════
    # READ-ONLY: For API
    # ══════════════════════════════════════════════════════

    async def list_complaints(
        self,
        current_user,
        issue_id=None,
        solver_id=None,
        skip=0,
        # limit=20,
    ):

        # Base query
        stmt = select(Complaint)

        # Role based filtering
        if current_user.role == UserRole.SUPERVISOR:
            stmt = stmt.where(
                Complaint.raised_by_supervisor_id == current_user.id
            )

        elif current_user.role == UserRole.PROBLEMSOLVER:
            stmt = stmt.where(
                Complaint.target_solver_id == current_user.id
            )

        # Optional filters
        if issue_id:
            stmt = stmt.where(Complaint.issue_id == issue_id)

        if solver_id:
            stmt = stmt.where(Complaint.target_solver_id == solver_id)

        # ─────────────────────────────
        # COUNT QUERY
        # ─────────────────────────────

        count_stmt = select(func.count()).select_from(stmt.subquery())

        total = (await self.db.execute(count_stmt)).scalar()

        # ─────────────────────────────
        # FETCH ITEMS
        # ─────────────────────────────

        stmt = (
            stmt
            .order_by(Complaint.created_at.desc())
            .offset(skip)
            # .limit()
        )

        result = await self.db.execute(stmt)

        # scalars() returns Complaint ORM objects
        items = result.scalars().all()

        return ComplaintListResponse(
            total=total,
            complaints=[self._to_response(c) for c in items],
        )

    async def get_complaint(self, complaint_id: int):

        stmt = select(Complaint).where(Complaint.id == complaint_id)

        result = await self.db.execute(stmt)

        # returns Complaint object or None
        complaint = result.scalar_one_or_none()

        return self._to_response(complaint) if complaint else None

    def _to_response(self, c):
        return ComplaintResponse(
            id=c.id, issue_id=c.issue_id,
            issue_title=c.issue.title if c.issue else None,
            assignment_id=c.assignment_id,
            raised_by_supervisor_id=c.raised_by_supervisor_id,
            supervisor_name=c.raised_by_supervisor.name if c.raised_by_supervisor else None,
            target_solver_id=c.target_solver_id,
            solver_name=c.target_solver.name if c.target_solver else None,
            complaint_details=c.complaint_details,
            complaint_image_url=c.complaint_image_url,
            created_at=c.created_at, updated_at=c.updated_at,
        )