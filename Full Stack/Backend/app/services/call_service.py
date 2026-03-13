# """
# PURPOSE: Twilio call logic + retry + webhook handling.
# ───────────────────────────────────────────────────────
# Based on your existing Twilio code with retry logic.
# Stage 3: Initial call to solver
# Stage 4: Retry calls + escalation if no answer
# """

# import logging
# import time
# from typing import Optional
# from datetime import datetime, timezone

# from sqlalchemy.orm import Session
# from twilio.rest import Client as TwilioClient

# from app.core.config import settings
# from app.models.issue_assignment import IssueAssignment
# from app.models.call_log import CallLog
# from app.models.escalation import Escalation
# from app.models.escalation_rule import EscalationRule
# from app.core.enums import CallStatus, AssignmentStatus
# from app.schemas.call_log_schema import CallStatusCallback

# logger = logging.getLogger(__name__)


# class CallService:
#     def __init__(self, db: Session):
#         self.db = db
#         self.twilio = TwilioClient(
#             settings.TWILIO_ACCOUNT_SID,
#             settings.TWILIO_AUTH_TOKEN,
#         )

#     # ══════════════════════════════════════════════════════
#     # MAKE CALL WITH RETRY (Stage 3 + 4)
#     # ══════════════════════════════════════════════════════

#     def make_call(self, assignment_id: int) -> dict:
#         """
#         Makes Twilio call to solver with retry logic.
#         Based on your existing make_call_with_retry code.
#         """
#         assignment = self.db.query(IssueAssignment).filter(
#             IssueAssignment.id == assignment_id
#         ).first()

#         if not assignment:
#             return {"success": False, "error": "Assignment not found"}

#         solver = assignment.assigned_solver
#         issue = assignment.issue

#         # Get existing attempt count
#         existing_attempts = self.db.query(CallLog).filter(
#             CallLog.assignment_id == assignment_id,
#         ).count()

#         attempt = existing_attempts + 1

#         try:
#             call = self.twilio.calls.create(
#                 to=solver.phone,
#                 from_=settings.TWILIO_PHONE_NUMBER,
#                 twiml=f'''
#                 <Response>
#                     <Say voice="Polly.Aditi" language="en-IN">
#                         Hello {solver.name}, you have a new work assignment.
#                         Problem: {issue.title}.
#                         Location: {issue.site.name if issue.site else 'Unknown'}.
#                         Please confirm your availability.
#                     </Say>
#                 </Response>
#                 ''',
#                 status_callback=f"{settings.BASE_URL}/api/v1/webhooks/twilio/status",
#                 status_callback_event=["completed", "busy", "failed", "no-answer"],
#             )

#             # Log call
#             log = CallLog(
#                 assignment_id=assignment_id,
#                 solver_id=solver.id,
#                 attempt_number=attempt,
#                 initiated_at=datetime.now(timezone.utc),
#                 status=CallStatus.INITIATED,
#             )
#             self.db.add(log)
#             self.db.commit()

#             return {
#                 "success": True,
#                 "call_sid": call.sid,
#                 "attempt": attempt,
#             }

#         except Exception as e:
#             logger.error(f"Twilio call failed: {e}")
#             return {"success": False, "error": str(e)}

#     # ══════════════════════════════════════════════════════
#     # HANDLE TWILIO WEBHOOK CALLBACK
#     # ══════════════════════════════════════════════════════

#     async def handle_status_callback(self, callback: CallStatusCallback):
#         """
#         Updates call log based on Twilio webhook.
#         Triggers escalation check if call missed.
#         """
#         status_map = {
#             "in-progress": CallStatus.ANSWERED,
#             "completed": CallStatus.ANSWERED,
#             "busy": CallStatus.MISSED,
#             "failed": CallStatus.MISSED,
#             "no-answer": CallStatus.MISSED,
#             "canceled": CallStatus.MISSED,
#         }

#         call_status = status_map.get(callback.CallStatus, None)
#         if not call_status:
#             return

#         # Find most recent INITIATED call log
#         log = (
#             self.db.query(CallLog)
#             .filter(CallLog.status == CallStatus.INITIATED)
#             .order_by(CallLog.initiated_at.desc())
#             .first()
#         )

#         if not log:
#             logger.warning(f"No INITIATED call log found for callback {callback.CallSid}")
#             return

#         now = datetime.now(timezone.utc)
#         log.status = call_status

#         if call_status == CallStatus.ANSWERED:
#             log.answered_at = now
#             log.ended_at = now
#         else:
#             log.ended_at = now
#             # Check escalation rules
#             self._check_escalation(log.assignment_id)

#         self.db.commit()

#     # ══════════════════════════════════════════════════════
#     # CHECK ESCALATION RULES (Stage 4)
#     # ══════════════════════════════════════════════════════

#     def _check_escalation(self, assignment_id: int):
#         """
#         After a missed call, check if escalation threshold is reached.
#         """
#         assignment = self.db.query(IssueAssignment).filter(
#             IssueAssignment.id == assignment_id
#         ).first()
#         if not assignment:
#             return

#         issue = assignment.issue
#         missed_count = self.db.query(CallLog).filter(
#             CallLog.assignment_id == assignment_id,
#             CallLog.status == CallStatus.MISSED,
#         ).count()

#         # Get rule for this priority
#         rule = self.db.query(EscalationRule).filter(
#             EscalationRule.priority == issue.priority,
#         ).order_by(EscalationRule.max_call_attempts.asc()).first()

#         if not rule:
#             return

#         if missed_count >= rule.max_call_attempts:
#             # Check if already escalated
#             existing = self.db.query(Escalation).filter(
#                 Escalation.assignment_id == assignment_id,
#                 Escalation.resolved == False,
#             ).first()

#             if not existing:
#                 esc = Escalation(
#                     issue_id=issue.id,
#                     assignment_id=assignment_id,
#                     escalation_type="NO_RESPONSE",
#                     escalated_to_role=rule.escalate_to_role,
#                     reason=f"Solver missed {missed_count} calls (threshold: {rule.max_call_attempts})",
#                     total_missed_calls=missed_count,
#                     notification_sent=False,
#                     resolved=False,
#                 )
#                 self.db.add(esc)
#                 issue.status = IssueStatus.ESCALATED
#                 self.db.commit()

#                 logger.warning(
#                     f"ESCALATION: Issue #{issue.id} — solver missed "
#                     f"{missed_count} calls, escalated to {rule.escalate_to_role}"
#                 )

#                 # Notify
#                 try:
#                     from app.services.notification_service import NotificationService
#                     NotificationService(self.db).send_escalation_email(esc)
#                 except Exception as e:
#                     logger.error(f"Escalation email failed: {e}")