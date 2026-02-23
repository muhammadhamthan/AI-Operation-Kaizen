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