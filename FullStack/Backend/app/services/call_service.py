# """
# PURPOSE: Twilio webhook handler + async escalation helper.
# ───────────────────────────────────────────────────────────
# This service runs INSIDE FastAPI (AsyncSession).

# It has exactly TWO jobs:
#   1. handle_webhook(call_sid, twilio_status, assignment_id)
#        Called by POST /api/v1/webhooks/twilio/status
#        Updates CallLog → ANSWERED or MISSED
#        On MISSED: checks if missed count >= threshold → escalates

#   2. escalate(assignment, missed_count, rule)
#        Creates Escalation record, marks issue ESCALATED,
#        writes IssueHistory, sends email.
#        Called by handle_webhook when threshold is reached.

# The Celery tasks in call_tasks.py handle:
#   - Placing Twilio calls
#   - Scheduling retries
#   - Calling escalate via _do_escalate_sync() (sync version)

# The webhook is the ONLY place that updates CallLog from INITIATED
# to ANSWERED/MISSED. Celery tasks read that status to decide
# whether to retry or stop.
# """

# import logging
# from datetime import datetime, timezone
# from typing import Optional

# from sqlalchemy import select
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy.orm import selectinload

# from app.core.enums import CallStatus, IssueStatus, ActionType, AssignmentStatus
# from app.models.issue import Issue
# from app.models.issue_assignment import IssueAssignment
# from app.models.call_log import CallLog
# from app.models.escalation import Escalation
# from app.models.escalation_rule import EscalationRule
# from app.models.issue_history import IssueHistory

# logger = logging.getLogger(__name__)

# # Twilio status → our internal CallStatus
# TWILIO_STATUS_MAP: dict[str, CallStatus] = {
#     "answered":    CallStatus.ANSWERED,
#     "in-progress": CallStatus.ANSWERED,
#     "completed":   CallStatus.ANSWERED,
#     "busy":        CallStatus.MISSED,
#     "failed":      CallStatus.MISSED,
#     "no-answer":   CallStatus.MISSED,
#     "canceled":    CallStatus.MISSED,
# }


# class CallService:
#     def __init__(self, db: AsyncSession):
#         self.db = db

#     # ══════════════════════════════════════════════════════
#     # WEBHOOK HANDLER  — called by POST /webhooks/twilio/status
#     # ══════════════════════════════════════════════════════

#     async def handle_webhook(
#         self,
#         call_sid: str,
#         twilio_status: str,
#         assignment_id: Optional[int] = None,
#     ) -> None:
#         """
#         Updates the CallLog for this call_sid.
#         On MISSED: checks missed count against escalation rule threshold.

#         Twilio sends intermediate statuses (queued, ringing) that we
#         ignore — we only act on terminal statuses in TWILIO_STATUS_MAP.
#         """
#         internal_status = TWILIO_STATUS_MAP.get(twilio_status)
#         logger.info(f"Received Twilio webhook: SID={call_sid} status={twilio_status} " f"(mapped to {internal_status}) assignment_id={assignment_id}")
#         if internal_status is None:
#             # queued / ringing — not terminal, nothing to do
#             return

#         # Find the CallLog by call_sid (set when Celery placed the call)
#         stmt = select(CallLog).where(CallLog.call_sid == call_sid)
#         log: Optional[CallLog] = (
#             await self.db.execute(stmt)
#         ).scalar_one_or_none()

#         if not log:
#             # Fallback: find by assignment_id if call_sid lookup fails
#             # (can happen if Celery worker crashed before logging)
#             if assignment_id:
#                 fallback = (await self.db.execute(
#                     select(CallLog)
#                     .where(
#                         CallLog.assignment_id == assignment_id,
#                         CallLog.status == CallStatus.INITIATED,
#                     )
#                     .order_by(CallLog.initiated_at.desc())
#                 )).scalars().first()
#                 log = fallback

#             if not log:
#                 logger.warning(
#                     "No INITIATED CallLog for SID=%s assignment_id=%s — ignoring webhook",
#                     call_sid, assignment_id,
#                 )
#                 return

#         now = datetime.now(timezone.utc)
#         log.status = internal_status

#         if internal_status == CallStatus.ANSWERED:
#             log.answered_at = now
#             log.ended_at    = now
#             logger.info(
#                 "Call ANSWERED — SID=%s assignment #%s attempt #%s",
#                 call_sid, log.assignment_id, log.attempt_number,
#             )
#         else:
#             log.ended_at = now
#             logger.info(
#                 "Call MISSED (%s) — SID=%s assignment #%s attempt #%s",
#                 twilio_status, call_sid, log.assignment_id, log.attempt_number,
#             )
#             # Check if escalation threshold is now reached.
#             # The Celery retry task is already scheduled; if threshold is
#             # reached here we escalate immediately rather than waiting for
#             # the retry task to fire and discover this.
#             await self._check_and_escalate_if_needed(log.assignment_id)

#         await self.db.commit()

#     # ══════════════════════════════════════════════════════
#     # ESCALATION CHECK — called after every MISSED webhook
#     # ══════════════════════════════════════════════════════

#     async def _check_and_escalate_if_needed(self, assignment_id: int) -> None:
#         """
#         After a missed call, count total misses and compare to rule threshold.
#         If threshold is reached, escalate immediately.
#         The Celery retry task will then find the open escalation and skip.
#         """
#         # Load assignment with relations needed for escalation
#         assignment = (await self.db.execute(
#             select(IssueAssignment)
#             .where(IssueAssignment.id == assignment_id)
#             .options(
#                 selectinload(IssueAssignment.assigned_solver),
#                 selectinload(IssueAssignment.issue).selectinload(Issue.site),
#             )
#         )).scalar_one_or_none()

#         if not assignment:
#             return

#         # Already escalated? Skip.
#         existing_esc = (await self.db.execute(
#             select(Escalation).where(
#                 Escalation.assignment_id == assignment_id,
#                 Escalation.resolved == False,
#             )
#         )).scalar_one_or_none()
#         if existing_esc:
#             return

#         # Count missed calls
#         missed_count: int = len((await self.db.execute(
#             select(CallLog).where(
#                 CallLog.assignment_id == assignment_id,
#                 CallLog.status == CallStatus.MISSED,
#             )
#         )).scalars().all())

#         # Get rule for this priority
#         rule: Optional[EscalationRule] = (await self.db.execute(
#             select(EscalationRule)
#             .where(EscalationRule.priority == assignment.issue.priority)
#             .order_by(EscalationRule.max_call_attempts.asc())
#         )).scalars().first()

#         threshold = rule.max_call_attempts if rule else 3

#         if missed_count >= threshold:
#             await self.escalate(assignment, missed_count, rule)

#     # ══════════════════════════════════════════════════════
#     # ESCALATION  — async version (used by webhook handler)
#     # ══════════════════════════════════════════════════════

#     async def escalate(
#         self,
#         assignment: IssueAssignment,
#         missed_count: int,
#         rule: Optional[EscalationRule],
#     ) -> None:
#         """
#         Creates Escalation record, marks issue ESCALATED, writes history,
#         sends email. Idempotent — safe to call multiple times.
#         """
#         issue = assignment.issue
#         escalate_to = rule.escalate_to_role if rule else "MANAGER"
#         threshold   = rule.max_call_attempts if rule else missed_count

#         esc = Escalation(
#             issue_id=issue.id,
#             assignment_id=assignment.id,
#             escalation_type="NO_RESPONSE",
#             escalated_to_role=escalate_to,
#             reason=(
#                 f"Solver '{assignment.assigned_solver.name}' missed "
#                 f"{missed_count} call(s) (threshold: {threshold})"
#             ),
#             total_missed_calls=missed_count,
#             notification_sent=False,
#             resolved=False,
#         )
#         self.db.add(esc)

#         self.db.add(IssueHistory(
#             issue_id=issue.id,
#             changed_by_user_id=None,
#             old_status=issue.status.value,
#             new_status="ESCALATED",
#             action_type=ActionType.ASSIGN,
#             details=f"Auto-escalated after {missed_count} missed call(s) → {escalate_to}",
#         ))

#         issue.status = IssueStatus.ESCALATED
#         await self.db.commit()
#         await self.db.refresh(esc)

#         logger.warning(
#             "ESCALATION #%s — issue #%s → %s (%d missed calls)",
#             esc.id, issue.id, escalate_to, missed_count,
#         )

#         try:
#             from app.services.notification_service import NotificationService
#             NotificationService(self.db).send_escalation_email(esc)
#         except Exception:
#             logger.exception("Escalation email failed for escalation #%s", esc.id)






























# # """
# # PURPOSE: Twilio call logic + retry + webhook handling.
# # ───────────────────────────────────────────────────────
# # Based on your existing Twilio code with retry logic.
# # Stage 3: Initial call to solver
# # Stage 4: Retry calls + escalation if no answer
# # """

# # import logging
# # import time
# # from typing import Optional
# # from datetime import datetime, timezone

# # from sqlalchemy.orm import Session
# # from twilio.rest import Client as TwilioClient

# # from app.core.config import settings
# # from app.models.issue_assignment import IssueAssignment
# # from app.models.call_log import CallLog
# # from app.models.escalation import Escalation
# # from app.models.escalation_rule import EscalationRule
# # from app.core.enums import CallStatus, AssignmentStatus
# # from app.schemas.call_log_schema import CallStatusCallback

# # logger = logging.getLogger(__name__)


# # class CallService:
# #     def __init__(self, db: Session):
# #         self.db = db
# #         self.twilio = TwilioClient(
# #             settings.TWILIO_ACCOUNT_SID,
# #             settings.TWILIO_AUTH_TOKEN,
# #         )

# #     # ══════════════════════════════════════════════════════
# #     # MAKE CALL WITH RETRY (Stage 3 + 4)
# #     # ══════════════════════════════════════════════════════

# #     def make_call(self, assignment_id: int) -> dict:
# #         """
# #         Makes Twilio call to solver with retry logic.
# #         Based on your existing make_call_with_retry code.
# #         """
# #         assignment = self.db.query(IssueAssignment).filter(
# #             IssueAssignment.id == assignment_id
# #         ).first()

# #         if not assignment:
# #             return {"success": False, "error": "Assignment not found"}

# #         solver = assignment.assigned_solver
# #         issue = assignment.issue

# #         # Get existing attempt count
# #         existing_attempts = self.db.query(CallLog).filter(
# #             CallLog.assignment_id == assignment_id,
# #         ).count()

# #         attempt = existing_attempts + 1

# #         try:
# #             call = self.twilio.calls.create(
# #                 to=solver.phone,
# #                 from_=settings.TWILIO_PHONE_NUMBER,
# #                 twiml=f'''
# #                 <Response>
# #                     <Say voice="Polly.Aditi" language="en-IN">
# #                         Hello {solver.name}, you have a new work assignment.
# #                         Problem: {issue.title}.
# #                         Location: {issue.site.name if issue.site else 'Unknown'}.
# #                         Please confirm your availability.
# #                     </Say>
# #                 </Response>
# #                 ''',
# #                 status_callback=f"{settings.BASE_URL}/api/v1/webhooks/twilio/status",
# #                 status_callback_event=["completed", "busy", "failed", "no-answer"],
# #             )

# #             # Log call
# #             log = CallLog(
# #                 assignment_id=assignment_id,
# #                 solver_id=solver.id,
# #                 attempt_number=attempt,
# #                 initiated_at=datetime.now(timezone.utc),
# #                 status=CallStatus.INITIATED,
# #             )
# #             self.db.add(log)
# #             self.db.commit()

# #             return {
# #                 "success": True,
# #                 "call_sid": call.sid,
# #                 "attempt": attempt,
# #             }

# #         except Exception as e:
# #             logger.error(f"Twilio call failed: {e}")
# #             return {"success": False, "error": str(e)}

# #     # ══════════════════════════════════════════════════════
# #     # HANDLE TWILIO WEBHOOK CALLBACK
# #     # ══════════════════════════════════════════════════════

# #     async def handle_status_callback(self, callback: CallStatusCallback):
# #         """
# #         Updates call log based on Twilio webhook.
# #         Triggers escalation check if call missed.
# #         """
# #         status_map = {
# #             "in-progress": CallStatus.ANSWERED,
# #             "completed": CallStatus.ANSWERED,
# #             "busy": CallStatus.MISSED,
# #             "failed": CallStatus.MISSED,
# #             "no-answer": CallStatus.MISSED,
# #             "canceled": CallStatus.MISSED,
# #         }

# #         call_status = status_map.get(callback.CallStatus, None)
# #         if not call_status:
# #             return

# #         # Find most recent INITIATED call log
# #         log = (
# #             self.db.query(CallLog)
# #             .filter(CallLog.status == CallStatus.INITIATED)
# #             .order_by(CallLog.initiated_at.desc())
# #             .first()
# #         )

# #         if not log:
# #             logger.warning(f"No INITIATED call log found for callback {callback.CallSid}")
# #             return

# #         now = datetime.now(timezone.utc)
# #         log.status = call_status

# #         if call_status == CallStatus.ANSWERED:
# #             log.answered_at = now
# #             log.ended_at = now
# #         else:
# #             log.ended_at = now
# #             # Check escalation rules
# #             self._check_escalation(log.assignment_id)

# #         self.db.commit()

# #     # ══════════════════════════════════════════════════════
# #     # CHECK ESCALATION RULES (Stage 4)
# #     # ══════════════════════════════════════════════════════

# #     def _check_escalation(self, assignment_id: int):
# #         """
# #         After a missed call, check if escalation threshold is reached.
# #         """
# #         assignment = self.db.query(IssueAssignment).filter(
# #             IssueAssignment.id == assignment_id
# #         ).first()
# #         if not assignment:
# #             return

# #         issue = assignment.issue
# #         missed_count = self.db.query(CallLog).filter(
# #             CallLog.assignment_id == assignment_id,
# #             CallLog.status == CallStatus.MISSED,
# #         ).count()

# #         # Get rule for this priority
# #         rule = self.db.query(EscalationRule).filter(
# #             EscalationRule.priority == issue.priority,
# #         ).order_by(EscalationRule.max_call_attempts.asc()).first()

# #         if not rule:
# #             return

# #         if missed_count >= rule.max_call_attempts:
# #             # Check if already escalated
# #             existing = self.db.query(Escalation).filter(
# #                 Escalation.assignment_id == assignment_id,
# #                 Escalation.resolved == False,
# #             ).first()

# #             if not existing:
# #                 esc = Escalation(
# #                     issue_id=issue.id,
# #                     assignment_id=assignment_id,
# #                     escalation_type="NO_RESPONSE",
# #                     escalated_to_role=rule.escalate_to_role,
# #                     reason=f"Solver missed {missed_count} calls (threshold: {rule.max_call_attempts})",
# #                     total_missed_calls=missed_count,
# #                     notification_sent=False,
# #                     resolved=False,
# #                 )
# #                 self.db.add(esc)
# #                 issue.status = IssueStatus.ESCALATED
# #                 self.db.commit()

# #                 logger.warning(
# #                     f"ESCALATION: Issue #{issue.id} — solver missed "
# #                     f"{missed_count} calls, escalated to {rule.escalate_to_role}"
# #                 )

# #                 # Notify
# #                 try:
# #                     from app.services.notification_service import NotificationService
# #                     NotificationService(self.db).send_escalation_email(esc)
# #                 except Exception as e:
# #                     logger.error(f"Escalation email failed: {e}")



"""
app/services/call_service.py
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import CallStatus, IssueStatus, ActionType
from app.models.issue import Issue
from app.models.issue_assignment import IssueAssignment
from app.models.call_log import CallLog
from app.models.escalation import Escalation
from app.models.escalation_rule import EscalationRule
from app.models.issue_history import IssueHistory

logger = logging.getLogger(__name__)

TWILIO_STATUS_MAP: dict[str, CallStatus] = {
    "answered":    CallStatus.ANSWERED,
    "in-progress": CallStatus.ANSWERED,
    "completed":   CallStatus.ANSWERED,
    "busy":        CallStatus.MISSED,
    "failed":      CallStatus.MISSED,
    "no-answer":   CallStatus.MISSED,
    "canceled":    CallStatus.MISSED,
}


class CallService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════
    # WEBHOOK HANDLER
    # ══════════════════════════════════════════════════════

    async def handle_webhook(
        self,
        call_sid: str,
        twilio_status: str,
        assignment_id: Optional[int] = None,
    ) -> None:
        internal_status = TWILIO_STATUS_MAP.get(twilio_status)
        if internal_status is None:
            return  # non-terminal status (queued, ringing) — ignore

        # Find CallLog by call_sid
        log: Optional[CallLog] = (await self.db.execute(
            select(CallLog).where(CallLog.call_sid == call_sid)
        )).scalar_one_or_none()

        if not log:
            # Fallback: find latest INITIATED log for this assignment
            if assignment_id:
                log = (await self.db.execute(
                    select(CallLog)
                    .where(
                        CallLog.assignment_id == assignment_id,
                        CallLog.status == CallStatus.INITIATED,
                    )
                    .order_by(CallLog.initiated_at.desc())
                )).scalars().first()

            if not log:
                logger.warning(
                    "No CallLog for SID=%s assignment_id=%s — ignoring webhook",
                    call_sid, assignment_id,
                )
                return

        now = datetime.now(timezone.utc)
        log.status = internal_status

        if internal_status == CallStatus.ANSWERED:
            log.answered_at = now
            log.ended_at    = now
            logger.info(
                "Call ANSWERED — SID=%s assignment #%s attempt #%s",
                call_sid, log.assignment_id, log.attempt_number,
            )
        else:
            log.ended_at = now
            logger.info(
                "Call MISSED (%s) — SID=%s assignment #%s attempt #%s",
                twilio_status, call_sid, log.assignment_id, log.attempt_number,
            )
            # Escalate immediately if threshold reached — don't wait for
            # retry_solver_call. The retry task checks for an open escalation
            # and stops if one exists, so there's no double-escalation.
            await self._check_and_escalate_if_needed(log)

        await self.db.commit()

    # ══════════════════════════════════════════════════════
    # ESCALATION CHECK — called after every MISSED webhook
    # ══════════════════════════════════════════════════════

    async def _check_and_escalate_if_needed(self, missed_log: CallLog) -> None:
        """
        Counts missed calls in the CURRENT ROUND ONLY, then escalates
        if threshold is reached.

        Round boundary = initiated_at of the earliest call that is
        part of this round. We find it by looking at the last ANSWERED
        call on this assignment — all misses AFTER that point belong to
        the current round. If no ANSWERED call exists (solver never
        answered in any round), all misses are in round 1.

        WHY this matters for complaints:
          Round 1: 2 missed calls. Supervisor complains. Round 2 begins.
          Webhook fires for Round 2's first missed call.
          Without round boundary: missed_count = 3 (2+1) → escalates
          immediately, before retry_solver_call even runs. Wrong.
          With round boundary: missed_count = 1 → no escalation. Correct.
        """
        assignment_id = missed_log.assignment_id

        assignment = (await self.db.execute(
            select(IssueAssignment)
            .where(IssueAssignment.id == assignment_id)
            .options(
                selectinload(IssueAssignment.assigned_solver),
                selectinload(IssueAssignment.issue).selectinload(Issue.site),
            )
        )).scalar_one_or_none()

        if not assignment:
            return

        # Already escalated — stop
        existing_esc = (await self.db.execute(
            select(Escalation).where(
                Escalation.assignment_id == assignment_id,
                Escalation.resolved == False,
            )
        )).scalar_one_or_none()
        if existing_esc:
            return

        # ── Find round boundary ───────────────────────────────
        # Last ANSWERED call on this assignment = end of the previous round.
        # All misses strictly AFTER that timestamp = this round.
        last_answered = (await self.db.execute(
            select(CallLog)
            .where(
                CallLog.assignment_id == assignment_id,
                CallLog.status == CallStatus.ANSWERED,
            )
            .order_by(CallLog.initiated_at.desc())
        )).scalars().first()

        round_start = (
            last_answered.initiated_at
            if last_answered
            else datetime.min.replace(tzinfo=timezone.utc)
        )

        # ── Count MISSED calls in this round only ─────────────
        missed_logs = (await self.db.execute(
            select(CallLog).where(
                CallLog.assignment_id == assignment_id,
                CallLog.status == CallStatus.MISSED,
                CallLog.initiated_at > round_start,
            )
        )).scalars().all()
        missed_count = len(missed_logs)

        rule: Optional[EscalationRule] = (await self.db.execute(
            select(EscalationRule)
            .where(EscalationRule.priority == assignment.issue.priority)
            .order_by(EscalationRule.max_call_attempts.asc())
        )).scalars().first()
        threshold = rule.max_call_attempts if rule else 3

        logger.info(
            "Webhook escalation check — assignment #%s missed=%d/%d this round",
            assignment_id, missed_count, threshold,
        )

        if missed_count >= threshold:
            await self.escalate(assignment, missed_count, rule)

    # ══════════════════════════════════════════════════════
    # ESCALATION — async version (used by webhook only)
    # ══════════════════════════════════════════════════════

    async def escalate(
        self,
        assignment: IssueAssignment,
        missed_count: int,
        rule: Optional[EscalationRule],
    ) -> None:
        """Idempotent — safe to call even if retry_solver_call races here."""
        issue = assignment.issue

        # Idempotency guard
        existing = (await self.db.execute(
            select(Escalation).where(
                Escalation.assignment_id == assignment.id,
                Escalation.resolved == False,
            )
        )).scalar_one_or_none()
        if existing:
            logger.info(
                "Escalation already exists for assignment #%s — skip",
                assignment.id,
            )
            return

        escalate_to = rule.escalate_to_role if rule else "MANAGER"
        threshold   = rule.max_call_attempts if rule else missed_count

        esc = Escalation(
            issue_id=issue.id,
            assignment_id=assignment.id,
            escalation_type="NO_RESPONSE",
            escalated_to_role=escalate_to,
            reason=(
                f"Solver '{assignment.assigned_solver.name}' missed "
                f"{missed_count} call(s) this round (threshold: {threshold})"
            ),
            total_missed_calls=missed_count,
            notification_sent=False,
            resolved=False,
        )
        self.db.add(esc)

        self.db.add(IssueHistory(
            issue_id=issue.id,
            changed_by_user_id=None,
            old_status=issue.status.value,
            new_status="ESCALATED",
            action_type=ActionType.ASSIGN,
            details=f"Auto-escalated after {missed_count} missed call(s) this round → {escalate_to}",
        ))

        issue.status = IssueStatus.ESCALATED
        await self.db.commit()
        await self.db.refresh(esc)

        logger.warning(
            "ESCALATION #%s — issue #%s → %s (%d missed this round)",
            esc.id, issue.id, escalate_to, missed_count,
        )

        try:
            from app.services.notification_service import NotificationService
            NotificationService(self.db).send_escalation_email(esc)
        except Exception:
            logger.exception("Escalation email failed for escalation #%s", esc.id)