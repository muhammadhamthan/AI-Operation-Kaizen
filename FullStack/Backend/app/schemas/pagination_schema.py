"""
pagination.py — Cursor-based pagination schema
═══════════════════════════════════════════════
WHY CURSOR OVER OFFSET?

Offset pagination:  SELECT ... LIMIT 20 OFFSET 200
  → DB must scan and discard 200 rows every time
  → Gets SLOWER as user goes deeper into pages
  → Data shifts if new rows inserted between requests

Cursor pagination: SELECT ... WHERE id < :cursor LIMIT 20 ORDER BY id DESC
  → DB uses the index directly — O(log n) lookup regardless of page depth
  → Consistent: new inserts don't shift pages
  → Under 2ms for any page depth on indexed columns

HOW TO USE:
  First page:   GET /api/v1/issues?limit=20
  Next page:    GET /api/v1/issues?cursor=<next_cursor>&limit=20
  No more data: next_cursor is null in response

Frontend stores `next_cursor` from each response and passes it
back as `cursor` in the next request. When `next_cursor` is null,
all data has been loaded.
"""

from __future__ import annotations
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field , field_validator
import base64
import json

T = TypeVar("T")


# ── Cursor encoding ──────────────────────────────────────────────────────────
# We encode the cursor as base64(json) so it's opaque to the frontend.
# This lets us change the internal cursor format without breaking clients.

def encode_cursor(last_id: int) -> str:
    """Encode last row ID into an opaque cursor string."""
    payload = json.dumps({"id": last_id})
    return base64.urlsafe_b64encode(payload.encode()).decode()


def decode_cursor(cursor: str) -> int:
    """Decode cursor string back to last row ID. Raises ValueError if invalid."""
    try:
        payload = base64.urlsafe_b64decode(cursor.encode()).decode()
        return json.loads(payload)["id"]
    except Exception:
        raise ValueError(f"Invalid cursor: {cursor!r}")


# ── Generic paginated response ────────────────────────────────────────────────

class CursorPage(BaseModel, Generic[T]):
    """
    Universal cursor-paginated response wrapper.

    Usage in an endpoint:
        return CursorPage[IssueResponse](
            items=issues,
            next_cursor=encode_cursor(issues[-1].id) if len(issues) == limit else None,
            total_returned=len(issues),
            has_more=len(issues) == limit,
        )

    Frontend pattern:
        if (response.has_more) {
            loadMore(response.next_cursor)
        }
    """
    items: List[T]
    next_cursor: Optional[str] = Field(
        None,
        description=(
            "Pass this value as `cursor` in the next request to get the next page. "
            "null means you have reached the last page."
        ),
    )
    total_returned: int = Field(..., description="Number of items in THIS response")
    has_more: bool = Field(..., description="True if more items exist beyond this page")


# ── Query helper ──────────────────────────────────────────────────────────────

class CursorParams(BaseModel):
    """
    Standard query parameters for any cursor-paginated endpoint.
    Use as a FastAPI dependency:

        @router.get("", response_model=CursorPage[IssueResponse])
        async def list_issues(
            params: CursorParams = Depends(),
            ...
        ):
    """
    cursor: Optional[str] = Field(
        None,
        description="Opaque cursor from previous response. Omit for first page.",
    )
    limit: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Number of items per page (1–100, default 20)",
    )
    
    @field_validator('cursor', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == '' or v == 'null' or v == 'undefined':
            return None
        return v
    
    def get_last_id(self) -> Optional[int]:
        """Returns the decoded last ID, or None for first page."""
        if self.cursor is None:
            return None
        return decode_cursor(self.cursor)