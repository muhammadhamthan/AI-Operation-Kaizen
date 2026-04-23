"""
app/workers/call_tasks.py

  - `db.get(IssueAssignment, ...)` replaced with `select().options(selectinload(...))`
    because IssueAssignment.assigned_solver and IssueAssignment.issue (and Issue.site)
    are now lazy="raise". The old db.get() code relied on the implicit selectin.
    
"""

from json import load
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy import func as sql_func

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

RETRY_DELAY: dict[str, int] = {
    "high":   40,
    "medium": 1 * 80,
    "low":    2 * 60,
}
DEFAULT_RETRY_DELAY = 10 * 60


# ══════════════════════════════════════════════════════════════
# Module-level sync engine + session factory
#
# WAVE A FIX: previously `_db_session()` built a brand-new engine on
# every task invocation. At 1000+ users this exhausts Supabase's
# connection pool very quickly. Now we create ONE engine per
# Celery worker process and reuse it for every task.
# ══════════════════════════════════════════════════════════════
 
def _build_sync_url() -> str:
    url = settings.SYNC_DATABASE_URL or settings.DATABASE_URL
    url = url.replace("+asyncpg", "")
    if "sslmode=" not in url and "ssl=" in url:
        url = url.replace("ssl=", "sslmode=")
    elif "sslmode=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"
    if not url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://")
    return url
 
 
_sync_engine = create_engine(
    _build_sync_url(),
    pool_pre_ping=True,
    pool_size=int(getattr(settings, "CELERY_DB_POOL_SIZE", 4)),
    max_overflow=int(getattr(settings, "CELERY_DB_MAX_OVERFLOW", 4)),
    pool_recycle=1800,
    pool_timeout=30,
)
 
_SyncSession = sessionmaker(
    bind=_sync_engine,
    autocommit=False,
    autoflush=False,
)
 
 
def _db_session() -> Session:
    """Returns a fresh sync Session bound to the shared engine."""
    return _SyncSession()


def _build_twiml(solver_name: str, issue_title: str, site_name: str, issue_id: Optional[int] = None) -> str:
    return (
        "<Response>"
        "<Say voice='alice' language='en-IN'>"
        f"Hello {solver_name}. "
        f"You have been assigned a facility issue at {site_name}. "
        f"Issue: {issue_title} (ID: {issue_id}). "
        "Please open your app and begin work immediately. "
        "</Say>"
        "</Response>"
    )
    
#helper: load an assignment with all relationships we'll need
def _load_assignment_full(db: Session, assignment_id: int):
    from app.models.issue_assignment import IssueAssignment
    from app.models.issue import Issue
    from sqlalchemy.orm import selectinload
 
    return db.execute(
        select(IssueAssignment)
        .where(IssueAssignment.id == assignment_id)
        .options(
            selectinload(IssueAssignment.assigned_solver),
            selectinload(IssueAssignment.issue).selectinload(Issue.site),
        )
    ).scalar_one_or_none()


# ══════════════════════════════════════════════════════════════
# TASK 1 — Entry point
# ══════════════════════════════════════════════════════════════

@celery_app.task(name="call_tasks.schedule_solver_call", max_retries=0)
def schedule_solver_call(assignment_id: int, issue_id: int) -> None:
    logger.info("[schedule_solver_call] assignment #%s", assignment_id)
    place_solver_call.delay(assignment_id , issue_id=issue_id)  # issue_id is optional for backward compatibility


# ══════════════════════════════════════════════════════════════
# TASK 2 — Place one Twilio call
# ══════════════════════════════════════════════════════════════

@celery_app.task(
    name="call_tasks.place_solver_call",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def place_solver_call(self, assignment_id: int, round_start: Optional[str]=None, issue_id: Optional[int]=None) -> None:
    from app.models.issue_assignment import IssueAssignment
    from app.models.call_log import CallLog
    from app.models.escalation import Escalation
    from app.core.enums import CallStatus, AssignmentStatus

    db = _db_session()
    try:
        assignment = _load_assignment_full(db, assignment_id)
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
                twiml=_build_twiml(solver.name, issue_title, site_name , issue_id),
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
            # WAVE A FIX: do NOT write a MISSED CallLog here.
            # Reasons:
            #   - the retry will re-enter this function and add a new
            #     INITIATED log, making attempt_number count the failed
            #     Twilio API attempt as a genuine missed call, which
            #     accelerated escalations spuriously.
            #   - a Twilio API failure is NOT the same as a missed call.
            # Just retry; if all retries exhaust, Celery raises.
            
            # db.add(CallLog(
            #     assignment_id=assignment_id,
            #     solver_id=solver.id,
            #     attempt_number=attempt_number,
            #     initiated_at=now,
            #     status=CallStatus.MISSED,
            # ))
            # db.commit()
            # raise self.retry(exc=exc, countdown=30)

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
            args=[assignment_id, call.sid, round_start, issue_id],
            eta=eta,
        )

    finally:
        db.close()


# ══════════════════════════════════════════════════════════════
# TASK 3 — Retry after priority delay
# ══════════════════════════════════════════════════════════════

@celery_app.task(
    name="call_tasks.retry_solver_call",
    bind=True,           # ← needed for self.retry
    max_retries=3,       # ← max webhook wait retries (not call retries)
)
def retry_solver_call(
    self,
    assignment_id: int,
    call_sid: str,
    round_start: Optional[str] = None,
    issue_id: Optional[int] = None,
) -> None:
    from app.models.issue_assignment import IssueAssignment
    from app.models.call_log import CallLog
    from app.models.escalation_rule import EscalationRule
    from app.models.escalation import Escalation
    from app.core.enums import CallStatus, AssignmentStatus

    db = _db_session()
    try:
        assignment = _load_assignment_full(db, assignment_id)
        if not assignment:
            return

        if assignment.status not in (
            AssignmentStatus.ACTIVE, AssignmentStatus.REOPENED
        ):
            logger.info(
                "[retry_solver_call] assignment #%s status=%s — stop",
                assignment_id, assignment.status,
            )
            return

        # Already escalated — stop the whole chain
        already_escalated = db.execute(
            select(Escalation).where(
                Escalation.assignment_id == assignment_id,
                Escalation.resolved == False,
            )
        ).scalar_one_or_none()
        if already_escalated:
            return

        # ── Check this specific call's status ────────────────
        this_call_log = db.execute(
            select(CallLog).where(CallLog.call_sid == call_sid)
        ).scalar_one_or_none()

        if not this_call_log:
            logger.warning(
                "[retry_solver_call] no log for SID=%s — stop", call_sid,
            )
            return

        # ── ANSWERED: solver picked up, stop the chain ───────
        if this_call_log.status == CallStatus.ANSWERED:
            logger.info(
                "[retry_solver_call] SID=%s answered — stop chain", call_sid,
            )
            return

        # ── INITIATED: webhook hasn't arrived yet ─────────────
        # Strategy: wait up to 3 × 30s = 90 extra seconds for webhook.
        # After that, mark as MISSED and continue normally.
        # This handles both slow webhooks AND lost webhooks safely.
        # A real answered call would have triggered the webhook well
        # before the retry delay (2min HIGH / 15min MEDIUM / 30min LOW).
        if this_call_log.status == CallStatus.INITIATED:
            webhook_wait_attempt = self.request.retries  # 0, 1, 2, 3

            if webhook_wait_attempt < self.max_retries:
                logger.warning(
                    "[retry_solver_call] SID=%s still INITIATED "
                    "(webhook attempt %d/%d) — waiting 30s more",
                    call_sid,
                    webhook_wait_attempt + 1,
                    self.max_retries,
                )
                # Re-check this same call after 30 seconds
                # This does NOT place a new Twilio call — just waits
                raise self.retry(countdown=30)
            else:
                # Webhook never arrived after 3×30s = 90 seconds
                # Safe to mark MISSED — if solver actually answered,
                # Twilio retries its webhook for 24 hours and will
                # eventually update the record
                logger.error(
                    "[retry_solver_call] SID=%s still INITIATED after "
                    "%d webhook checks — marking MISSED (webhook lost)",
                    call_sid, self.max_retries,
                )
                this_call_log.status = CallStatus.MISSED
                this_call_log.ended_at = datetime.now(timezone.utc)
                db.commit()
                # Fall through to missed-count check below

        # ── MISSED: count this round and decide next action ───
        round_start_dt = datetime.fromisoformat(round_start)

        # WAVE B speed-up: COUNT instead of fetching all rows
        missed_count = db.execute(
            select(sql_func.count(CallLog.id)).where(
                CallLog.assignment_id == assignment_id,
                CallLog.status == CallStatus.MISSED,
                CallLog.initiated_at >= round_start_dt,
            )
        ).scalar() or 0

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

        # Under threshold — place the next call
        issue_id=issue_id if issue_id is not None else (issue.id if issue else None)
        place_solver_call.delay(assignment_id, round_start, issue_id=issue_id)

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
        from app.workers.notification_tasks import send_escalation_email
        send_escalation_email.delay(esc.id)
    except Exception:
        logger.exception("Escalation email failed for escalation #%s", esc.id)