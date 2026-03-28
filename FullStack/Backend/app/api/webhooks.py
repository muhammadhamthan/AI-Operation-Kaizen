"""
PURPOSE: Twilio webhook endpoint.
───────────────────────────────────
POST /api/v1/webhooks/twilio/status

Twilio calls this URL when a call reaches a terminal state.
This is machine-to-machine — not called by users.

Registration in main.py (uncomment these two lines):
    from app.api.webhooks import router as webhooks_router
    app.include_router(webhooks_router, prefix="/api/v1/webhooks", tags=["Webhooks"])

Twilio configuration:
  Set the status_callback URL in Twilio console OR pass it in calls.create():
    status_callback = f"{settings.BASE_URL}/api/v1/webhooks/twilio/status?assignment_id={id}"
    status_callback_method = "POST"
    status_callback_event  = ["completed", "busy", "failed", "no-answer"]
"""

from typing import Optional

from fastapi import APIRouter, Depends, Form, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.services.call_service import CallService

router = APIRouter()


@router.post(
    "/twilio/status",
    summary="Twilio call status callback (machine-to-machine)",
    # Return 204 — Twilio doesn't use the response body
    status_code=204,
    include_in_schema=False,   # hide from public API docs
)
async def twilio_status_callback(
    request: Request,
    # Twilio sends form-encoded POST — each field is a Form param
    CallSid: str              = Form(...),
    CallStatus: str           = Form(...),
    To: Optional[str]         = Form(None),
    From: Optional[str]       = Form(None),
    Duration: Optional[str]   = Form(None),
    # assignment_id is appended as query param when call is created
    assignment_id: Optional[int] = None,
    db: AsyncSession           = Depends(get_db),
) -> Response:
    """
    Receives Twilio call status updates.

    We deliberately return 204 immediately so Twilio doesn't retry
    due to slow response. The actual DB work is lightweight.

    Twilio sends this for every status change, including intermediate
    ones (queued, ringing). CallService.handle_webhook() ignores
    non-terminal statuses internally.
    """
    await CallService(db).handle_webhook(
        call_sid=CallSid,
        twilio_status=CallStatus,
        assignment_id=assignment_id,
    )
    return Response(status_code=204)






















# """
# PURPOSE: Twilio webhook endpoint for call status callbacks.
# ──────────────────────────────────────────────────────────────
# Twilio calls this endpoint when a call status changes.
# This is NOT called by users — it's machine-to-machine.

# ENDPOINT:
#   POST /api/v1/webhooks/twilio/status → Twilio status callback
# """

# from fastapi import APIRouter, Depends, Request, Form
# from sqlalchemy.orm import Session
# from typing import Optional

# from app.api.deps import get_db
# from app.services.call_service import CallService
# from app.schemas.call_log_schema import CallStatusCallback

# router = APIRouter()


# @router.post(
#     "/twilio/status",
#     summary="Twilio call status webhook (machine-to-machine)",
# )
# async def twilio_status_callback(
#     request: Request,
#     CallSid: str = Form(...),
#     CallStatus: str = Form(...),
#     To: Optional[str] = Form(None),
#     From: Optional[str] = Form(None),
#     Duration: Optional[str] = Form(None),
#     db: Session = Depends(get_db),
# ):
#     """
#     Twilio sends form-encoded POST when call status changes.
#     We parse it and update our call_logs table.

#     Twilio statuses:
#       in-progress, completed → ANSWERED
#       busy, failed, no-answer, canceled → MISSED
#     """
#     callback = CallStatusCallback(
#         CallSid=CallSid,
#         CallStatus=CallStatus,
#         To=To,
#         From=From,
#         Duration=Duration,
#     )

#     call_service = CallService(db)
#     await call_service.handle_status_callback(callback)

#     return {"status": "ok"}