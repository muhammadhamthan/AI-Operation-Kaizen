"""
PURPOSE: Dashboard card endpoints — 3 endpoints, role-aware data.
──────────────────────────────────────────────────────────────────
Only 3 endpoints. Service decides what data to return based on role.

  GET /api/v1/dashboard-cards/pending-issues
  GET /api/v1/dashboard-cards/resolved
  GET /api/v1/dashboard-cards/escalated

ROLE BEHAVIOR:
  pending-issues:
    MANAGER       → ALL pending issues in system
    SUPERVISOR    → pending issues from their managed sites only
    PROBLEMSOLVER → issues assigned to them (ACTIVE assignment) only

  resolved:
    MANAGER       → ALL completed issues in system
    SUPERVISOR    → completed issues from their managed sites only
    PROBLEMSOLVER → issues they personally resolved (COMPLETED assignment)

  escalated:
    MANAGER       → ALL escalated issues in system
    SUPERVISOR    → escalated issues from their managed sites only
    PROBLEMSOLVER → returns empty (solvers do not have an escalated card)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.issue_schema import IssueDetailResponse, IssueResponse
from app.schemas.pagination_schema import CursorPage, CursorParams
from app.services.dashboard_card_service import DashboardCardService

router = APIRouter()


@router.get(
    "/pending-issues",
    response_model=CursorPage[IssueResponse],
    summary="Pending issues — data scoped by caller role",
)
async def pending_issues(
    cursor: Optional[str] = None,
    limit: int = 20,
    site_id: Optional[int] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns pending issues based on who is calling:
      MANAGER       → all OPEN | ASSIGNED | IN_PROGRESS | REOPENED in system
      SUPERVISOR    → same statuses, scoped to their managed sites only
      PROBLEMSOLVER → only issues where they have an ACTIVE or REOPENED assignment
    """
    limit = max(1, min(limit, 100))
    params = CursorParams(cursor=cursor, limit=limit)
    service = DashboardCardService(db)
    return await service.pending_issues(
        user=current_user,
        params=params,
        site_id=site_id,
        priority=priority,
        search=search,
    )


@router.get(
    "/resolved",
    response_model=CursorPage[IssueResponse],
    summary="Resolved issues — data scoped by caller role",
)
async def resolved(
    cursor: Optional[str] = None,
    limit: int = 20,
    site_id: Optional[int] = None,#NOT NEEDED
    priority: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns resolved/completed issues based on who is calling:
      MANAGER       → all COMPLETED issues in system
      SUPERVISOR    → COMPLETED issues from their managed sites only
      PROBLEMSOLVER → issues they resolved (where their assignment = COMPLETED)
    """
    limit = max(1, min(limit, 100))
    params = CursorParams(cursor=cursor, limit=limit)
    service = DashboardCardService(db)
    return await service.resolved(
        user=current_user,
        params=params,
        site_id=site_id,
        priority=priority,
        search=search,
    )


@router.get(
    "/escalated",
    response_model=CursorPage[IssueResponse],
    summary="Escalated issues — data scoped by caller role",
)
async def escalated(
    cursor: Optional[str] = None,
    limit: int = 20,
    site_id: Optional[int] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns escalated issues based on who is calling:
      MANAGER       → all ESCALATED issues in system
      SUPERVISOR    → ESCALATED issues from their managed sites only
      PROBLEMSOLVER → empty page (solvers do not have an escalated card)
    """
    limit = max(1, min(limit, 100))
    params = CursorParams(cursor=cursor, limit=limit)
    service = DashboardCardService(db)
    return await service.escalated(
        user=current_user,
        params=params,
        site_id=site_id,
        priority=priority,
        search=search,
    )

@router.get(
    "/resolved-pending-review",
    response_model=CursorPage[IssueResponse],
    summary="Resolved pending review issues — data scoped by caller role",
)   
async def resolved_pending_review(
    cursor: Optional[str] = None,
    limit: int = 20,
    site_id: Optional[int] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns resolved pending review issues based on who is calling:
      MANAGER       → all RESOLVED_PENDING_REVIEW issues in system
      SUPERVISOR    → RESOLVED_PENDING_REVIEW issues from their managed sites only
      PROBLEMSOLVER → empty page (solvers do not have a resolved pending review card)
    """
    limit = max(1, min(limit, 100))
    params = CursorParams(cursor=cursor, limit=limit)
    service = DashboardCardService(db)
    return await service.resolved_pending_review(
        user=current_user,
        params=params,
        site_id=site_id,
        priority=priority,
        search=search,
    )
    
@router.get("/pending-issues/{issue_id}", response_model=IssueDetailResponse)
async def pending_issue_detail(issue_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = DashboardCardService(db)
    return await service.get_pending_issue_detail(issue_id, current_user)


@router.get("/resolved/{issue_id}", response_model=IssueDetailResponse)
async def resolved_issue_detail(issue_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = DashboardCardService(db)
    return await service.get_resolved_issue_detail(issue_id, current_user)


@router.get("/escalated/{issue_id}", response_model=IssueDetailResponse)
async def escalated_issue_detail(issue_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = DashboardCardService(db)
    return await service.get_escalated_issue_detail(issue_id, current_user)

@router.get("/resolved-pending-review/{issue_id}", response_model=IssueDetailResponse)
async def resolved_pending_review_issue_detail(issue_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = DashboardCardService(db)
    return await service.get_resolved_pending_review(issue_id, current_user)