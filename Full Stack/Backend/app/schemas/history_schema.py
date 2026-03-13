"""
PURPOSE: Shapes issue history/audit trail responses.
─────────────────────────────────────────────────────
USED BY:
  - GET /api/v1/history/{issue_id}   → IssueHistoryListResponse
  - GET /api/v1/issues/{id}/timeline → IssueHistoryListResponse

COMMAND: Every status change, assignment, complaint, and escalation
is logged in issue_history table. This schema formats that audit trail
into a human-readable timeline for the issue detail view.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.core.enums import ActionType


# ── Response: Single history entry ───────────────────────
class  IssueHistoryResponse(BaseModel):
    id: int
    issue_id: int
    changed_by_user_id: Optional[int] = None
    changed_by_name: Optional[str] = None
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    action_type: ActionType
    details: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Response: Full history list ──────────────────────────
class IssueHistoryListResponse(BaseModel):
    total: int
    issue_id: int
    history: List[IssueHistoryResponse]