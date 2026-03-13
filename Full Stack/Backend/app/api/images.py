"""
PURPOSE: Image upload endpoint — HELPER for the chat flow.
──────────────────────────────────────────────────────────────
File uploads cannot happen through text chat, so this is a
separate endpoint. The flow is:

  1. User selects photo in app
  2. Frontend calls POST /api/v1/images/upload
  3. Backend uploads to ImageKit CDN → returns URL
  4. Frontend puts the URL in the NEXT chat message:
     POST /api/v1/chat { message: "pipe broken...", image_url: "<url>" }

ENDPOINTS:
  POST /api/v1/images/upload          → Upload file to CDN
  GET  /api/v1/images/by-issue/{id}   → Get images for an issue (read-only)
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.image_service import ImageService
from app.core.enums import ImageType
from app.schemas.image_schema import (
    ImageUploadResponse,
    ImageListResponse,
)

router = APIRouter()


@router.post(
    "/upload",
    response_model=ImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload image to CDN (helper for chat flow)",
)
async def upload_image(
    file: UploadFile = File(..., description="Image file (JPEG, PNG)"),
    issue_id: Optional[int] = Form(None, description="Link to issue if known"),
    image_type: str = Form("BEFORE", description="BEFORE or AFTER"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Uploads image to ImageKit CDN and returns the URL.
    Use the returned image_url in your next POST /api/v1/chat message.

    - Supervisors upload BEFORE photos when reporting issues
    - Solvers upload AFTER photos when completing work
    - Supervisors upload evidence photos when filing complaints
    """
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, and WebP images are allowed",
        )

    # Validate file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit",
        )
    await file.seek(0)

    # Parse image type
    try:
        img_type = ImageType(image_type)
    except ValueError:
        raise HTTPException(400, f"Invalid image_type: {image_type}. Use BEFORE or AFTER")

    image_service = ImageService(db)

    return await image_service.upload_image(
        file=file,
        issue_id=issue_id,
        image_type=img_type,
        uploaded_by=current_user,
    )


@router.get(
    "/by-issue/{issue_id}",
    response_model=ImageListResponse,
    summary="Get all images for an issue (read-only)",
)
def get_images_by_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns BEFORE and AFTER images for a specific issue."""
    image_service = ImageService(db)
    return image_service.get_images_by_issue(issue_id)