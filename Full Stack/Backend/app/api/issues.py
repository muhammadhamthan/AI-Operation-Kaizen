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

router = APIRouter()


@router.get(
    "",
    response_model=IssueListResponse,
    summary="List issues (read-only, role-filtered)",
)
def list_issues(
    status_filter: Optional[str] = None,
    priority: Optional[str] = None,
    site_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns issues visible to the current user based on their role.
    Supervisor → issues from their sites.
    Solver → issues assigned to them.
    Manager → all issues.
    """
    issue_service = IssueService(db)

    # Parse optional enums
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

    return issue_service.list_issues(
        current_user=current_user,
        status_filter=status_enum,
        priority=priority_enum,
        site_id=site_id,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{issue_id}",
    response_model=IssueDetailResponse,
    summary="Get issue detail (read-only)",
)
def get_issue_detail(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns full issue with images, assignments, and complaint count."""
    issue_service = IssueService(db)
    result = issue_service.get_issue_detail(issue_id)

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
def get_issue_timeline(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the complete history of status changes for an issue."""
    issue_service = IssueService(db)
    return issue_service.get_timeline(issue_id)