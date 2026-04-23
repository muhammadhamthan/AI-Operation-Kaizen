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
        
        # WAVE A FIX: was `NotificationService(self.db).send_escalation_email(esc)`
        # — sync SMTP call on an async session. Now enqueued as Celery task.
        try:
            from app.workers.notification_tasks import send_escalation_email
            send_escalation_email.delay(esc.id)
        except Exception:
            logger.exception("Escalation email failed for escalation #%s", esc.id)