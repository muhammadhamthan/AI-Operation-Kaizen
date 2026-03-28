"""
PURPOSE: READ-ONLY assignment endpoints.
─────────────────────────────────────────
Assignments are CREATED automatically by the chatbot when issues are created.
Assignments are UPDATED via chat (solver status updates, complaint reopening).
These endpoints only READ existing data.

ENDPOINTS:
  GET /api/v1/assignments            → List assignments (role-filtered)
  GET /api/v1/assignments/{id}       → Single assignment detail
  GET /api/v1/assignments/{id}/calls → Call attempt history
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.assignment_service import AssignmentService
from app.core.enums import AssignmentStatus
from app.schemas.assignment_schema import (
    AssignmentResponse,
    AssignmentListResponse,
)
from app.schemas.call_log_schema import CallLogListResponse

router = APIRouter()


@router.get(
    "",
    response_model=AssignmentListResponse,
    summary="List assignments (read-only, role-filtered)",
)
def list_assignments(
    status_filter: Optional[str] = None,
    solver_id: Optional[int] = None,
    issue_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Solver → their assignments.
    Supervisor → assignments they created.
    Manager → all assignments.
    """
    service = AssignmentService(db)

    status_enum = None
    if status_filter:
        try:
            status_enum = AssignmentStatus(status_filter)
        except ValueError:
            raise HTTPException(400, f"Invalid status: {status_filter}")

    return service.list_assignments(
        current_user=current_user,
        status_filter=status_enum,
        solver_id=solver_id,
        issue_id=issue_id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{assignment_id}",
    response_model=AssignmentResponse,
    summary="Get assignment detail (read-only)",
)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AssignmentService(db)
    result = service.get_assignment(assignment_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment {assignment_id} not found",
        )
    return result


@router.get(
    "/{assignment_id}/calls",
    response_model=CallLogListResponse,
    summary="Get call attempt history for an assignment",
)
def get_call_logs(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AssignmentService(db)
    return service.get_call_logs(assignment_id)