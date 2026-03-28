"""
PURPOSE: Issue business logic — mutations + dashboard reads.
─────────────────────────────────────────────────────────────
Called by:
  - chatbot_service.py   (all chat-based write actions)
  - api/issues.py        (dashboard read endpoints)

Write / mutation actions:
  1. create_from_chat        — Stage 1-3: create issue + auto-assign
  2. approve_completion      — Supervisor approves resolved issue
  3. update_priority         — Supervisor changes priority
  4. extend_deadline         — Supervisor extends deadline
  5. solver_update_status    — Solver marks issue IN_PROGRESS
  6. solver_complete_work    — Solver submits completion + AFTER image
  7. solver_report_blocker   — Solver logs a blocker note

Dashboard read actions (role-aware, paginated, no N+1):
  8. list_issues             — Paginated issue list with filters
  9. get_issue_detail        — Full issue with images + assignments
 10. get_timeline            — Audit trail for a single issue

Rules:
  - AsyncSession only: always use select() + await db.execute()
  - Never use db.query()
  - Eager-load related rows with selectinload() to avoid N+1
  - All public methods are async
"""

import logging
from typing import Optional, Tuple
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func as sql_func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.site import Site
from app.models.issue import Issue
from app.models.issue_assignment import IssueAssignment
from app.models.issue_image import IssueImage
from app.models.issue_history import IssueHistory
from app.models.chat_history import ChatHistory
from app.models.complaint import Complaint
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
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════
    # 1. CREATE ISSUE FROM CHAT  (Stage 1 → 2 → 3)
    # ══════════════════════════════════════════════════════

    # ══════════════════════════════════════════════════════
    # 1. CREATE ISSUE FROM CHAT  (Stage 1 → 2 → 3)
    # ══════════════════════════════════════════════════════

    async def create_from_chat(
        self,
        user: User,
        message: str,
        image_url: Optional[str],
        ai_service,
    ) -> ChatResponse:
        
        """
        Full flow:
          1. Resolve supervisor's sites
          2. AI extracts issue details
          3. Match site by name
          4. Persist Issue
          5. Persist BEFORE image (if provided)
          6. Add OPEN history entry
          7. Auto-assign best solver
          8. Return ChatResponse
        """
        actions: list[str] = []

        # ── 1. Supervisor sites ──────────────────────────
        site_ids = await self._get_supervisor_site_ids(user.id)

        stmt = select(Site)
        if site_ids:
            stmt = stmt.where(Site.id.in_(site_ids))
        result = await self.db.execute(stmt)
        sites: list[Site] = result.scalars().all()
        site_names = [s.name for s in sites]

        # ── 2. AI extraction ─────────────────────────────
        
        #extract_issue
        from app.services.ai_service import extract_issue
        extraction = await extract_issue(
            message=message,
            available_sites=site_names,
        )
        
        print("--------------------------",extraction)
      

        # ── 3. Site matching ─────────────────────────────
        #changed by ismail
        site = self._match_site(extraction['site_location'], sites)
        if not site:
            return ChatResponse(
                message=(
                    f"❌ Couldn't find site '{extraction['site_location']}'. "
                    f"Available: {', '.join(site_names)}"
                ),
                intent="create_issue",
                actions_taken=["Site matching failed"],
            )

        # ── 4. Create Issue ──────────────────────────────
        #changed by ismail
        deadline = datetime.now(timezone.utc) + timedelta(days=extraction['days_to_fix'])
        issue = Issue(
            site_id=site.id,
            raised_by_supervisor_id=user.id,
            title=extraction['title'],
            description=extraction['description'],
            priority=extraction['priority'],
            deadline_at=deadline,
            status=IssueStatus.OPEN,
            track_status="awaiting_solver",
            latitude=site.latitude,
            longitude=site.longitude,
        )
        self.db.add(issue)
        await self.db.flush()          # gets issue.id without committing
        actions.append(f"Issue #{issue.id} created: '{issue.title}'")

        # ── 5. BEFORE image ──────────────────────────────
        if image_url:
            self.db.add(IssueImage(
                issue_id=issue.id,
                uploaded_by_user_id=user.id,
                image_url=image_url,
                image_type=ImageType.BEFORE,
                ai_flag=AIFlag.NOT_CHECKED,
                ai_details={},
            ))
            actions.append("BEFORE image saved")

        # ── 6. History: OPEN ─────────────────────────────
        self._add_history(
            issue.id, user.id, None, "OPEN",
            ActionType.ASSIGN, f"Created via chat by {user.name}",
        )

        # ── 7. Auto-assign ───────────────────────────────
        #changed by ismail
        # Import here to avoid circular import at module level
        from app.services.assignment_service import AssignmentService
        assignment_svc = AssignmentService(self.db)
        solver, assignment = await assignment_svc.auto_assign(
            issue=issue,
            problem_type=extraction['skill_name'],
            site_id=site.id,
            supervisor=user,
        )

        if solver and assignment:
            actions.append(f"Solver {solver.name} assigned (#{assignment.id})")
            
        else:
            actions.append("No solver available — awaiting manual assignment")

        await self.db.commit()
        await self.db.refresh(issue)

        # ── 8. Enqueue call chain (after commit so IDs are persisted in DB) ───
        # Celery calls the solver immediately, then retries with priority-based
        # delays until answered or escalation threshold is reached.
        if solver and assignment:
            self._enqueue_call(assignment.id)
            actions.append(f"📞 Call chain queued → {solver.phone}")


        # ── Build response ───────────────────────────────
        #changed by ismail
        lines = [
            f"✅ Issue #{issue.id} created!",
            f"📍 Site: {site.name}",
            f"🔧 Type: {extraction['skill_name']}",
            f"⚡ Priority: {extraction['priority']}",
            f"📅 Deadline: {deadline.strftime('%Y-%m-%d %H:%M')} UTC",
        ]
        if solver:
            lines += [f"👷 Assigned to: {solver.name}", "📞 Calling solver now..."]
        else:
            lines.append("⏳ Awaiting solver assignment...")

        return ChatResponse(
            message="\n".join(lines),
            intent="create_issue",
            issue_id=issue.id,
            assignment_id=assignment.id if assignment else None,
            actions_taken=actions,
            data={
                "issue_id": issue.id,
                "site": site.name,
                "problem_type": extraction['skill_name'],
                "priority": extraction['priority'],
                "solver_name": solver.name if solver else None,
            },
        )

    # ══════════════════════════════════════════════════════
    # 2. APPROVE COMPLETION  (Supervisor)
    # ══════════════════════════════════════════════════════

    async def approve_completion(
        self, user: User, issue_id: Optional[int],
    ) -> ChatResponse:
        if not issue_id:
            return ChatResponse(
                message="Please specify: 'approve issue 8'",
                intent="approve_completion", actions_taken=[],
            )

        issue = await self._get_issue_or_none(issue_id)
        if not issue:
            return ChatResponse(
                message=f"Issue #{issue_id} not found.",
                intent="approve_completion", actions_taken=[],
            )
        if issue.status != IssueStatus.RESOLVED_PENDING_REVIEW and issue.status != IssueStatus.REOPENED:
            return ChatResponse(
                message=f"Issue #{issue_id} is '{issue.status.value}', not awaiting review.",
                intent="approve_completion", actions_taken=[],
            )

        old_status = issue.status.value
        issue.status = IssueStatus.COMPLETED
        issue.track_status = "resolved"

        # Update active assignment
        stmt = select(IssueAssignment).where(
            IssueAssignment.issue_id == issue_id,
            IssueAssignment.status == AssignmentStatus.ACTIVE,
        )
        result = await self.db.execute(stmt)
        assignment = result.scalar_one_or_none()
        if assignment:
            assignment.status = AssignmentStatus.COMPLETED

        self._add_history(
            issue.id, user.id, old_status, "COMPLETED",
            ActionType.COMPLETE, f"Approved by {user.name}",
        )
        await self.db.commit()

        return ChatResponse(
            message=f"✅ Issue #{issue_id} marked as COMPLETED!",
            intent="approve_completion",
            issue_id=issue_id,
            actions_taken=[f"Issue #{issue_id} → COMPLETED"],
        )

    # ══════════════════════════════════════════════════════
    # 3. UPDATE PRIORITY  (Supervisor)
    # ══════════════════════════════════════════════════════

    async def update_priority(
        self, user: User, issue_id: Optional[int], new_priority: str,
    ) -> ChatResponse:
        """
        Dedicated priority-update mutation.
        Chatbot extracts the new priority value and passes it here.
        """
        if not issue_id:
            return ChatResponse(
                message="Specify: 'change priority of issue 3 to high'",
                intent="update_priority", actions_taken=[],
            )

        issue = await self._get_issue_or_none(issue_id)
        if not issue:
            return ChatResponse(
                message=f"Issue #{issue_id} not found.",
                intent="update_priority", actions_taken=[],
            )

        try:
            priority = Priority(new_priority.lower())
        except ValueError:
            valid = [p.value for p in Priority]
            return ChatResponse(
                message=f"Invalid priority '{new_priority}'. Valid: {', '.join(valid)}",
                intent="update_priority", actions_taken=[],
            )

        old = issue.priority.value
        issue.priority = priority
        self._add_history(
            issue.id, user.id, issue.status.value, issue.status.value,
            ActionType.UPDATE, f"Priority: {old} → {priority.value} by {user.name}",
        )
        await self.db.commit()

        return ChatResponse(
            message=f"✅ Issue #{issue_id} priority updated: {old} → {priority.value}",
            intent="update_priority",
            issue_id=issue_id,
            actions_taken=[f"Priority {old} → {priority.value}"],
        )

    # ══════════════════════════════════════════════════════
    # 4. EXTEND DEADLINE  (Supervisor)
    # ══════════════════════════════════════════════════════

    async def extend_deadline(
        self, user: User, issue_id: Optional[int], days: int = 3,
    ) -> ChatResponse:
        if not issue_id:
            return ChatResponse(
                message="Specify: 'extend deadline of issue 2 by 3 days'",
                intent="extend_deadline", actions_taken=[],
            )

        issue = await self._get_issue_or_none(issue_id)
        if not issue:
            return ChatResponse(
                message=f"Issue #{issue_id} not found.",
                intent="extend_deadline", actions_taken=[],
            )

        base = issue.deadline_at or datetime.now(timezone.utc)
        new_deadline = base + timedelta(days=days)
        issue.deadline_at = new_deadline

        self._add_history(
            issue.id, user.id, issue.status.value, issue.status.value,
            ActionType.UPDATE,
            f"Deadline extended +{days}d → {new_deadline.strftime('%Y-%m-%d %H:%M')} by {user.name}",
        )
        await self.db.commit()

        return ChatResponse(
            message=(
                f"📅 Issue #{issue_id} deadline extended by {days} day(s).\n"
                f"New deadline: {new_deadline.strftime('%Y-%m-%d %H:%M')} UTC"
            ),
            intent="extend_deadline",
            issue_id=issue_id,
            actions_taken=[f"Deadline +{days}d"],
        )

    # ══════════════════════════════════════════════════════
    # 5. SOLVER: Mark IN_PROGRESS
    # ══════════════════════════════════════════════════════

    async def solver_update_status(
        self, solver: User, message: str, issue_id: Optional[int],
    ) -> ChatResponse:
        assignment = await self._get_active_assignment(solver.id, issue_id)
        if not assignment:
            return ChatResponse(
                message="No active assignment found.",
                intent="update_work_status", actions_taken=[],
            )

        issue = await self._get_issue_or_none(assignment.issue_id)
        if not issue:
            return ChatResponse(
                message="Assigned issue not found.",
                intent="update_work_status", actions_taken=[],
            )

        old_status = issue.status.value
        transitional = {IssueStatus.ASSIGNED, IssueStatus.REOPENED, IssueStatus.OPEN}
        if issue.status in transitional:
            issue.status = IssueStatus.IN_PROGRESS
            issue.track_status = "in_progress"

        self._add_history(
            issue.id, solver.id, old_status, issue.status.value,
            ActionType.UPDATE, f"Solver update: {message[:200]}",
        )
        await self.db.commit()

        return ChatResponse(
            message=f"✅ Issue #{issue.id} → {issue.status.value}. Keep it up!",
            intent="update_work_status",
            issue_id=issue.id,
            assignment_id=assignment.id,
            actions_taken=[f"#{issue.id}: {old_status} → {issue.status.value}"],
        )

    # ══════════════════════════════════════════════════════
    # 6. SOLVER: Submit Completion  (Stage 5)
    # ══════════════════════════════════════════════════════

    async def solver_complete_work(
        self,
        solver: User,
        message: str,
        image_url: Optional[str],
        issue_id: Optional[int],
        ai_service,
    ) -> ChatResponse:
        assignment = await self._get_active_assignment(solver.id, issue_id)
        if not assignment:
            return ChatResponse(
                message="No active assignment found.",
                intent="complete_work", actions_taken=[],
            )

        issue = await self._get_issue_or_none(assignment.issue_id)
        if not issue:
            return ChatResponse(
                message="Assigned issue not found.",
                intent="complete_work", actions_taken=[],
            )

        actions: list[str] = []

        # ── AFTER image + AI verification ────────────────
        if image_url:
            img = IssueImage(
                issue_id=issue.id,
                uploaded_by_user_id=solver.id,
                image_url=image_url,
                image_type=ImageType.AFTER,
                ai_flag=AIFlag.NOT_CHECKED,
                ai_details={},
            )
            self.db.add(img)
            actions.append("AFTER photo saved")

            try:
                verify = await ai_service.verify_completion_image(
                    image_url=image_url,
                    problem_type=issue.title,
                    issue_description=issue.description,
                )
                img.ai_flag = verify.ai_flag
                img.ai_details = {
                    "confidence": verify.confidence,
                    **verify.details,
                }
                actions.append(f"AI verification: {verify.ai_flag.value} ({verify.confidence:.2f})")
            except Exception:
                logger.exception("AI image verification failed for issue #%s", issue.id)
                actions.append("AI verification skipped (error)")

        old_status = issue.status.value
        issue.status = IssueStatus.RESOLVED_PENDING_REVIEW
        issue.track_status = "awaiting_review"

        self._add_history(
            issue.id, solver.id, old_status, "RESOLVED_PENDING_REVIEW",
            ActionType.UPDATE, f"Work completed by {solver.name}",
        )
        actions.append(f"Issue #{issue.id} → RESOLVED_PENDING_REVIEW")
        await self.db.commit()

        photo_note = "📸 Photo uploaded. " if image_url else ""
        return ChatResponse(
            message=f"✅ Work submitted for Issue #{issue.id}.\n{photo_note}Supervisor notified for review.",
            intent="complete_work",
            issue_id=issue.id,
            assignment_id=assignment.id,
            actions_taken=actions,
        )

    # ══════════════════════════════════════════════════════
    # 7. SOLVER: Report Blocker
    # ══════════════════════════════════════════════════════

    async def solver_report_blocker(
        self, solver: User, message: str, issue_id: Optional[int],
    ) -> ChatResponse:
        """
        Logs a blocker as a SYSTEM chat message so supervisors can
        see it in the conversation history.
        """
        self.db.add(ChatHistory(
            user_id=None,
            issue_id=issue_id,
            role_in_chat=ChatRole.SYSTEM,
            message=f"⚠️ Blocker reported by {solver.name}: {message}",
            attachments=[],
        ))
        await self.db.commit()

        return ChatResponse(
            message="📝 Blocker noted. Supervisor has been notified.",
            intent="report_blocker",
            issue_id=issue_id,
            actions_taken=["Blocker logged", "Supervisor notified"],
        )

    # ══════════════════════════════════════════════════════
    # 8. DASHBOARD: Paginated issue list  (API read)
    # ══════════════════════════════════════════════════════

    async def list_issues(
        self,
        current_user: User,
        status_filter: Optional[IssueStatus] = None,
        priority: Optional[Priority] = None,
        site_id: Optional[int] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> IssueListResponse:
        """
        Role-aware paginated list with optional filters.

        - SUPERVISOR  → only their sites
        - PROBLEMSOLVER → only their assigned issues
        - MANAGER/ADMIN → all issues

        Eager-loads site + raised_by_supervisor in a single query
        to avoid N+1 when serialising each IssueResponse.
        """
        stmt = (
            select(Issue)
            .options(
                selectinload(Issue.site),
                selectinload(Issue.raised_by_supervisor),
            )
        )

        # ── Role-based scope ─────────────────────────────
        if current_user.role == UserRole.SUPERVISOR:
            site_ids = await self._get_supervisor_site_ids(current_user.id)
            stmt = stmt.where(Issue.site_id.in_(site_ids))

        elif current_user.role == UserRole.PROBLEMSOLVER:
            sub = select(IssueAssignment.issue_id).where(
                IssueAssignment.assigned_to_solver_id == current_user.id
            )
            result = await self.db.execute(sub)
            assigned_ids = result.scalars().all()
            stmt = stmt.where(Issue.id.in_(assigned_ids))

        # ── Optional filters ─────────────────────────────
        if status_filter:
            stmt = stmt.where(Issue.status == status_filter)
        if priority:
            stmt = stmt.where(Issue.priority == priority)
        if site_id:
            stmt = stmt.where(Issue.site_id == site_id)
        if search:
            stmt = stmt.where(Issue.title.ilike(f"%{search}%"))

        # ── Total count (reuse same WHERE, no LIMIT) ─────
        count_stmt = select(sql_func.count()).select_from(stmt.subquery())
        total: int = (await self.db.execute(count_stmt)).scalar()

        # ── Paginated fetch ───────────────────────────────
        stmt = stmt.order_by(Issue.created_at.desc()).offset(skip).limit(limit)
        issues = (await self.db.execute(stmt)).scalars().all()

        return IssueListResponse(
            total=total,
            page=skip // limit + 1,
            per_page=limit,
            issues=[self._to_response(i) for i in issues],
        )

    # ══════════════════════════════════════════════════════
    # 9. DASHBOARD: Issue detail  (API read)
    # ══════════════════════════════════════════════════════

    async def get_issue_detail(self, issue_id: int) -> Optional[IssueDetailResponse]:
        """
        Full issue object with nested images and assignments.
        Uses selectinload for images, assignments→solver→call_logs
        and site/supervisor — all resolved in a minimal number of queries.
        Complaints count is fetched as a single aggregate.
        """
        stmt = (
            select(Issue)
            .where(Issue.id == issue_id)
            .options(
                selectinload(Issue.site),
                selectinload(Issue.raised_by_supervisor),
                selectinload(Issue.images).selectinload(IssueImage.uploaded_by_user),
                selectinload(Issue.assignments).options(
                    selectinload(IssueAssignment.assigned_solver),
                    selectinload(IssueAssignment.call_logs),
                ),
            )
        )
        issue: Optional[Issue] = (await self.db.execute(stmt)).scalar_one_or_none()
        if not issue:
            return None

        # Single aggregate query — no loop, no N+1
        complaints_count: int = (
            await self.db.execute(
                select(sql_func.count()).select_from(Complaint).where(
                    Complaint.issue_id == issue_id
                )
            )
        ).scalar()

        return IssueDetailResponse(
            id=issue.id,
            site_id=issue.site_id,
            site_name=issue.site.name if issue.site else None,
            site_location=issue.site.location if issue.site else None,
            raised_by_supervisor_id=issue.raised_by_supervisor_id,
            supervisor_name=issue.raised_by_supervisor.name if issue.raised_by_supervisor else None,
            title=issue.title,
            description=issue.description,
            priority=issue.priority,
            deadline_at=issue.deadline_at,
            status=issue.status,
            track_status=issue.track_status,
            latitude=issue.latitude,
            longitude=issue.longitude,
            images=[
                IssueImageBrief(
                    id=img.id,
                    image_url=img.image_url,
                    image_type=img.image_type.value,
                    ai_flag=img.ai_flag.value,
                    uploaded_by_user_id=img.uploaded_by_user_id,
                    uploader_name=img.uploaded_by_user.name if img.uploaded_by_user else None,
                    created_at=img.created_at,
                )
                for img in issue.images
            ],
            assignments=[
                AssignmentBrief(
                    id=a.id,
                    assigned_to_solver_id=a.assigned_to_solver_id,
                    solver_name=a.assigned_solver.name if a.assigned_solver else None,
                    solver_phone=a.assigned_solver.phone if a.assigned_solver else None,
                    status=a.status.value,
                    due_date=a.due_date,
                    total_call_attempts=len(a.call_logs) if a.call_logs else 0,
                    last_call_status=a.call_logs[-1].status.value if a.call_logs else None,
                    created_at=a.created_at,
                )
                for a in issue.assignments
            ],
            complaints_count=complaints_count,
            created_at=issue.created_at,
            updated_at=issue.updated_at,
        )

    # ══════════════════════════════════════════════════════
    # 10. DASHBOARD: Issue timeline  (API read)
    # ══════════════════════════════════════════════════════

    async def get_timeline(self, issue_id: int) -> IssueHistoryListResponse:
        """
        Ordered audit trail for a single issue.
        Eager-loads changed_by_user to avoid N+1 per entry.
        """
        stmt = (
            select(IssueHistory)
            .where(IssueHistory.issue_id == issue_id)
            .options(selectinload(IssueHistory.changed_by_user))
            .order_by(IssueHistory.created_at.desc())
        )
        entries = (await self.db.execute(stmt)).scalars().all()

        return IssueHistoryListResponse(
            total=len(entries),
            issue_id=issue_id,
            history=[
                IssueHistoryResponse(
                    id=e.id,
                    issue_id=e.issue_id,
                    changed_by_user_id=e.changed_by_user_id,
                    changed_by_name=e.changed_by_user.name if e.changed_by_user else "System",
                    old_status=e.old_status,
                    new_status=e.new_status,
                    action_type=e.action_type,
                    details=e.details,
                    created_at=e.created_at,
                )
                for e in entries
            ],
        )

    # ══════════════════════════════════════════════════════
    # PRIVATE HELPERS
    # ══════════════════════════════════════════════════════

    async def _get_supervisor_site_ids(self, supervisor_id: int) -> list[int]:
        """Return site_ids the supervisor manages."""
        stmt = select(SupervisorSite.c.site_id).where(
            SupervisorSite.c.supervisor_id == supervisor_id
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def _get_issue_or_none(self, issue_id: int) -> Optional[Issue]:
        """Fetch a single Issue by PK."""
        result = await self.db.execute(
            select(Issue).where(Issue.id == issue_id)
        )
        return result.scalar_one_or_none()

    async def _get_active_assignment(
        self, solver_id: int, issue_id: Optional[int],
    ) -> Optional[IssueAssignment]:
        """Fetch the solver's most recent active/reopened assignment."""
        stmt = (
            select(IssueAssignment)
            .where(
                IssueAssignment.assigned_to_solver_id == solver_id,
                IssueAssignment.status.in_([
                    AssignmentStatus.ACTIVE,
                    AssignmentStatus.REOPENED,
                ]),
            )
            .order_by(IssueAssignment.created_at.desc())
        )
        if issue_id:
            stmt = stmt.where(IssueAssignment.issue_id == issue_id)

        result = await self.db.execute(stmt)
        return result.scalars().first()

    def _match_site(self, location_name: str, sites: list[Site]) -> Optional[Site]:
        """
        Fuzzy site matching by name.
        Order: exact → substring → word-overlap.
        """
        loc = location_name.lower().strip()

        # Exact
        for s in sites:
            if s.name.lower() == loc:
                return s

        # Substring
        for s in sites:
            name = s.name.lower()
            if loc in name or name in loc:
                return s

        # Word overlap
        loc_words = set(loc.split())
        best, best_score = None, 0
        for s in sites:
            overlap = len(loc_words & set(s.name.lower().split()))
            if overlap > best_score:
                best_score, best = overlap, s

        return best if best_score > 0 else None

    def _add_history(
        self,
        issue_id: int,
        user_id: Optional[int],
        old_status: Optional[str],
        new_status: str,
        action_type: ActionType,
        details: str,
    ) -> None:
        """Append an IssueHistory row (no flush/commit — caller decides)."""
        self.db.add(IssueHistory(
            issue_id=issue_id,
            changed_by_user_id=user_id,
            old_status=old_status,
            new_status=new_status,
            action_type=action_type,
            details=details,
        ))

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
    def _to_response(issue: Issue) -> IssueResponse:
        """
        Serialise an Issue ORM object to IssueResponse.
        Caller must have eager-loaded .site and .raised_by_supervisor
        before calling this to avoid lazy-load errors with AsyncSession.
        """
        return IssueResponse(
            id=issue.id,
            site_id=issue.site_id,
            site_name=issue.site.name if issue.site else None,
            raised_by_supervisor_id=issue.raised_by_supervisor_id,
            supervisor_name=issue.raised_by_supervisor.name if issue.raised_by_supervisor else None,
            title=issue.title, description=issue.description,
            priority=issue.priority, deadline_at=issue.deadline_at,
            status=issue.status, track_status=issue.track_status,
            latitude=issue.latitude, longitude=issue.longitude,
            created_at=issue.created_at, updated_at=issue.updated_at,
        )
        
        
        