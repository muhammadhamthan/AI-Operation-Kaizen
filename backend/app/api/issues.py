"""
PURPOSE: READ-ONLY issue endpoints for dashboard and detail views.
──────────────────────────────────────────────────────────────────
Issues are CREATED via chat (POST /api/v1/chat).
Issues are UPDATED via chat (POST /api/v1/chat).
These endpoints only READ existing data.

ENDPOINTS:
  GET /api/v1/issues          → List issues (role-filtered)
  GET /api/v1/issues/{id}     → Single issue detail
  GET /api/v1/issues/{id}/timeline → Audit trail
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.issue_service import IssueService
from app.core.enums import IssueStatus, Priority
from app.schemas.issue_schema import (
    IssueListResponse,
    IssueDetailResponse,
)
from app.schemas.history_schema import IssueHistoryListResponse

from app.schemas.issue_schema import IssueResponse
from app.schemas.history_schema import IssueHistoryListResponse
from app.schemas.pagination_schema import CursorPage, CursorParams

router = APIRouter()



# ══════════════════════════════════════════════════════════════════════════════
# NEW: Cursor-paginated feed  ← use this for all frontend pages
# ══════════════════════════════════════════════════════════════════════════════
 
@router.get(
    "",
    response_model=CursorPage[IssueResponse],
    summary="Cursor-paginated issue feed (fast, use for all UI pages)",
)
async def get_issues_feed(
    # Cursor params — injected as query params automatically
    cursor: Optional[str] = None,
    
    limit: int = 20,
    # Filters
    status_filter: Optional[str] = None,
    priority: Optional[str] = None,
    site_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    HIGH-PERFORMANCE cursor-paginated issue list.
 
    HOW TO USE FROM FRONTEND:
 
    First page (no cursor):
      GET /api/v1/issues/feed?limit=20
 
    Next page (pass next_cursor from previous response):
      GET /api/v1/issues/feed?cursor=eyJpZCI6IDEwMH0&limit=20
 
    With filters:
      GET /api/v1/issues/feed?status_filter=OPEN&priority=high&limit=20
 
    Load-more button example (React Native):
      const [items, setItems] = useState([])
      const [nextCursor, setNextCursor] = useState(null)
      const [hasMore, setHasMore] = useState(true)
 
      async function loadMore() {
        const url = nextCursor
          ? `/api/v1/issues/feed?cursor=${nextCursor}&limit=20`
          : `/api/v1/issues/feed?limit=20`
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        setItems(prev => [...prev, ...data.items])
        setNextCursor(data.next_cursor)
        setHasMore(data.has_more)
      }
 
    Response shape:
    {
      "items": [...],          // IssueResponse objects
      "next_cursor": "abc123", // pass as ?cursor= next time (null = last page)
      "total_returned": 20,    // items in THIS response
      "has_more": true         // false = you've loaded everything
    }
    """
    issue_service = IssueService(db)
 
    # Validate filter enums
    status_enum = None
    if status_filter:
        try:
            status_enum = IssueStatus(status_filter)
        except ValueError:
            raise HTTPException(400, f"Invalid status: {status_filter}")
 
    priority_enum = None
    if priority:
        try:
            priority_enum = Priority(priority)
        except ValueError:
            raise HTTPException(400, f"Invalid priority: {priority}")
 
    # Clamp limit
    limit = max(1, min(limit, 100))
 
    params = CursorParams(cursor=cursor, limit=limit)
 
    return await issue_service.list_issues_cursor(
        current_user=current_user,
        params=params,
        status_filter=status_enum,
        priority=priority_enum,
        site_id=site_id,
        search=search,
    )

@router.get(
    "/{issue_id}",
    response_model=IssueDetailResponse,
    summary="Get issue detail (read-only)",
)
async def get_issue_detail(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns full issue with images, assignments, and complaint count."""
    issue_service = IssueService(db)
    result = await issue_service.get_issue_detail(issue_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue {issue_id} not found",
        )

    return result


@router.get(
    "/{issue_id}/timeline",
    response_model=IssueHistoryListResponse,
    summary="Get issue audit trail (read-only)",
)
async def get_issue_timeline(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the complete history of status changes for an issue."""
    issue_service = IssueService(db)
    result = await issue_service.get_timeline(issue_id)
    return result