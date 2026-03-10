"""
PURPOSE: All issue-related business logic.
──────────────────────────────────────────
Called by:
  - chatbot_service.py (chat-based actions)
  - api/issues.py (read-only endpoints)

Handles:
  - Create issue from chat (Stage 1)
  - Auto-assign solver (Stage 2)
  - Query issues by role
  - Check issue status
  - Update issue from chat
  - Extend deadline
  - Solver: update work status
  - Solver: complete work (Stage 5)
  - Solver: report blocker
  - Supervisor: approve completion
  - Query escalations
  - Query overdue issues
  - Issue detail + timeline
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func,select

from app.models.user import User
from app.models.site import Site
from app.models.issue import Issue
from app.models.issue_assignment import IssueAssignment
from app.models.issue_image import IssueImage
from app.models.issue_history import IssueHistory
from app.models.escalation import Escalation
from app.models.chat_history import ChatHistory
from app.models.supervisor_site import SupervisorSite
from app.core.enums import (
    IssueStatus, AssignmentStatus, Priority,
    ImageType, AIFlag, ActionType, ChatRole, UserRole,
)
from app.schemas.chatbot_schema import ChatResponse
from app.schemas.issue_schema import (
    IssueResponse, IssueListResponse, IssueDetailResponse,
    IssueImageBrief, AssignmentBrief,
)
from app.schemas.history_schema import (
    IssueHistoryResponse, IssueHistoryListResponse,
)

logger = logging.getLogger(__name__)


class IssueService:
    def __init__(self, db: Session):
        self.db = db

    # ══════════════════════════════════════════════════════
    # CREATE ISSUE FROM CHAT (Stage 1 + 2 + 3)
    # ══════════════════════════════════════════════════════

    async def create_from_chat(
        self, user: User, message: str,
        image_url: Optional[str], ai_service, 
    ) -> ChatResponse:
        """
        Full Stage 1-3 flow:
        1. Get supervisor's sites
        2. AI extracts issue details
        3. Match site
        4. Create issue
        5. Save BEFORE image if provided
        6. Auto-assign solver
        7. Queue Twilio call
        """
        actions = []

        # 1. Get sites
        site_ids = [
            r[0] for r in
            self.db.query(SupervisorSite.c.site_id)
            .filter(SupervisorSite.c.supervisor_id == user.id).all()
        ]
        sites = (
            self.db.query(Site).filter(Site.id.in_(site_ids)).all() 
            if site_ids else self.db.query(Site).all()
        )
        site_names = [s.name for s in sites]

        # 2. AI extraction
        extraction = await ai_service.extract_issue_details(
            message=message, available_sites=site_names,
        )

        # 3. Match site
        site = self._match_site(extraction.location, sites) #here we can use the user's langtitude and latitude to match the site more accurately, we have to update the frontend to enable to get the user location and match based on it .
        if not site:
            return ChatResponse(
                message=(
                    f"❌ Couldn't find site '{extraction.location}'. "
                    f"Available: {', '.join(site_names)}"
                ),
                intent="create_issue",
                actions_taken=["Site matching failed"],
            )

        # 4. Create issue
        deadline = datetime.now(timezone.utc) + timedelta(days=extraction.days_to_fix)#Frontend Converts to User Timezone User mobile knows its own timezone automatically.
        issue = Issue(
            site_id=site.id,
            raised_by_supervisor_id=user.id,
            title=extraction.title,
            description=extraction.description,
            priority=extraction.priority,
            deadline_at=deadline,
            status=IssueStatus.OPEN,
            track_status="awaiting_solver",
            latitude=site.latitude,
            longitude=site.longitude,
        )
        self.db.add(issue)
        self.db.flush()
        actions.append(f"Issue #{issue.id} created: '{issue.title}'")

        # 5. BEFORE image
        if image_url:
            self.db.add(IssueImage(
                issue_id=issue.id, uploaded_by_user_id=user.id,
                image_url=image_url, image_type=ImageType.BEFORE,
                ai_flag=AIFlag.NOT_CHECKED, ai_details={},
            ))
            actions.append("BEFORE image saved")

        # History: OPEN
        self._add_history(issue.id, user.id, None, "OPEN",
            ActionType.ASSIGN, f"Created via chat by {user.name}")

        # 6. Auto-assign
        from app.services.assignment_service import AssignmentService
        assignment_svc = AssignmentService(self.db) # to we need to add the solvers with sites , so they can be assigned for work later ?
        solver, assignment = assignment_svc.auto_assign(
            issue=issue,
            problem_type=extraction.problem_type,
            site_id=site.id,
            supervisor=user,
        )

        if solver and assignment:
            actions.append(f"Solver {solver.name} assigned (#{assignment.id})")
            actions.append(f"Twilio call queued to {solver.phone}")
        else:
            actions.append("No solver available — awaiting manual assignment")

        self.db.commit()
        self.db.refresh(issue)

        # Build response
        lines = [
            f"✅ Issue #{issue.id} created!",
            f"📍 Site: {site.name}",
            f"🔧 Type: {extraction.problem_type}",
            f"⚡ Priority: {extraction.priority.value}",
            f"📅 Deadline: {deadline.strftime('%Y-%m-%d %H:%M')}",
        ]
        if solver:
            lines.extend([f"👷 Assigned to: {solver.name}", "📞 Calling solver now..."])
        else:
            lines.append("⏳ Awaiting solver assignment...")

        return ChatResponse(
            message="\n".join(lines),
            intent="create_issue",
            issue_id=issue.id,
            assignment_id=assignment.id if assignment else None,
            actions_taken=actions,
            data={
                "issue_id": issue.id, "site": site.name,
                "problem_type": extraction.problem_type,
                "priority": extraction.priority.value,
                "solver_name": solver.name if solver else None,
            },
        )

    # ══════════════════════════════════════════════════════
    # QUERY ISSUES FROM CHAT
    # ══════════════════════════════════════════════════════

    async def query_from_chat(self, user: User) -> ChatResponse: # we are not using this fucnion any where
        query = self.db.query(Issue)

        if user.role == UserRole.SUPERVISOR:
            site_ids = self._get_supervisor_site_ids(user.id)
            query = query.filter(Issue.site_id.in_(site_ids))
        elif user.role == UserRole.PROBLEMSOLVER:
            assigned_ids = [
                r[0] for r in
                self.db.query(IssueAssignment.issue_id)
                .filter(IssueAssignment.assigned_to_solver_id == user.id).all()
            ]
            query = query.filter(Issue.id.in_(assigned_ids))

        issues = query.order_by(Issue.created_at.desc()).limit(15).all()
        total = query.count()

        if total == 0:
            return ChatResponse(message="📋 No issues found.", intent="query_issues", actions_taken=[])

        emoji = {
            "OPEN": "🔴", "ASSIGNED": "🟡", "IN_PROGRESS": "🔵",
            "RESOLVED_PENDING_REVIEW": "🟠", "COMPLETED": "🟢",
            "REOPENED": "🔴", "ESCALATED": "⚠️",
        }
        lines = [f"📋 {total} issue(s):\n"]
        for i in issues:
            e = emoji.get(i.status.value, "⚪")
            lines.append(f"{e} #{i.id} — {i.title} [{i.priority.value}] ({i.status.value})")

        return ChatResponse(
            message="\n".join(lines), intent="query_issues",
            actions_taken=[f"Retrieved {total} issues"],
            data={"total": total, "issues": [{"id": i.id, "title": i.title, "status": i.status.value, "priority": i.priority.value} for i in issues]},
        )

    # ══════════════════════════════════════════════════════
    # CHECK STATUS FROM CHAT
    # ══════════════════════════════════════════════════════

    async def check_status_chat(self, user: User, issue_id: Optional[int]) -> ChatResponse: # have to update role based access for this function and other functions in this class
        if not issue_id:
            return ChatResponse(message="Please specify: 'status of issue 5'", intent="check_status", actions_taken=[])

        issue = self.db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            return ChatResponse(message=f"Issue #{issue_id} not found.", intent="check_status", actions_taken=[])

        lines = [
            f"📋 Issue #{issue.id}: {issue.title}",
            f"📍 Site: {issue.site.name if issue.site else 'N/A'}",
            f"⚡ Priority: {issue.priority.value}",
            f"📊 Status: {issue.status.value}",
            f"📅 Deadline: {issue.deadline_at.strftime('%Y-%m-%d %H:%M') if issue.deadline_at else 'N/A'}",
        ]

        assgn = self.db.query(IssueAssignment).filter(
            IssueAssignment.issue_id == issue_id
        ).order_by(IssueAssignment.created_at.desc()).first()
        if assgn and assgn.assigned_solver:
            lines.append(f"👷 Assigned: {assgn.assigned_solver.name} ({assgn.status.value})")

        return ChatResponse(message="\n".join(lines), intent="check_status", issue_id=issue_id, actions_taken=[f"Status for #{issue_id}"])

    # ══════════════════════════════════════════════════════
    # APPROVE COMPLETION (Supervisor)
    # ══════════════════════════════════════════════════════

    async def approve_completion(self, user: User, issue_id: Optional[int]) -> ChatResponse:
        if not issue_id:
            return ChatResponse(message="Please specify: 'approve issue 8'", intent="approve_completion", actions_taken=[])

        issue = self.db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            return ChatResponse(message=f"Issue #{issue_id} not found.", intent="approve_completion", actions_taken=[])
        if issue.status != IssueStatus.RESOLVED_PENDING_REVIEW:
            return ChatResponse(message=f"Issue #{issue_id} is {issue.status.value}, not awaiting review.", intent="approve_completion", actions_taken=[])

        old = issue.status
        issue.status = IssueStatus.COMPLETED
        issue.track_status = "resolved"

        assgn = self.db.query(IssueAssignment).filter(
            IssueAssignment.issue_id == issue_id, IssueAssignment.status == AssignmentStatus.ACTIVE
        ).first()
        if assgn:
            assgn.status = AssignmentStatus.COMPLETED

        self._add_history(issue.id, user.id, old.value, "COMPLETED", ActionType.COMPLETE, f"Approved by {user.name}")
        self.db.commit()

        return ChatResponse(
            message=f"✅ Issue #{issue_id} marked as COMPLETED!",
            intent="approve_completion", issue_id=issue_id,
            actions_taken=[f"Issue #{issue_id} → COMPLETED"],
        )

    # ══════════════════════════════════════════════════════
    # UPDATE ISSUE FROM CHAT (Supervisor)
    # ══════════════════════════════════════════════════════

    async def update_from_chat(self, user: User, issue_id: Optional[int], entities: Dict) -> ChatResponse:
        if not issue_id:
            return ChatResponse(message="Specify: 'change priority of issue 3 to high'", intent="update_issue", actions_taken=[])

        issue = self.db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            return ChatResponse(message=f"Issue #{issue_id} not found.", intent="update_issue", actions_taken=[])

        actions = []
        new_pri = entities.get("priority") 
        if new_pri:
            try:
                p = Priority(new_pri.lower())
                actions.append(f"Priority: {issue.priority.value} → {p.value}")
                issue.priority = p
            except ValueError:
                pass

        if actions:
            self._add_history(issue.id, user.id, issue.status.value, issue.status.value, ActionType.UPDATE, f"Chat update: {', '.join(actions)}")
            self.db.commit()

        return ChatResponse(
            message=f"✅ Issue #{issue_id} updated.\n" + "\n".join(actions) if actions else f"No changes for issue #{issue_id}.",
            intent="update_issue", issue_id=issue_id, actions_taken=actions,
        )

    # ══════════════════════════════════════════════════════
    # EXTEND DEADLINE (Supervisor)
    # ══════════════════════════════════════════════════════

    async def extend_deadline(self, user: User, issue_id: Optional[int], days: int = 3) -> ChatResponse:
        if not issue_id:
            return ChatResponse(message="Specify: 'extend deadline of issue 2 by 3 days'", intent="extend_deadline", actions_taken=[])

        issue = self.db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            return ChatResponse(message=f"Issue #{issue_id} not found.", intent="extend_deadline", actions_taken=[])

        new_deadline = (issue.deadline_at or datetime.now(timezone.utc)) + timedelta(days=days)
        issue.deadline_at = new_deadline

        self._add_history(issue.id, user.id, issue.status.value, issue.status.value, ActionType.UPDATE, f"Deadline +{days}d → {new_deadline.strftime('%Y-%m-%d %H:%M')}")
        self.db.commit()

        return ChatResponse(
            message=f"📅 Issue #{issue_id} deadline extended by {days} days.\nNew: {new_deadline.strftime('%Y-%m-%d %H:%M')}",
            intent="extend_deadline", issue_id=issue_id, actions_taken=[f"Deadline +{days}d"],
        )

    # ══════════════════════════════════════════════════════
    # SOLVER: Update Work Status
    # ══════════════════════════════════════════════════════

    async def solver_update_status(self, solver: User, message: str, issue_id: Optional[int]) -> ChatResponse:
        assgn = self._find_solver_assignment(solver.id, issue_id)
        if not assgn:
            return ChatResponse(message="No active assignment found.", intent="update_work_status", actions_taken=[])

        issue = assgn.issue
        old = issue.status
        if issue.status in [IssueStatus.ASSIGNED, IssueStatus.REOPENED, IssueStatus.OPEN]:
            issue.status = IssueStatus.IN_PROGRESS
            issue.track_status = "in_progress"

        self._add_history(issue.id, solver.id, old.value, issue.status.value, ActionType.UPDATE, f"Solver: {message[:200]}")
        self.db.commit()

        return ChatResponse(
            message=f"✅ Issue #{issue.id} → {issue.status.value}. Keep it up!",
            intent="update_work_status", issue_id=issue.id, assignment_id=assgn.id,
            actions_taken=[f"#{issue.id}: {old.value} → {issue.status.value}"],
        )

    # ══════════════════════════════════════════════════════
    # SOLVER: Complete Work (Stage 5)
    # ══════════════════════════════════════════════════════

    async def solver_complete_work(
        self, solver: User, message: str, image_url: Optional[str],
        issue_id: Optional[int], ai_service,
    ) -> ChatResponse:
        assgn = self._find_solver_assignment(solver.id, issue_id)
        if not assgn:
            return ChatResponse(message="No active assignment found.", intent="complete_work", actions_taken=[])

        issue = assgn.issue
        actions = []

        # AFTER image
        if image_url:
            img = IssueImage(
                issue_id=issue.id, uploaded_by_user_id=solver.id,
                image_url=image_url, image_type=ImageType.AFTER,
                ai_flag=AIFlag.NOT_CHECKED, ai_details={},
            )
            self.db.add(img)
            actions.append("AFTER photo saved")

            try:
                verify = await ai_service.verify_completion_image(
                    image_url=image_url, problem_type=issue.title,
                    issue_description=issue.description,
                )
                img.ai_flag = verify.ai_flag
                img.ai_details = {"confidence": verify.confidence, **verify.details}
                actions.append(f"AI: {verify.ai_flag.value} ({verify.confidence:.2f})")
            except Exception as e:
                logger.error(f"Verification failed: {e}")

        old = issue.status
        issue.status = IssueStatus.RESOLVED_PENDING_REVIEW
        issue.track_status = "awaiting_review"

        self._add_history(issue.id, solver.id, old.value, "RESOLVED_PENDING_REVIEW", ActionType.UPDATE, f"Completed by {solver.name}")
        actions.append(f"Issue #{issue.id} → RESOLVED_PENDING_REVIEW")
        self.db.commit()

        return ChatResponse(
            message=f"✅ Work submitted for Issue #{issue.id}.\n{'📸 Photo uploaded. ' if image_url else ''}Supervisor notified for review.",
            intent="complete_work", issue_id=issue.id, assignment_id=assgn.id,
            actions_taken=actions,
        )

    # ══════════════════════════════════════════════════════
    # SOLVER: Report Blocker
    # ══════════════════════════════════════════════════════

    async def solver_report_blocker(self, solver: User, message: str, issue_id: Optional[int]) -> ChatResponse:
        # Log as system message
        entry = ChatHistory(
            user_id=None, issue_id=issue_id, role_in_chat=ChatRole.SYSTEM,
            message=f"⚠️ Blocker by {solver.name}: {message}",
            attachments=[],
        )
        self.db.add(entry)
        self.db.commit()

        return ChatResponse(
            message="📝 Blocker noted. Supervisor has been notified.",
            intent="report_blocker", issue_id=issue_id,
            actions_taken=["Blocker logged", "Supervisor notified"],
        )

    # ══════════════════════════════════════════════════════
    # QUERY ESCALATIONS (Manager)
    # ════════════════════════════════════════════════════


    async def query_escalations_chat(self, user: User) -> ChatResponse:
        escs = self.db.query(Escalation).filter(
            Escalation.resolved == False
        ).order_by(Escalation.created_at.desc()).limit(20).all()

        if not escs:
            return ChatResponse(message="✅ No active escalations.", intent="query_escalations", actions_taken=[])

        lines = [f"⚠️ {len(escs)} active escalation(s):\n"]
        for e in escs:
            i = e.issue
            lines.append(f"🔴 #{i.id}: {i.title} [{i.priority.value}] — {e.escalation_type}")

        return ChatResponse(message="\n".join(lines), intent="query_escalations", actions_taken=[f"{len(escs)} escalations"])

    # ══════════════════════════════════════════════════════
    # QUERY OVERDUE (Manager)
    # ══════════════════════════════════════════════════════

    async def query_overdue_chat(self, user: User) -> ChatResponse:
        now = datetime.now(timezone.utc)
        overdue = self.db.query(Issue).filter(
            Issue.deadline_at < now,
            Issue.status.notin_([IssueStatus.COMPLETED]),
        ).order_by(Issue.deadline_at.asc()).limit(20).all()

        if not overdue:
            return ChatResponse(message="✅ No overdue issues.", intent="query_overdue", actions_taken=[])

        lines = [f"⏰ {len(overdue)} overdue:\n"]
        for i in overdue:
            hrs = (now - i.deadline_at).total_seconds() / 3600
            lines.append(f"🔴 #{i.id}: {i.title} — overdue {hrs:.0f}h [{i.priority.value}]")

        return ChatResponse(message="\n".join(lines), intent="query_overdue", actions_taken=[f"{len(overdue)} overdue"])

    # ══════════════════════════════════════════════════════
    # READ-ONLY: List issues for API
    # ══════════════════════════════════════════════════════


    async def list_issues(
        self,
        current_user,
        status_filter=None,
        priority=None,
        site_id=None,
        search=None,
        skip=0,
        limit=20,
    ):

        stmt = select(Issue)

        # Role-based filtering
        if current_user.role == UserRole.SUPERVISOR:
            site_ids = await self._get_supervisor_site_ids(current_user.id)
            stmt = stmt.where(Issue.site_id.in_(site_ids))

        elif current_user.role == UserRole.PROBLEMSOLVER:
            sub_stmt = select(IssueAssignment.issue_id).where(
                IssueAssignment.assigned_to_solver_id == current_user.id
            )

            result = await self.db.execute(sub_stmt)
            assigned_ids = [r[0] for r in result.all()]

            stmt = stmt.where(Issue.id.in_(assigned_ids))

        # Filters
        # if status_filter:
        #     stmt = stmt.where(Issue.status == status_filter)

        # if priority:
        #     stmt = stmt.where(Issue.priority == priority)

        # if site_id:
        #     stmt = stmt.where(Issue.site_id == site_id)

        # if search:
        #     stmt = stmt.where(Issue.title.ilike(f"%{search}%"))

        # Total count query
        count_stmt = select(sql_func.count()).select_from(stmt.subquery())
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar()

        # # Pagination
        # stmt = stmt.order_by(Issue.created_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(stmt)
        issues = result.scalars().all()
        print("------------------------------------------------------------------------------------")
        print(issues)

        # total = 90

        return IssueListResponse(
            total=total,
            page=skip // limit + 1,
            per_page=limit,
            issues=[self._to_response(i) for i in issues],
        )

    # ══════════════════════════════════════════════════════
    # READ-ONLY: Issue detail
    # ══════════════════════════════════════════════════════

    async def get_issue_detail(self, issue_id: int):
        issue_stmt = select(Issue).where(Issue.id == issue_id)
        issue = await self.db.execute(issue_stmt)
        issue = issue.scalar()
        if not issue:
            return None

        from app.models.complaint import Complaint #it might create circular import issue but we can handle it by importing inside the function where we need to use it

        complaints_stmt = select(sql_func.count()).select_from(Complaint).where(
            Complaint.issue_id == issue_id
        )
        complaints_count = await self.db.execute(complaints_stmt)
        complaints_count = complaints_count.scalar()

        return IssueDetailResponse(
            id=issue.id, site_id=issue.site_id,
            site_name=issue.site.name if issue.site else None,
            site_location=issue.site.location if issue.site else None,
            raised_by_supervisor_id=issue.raised_by_supervisor_id,
            supervisor_name=issue.raised_by_supervisor.name if issue.raised_by_supervisor else None,
            title=issue.title, description=issue.description,
            priority=issue.priority, deadline_at=issue.deadline_at,
            status=issue.status, track_status=issue.track_status,
            latitude=issue.latitude, longitude=issue.longitude,
            images=[IssueImageBrief(
                id=img.id, image_url=img.image_url, image_type=img.image_type.value,
                ai_flag=img.ai_flag.value, uploaded_by_user_id=img.uploaded_by_user_id,
                uploader_name=img.uploaded_by_user .name if img.uploaded_by_user else None,
                created_at=img.created_at,
            ) for img in issue.images],
            assignments=[AssignmentBrief(
                id=a.id, assigned_to_solver_id=a.assigned_to_solver_id,
                solver_name=a.assigned_solver.name if a.assigned_solver else None,
                solver_phone=a.assigned_solver.phone if a.assigned_solver else None,
                status=a.status.value, due_date=a.due_date,
                total_call_attempts=len(a.call_logs) if a.call_logs else 0,
                last_call_status=a.call_logs[-1].status.value if a.call_logs else None,
                created_at=a.created_at,
            ) for a in issue.assignments],
            complaints_count=complaints_count,
            created_at=issue.created_at, updated_at=issue.updated_at,
        )

    # ══════════════════════════════════════════════════════
    # READ-ONLY: Timeline
    # ══════════════════════════════════════════════════════

    async def get_timeline(self, issue_id: int): # IT IS NOT USED YET IN THE FRONTEND
        stmt = (
            select(IssueHistory)
            .where(IssueHistory.issue_id == issue_id)
            .order_by(IssueHistory.created_at.desc())
        )

        entries = await self.db.execute(stmt)
        entries = entries.scalars().all()

        return IssueHistoryListResponse(
            total=len(entries), issue_id=issue_id,
            history=[IssueHistoryResponse(
                id=e.id, issue_id=e.issue_id,
                changed_by_user_id=e.changed_by_user_id,
                changed_by_name=e.changed_by_user.name if e.changed_by_user else "System",
                old_status=e.old_status, new_status=e.new_status,
                action_type=e.action_type, details=e.details,
                created_at=e.created_at,
            ) for e in entries],
        )

    # ══════════════════════════════════════════════════════
    # PRIVATE HELPERS
    # ══════════════════════════════════════════════════════

    from sqlalchemy import select

    async def _get_supervisor_site_ids(self, supervisor_id: int):

        stmt = select(SupervisorSite.c.site_id).where(
            SupervisorSite.c.supervisor_id == supervisor_id
        )

        result = await self.db.execute(stmt)
        result = result.scalars().all()

        return result

    def _match_site(self, location_name: str, sites: list) -> Optional[Site]:
        loc = location_name.lower()
        for s in sites:
            if s.name.lower() == loc:#how site anme and location name both might be different so will use the langtitude and longitude to match the site more accurately, we have to update the frontend to enable to get the user location and match based on it and update into the db .
                return s
        for s in sites:
            if loc in s.name.lower() or s.name.lower() in loc:
                return s
        loc_words = set(loc.split())
        best, best_score = None, 0
        for s in sites:
            overlap = len(loc_words & set(s.name.lower().split()))
            if overlap > best_score:
                best_score, best = overlap, s
        return best if best_score > 0 else None

    def _find_solver_assignment(self, solver_id, issue_id=None):
        q = self.db.query(IssueAssignment).filter(
            IssueAssignment.assigned_to_solver_id == solver_id,
            IssueAssignment.status.in_([AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED]),
        )
        if issue_id:
            q = q.filter(IssueAssignment.issue_id == issue_id)
        return q.order_by(IssueAssignment.created_at.desc()).first()

    def _add_history(self, issue_id, user_id, old_status, new_status, action_type, details):
        self.db.add(IssueHistory(
            issue_id=issue_id, changed_by_user_id=user_id,
            old_status=old_status, new_status=new_status,
            action_type=action_type, details=details,
        ))

    def _to_response(self, issue):
        return IssueResponse(
            id=issue.id, site_id=issue.site_id,
            site_name=issue.site.name if issue.site else None,
            raised_by_supervisor_id=issue.raised_by_supervisor_id,
            supervisor_name=issue.raised_by_supervisor.name if issue.raised_by_supervisor else None,
            title=issue.title, description=issue.description,
            priority=issue.priority, deadline_at=issue.deadline_at,
            status=issue.status, track_status=issue.track_status,
            latitude=issue.latitude, longitude=issue.longitude,
            created_at=issue.created_at, updated_at=issue.updated_at,
        )