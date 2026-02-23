"""
PURPOSE: Image upload to CDN + AI verification.
"""

import logging
from typing import Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.issue_image import IssueImage
from app.core.enums import ImageType, AIFlag
from app.schemas.image_schema import (
    ImageUploadResponse, ImageListResponse, ImageResponse,
)

logger = logging.getLogger(__name__)


class ImageService:
    def __init__(self, db: Session):
        self.db = db

    async def upload_image(
        self, file: UploadFile, issue_id: Optional[int],
        image_type: ImageType, uploaded_by: User,
    ) -> ImageUploadResponse:
        """
        Uploads to ImageKit CDN and creates DB record.
        For now: saves URL as placeholder.
        Replace with actual ImageKit SDK call.
        """
        # TODO: Replace with actual ImageKit upload
        filename = f"{issue_id or 'temp'}/{image_type.value}-{file.filename}"
        image_url = f"https://ik.imagekit.io/facility/issues/{filename}"

        record = IssueImage(
            issue_id=issue_id,
            uploaded_by_user_id=uploaded_by.id,
            image_url=image_url,
            image_type=image_type,
            ai_flag=AIFlag.NOT_CHECKED,
            ai_details={},
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)

        return ImageUploadResponse(
            id=record.id,
            image_url=record.image_url,
            image_type=record.image_type,
            issue_id=record.issue_id,
            ai_flag=record.ai_flag,
            ai_details=record.ai_details,
            created_at=record.created_at,
        )

    def get_images_by_issue(self, issue_id: int) -> ImageListResponse:
        images = self.db.query(IssueImage).filter(
            IssueImage.issue_id == issue_id
        ).order_by(IssueImage.created_at).all()

        before = [self._to_response(i) for i in images if i.image_type == ImageType.BEFORE]
        after = [self._to_response(i) for i in images if i.image_type == ImageType.AFTER]

        return ImageListResponse(
            total=len(images), issue_id=issue_id,
            before_images=before, after_images=after,
        )

    def _to_response(self, img):
        return ImageResponse(
            id=img.id, issue_id=img.issue_id,
            uploaded_by_user_id=img.uploaded_by_user_id,
            uploader_name=img.uploaded_by.name if img.uploaded_by else None,
            image_url=img.image_url, image_type=img.image_type,
            ai_flag=img.ai_flag, ai_details=img.ai_details,
            created_at=img.created_at, updated_at=img.updated_at,
        )