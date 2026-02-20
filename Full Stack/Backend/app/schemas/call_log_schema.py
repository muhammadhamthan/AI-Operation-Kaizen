"""
PURPOSE: Call log schemas — INTERNAL processing + Twilio webhook.
──────────────────────────────────────────────────────────────────
Call logs are NEVER created by user action.
They are created AUTOMATICALLY by the backend when:
  1. Assignment created → first call placed
  2. Celery retries every 2 hours → new call attempts
  3. Complaint reopens assignment → new call round

CallStatusCallback handles Twilio's webhook POST when
call status changes (ringing → answered → completed, or → missed).

Users see call attempt info indirectly through:
  - Chat responses: "Solver called 3 times, no answer. Escalated."
  - Dashboard: call attempt counts per assignment
  - IssueDetailResponse.assignments[].total_call_attempts

USED BY:
  - call_service.py → CallLogCreate, CallLogUpdate (internal)
  - POST /api/v1/webhooks/twilio/status → CallStatusCallback
  - assignment_service.py → CallLogResponse (read-only display)
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.core.enums import CallStatus


# ══════════════════════════════════════════════════════════
# INTERNAL: Create and update call logs — NOT user-facing
# ══════════════════════════════════════════════════════════

class CallLogCreate(BaseModel):
    """
    INTERNAL — created by call_service after every Twilio calls.create().
    Each retry gets a separate record with incrementing attempt_number.
    """
    assignment_id: int
    solver_id: int
    attempt_number: int = Field(default=1, ge=1)
    initiated_at: datetime
    status: CallStatus = Field(default=CallStatus.INITIATED)


class CallLogUpdate(BaseModel):
    """
    INTERNAL — updated when Twilio webhook reports call outcome.
    ANSWERED: set answered_at and ended_at
    MISSED: status changes, answered_at stays NULL
    """
    status: CallStatus
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None


# ══════════════════════════════════════════════════════════
# WEBHOOK: Twilio status callback
# ══════════════════════════════════════════════════════════

class CallStatusCallback(BaseModel):
    """
    Twilio sends this to POST /api/v1/webhooks/twilio/status
    when call status changes.
    
    Field names match Twilio's webhook payload exactly.
    The webhook endpoint parses Twilio's form-encoded POST
    into this schema for processing.
    
    Twilio status values:
      queued, ringing      → call in progress (no action needed)
      in-progress          → solver answered → ANSWERED
      completed            → call ended normally → ANSWERED
      busy                 → solver busy → MISSED
      failed               → call failed → MISSED
      no-answer            → no pickup → MISSED
      canceled             → call canceled → MISSED
    """
    CallSid: str = Field(..., description="Unique Twilio call identifier")
    CallStatus: str = Field(..., description="Current Twilio call status")
    To: Optional[str] = Field(None, description="Called phone number")
    From: Optional[str] = Field(None, description="Twilio phone number used")
    Duration: Optional[str] = Field(None, description="Call duration in seconds")
    Timestamp: Optional[str] = Field(None, description="When status changed")


# ══════════════════════════════════════════════════════════
# RESPONSE: Call log data — for dashboard and internal display
# ══════════════════════════════════════════════════════════

class CallLogResponse(BaseModel):
    """
    Call attempt record — used in assignment detail views.
    Shows when each call was placed, whether it was answered,
    and how long it lasted.
    """
    id: int
    assignment_id: int
    solver_id: int
    solver_name: Optional[str] = None
    solver_phone: Optional[str] = None
    attempt_number: int
    initiated_at: datetime
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    status: CallStatus
    updated_at: datetime

    model_config = {"from_attributes": True}


class CallLogListResponse(BaseModel):
    """All call attempts for a specific assignment."""
    total: int
    assignment_id: int
    call_logs: List[CallLogResponse]