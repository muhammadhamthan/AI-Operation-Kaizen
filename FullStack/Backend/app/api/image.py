"""
PURPOSE: ImageKit auth + image reference saving endpoints.
────────────────────────────────────────────────────────────────
ENDPOINTS:
  GET  /api/v1/images/imagekit-auth   → Returns fresh ImageKit credentials
  POST /api/v1/images/save            → Saves uploaded image URL to DB
"""

import hashlib
import hmac
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.issue import Issue
from app.models.issue_image import IssueImage
from app.core.config import settings
from app.core.enums import ImageType, AIFlag
from app.schemas.image_schema import (
    ImageKitAuthResponse,
    ImageUploadResponse,
    ImageListResponse,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════
# GET /imagekit-auth  ─ Generate fresh upload credentials
# ══════════════════════════════════════════════════════════════════

@router.get(
    "/imagekit-auth",
    response_model=ImageKitAuthResponse,
    summary="Get fresh ImageKit upload credentials (required before every upload)",
)
async def get_imagekit_auth(
    current_user: User = Depends(get_current_user),
):
    """
    Generates a brand-new signed token for ImageKit direct uploads.

    ImageKit requires a unique UUID token per upload to prevent
    replay attacks — never reuse tokens.

    Frontend calls this BEFORE every upload, then POSTs directly
    to ImageKit's upload endpoint using these credentials.
    """
    try:
        # ── 1. Generate a fresh UUID token (ImageKit requirement) ──
        token = str(uuid.uuid4())

        # ── 2. Set expiry to 30 minutes from now ──────────────────
        expire = int(time.time()) + 1800  # 30 minutes

        # ── 3. Build the HMAC-SHA1 signature ──────────────────────
        # ImageKit signature = HMAC-SHA1(private_key, token + expire)
        message = f"{token}{expire}"
        signature = hmac.new(
            settings.IMAGEKIT_PRIVATE_KEY.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha1,
        ).hexdigest()

        return ImageKitAuthResponse(
            token=token,
            expire=expire,
            signature=signature,
            public_key=settings.IMAGEKIT_PUBLIC_KEY,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate ImageKit auth: {str(e)}",
        )


# ══════════════════════════════════════════════════════════════════
# POST /save  ─ Save uploaded image reference to DB
# ══════════════════════════════════════════════════════════════════

from pydantic import BaseModel

class SaveImageRequest(BaseModel):
    image_url: str
    image_type: str = "BEFORE"      # BEFORE | AFTER
    issue_id: Optional[int] = None


@router.post(
    "/save",
    response_model=ImageUploadResponse,
    summary="Save uploaded image URL reference to database",
)
async def save_image_reference(
    data: SaveImageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    After frontend uploads directly to ImageKit, it calls this endpoint
    to save the resulting CDN URL into our database.

    Links the image to an issue (if issue_id provided) and records
    who uploaded it and what type (BEFORE/AFTER).
    """
    # ── Validate image_type ────────────────────────────────────────
    try:
        img_type = ImageType(data.image_type.upper())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image_type '{data.image_type}'. Must be BEFORE or AFTER.",
        )

    # ── Validate issue exists if provided ─────────────────────────
    if data.issue_id:
        issue = (await db.execute(
            select(Issue).where(Issue.id == data.issue_id)
        )).scalar_one_or_none()

        if not issue:
            raise HTTPException(
                status_code=404,
                detail=f"Issue #{data.issue_id} not found.",
            )

    # ── Save image reference to DB ─────────────────────────────────
    image = IssueImage(
        issue_id=data.issue_id,
        uploaded_by_user_id=current_user.id,
        image_url=data.image_url,
        image_type=img_type,
        ai_flag=AIFlag.NOT_CHECKED,
        ai_details={},
    )
    db.add(image)
    await db.flush()
    await db.refresh(image)
    await db.commit()

    return ImageUploadResponse(
        id=image.id,
        image_url=image.image_url,
        image_type=image.image_type.value,
        ai_flag=image.ai_flag.value,
        issue_id=image.issue_id,
    )


# ══════════════════════════════════════════════════════════════════
# GET /issue/{issue_id}  ─ List all images for an issue
# ══════════════════════════════════════════════════════════════════

@router.get(
    "/issue/{issue_id}",
    response_model=ImageListResponse,
    summary="Get all images for a specific issue",
)
async def get_issue_images(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all BEFORE and AFTER images for an issue."""
    images = (await db.execute(
        select(IssueImage)
        .where(IssueImage.issue_id == issue_id)
        .order_by(IssueImage.created_at.asc())
    )).scalars().all()

    return ImageListResponse(
        total=len(images),
        images=[
            ImageUploadResponse(
                id=img.id,
                image_url=img.image_url,
                image_type=img.image_type.value,
                ai_flag=img.ai_flag.value,
                issue_id=img.issue_id,
            )
            for img in images
        ],
    )