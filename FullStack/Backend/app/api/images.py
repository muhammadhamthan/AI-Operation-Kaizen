"""
app/api/images.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENDPOINTS:
  GET  /api/v1/images/imagekit-auth   → Returns short-lived token for frontend direct upload
  POST /api/v1/images/upload          → (Legacy) Upload through server → ImageKit → return URL
  GET  /api/v1/images/by-issue/{id}  → List BEFORE + AFTER images for an issue

RECOMMENDED FLOW (frontend-direct):
  Step 1 → Frontend calls GET /api/v1/images/imagekit-auth  (gets token/signature)
  Step 2 → Frontend uploads directly to ImageKit using their JS SDK
  Step 3 → Frontend gets back a permanent URL from ImageKit
  Step 4 → Frontend sends ONLY the URL in ChatRequest.image_url
  Step 5 → Backend never touches image bytes — just stores the URL

LEGACY FLOW (server-proxied, still available):
  Step 1 → POST /api/v1/images/upload  (bytes go through your server)
  Step 2 → Backend uploads to ImageKit, returns URL
  Step 3 → Frontend uses URL in next chat message
"""

import hashlib
import hmac
import time
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.image_service import ImageService
from app.core.config import settings
from app.core.enums import ImageType
from app.schemas.image_schema import (
    ImageUploadResponse,
    ImageListResponse,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════
# NEW: ImageKit auth token for frontend direct upload
# ══════════════════════════════════════════════════════════════════

@router.get(
    "/imagekit-auth",
    summary="Get ImageKit auth token for frontend direct upload",
)
async def get_imagekit_auth(
    current_user: User = Depends(get_current_user),
):
    """
    Returns a short-lived ImageKit authentication signature.

    The frontend uses this to upload images DIRECTLY to ImageKit CDN
    without routing image bytes through our FastAPI server.

    Token expires in 30 minutes. Frontend should call this fresh
    before each upload (or cache and refresh when expired).

    Response:
    {
        "token": "uuid-string",
        "expire": 1700000000,
        "signature": "sha1-hmac-hex",
        "public_key": "public_...",
        "url_endpoint": "https://ik.imagekit.io/yourid"
    }
    """
    private_key = settings.IMAGEKIT_PRIVATE_KEY
    expire = int(time.time()) + 1800  # valid for 30 minutes
    token = str(uuid.uuid4())

    # ImageKit requires HMAC-SHA1: sign (token + expire) with private key
    signature_input = token + str(expire)
    signature = hmac.new(
        private_key.encode("utf-8"),
        signature_input.encode("utf-8"),
        hashlib.sha1,
    ).hexdigest()

    return {
        "token": token,
        "expire": expire,
        "signature": signature,
        "public_key": settings.IMAGEKIT_PUBLIC_KEY,
        "url_endpoint": settings.IMAGEKIT_URL_ENDPOINT,
    }


# ══════════════════════════════════════════════════════════════════
# LEGACY: Upload through server (keep for backward compatibility)
# ══════════════════════════════════════════════════════════════════

@router.post(
    "/upload",
    response_model=ImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="(Legacy) Upload image through server to ImageKit CDN",
)
async def upload_image(
    file: UploadFile = File(..., description="Image file — JPEG, PNG, or WebP"),
    issue_id: Optional[int] = Form(None, description="Link to issue if known"),
    image_type: str = Form(
        "BEFORE",
        description="BEFORE = supervisor photo. AFTER = solver completion photo.",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Uploads an image to ImageKit CDN via the server.

    NOTE: Prefer the frontend-direct flow using /imagekit-auth instead.
    This endpoint routes all image bytes through the FastAPI server,
    which is slower and uses more server resources.

    Still useful for:
      - Server-side AI verification workflows
      - Environments where the frontend can't use the ImageKit JS SDK
    """
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, WebP",
        )

    content = await file.read()
    MAX_SIZE = 10 * 1024 * 1024  # 10 MB
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size {len(content) // 1024 // 1024}MB exceeds the 10MB limit",
        )
    await file.seek(0)

    try:
        img_type_enum = ImageType(image_type.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image_type '{image_type}'. Use 'BEFORE' or 'AFTER'",
        )

    image_service = ImageService(db)
    result = await image_service.upload_image(
        file=file,
        issue_id=issue_id,
        image_type=img_type_enum,
        uploaded_by=current_user,
    )

    await db.commit()
    return result


# ══════════════════════════════════════════════════════════════════
# GET IMAGES BY ISSUE
# ══════════════════════════════════════════════════════════════════

@router.get(
    "/by-issue/{issue_id}",
    response_model=ImageListResponse,
    summary="Get all images for an issue (BEFORE + AFTER separated)",
)
async def get_images_by_issue(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all images for an issue split into two lists:
      - before_images: photos uploaded by the supervisor showing the problem
      - after_images:  photos uploaded by the solver showing the completed fix
    """
    image_service = ImageService(db)
    return await image_service.get_images_by_issue(issue_id)