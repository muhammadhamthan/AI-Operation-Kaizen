"""
PURPOSE: Dashboard card service — 3 role-aware functions, cursor-paginated.
───────────────────────────────────────────────────────────────────────────
One function per card. Each function inspects the caller's role and decides
what scope to apply before delegating to the shared _fetch_issues_cursor().

FUNCTIONS:
  pending_issues(user, params, ...)  → scoped by role
  resolved(user, params, ...)        → scoped by role
  escalated(user, params, ...)       → scoped by role (empty for solver)

ROLE SCOPE MATRIX:
  ┌──────────────────┬────────────────┬──────────────────────┬──────────────────────┐
  │ Card             │ MANAGER        │ SUPERVISOR           │ PROBLEMSOLVER        │
  ├──────────────────┼────────────────┼──────────────────────┼──────────────────────┤
  │ pending_issues   │ all sites      │ their sites only     │ their assignments    │
  │ resolved         │ all sites      │ their sites only     │ their assignments    │
  │ escalated        │ all sites      │ their sites only     │ empty               │
  └──────────────────┴────────────────┴──────────────────────┴──────────────────────┘

PENDING statuses : OPEN | ASSIGNED | IN_PROGRESS | REOPENED
RESOLVED statuses: COMPLETED
ESCALATED statuses: ESCALATED

QUERY STRATEGY (same as IssueService.list_issues_cursor):
  - 1 JOIN query per request (site + supervisor name inline)
  - No COUNT query (cursor pagination never needs total)
  - Supervisor scope = 1 extra indexed lookup on supervisor_sites
  - Solver scope     = 1 extra indexed lookup on issue_assignments
  - Cursor filter    = WHERE id < :last_id → O(log n) always
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.site import Site
from app.models.issue import Issue
from app.models.issue_assignment import IssueAssignment
from app.models.supervisor_site import SupervisorSite
from app.core.enums import IssueStatus, AssignmentStatus, Priority, UserRole
from app.schemas.issue_schema import IssueDetailResponse, IssueResponse
from app.schemas.pagination_schema import CursorPage, CursorParams, encode_cursor

logger = logging.getLogger(__name__)

# ── Status groups ────────────────────────────────────────────────────
PENDING_STATUSES = [
    IssueStatus.OPEN,
    IssueStatus.ASSIGNED,
    IssueStatus.IN_PROGRESS,
    IssueStatus.REOPENED,
]
RESOLVED_STATUSES = [IssueStatus.COMPLETED]
ESCALATED_STATUSES = [IssueStatus.ESCALATED]
RESOLVED_PENDING_REVIEW = [IssueStatus.RESOLVED_PENDING_REVIEW]


class DashboardCardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════════════════
    # CARD 1 — PENDING ISSUES
    # ══════════════════════════════════════════════════════════════════

    async def pending_issues(
        self,
        user: User,
        params: CursorParams,
        site_id: Optional[int] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
    ) -> CursorPage[IssueResponse]:
        """
        MANAGER       → all OPEN|ASSIGNED|IN_PROGRESS|REOPENED in system
        SUPERVISOR    → same, scoped to their managed sites
        PROBLEMSOLVER → only issues where they have ACTIVE/REOPENED assignment
        """
        if user.role == UserRole.MANAGER:
            # No site restriction — full system view
            return await self._fetch(
                params=params,
                statuses=PENDING_STATUSES,
                site_ids=None,
                issue_ids=None,
                site_id_filter=site_id,
                priority_filter=priority,
                search=search,
            )

        elif user.role == UserRole.SUPERVISOR:
            site_ids = await self._supervisor_site_ids(user.id)
            if not site_ids:
                return _empty()
            return await self._fetch(
                params=params,
                statuses=PENDING_STATUSES,
                site_ids=site_ids,
                issue_ids=None,
                site_id_filter=site_id,
                priority_filter=priority,
                search=search,
            )

        else:
            # PROBLEMSOLVER — only their actively assigned issues
            issue_ids = await self._solver_active_issue_ids(user.id)
            if not issue_ids:
                return _empty()
            return await self._fetch(
                params=params,
                statuses=PENDING_STATUSES,
                site_ids=None,
                issue_ids=issue_ids,
                site_id_filter=None,
                priority_filter=priority,
                search=search,
            )

    # ══════════════════════════════════════════════════════════════════
    # CARD 2 — RESOLVED
    # ══════════════════════════════════════════════════════════════════

    async def resolved(
        self,
        user: User,
        params: CursorParams,
        site_id: Optional[int] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
    ) -> CursorPage[IssueResponse]:
        """
        MANAGER       → all COMPLETED issues in system
        SUPERVISOR    → COMPLETED issues from their managed sites only
        PROBLEMSOLVER → issues they personally resolved (COMPLETED assignment)
        """
        if user.role == UserRole.MANAGER:
            return await self._fetch(
                params=params,
                statuses=RESOLVED_STATUSES,
                site_ids=None,
                issue_ids=None,
                site_id_filter=site_id,
                priority_filter=priority,
                search=search,
            )

        elif user.role == UserRole.SUPERVISOR:
            site_ids = await self._supervisor_site_ids(user.id)
            if not site_ids:
                return _empty()
            return await self._fetch(
                params=params,
                statuses=RESOLVED_STATUSES,
                site_ids=site_ids,
                issue_ids=None,
                site_id_filter=site_id,
                priority_filter=priority,
                search=search,
            )

        else:
            # PROBLEMSOLVER — only issues where their assignment = COMPLETED
            issue_ids = await self._solver_completed_issue_ids(user.id)
            if not issue_ids:
                return _empty()
            return await self._fetch(
                params=params,
                statuses=RESOLVED_STATUSES,
                site_ids=None,
                issue_ids=issue_ids,
                site_id_filter=None,
                priority_filter=priority,
                search=search,
            )

    # ══════════════════════════════════════════════════════════════════
    # CARD 3 — ESCALATED
    # ══════════════════════════════════════════════════════════════════

    async def escalated(
        self,
        user: User,
        params: CursorParams,
        site_id: Optional[int] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
    ) -> CursorPage[IssueResponse]:
        """
        MANAGER       → all ESCALATED issues in system
        SUPERVISOR    → ESCALATED issues from their managed sites only
        PROBLEMSOLVER → empty (solvers do not have an escalated card)
        """
        if user.role == UserRole.MANAGER:
            return await self._fetch(
                params=params,
                statuses=ESCALATED_STATUSES,
                site_ids=None,
                issue_ids=None,
                site_id_filter=site_id,
                priority_filter=priority,
                search=search,
            )

        elif user.role == UserRole.SUPERVISOR:
            site_ids = await self._supervisor_site_ids(user.id)
            if not site_ids:
                return _empty()
            return await self._fetch(
                params=params,
                statuses=ESCALATED_STATUSES,
                site_ids=site_ids,
                issue_ids=None,
                site_id_filter=site_id,
                priority_filter=priority,
                search=search,
            )

        else:
            # PROBLEMSOLVER — no escalated card
            return _empty()
        
    # ══════════════════════════════════════════════════════════════════
    # CARD 3 — RESOLVED_PENDING_REVIEW
    # ══════════════════════════════════════════════════════════════════
    
    async def resolved_pending_review(
        self,
        user: User,
        params: CursorParams,
        site_id: Optional[int] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
    ) -> CursorPage[IssueResponse]:
        """
        MANAGER       → all RESOLVED_PENDING_REVIEW issues in system
        SUPERVISOR    → RESOLVED_PENDING_REVIEW issues from their managed sites only
        PROBLEMSOLVER → empty (solvers do not have an escalated card)
        """
        if user.role == UserRole.MANAGER:
            return await self._fetch(
                params=params,
                statuses=RESOLVED_PENDING_REVIEW,
                site_ids=None,
                issue_ids=None,
                site_id_filter=site_id,
                priority_filter=priority,
                search=search,
            )

        elif user.role == UserRole.SUPERVISOR:
            site_ids = await self._supervisor_site_ids(user.id)
            if not site_ids:
                return _empty()
            return await self._fetch(
                params=params,
                statuses=RESOLVED_PENDING_REVIEW,
                site_ids=site_ids,
                issue_ids=None,
                site_id_filter=site_id,
                priority_filter=priority,
                search=search,
            )

        else:
            # PROBLEMSOLVER — no resolved pending review card
            return _empty()

    # ══════════════════════════════════════════════════════════════════
    # CORE: Shared cursor-paginated query
    # All 3 card functions call this — 1 JOIN query every time.
    # ══════════════════════════════════════════════════════════════════

    async def _fetch(
        self,
        params: CursorParams,
        statuses: list[IssueStatus],
        site_ids: Optional[list[int]],   # None = no site restriction
        issue_ids: Optional[list[int]],  # None = no issue-id restriction
        site_id_filter: Optional[int],   # extra ?site_id= query param
        priority_filter: Optional[str],  # extra ?priority= query param
        search: Optional[str],           # extra ?search= query param
    ) -> CursorPage[IssueResponse]:
        """
        Single indexed query with inline JOINs — no N+1.

        Page 1:  WHERE (scope) AND id < ∞         ORDER BY id DESC LIMIT limit+1
        Page 2:  WHERE (scope) AND id < last_id   ORDER BY id DESC LIMIT limit+1

        Fetch limit+1 rows. If we get limit+1 back, there IS a next page.
        Return only `limit` rows and encode rows[-1].id as next_cursor.

        No COUNT — cursor pagination never needs it.
        """
        last_id = params.get_last_id()
        fetch_limit = params.limit + 1

        stmt = (
            select(
                Issue.id,
                Issue.site_id,
                Issue.raised_by_supervisor_id,
                Issue.title,
                Issue.description,
                Issue.priority,
                Issue.deadline_at,
                Issue.status,
                Issue.track_status,
                Issue.latitude,
                Issue.longitude,
                Issue.created_at,
                Issue.updated_at,
                # Inline joins → avoids selectinload N+1
                Site.name.label("site_name"),
                User.name.label("supervisor_name"),
            )
            .join(Site, Site.id == Issue.site_id, isouter=True)
            .join(User, User.id == Issue.raised_by_supervisor_id, isouter=True)
        )

        # ── Status filter (always present) ─────────────────────────
        stmt = stmt.where(Issue.status.in_(statuses))

        # ── Supervisor scope: only their sites ──────────────────────
        # site_ids = None  → manager path, no restriction
        # site_ids = [...]  → supervisor path, restrict to these sites
        if site_ids is not None:
            stmt = stmt.where(Issue.site_id.in_(site_ids))

        # ── Solver scope: only their assigned issues ─────────────────
        # issue_ids = None  → manager/supervisor path, no restriction
        # issue_ids = [...]  → solver path, restrict to these issue IDs
        if issue_ids is not None:
            stmt = stmt.where(Issue.id.in_(issue_ids))

        # ── Optional extra query-param filters ───────────────────────
        if site_id_filter:
            stmt = stmt.where(Issue.site_id == site_id_filter)

        if priority_filter:
            try:
                p_enum = Priority(priority_filter.lower())
                stmt = stmt.where(Issue.priority == p_enum)
            except ValueError:
                pass  # Invalid priority value — silently ignore

        if search:
            stmt = stmt.where(Issue.title.ilike(f"%{search}%"))

        # ── Cursor filter: O(log n) regardless of page depth ─────────
        if last_id is not None:
            stmt = stmt.where(Issue.id < last_id)

        # ── Order + fetch limit (extra row = has_more signal) ────────
        stmt = stmt.order_by(Issue.id.desc()).limit(fetch_limit)

        rows = (await self.db.execute(stmt)).mappings().all()

        has_more = len(rows) == fetch_limit
        items = rows[: params.limit]
        next_cursor = encode_cursor(items[-1]["id"]) if has_more and items else None

        return CursorPage(
            items=[_row_to_response(r) for r in items],
            next_cursor=next_cursor,
            total_returned=len(items),
            has_more=has_more,
        )
    
    async def _get_issue_if_allowed(
        self,
        issue_id: int,
        user: User,
        allowed_statuses: list[IssueStatus],
    ) -> Issue:

        stmt = select(Issue).where(
            Issue.id == issue_id,
            Issue.status.in_(allowed_statuses),
        )

        issue = (await self.db.execute(stmt)).scalar_one_or_none()

        if not issue:
            raise ValueError("Issue not found or not in this category")

        # ── Role access control ─────────────────────────────

        if user.role == UserRole.MANAGER:
            return issue

        elif user.role == UserRole.SUPERVISOR:
            site_ids = await self._supervisor_site_ids(user.id)
            if issue.site_id not in site_ids:
                raise PermissionError("Not allowed")
            return issue

        else:  # PROBLEMSOLVER
            active_ids = await self._solver_active_issue_ids(user.id)
            completed_ids = await self._solver_completed_issue_ids(user.id)

            if issue.id not in (active_ids + completed_ids):
                raise PermissionError("Not allowed")

        return issue
        
    async def get_pending_issue_detail(self, issue_id: int, user: User) -> IssueDetailResponse:
        from app.services.issue_service import IssueService

        issue = await self._get_issue_if_allowed(issue_id, user, PENDING_STATUSES)

        issue_service = IssueService(self.db)
        return await issue_service.get_issue_detail(issue.id)


    async def get_resolved_issue_detail(self, issue_id: int, user: User) -> IssueDetailResponse:
        from app.services.issue_service import IssueService

        issue = await self._get_issue_if_allowed(issue_id, user, RESOLVED_STATUSES)

        issue_service = IssueService(self.db)
        return await issue_service.get_issue_detail(issue.id)


    async def get_escalated_issue_detail(self, issue_id: int, user: User) -> IssueDetailResponse:
        from app.services.issue_service import IssueService

        issue = await self._get_issue_if_allowed(issue_id, user, ESCALATED_STATUSES)

        issue_service = IssueService(self.db)
        return await issue_service.get_issue_detail(issue.id)
    
    async def get_resolved_pending_review(self, issue_id: int, user: User) -> IssueDetailResponse:
        from app.services.issue_service import IssueService

        issue = await self._get_issue_if_allowed(issue_id, user, RESOLVED_PENDING_REVIEW)

        issue_service = IssueService(self.db)
        return await issue_service.get_issue_detail(issue.id)

    # ══════════════════════════════════════════════════════════════════
    # PRIVATE: Scope helpers
    # ══════════════════════════════════════════════════════════════════

    async def _supervisor_site_ids(self, supervisor_id: int) -> list[int]:
        """
        Returns site IDs managed by this supervisor.
        One indexed query on supervisor_sites.supervisor_id.
        """
        result = await self.db.execute(
            select(SupervisorSite.c.site_id).where(
                SupervisorSite.c.supervisor_id == supervisor_id
            )
        )
        return result.scalars().all()

    async def _solver_active_issue_ids(self, solver_id: int) -> list[int]:
        """
        Returns issue IDs where this solver has an ACTIVE or REOPENED assignment.
        Used for the solver's pending-issues card.
        One indexed query on issue_assignments.assigned_to_solver_id.
        """
        result = await self.db.execute(
            select(IssueAssignment.issue_id).where(
                IssueAssignment.assigned_to_solver_id == solver_id,
                IssueAssignment.status.in_([
                    AssignmentStatus.ACTIVE,
                    AssignmentStatus.REOPENED,
                ]),
            )
        )
        return result.scalars().all()

    async def _solver_completed_issue_ids(self, solver_id: int) -> list[int]:
        """
        Returns issue IDs where this solver has a COMPLETED assignment.
        Used for the solver's resolved card.
        One indexed query on issue_assignments.assigned_to_solver_id.
        """
        result = await self.db.execute(
            select(IssueAssignment.issue_id).where(
                IssueAssignment.assigned_to_solver_id == solver_id,
                IssueAssignment.status == AssignmentStatus.COMPLETED,
            )
        )
        return result.scalars().all()


# ══════════════════════════════════════════════════════════════════════
# MODULE HELPERS
# ══════════════════════════════════════════════════════════════════════

def _empty() -> CursorPage[IssueResponse]:
    """Empty cursor page — returned when the role has no data for this card."""
    return CursorPage(
        items=[],
        next_cursor=None,
        total_returned=0,
        has_more=False,
    )


def _row_to_response(row) -> IssueResponse:
    """Convert a raw JOIN mapping row to IssueResponse schema."""
    return IssueResponse(
        id=row["id"],
        site_id=row["site_id"],
        site_name=row["site_name"],
        raised_by_supervisor_id=row["raised_by_supervisor_id"],
        supervisor_name=row["supervisor_name"],
        title=row["title"],
        description=row["description"],
        priority=row["priority"],
        deadline_at=row["deadline_at"],
        status=row["status"],
        track_status=row["track_status"],
        latitude=row["latitude"],
        longitude=row["longitude"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    ) 