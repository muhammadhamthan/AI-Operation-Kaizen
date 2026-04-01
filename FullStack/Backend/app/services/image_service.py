"""
app/services/image_service.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT THIS FILE DOES
═══════════════════
Handles everything related to images:
  1. Upload a file → ImageKit CDN → get back a permanent URL
  2. Store the URL + metadata in the issue_images table
  3. Return images for a given issue (BEFORE + AFTER separated)

IMAGEKIT — PLAIN ENGLISH EXPLANATION
═══════════════════════════════════════
ImageKit is a cloud media storage + CDN + real-time image processing service.

  YOU SEND:  raw file bytes  (JPEG / PNG / WebP)
  YOU GET:   a permanent CDN URL like:
             https://ik.imagekit.io/YOUR_ID/issues/123/before-photo.jpg

  The URL never changes. ImageKit stores the file forever (until you delete it).
  Their CDN serves it fast globally.

  EXTRA POWERS (you can use by changing the URL — no re-upload needed):
    Original:   https://ik.imagekit.io/abc/issues/123/photo.jpg
    Resize:     https://ik.imagekit.io/abc/issues/123/photo.jpg?tr=w-400,h-300
    Thumbnail:  https://ik.imagekit.io/abc/issues/123/photo.jpg?tr=w-100,h-100,fo-auto
    WebP:       https://ik.imagekit.io/abc/issues/123/photo.jpg?tr=f-webp
    Compress:   https://ik.imagekit.io/abc/issues/123/photo.jpg?tr=q-80
  These transformations happen on their server — your stored file stays original.

  THREE CONFIG VALUES you need (from ImageKit dashboard → Developer section):
    IMAGEKIT_PRIVATE_KEY   — for uploading (server-side only, never expose to frontend)
    IMAGEKIT_PUBLIC_KEY    — for client-side SDK (not used in our backend-only flow)
    IMAGEKIT_URL_ENDPOINT  — the base CDN URL, e.g. https://ik.imagekit.io/youraccountid

  LIMITS on free plan:
    Storage:    20 GB
    Bandwidth:  20 GB / month
    File size:  No hard limit per file, but we enforce 10 MB in our API layer
    Requests:   Unlimited
  Paid plans start at $29/month for more storage and bandwidth.

BEFORE vs AFTER IMAGE LOGIC
═════════════════════════════
This system uses a two-photo verification workflow:

  BEFORE image (image_type = "BEFORE"):
    ▸ Uploaded by SUPERVISOR when they create/report a new issue
    ▸ Shows the problem: the broken pipe, the electrical fault, etc.
    ▸ Stored in issue_images with image_type = BEFORE
    ▸ Used as evidence that the problem existed

  AFTER image (image_type = "AFTER"):
    ▸ Uploaded by SOLVER when they complete the repair
    ▸ Shows the fix: the pipe is sealed, wiring is neat, etc.
    ▸ Stored in issue_images with image_type = AFTER
    ▸ AI vision runs on this image to verify the fix is real
    ▸ ai_flag = OK → supervisor can approve → issue → COMPLETED
    ▸ ai_flag = SUSPECT → supervisor reviews manually

  EACH upload is a SEPARATE row in issue_images.
  One issue can have:
    - Multiple BEFORE images (different angles)
    - Multiple AFTER images (different angles after fix)
  They are NEVER combined into a single row.

WHAT CHANGED FROM THE OLD CODE
═══════════════════════════════════
OLD code (image_service.py):
  ✗ Used a fake placeholder URL — nothing was actually uploaded
  ✗ Used sync db.query() which breaks with AsyncSession
  ✗ db.commit() inside the service — caller has no transaction control
  ✗ No real ImageKit SDK call
  ✗ No folder structure on ImageKit (all files dumped in one place)
  ✗ No filename normalization (spaces, special chars cause CDN issues)

NEW code (this file):
  ✓ Real ImageKit SDK upload — bytes go to CDN, permanent URL returned
  ✓ AsyncSession properly used throughout
  ✓ Caller controls commit (service does flush, not commit)
  ✓ Organized folder structure: issues/{issue_id or temp}/before/ or after/
  ✓ Sanitized filenames with timestamp to avoid collisions
  ✓ get_images_by_issue uses proper async select(), not db.query()
  ✓ Thumbnail URL helper method added
"""

import logging
import re
import time
from typing import Optional

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.enums import ImageType, AIFlag
from app.models.issue_image import IssueImage
from app.models.user import User
from app.schemas.image_schema import (
    ImageListResponse,
    ImageResponse,
    ImageUploadResponse,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# IMAGEKIT CLIENT — lazy-loaded singleton
# We import lazily so the app doesn't crash if imagekitio is not
# installed. If ImageKit is not configured, we fall back gracefully.
# ─────────────────────────────────────────────────────────────────

_imagekit_client = None


def _get_imagekit():
    """
    Returns a configured ImageKit client.
    Lazy-loads on first call so startup is fast.

    Requires these env vars (set in .env):
        IMAGEKIT_PRIVATE_KEY    = private_xxxxxxxxxxxx
        IMAGEKIT_PUBLIC_KEY     = public_xxxxxxxxxxxx
        IMAGEKIT_URL_ENDPOINT   = https://ik.imagekit.io/youraccountid
    """
    global _imagekit_client
    if _imagekit_client is not None:
        return _imagekit_client

    try:
        from imagekitio import ImageKit

        _imagekit_client = ImageKit(
            private_key=settings.IMAGEKIT_PRIVATE_KEY,
            public_key=settings.IMAGEKIT_PUBLIC_KEY,
            url_endpoint=settings.IMAGEKIT_URL_ENDPOINT,
        )
        logger.info("ImageKit client initialized successfully")
        return _imagekit_client

    except ImportError:
        logger.error(
            "imagekitio package not installed. "
            "Run: pip install imagekitio"
        )
        return None
    except Exception as e:
        logger.error("ImageKit initialization failed: %s", e)
        return None


# ─────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────

def _sanitize_filename(original_name: str) -> str:
    """
    Converts any filename into a CDN-safe format.

    Example:
        "Pipe Leak (BEFORE) #1.jpeg"  →  "pipe_leak_before_1.jpeg"

    Rules:
      - Lowercase everything
      - Replace spaces and special chars with underscores
      - Keep only alphanumeric, underscore, hyphen, dot
      - Add a millisecond timestamp prefix to guarantee uniqueness
        (prevents CDN caching of an old file when the same name is re-uploaded)
    """
    name = original_name.lower()
    name = re.sub(r"[^a-z0-9._-]", "_", name)   # replace bad chars
    name = re.sub(r"_+", "_", name)              # collapse multiple underscores
    name = name.strip("_")
    timestamp = int(time.time() * 1000)          # milliseconds
    return f"{timestamp}_{name}"


def _build_folder(issue_id: Optional[int], image_type: ImageType) -> str:
    """
    Builds the folder path on ImageKit.

    Structure:
        issues/123/before/     — supervisor's problem photos
        issues/123/after/      — solver's completion photos
        issues/temp/before/    — uploaded before issue_id is known

    Having a consistent folder structure means:
      - Easy bulk deletion when an issue is deleted
      - Easy browsing in ImageKit dashboard
      - Clear CDN URLs that tell you what the image is
    """
    folder_name = issue_id if issue_id else "temp"
    return f"issues/{folder_name}/{image_type.value.lower()}/"


def build_thumbnail_url(image_url: str, width: int = 200, height: int = 200) -> str:
    """
    Returns a resized thumbnail URL for any ImageKit image.

    Does NOT re-upload anything — ImageKit generates the thumbnail
    on-the-fly from the original stored file.

    Usage:
        original  = "https://ik.imagekit.io/abc/issues/5/before/photo.jpg"
        thumbnail = build_thumbnail_url(original, 100, 100)
        # → "https://ik.imagekit.io/abc/issues/5/before/photo.jpg?tr=w-100,h-100,fo-auto"

    fo-auto = focus on auto-detected important region (face, object center)
    """
    return f"{image_url}?tr=w-{width},h-{height},fo-auto"


# ─────────────────────────────────────────────────────────────────
# SERVICE CLASS
# ─────────────────────────────────────────────────────────────────

class ImageService:
    """
    Handles all image operations: upload, fetch, list.

    Uses AsyncSession consistently — caller is responsible for commit().
    The service only calls flush() to get generated IDs before returning.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════════════
    # UPLOAD IMAGE
    # Called by: POST /api/v1/images/upload
    # ══════════════════════════════════════════════════════════════

    async def upload_image(
        self,
        file: UploadFile,
        issue_id: Optional[int],
        image_type: ImageType,
        uploaded_by: User,
    ) -> ImageUploadResponse:
        """
        Full upload flow:
          1. Read file bytes from the HTTP request
          2. Upload to ImageKit CDN → get permanent URL
          3. Create IssueImage row in the database
          4. Flush (not commit) so caller can commit with surrounding transaction
          5. Return the CDN URL + DB record metadata

        If ImageKit is not configured or upload fails, raises an exception
        that FastAPI will turn into a 500 response.
        """
        # ── Step 1: Read file bytes ──────────────────────────────
        content: bytes = await file.read()

        # ── Step 2: Upload to ImageKit ───────────────────────────
        image_url = await self._upload_to_imagekit(
            content=content,
            original_filename=file.filename or "NoFileNameFound.jpg",
            issue_id=issue_id,
            image_type=image_type,
        )

        # ── Step 3: Create DB record ─────────────────────────────
        record = IssueImage(
            issue_id=issue_id,
            uploaded_by_user_id=uploaded_by.id,
            image_url=image_url,
            image_type=image_type,
            ai_flag=AIFlag.NOT_CHECKED,
            ai_details={},
        )
        self.db.add(record)

        # ── Step 4: Flush to get record.id ───────────────────────
        # We flush (not commit) because:
        #   - The API route's db session will commit on success
        #   - If anything fails after this point, the whole transaction rolls back
        #   - This keeps image upload atomic with any surrounding operations
        await self.db.flush()
        await self.db.refresh(record)

        logger.info(
            "Image uploaded — issue_id=%s type=%s url=%s user=%s",
            issue_id, image_type.value, image_url, uploaded_by.name,
        )

        # ── Step 5: Return response ──────────────────────────────
        return ImageUploadResponse(
            id=record.id,
            image_url=record.image_url,
            image_type=record.image_type,
            issue_id=record.issue_id,
            ai_flag=record.ai_flag,
            ai_details=record.ai_details,
            created_at=record.created_at,
        )

    # ══════════════════════════════════════════════════════════════
    # GET IMAGES BY ISSUE
    # Called by: GET /api/v1/images/by-issue/{issue_id}
    # ══════════════════════════════════════════════════════════════

    async def get_images_by_issue(self, issue_id: int) -> ImageListResponse:
        """
        Returns all images for an issue, split into BEFORE and AFTER lists.

        Uses AsyncSession properly with select() + await.
        Eager-loads uploaded_by_user to avoid N+1 queries.
        """
        result = await self.db.execute(
            select(IssueImage)
            .where(IssueImage.issue_id == issue_id)
            .options(selectinload(IssueImage.uploaded_by_user))
            .order_by(IssueImage.created_at.asc())
        )
        images = result.scalars().all()

        before_images = [
            self._to_response(img)
            for img in images
            if img.image_type == ImageType.BEFORE
        ]
        after_images = [
            self._to_response(img)
            for img in images
            if img.image_type == ImageType.AFTER
        ]

        return ImageListResponse(
            total=len(images),
            issue_id=issue_id,
            before_images=before_images,
            after_images=after_images,
        )

    # ══════════════════════════════════════════════════════════════
    # PRIVATE: ImageKit upload
    # ══════════════════════════════════════════════════════════════

    async def _upload_to_imagekit(
        self,
        content: bytes,
        original_filename: str,
        issue_id: Optional[int],
        image_type: ImageType,
    ) -> str:
        """
        Uploads bytes to ImageKit and returns the permanent CDN URL.

        ImageKit SDK's upload() is a blocking call (not async),
        so we call it directly in an async function — this is acceptable
        because:
          a) ImageKit uploads are typically 200-800ms
          b) The SDK doesn't provide an async variant
          c) For production-scale throughput, wrap in asyncio.to_thread()
             (shown in comment below)

        Returns the URL string like:
            https://ik.imagekit.io/fcoazymui/issues/5/before/1699123456789_photo.jpg
        """
        ik = _get_imagekit()
        if not ik:
            raise RuntimeError(
                "ImageKit is not configured. "
                "Check IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY, "
                "and IMAGEKIT_URL_ENDPOINT in your .env file."
            )

        safe_filename = _sanitize_filename(original_filename)
        folder = _build_folder(issue_id, image_type)

        try:
            # ── For high-throughput production: use asyncio.to_thread ──
            # import asyncio
            # upload_result = await asyncio.to_thread(
            #     ik.upload_file,
            #     file=content,
            #     file_name=safe_filename,
            #     options=UploadFileRequestOptions(
            #         folder=folder,
            #         use_unique_file_name=False,
            #     ),
            # )

            # ── Standard call (fine for current scale) ────────────────
            from imagekitio.models.UploadFileRequestOptions import UploadFileRequestOptions

            upload_result = ik.upload_file(
                file=content,
                file_name=safe_filename,
                options=UploadFileRequestOptions(
                    folder=folder,
                    use_unique_file_name=False,  # we handle uniqueness with timestamp prefix
                ),
            )

            # upload_result.url is the permanent CDN URL
            if not upload_result or not upload_result.url:
                raise RuntimeError(
                    f"ImageKit returned empty URL for file: {safe_filename}"
                )

            return upload_result.url

        except Exception as e:
            logger.exception(
                "ImageKit upload failed — file=%s folder=%s error=%s",
                safe_filename, folder, str(e),
            )
            raise RuntimeError(f"Image upload failed: {str(e)}") from e

    # ══════════════════════════════════════════════════════════════
    # PRIVATE: Serialise ORM object → Pydantic response
    # ══════════════════════════════════════════════════════════════

    @staticmethod
    def _to_response(img: IssueImage) -> ImageResponse:
        """
        Converts an IssueImage ORM object to the API response schema.
        Caller must have eager-loaded uploaded_by_user before calling this.

        thumbnail_url is computed here using ImageKit's URL transformation.
        Nothing is re-uploaded — ImageKit resizes on-the-fly using the
        original stored file.
        """
        thumbnail_url = build_thumbnail_url(img.image_url, 200, 200)

        return ImageResponse(
            id=img.id,
            issue_id=img.issue_id,
            uploaded_by_user_id=img.uploaded_by_user_id,
            uploader_name=(
                img.uploaded_by_user.name
                if img.uploaded_by_user
                else None
            ),
            image_url=img.image_url,
            thumbnail_url=thumbnail_url,
            image_type=img.image_type,
            ai_flag=img.ai_flag,
            ai_details=img.ai_details,
            created_at=img.created_at,
            updated_at=img.updated_at,
        )