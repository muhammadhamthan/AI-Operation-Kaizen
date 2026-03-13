"""
PURPOSE: Image upload response and AI verification schemas.
──────────────────────────────────────────────────────────────
Image UPLOAD is the one action that needs a separate endpoint
because file upload cannot happen through text chat.

FLOW:
  1. User selects a photo in the mobile app / web UI
  2. Frontend calls POST /api/v1/images/upload (multipart form)
  3. Backend uploads to ImageKit CDN → returns URL
  4. Frontend gets the URL and includes it in the NEXT chat message:
     ChatRequest(message="pipe broken...", image_url="https://ik.imagekit.io/...")

So the image upload endpoint is a HELPER for the chat flow.
The actual issue creation / completion still happens through chat.

USED BY:
  POST /api/v1/images/upload  → returns ImageUploadResponse with CDN URL
  GET  /api/v1/images/by-issue/{id} → ImageListResponse (read-only)
  Internal: ai_service → AIVerificationResult

AI Verification happens AUTOMATICALLY when solver sends AFTER photo:
  - Solver chats: "work completed, here is the photo" + image_url
  - chatbot_service detects complete_work intent
  - Creates AFTER image record
  - AI vision analyzes the photo
  - If confidence > 0.85 → ai_flag = OK
  - If confidence ≤ 0.85 → ai_flag = SUSPECT
  - Updates issue to RESOLVED_PENDING_REVIEW
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.core.enums import ImageType, AIFlag


# ══════════════════════════════════════════════════════════
# RESPONSE: Image upload result — returned after file upload
# ══════════════════════════════════════════════════════════

class ImageUploadResponse(BaseModel):
    """
    Returned by POST /api/v1/images/upload after file is uploaded to ImageKit.
    
    The frontend uses the image_url from this response and passes it
    to the chat endpoint in the next ChatRequest.image_url field.
    
    This is a HELPER endpoint — not the main action.
    The actual issue creation / work completion happens in chat.
    """
    id: int = Field(
        ..., description="Image record ID in database",
    )
    image_url: str = Field(
        ..., description=(
            "ImageKit CDN URL — use this in ChatRequest.image_url "
            "when sending the chat message"
        ),
    )
    image_type: ImageType = Field(
        ..., description="BEFORE or AFTER",
    )
    issue_id: Optional[int] = Field(
        None, description="Issue ID if linked during upload",
    )
    ai_flag: AIFlag = Field(
        default=AIFlag.NOT_CHECKED,
        description="AI verification result (for AFTER photos)",
    )
    ai_details: Optional[Dict[str, Any]] = Field(
        None,
        description="AI analysis details (confidence, findings)",
    )
    created_at: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════
# INTERNAL: AI verification output
# ══════════════════════════════════════════════════════════

class AIVerificationResult(BaseModel):
    """
    INTERNAL — returned by ai_service.verify_completion_image().
    Used by chatbot_service when processing solver's AFTER photo.
    
    confidence > 0.85 → ai_flag = OK (repair looks complete)
    confidence ≤ 0.85 → ai_flag = SUSPECT (potential issues found)
    """
    ai_flag: AIFlag = Field(..., description="OK | SUSPECT | NOT_CHECKED")
    confidence: float = Field(
        ..., ge=0.0, le=1.0,
        description="AI confidence score (0.0 to 1.0)",
    )
    details: Dict[str, Any] = Field(
        default_factory=dict,
        description="Problem-specific findings from AI analysis",
        examples=[
            {"leak_detected": False, "pipe_condition": "good"},
            {"wiring_fixed": True, "exposed_conductors": False},
        ],
    )


# ══════════════════════════════════════════════════════════
# RESPONSE: Image list — for issue detail views
# ══════════════════════════════════════════════════════════

class ImageResponse(BaseModel):
    """Single image record with AI verification details."""
    id: int
    issue_id: int
    uploaded_by_user_id: int
    uploader_name: Optional[str] = None
    image_url: str
    image_type: ImageType
    ai_flag: AIFlag
    ai_details: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ImageListResponse(BaseModel):
    """
    All images for an issue — separated into BEFORE and AFTER.
    Used in issue detail views and when user asks about photos in chat.
    """
    total: int
    issue_id: int
    before_images: List[ImageResponse] = Field(
        default_factory=list,
        description="Photos uploaded by supervisor when creating issue",
    )
    after_images: List[ImageResponse] = Field(
        default_factory=list,
        description="Photos uploaded by solver when completing work",
    )