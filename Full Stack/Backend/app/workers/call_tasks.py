# """
# PURPOSE: Celery tasks for Twilio call retry chain.
# ────────────────────────────────────────────────────
# Flow triggered after every assignment creation / reassign / complaint:

#   schedule_solver_call(assignment_id)
#       └─ place_solver_call(assignment_id)
#               ├─ calls Twilio → logs CallLog with call_sid + status=INITIATED
#               └─ schedules retry_solver_call(assignment_id) with priority delay

#   Twilio fires webhook → POST /api/v1/webhooks/twilio/status
#       └─ CallService.handle_webhook(call_sid, twilio_status)
#               ├─ ANSWERED  → update CallLog → stop (no more retries needed)
#               └─ MISSED    → update CallLog → check missed count
#                                   ├─ under threshold → retry fires (already scheduled)
#                                   └─ at threshold    → cancel next retry, escalate

#   retry_solver_call(assignment_id)
#       ├─ checks: already answered? already escalated? → skip
#       └─ places another call → schedules next retry

# Key design decisions:
#   - Celery tasks are SYNC (plain Session) — they run in a worker process,
#     not inside FastAPI's async event loop.
#   - The webhook endpoint is ASYNC (AsyncSession) — it runs inside FastAPI.
#   - call_sid is stored on CallLog so the webhook can find the right log row
#     without guessing.
#   - Retry scheduling uses eta (absolute time) not countdown so the delay
#     is measured from call placement, not from Twilio's callback arrival.
# """

# import logging
# from datetime import datetime, timezone, timedelta

# from sqlalchemy import create_engine, select
# from sqlalchemy.orm import sessionmaker, Session

# from app.core.config import settings
# from app.workers.celery_app import celery_app

# logger = logging.getLogger(__name__)

# # ── Retry delays per priority (seconds) ─────────────────────
# RETRY_DELAY: dict[str, int] = {
#     "high":     10 * 2,
#     "medium":   15 * 60,
#     "low":      30 * 60,
# }
# DEFAULT_RETRY_DELAY = 10 * 60




# def _sync_db() -> Session:
#     """
#     New sync session for each Celery task invocation.
#     Converts async URL to sync and enforces 'sslmode' for psycopg2.
#     """
#     # 1. Remove the async driver
#     url = settings.DATABASE_URL.replace("+asyncpg", "")
    
#     # 2. Convert 'ssl' parameter to 'sslmode' if present, or just append it
#     if "ssl=" in url:
#         url = url.replace("ssl=", "sslmode=")
#     elif "sslmode=" not in url:
#         # Append sslmode if not already there
#         separator = "&" if "?" in url else "?"
#         url = f"{url}{separator}sslmode=require"

#     # 3. Create engine with the psycopg2-friendly URL
#     engine = create_engine(
#         url, 
#         pool_pre_ping=True,
#         # Alternatively, you can force it here instead of the URL string:
#         # connect_args={"sslmode": "require"} 
#     )
    
#     factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
#     return factory()


# # ══════════════════════════════════════════════════════════════
# # TASK 1 — Entry point: called by all three service callers
# # ══════════════════════════════════════════════════════════════

# @celery_app.task(name="call_tasks.schedule_solver_call", max_retries=0)
# def schedule_solver_call(assignment_id: int) -> None:
#     """
#     Immediate entry point. Chains into place_solver_call right away.
#     Called by issue_service, assignment_service, complaint_service
#     after db.commit().
#     """
#     logger.info("Scheduling call chain for assignment #%s", assignment_id)
#     place_solver_call.delay(assignment_id)


# # ══════════════════════════════════════════════════════════════
# # TASK 2 — Place one Twilio call
# # ══════════════════════════════════════════════════════════════

# @celery_app.task(name="call_tasks.place_solver_call", bind=True, max_retries=3)
# def place_solver_call(self, assignment_id: int) -> None:
#     """
#     Makes one Twilio call.
#       - Logs CallLog with status=INITIATED and the Twilio call_sid
#       - Schedules retry_solver_call after priority-based delay
#         (using eta so delay is from NOW, not from webhook arrival)

#     The webhook will update the CallLog to ANSWERED or MISSED.
#     retry_solver_call will check that status before placing another call.
#     """
#     from app.models.issue_assignment import IssueAssignment
#     from app.models.call_log import CallLog
#     from app.models.escalation import Escalation
#     from app.core.enums import CallStatus, AssignmentStatus

#     db = _sync_db()
#     try:
#         assignment = db.get(IssueAssignment, assignment_id)
#         if not assignment:
#             logger.error("place_solver_call: assignment #%s not found", assignment_id)
#             return

#         # Bail if assignment is no longer active
#         if assignment.status not in (AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED):
#             logger.info(
#                 "Assignment #%s status=%s — skipping call", assignment_id, assignment.status
#             )
#             return

#         # Bail if already answered in a previous attempt
#         already_answered = db.execute(
#             select(CallLog).where(
#                 CallLog.assignment_id == assignment_id,
#                 CallLog.status == CallStatus.ANSWERED,
#             )
#         ).scalar_one_or_none()
#         if already_answered:
#             logger.info("Assignment #%s already answered — stopping", assignment_id)
#             return

#         # Bail if already escalated
#         already_escalated = db.execute(
#             select(Escalation).where(
#                 Escalation.assignment_id == assignment_id,
#                 Escalation.resolved == False,
#             )
#         ).scalar_one_or_none()
#         if already_escalated:
#             logger.info("Assignment #%s already escalated — stopping", assignment_id)
#             return

#         # Count existing attempts
#         existing_logs = db.execute(
#             select(CallLog).where(CallLog.assignment_id == assignment_id)
#         ).scalars().all()
#         attempt_number = len(existing_logs) + 1

#         solver = assignment.assigned_solver
#         issue  = assignment.issue
#         site_name = issue.site.name if issue and issue.site else "your site"

#         # Place Twilio call
#         from twilio.rest import Client
#         twilio = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
#         twiml = _build_twiml(
#             solver.name,
#             issue.title if issue else "the assigned issue",
#             site_name,
#         )

#         try:
#             call = twilio.calls.create(
#                 to=f"+91{solver.phone}",
#                 from_=settings.TWILIO_PHONE_NUMBER,
#                 twiml=twiml,
#                 status_callback=(
#                     f"{settings.BASE_URL}/api/v1/webhooks/twilio/status"
#                     f"?assignment_id={assignment_id}"
#                 ),
#                 status_callback_method="POST",
#                 status_callback_event=["initiated", "ringing", "in-progress", "completed", "busy", "failed", "no-answer", "canceled"],
#             )
#         except Exception as exc:
#             logger.exception(
#                 "Twilio calls.create() failed — assignment #%s attempt #%s",
#                 assignment_id, attempt_number,
#             )
#             # Log as MISSED so the counter is accurate for escalation
#             db.add(CallLog(
#                 assignment_id=assignment_id,
#                 solver_id=solver.id,
#                 attempt_number=attempt_number,
#                 initiated_at=datetime.now(timezone.utc),
#                 status=CallStatus.MISSED,
#             ))
#             db.commit()
#             raise self.retry(exc=exc, countdown=30)

#         # Log with INITIATED status and call_sid for webhook lookup
#         log = CallLog(
#             assignment_id=assignment_id,
#             solver_id=solver.id,
#             attempt_number=attempt_number,
#             initiated_at=datetime.now(timezone.utc),
#             status=CallStatus.INITIATED,
#             call_sid=call.sid,
#         )
#         db.add(log)
#         db.commit()

#         logger.info(
#             "Call placed — assignment #%s attempt #%s SID=%s",
#             assignment_id, attempt_number, call.sid,
#         )

#         # Schedule retry with priority-based delay (eta = absolute time)
#         priority_str = issue.priority.value.lower() if issue and issue.priority else "medium"
#         delay = RETRY_DELAY.get(priority_str, DEFAULT_RETRY_DELAY)
#         eta = datetime.now(timezone.utc) + timedelta(seconds=delay)

#         retry_solver_call.apply_async(args=[assignment_id], eta=eta)
#         logger.info(
#             "Retry scheduled for assignment #%s at %s (%ds from now)",
#             assignment_id, eta.isoformat(), delay
#         )

#     finally:
#         db.close()


# # ══════════════════════════════════════════════════════════════
# # TASK 3 — Retry: runs after priority delay
# # ══════════════════════════════════════════════════════════════

# @celery_app.task(name="call_tasks.retry_solver_call", max_retries=0)
# def retry_solver_call(assignment_id: int) -> None:
#     """
#     Runs after the retry delay expires.
#     Checks current state — if still unanswered and under threshold,
#     delegates back to place_solver_call for another attempt.
#     If threshold reached, escalates and stops.
#     """
#     from app.models.issue_assignment import IssueAssignment
#     from app.models.call_log import CallLog
#     from app.models.escalation_rule import EscalationRule
#     from app.models.escalation import Escalation
#     from app.core.enums import CallStatus, AssignmentStatus

#     db = _sync_db()
#     try:
#         assignment = db.get(IssueAssignment, assignment_id)
#         if not assignment:
#             logger.warning("retry_solver_call: assignment #%s not found", assignment_id)
#             return

#         if assignment.status not in (AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED):
#             logger.info(
#                 "Assignment #%s status=%s — no retry needed", assignment_id, assignment.status
#             )
#             return

#         # Already answered?
#         answered = db.execute(
#             select(CallLog).where(
#                 CallLog.assignment_id == assignment_id,
#                 CallLog.status == CallStatus.ANSWERED,
#             )
#         ).scalar_one_or_none()
#         if answered:
#             logger.info("Assignment #%s already answered — stopping retries", assignment_id)
#             return

#         # Already escalated?
#         escalated = db.execute(
#             select(Escalation).where(
#                 Escalation.assignment_id == assignment_id,
#                 Escalation.resolved == False,
#             )
#         ).scalar_one_or_none()
#         if escalated:
#             logger.info("Assignment #%s already escalated — stopping retries", assignment_id)
#             return

#         # Count missed calls
#         missed_logs = db.execute(
#             select(CallLog).where(
#                 CallLog.assignment_id == assignment_id,
#                 CallLog.status == CallStatus.MISSED,
#             )
#         ).scalars().all()
#         missed_count = len(missed_logs)

#         # Get escalation threshold for this priority
#         issue = assignment.issue
#         rule = db.execute(
#             select(EscalationRule)
#             .where(EscalationRule.priority == issue.priority)
#             .order_by(EscalationRule.max_call_attempts.asc())
#         ).scalars().first()
#         max_attempts = rule.max_call_attempts if rule else 3

#         if missed_count >= max_attempts:
#             logger.warning(
#                 "Assignment #%s: %d missed (threshold %d) — escalating",
#                 assignment_id, missed_count, max_attempts,
#             )
#             _do_escalate_sync(db, assignment, missed_count, rule)
#             return

#         # Still under threshold — place another call
#         logger.info(
#             "Assignment #%s: %d/%d missed — placing retry call",
#             assignment_id, missed_count, max_attempts,
#         )
#         place_solver_call.delay(assignment_id)

#     finally:
#         db.close()


# # ══════════════════════════════════════════════════════════════
# # SYNC ESCALATION (used inside Celery tasks)
# # ══════════════════════════════════════════════════════════════

# def _do_escalate_sync(db: Session, assignment, missed_count: int, rule) -> None:
#     """
#     Sync escalation for use inside Celery tasks.
#     Creates Escalation, marks issue ESCALATED, writes history, sends email.
#     """
#     from app.models.escalation import Escalation
#     from app.models.issue_history import IssueHistory
#     from app.core.enums import IssueStatus, ActionType

#     issue = assignment.issue

#     # Idempotent
#     existing = db.execute(
#         select(Escalation).where(
#             Escalation.assignment_id == assignment.id,
#             Escalation.resolved == False,
#         )
#     ).scalar_one_or_none()
#     if existing:
#         logger.info("Escalation already exists for assignment #%s", assignment.id)
#         return

#     escalate_to = rule.escalate_to_role if rule else "MANAGER"
#     threshold   = rule.max_call_attempts if rule else missed_count

#     esc = Escalation(
#         issue_id=issue.id,
#         assignment_id=assignment.id,
#         escalation_type="NO_RESPONSE",
#         escalated_to_role=escalate_to,
#         reason=(
#             f"Solver '{assignment.assigned_solver.name}' missed "
#             f"{missed_count} call(s) (threshold: {threshold})"
#         ),
#         total_missed_calls=missed_count,
#         notification_sent=False,
#         resolved=False,
#     )
#     db.add(esc)

#     db.add(IssueHistory(
#         issue_id=issue.id,
#         changed_by_user_id=None,
#         old_status=issue.status.value,
#         new_status="ESCALATED",
#         action_type=ActionType.ASSIGN,   # closest available; add ESCALATE to enum when ready
#         details=f"Auto-escalated after {missed_count} missed call(s) → {escalate_to}",
#     ))

#     issue.status = IssueStatus.ESCALATED
#     db.commit()
#     db.refresh(esc)

#     logger.warning(
#         "ESCALATION #%s created — issue #%s → %s (%d missed calls)",
#         esc.id, issue.id, escalate_to, missed_count,
#     )

#     try:
#         from app.services.notification_service import NotificationService
#         NotificationService(db).send_escalation_email(esc)
#     except Exception:
#         logger.exception("Escalation email failed for escalation #%s", esc.id)


# # ══════════════════════════════════════════════════════════════
# # HELPERS
# # ══════════════════════════════════════════════════════════════

# def _build_twiml(solver_name: str, issue_title: str, site_name: str) -> str:
#     return (
#         "<Response>"
#         "<Say voice=\"Polly.Aditi\" language=\"en-IN\">"
#         f"Hello {solver_name}. "
#         f"You have a new work assignment. "
#         f"Problem: {issue_title}. "
#         f"Location: {site_name}. "
#         "Please attend to this issue as soon as possible. "
#         "Thank you."
#         "</Say>"
#         "</Response>"
#     )


"""
app/workers/call_tasks.py
"""

import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

RETRY_DELAY: dict[str, int] = {
    "high":   2 * 60,
    "medium": 15 * 60,
    "low":    30 * 60,
}
DEFAULT_RETRY_DELAY = 10 * 60


def _sync_db() -> Session:
    url = settings.DATABASE_URL.replace("+asyncpg", "")
    if "ssl=" in url and "sslmode=" not in url:
        url = url.replace("ssl=", "sslmode=")
    elif "sslmode=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"
    engine = create_engine(url, pool_pre_ping=True, pool_size=2, max_overflow=2)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def _build_twiml(solver_name: str, issue_title: str, site_name: str) -> str:
    return (
        "<Response>"
        "<Say voice='alice' language='en-IN'>"
        f"Hello {solver_name}. "
        f"You have been assigned a facility issue at {site_name}. "
        f"Issue: {issue_title}. "
        "Please open your app and begin work immediately. "
        "</Say>"
        "</Response>"
    )


# ══════════════════════════════════════════════════════════════
# TASK 1 — Entry point
# ══════════════════════════════════════════════════════════════

@celery_app.task(name="call_tasks.schedule_solver_call", max_retries=0)
def schedule_solver_call(assignment_id: int) -> None:
    logger.info("[schedule_solver_call] assignment #%s", assignment_id)
    place_solver_call.delay(assignment_id)


# ══════════════════════════════════════════════════════════════
# TASK 2 — Place one Twilio call
# ══════════════════════════════════════════════════════════════

@celery_app.task(
    name="call_tasks.place_solver_call",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def place_solver_call(self, assignment_id: int, round_start: str = None) -> None:
    from app.models.issue_assignment import IssueAssignment
    from app.models.call_log import CallLog
    from app.models.escalation import Escalation
    from app.core.enums import CallStatus, AssignmentStatus

    db = _sync_db()
    try:
        assignment = db.get(IssueAssignment, assignment_id)
        if not assignment:
            logger.error("[place_solver_call] assignment #%s not found", assignment_id)
            return

        if assignment.status not in (AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED):
            logger.info(
                "[place_solver_call] assignment #%s status=%s — skip",
                assignment_id, assignment.status,
            )
            return

        already_escalated = db.execute(
            select(Escalation).where(
                Escalation.assignment_id == assignment_id,
                Escalation.resolved == False,
            )
        ).scalar_one_or_none()
        if already_escalated:
            logger.info("[place_solver_call] assignment #%s escalated — stop", assignment_id)
            return

        now = datetime.now(timezone.utc)
        if round_start is None:
            round_start = now.isoformat()
            logger.info(
                "[place_solver_call] new round for assignment #%s at %s",
                assignment_id, round_start,
            )

        all_logs = db.execute(
            select(CallLog).where(CallLog.assignment_id == assignment_id)
        ).scalars().all()
        attempt_number = len(all_logs) + 1

        solver       = assignment.assigned_solver
        issue        = assignment.issue
        site_name    = issue.site.name if (issue and issue.site) else "your site"
        issue_title  = issue.title if issue else "the assigned issue"
        priority_str = issue.priority.value.lower() if (issue and issue.priority) else "medium"

        from twilio.rest import Client
        twilio = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        try:
            call = twilio.calls.create(
                to=f"+91{solver.phone}",
                from_=settings.TWILIO_PHONE_NUMBER,
                twiml=_build_twiml(solver.name, issue_title, site_name),
                status_callback=(
                    f"{settings.BASE_URL}/api/v1/webhooks/twilio/status"
                    f"?assignment_id={assignment_id}"
                ),
                status_callback_method="POST",
                status_callback_event=[
                    "initiated", "ringing", "in-progress", "completed",
                    "busy", "failed", "no-answer", "canceled",
                ],
            )
        except Exception as exc:
            logger.exception(
                "[place_solver_call] Twilio error — assignment #%s attempt #%s",
                assignment_id, attempt_number,
            )
            db.add(CallLog(
                assignment_id=assignment_id,
                solver_id=solver.id,
                attempt_number=attempt_number,
                initiated_at=now,
                status=CallStatus.MISSED,
            ))
            db.commit()
            raise self.retry(exc=exc, countdown=30)

        db.add(CallLog(
            assignment_id=assignment_id,
            solver_id=solver.id,
            attempt_number=attempt_number,
            initiated_at=now,
            status=CallStatus.INITIATED,
            call_sid=call.sid,
        ))
        db.commit()

        logger.info(
            "[place_solver_call] placed — assignment #%s attempt #%s SID=%s",
            assignment_id, attempt_number, call.sid,
        )

        delay = RETRY_DELAY.get(priority_str, DEFAULT_RETRY_DELAY)
        eta   = now + timedelta(seconds=delay)

        retry_solver_call.apply_async(
            args=[assignment_id, call.sid, round_start],
            eta=eta,
        )

    finally:
        db.close()


# ══════════════════════════════════════════════════════════════
# TASK 3 — Retry after priority delay
# ══════════════════════════════════════════════════════════════

@celery_app.task(name="call_tasks.retry_solver_call", max_retries=0)
def retry_solver_call(assignment_id: int, call_sid: str, round_start: str) -> None:
    from app.models.issue_assignment import IssueAssignment
    from app.models.call_log import CallLog
    from app.models.escalation_rule import EscalationRule
    from app.models.escalation import Escalation
    from app.core.enums import CallStatus, AssignmentStatus

    db = _sync_db()
    try:
        assignment = db.get(IssueAssignment, assignment_id)
        if not assignment:
            return

        if assignment.status not in (AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED):
            logger.info(
                "[retry_solver_call] assignment #%s status=%s — stop",
                assignment_id, assignment.status,
            )
            return

        # ── Check THIS specific call ──────────────────────────
        this_call_log = db.execute(
            select(CallLog).where(CallLog.call_sid == call_sid)
        ).scalar_one_or_none()

        if not this_call_log:
            logger.warning("[retry_solver_call] no log for SID=%s — stop", call_sid)
            return

        if this_call_log.status == CallStatus.ANSWERED:
            logger.info(
                "[retry_solver_call] SID=%s answered — stop chain", call_sid,
            )
            return

        # If webhook hasn't arrived yet, call is still INITIATED.
        # Don't count it as missed — just retry. The webhook will
        # update it to ANSWERED or MISSED independently.
        if this_call_log.status == CallStatus.INITIATED: # IMPORTANT: check THIS call, THIS MIGHT THROW EXTRA CALLS WHEN THE DELAY IN WEBHOOKS
            logger.info(
                "[retry_solver_call] SID=%s still INITIATED (webhook pending) "
                "— placing next call anyway for assignment #%s",
                call_sid, assignment_id,
            )
            place_solver_call.delay(assignment_id, round_start)
            return

        # ── Status is MISSED — check threshold ───────────────
        escalated = db.execute(
            select(Escalation).where(
                Escalation.assignment_id == assignment_id,
                Escalation.resolved == False,
            )
        ).scalar_one_or_none()
        if escalated:
            return

        round_start_dt = datetime.fromisoformat(round_start)

        # Count only confirmed MISSED calls in this round
        missed_count = db.execute(
            select(CallLog).where(
                CallLog.assignment_id == assignment_id,
                CallLog.status == CallStatus.MISSED,
                CallLog.initiated_at >= round_start_dt,
            )
        ).scalars().all()
        missed_count = len(missed_count)

        issue = assignment.issue
        rule = db.execute(
            select(EscalationRule)
            .where(EscalationRule.priority == issue.priority)
            .order_by(EscalationRule.max_call_attempts.asc())
        ).scalars().first()
        max_attempts = rule.max_call_attempts if rule else 3

        logger.info(
            "[retry_solver_call] assignment #%s missed=%d/%d this round",
            assignment_id, missed_count, max_attempts,
        )

        if missed_count >= max_attempts:
            _do_escalate_sync(db, assignment, missed_count, rule)
            return

        place_solver_call.delay(assignment_id, round_start)

    finally:
        db.close()


# ══════════════════════════════════════════════════════════════
# SYNC ESCALATION
# ══════════════════════════════════════════════════════════════

def _do_escalate_sync(db: Session, assignment, missed_count: int, rule) -> None:
    from app.models.escalation import Escalation
    from app.models.issue_history import IssueHistory
    from app.core.enums import IssueStatus, ActionType

    issue = assignment.issue

    existing = db.execute(
        select(Escalation).where(
            Escalation.assignment_id == assignment.id,
            Escalation.resolved == False,
        )
    ).scalar_one_or_none()
    if existing:
        return

    escalate_to = rule.escalate_to_role if rule else "manager"
    threshold   = rule.max_call_attempts if rule else missed_count

    esc = Escalation(
        issue_id=issue.id,
        assignment_id=assignment.id,
        escalation_type="NO_RESPONSE",
        escalated_to_role=escalate_to,
        escalated_by_user_id=None,
        reason=(
            f"Solver '{assignment.assigned_solver.name}' missed "
            f"{missed_count} call(s) this round (threshold: {threshold})"
        ),
        total_missed_calls=missed_count,
        notification_sent=False,
        resolved=False,
    )
    db.add(esc)

    db.add(IssueHistory(
        issue_id=issue.id,
        changed_by_user_id=None,
        old_status=issue.status.value,
        new_status="ESCALATED",
        action_type=ActionType.ASSIGN,
        details=f"Auto-escalated after {missed_count} missed call(s) → {escalate_to}",
    ))

    issue.status = IssueStatus.ESCALATED
    db.commit()
    db.refresh(esc)

    logger.warning(
        "[_do_escalate_sync] escalation #%s — issue #%s → %s (%d missed)",
        esc.id, issue.id, escalate_to, missed_count,
    )

    try:
        from app.services.notification_service import NotificationService
        NotificationService(db).send_escalation_email(esc)
    except Exception:
        logger.exception("Escalation email failed for escalation #%s", esc.id)