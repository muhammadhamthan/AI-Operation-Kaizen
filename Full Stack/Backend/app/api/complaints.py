"""
PURPOSE: READ-ONLY complaint endpoints.
─────────────────────────────────────────
Complaints are CREATED via chat when supervisor says
"work not done properly" or similar complaint messages.
These endpoints only READ existing data.

ENDPOINTS:
  GET /api/v1/complaints          → List complaints (role-filtered)
  GET /api/v1/complaints/{id}     → Single complaint detail
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.complaint_service import ComplaintService
from app.schemas.complaint_schema import (
    ComplaintResponse,
    ComplaintListResponse,
)

router = APIRouter()


@router.get(
    "",
    response_model=ComplaintListResponse,
    summary="List complaints (read-only, role-filtered)",
)
async def list_complaints(
    issue_id: Optional[int] = None,
    solver_id: Optional[int] = None,
    skip: int = 0,
    # limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Supervisor → complaints they raised.
    Solver → complaints against them.
    Manager → all complaints.
    """
    service = ComplaintService(db)

    return await service.list_complaints(
        current_user=current_user,
        issue_id=issue_id,
        solver_id=solver_id,
        skip=skip,
        # limit=limit,
    )


@router.get(
    "/{complaint_id}",
    response_model=ComplaintResponse,
    summary="Get complaint detail (read-only)",
)
async def get_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ComplaintService(db)
    result = await service.get_complaint(complaint_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint {complaint_id} not found",
        )
    return result