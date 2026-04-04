"""
PURPOSE: ImageKit authentication + image upload response schemas.
"""

from pydantic import BaseModel
from typing import Optional


class ImageKitAuthResponse(BaseModel):
    """
    Returned to frontend for direct-to-ImageKit uploads.
    Frontend uses these credentials to upload directly to ImageKit CDN.
    """
    token: str
    expire: int
    signature: str
    public_key: str


class ImageUploadResponse(BaseModel):
    """
    Returned after backend saves the image reference to DB.
    """
    id: int
    image_url: str
    image_type: str
    ai_flag: str
    issue_id: Optional[int] = None

    model_config = {"from_attributes": True}


class ImageListResponse(BaseModel):
    total: int
    images: list[ImageUploadResponse]