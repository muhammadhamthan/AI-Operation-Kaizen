"""
app/workers/notification_tasks.py

Celery tasks for notifications (email, etc.).

WAVE A ADDITION:
  The async call_service.escalate was calling NotificationService
  directly, which is a sync SMTP path. This blocked the event loop
  AND was crashing silently because NotificationService takes a sync
  Session but was getting the async session from the request.

  Now: async call_service.escalate → enqueues this task →
  the task opens a sync Session and invokes NotificationService sync.
    - Now loads the Escalation with explicit eager loading of:
      escalation.issue
      escalation.issue.site
      escalation.assignment
      escalation.assignment.assigned_solver
    because Issue.site and IssueAssignment.assigned_solver are now
    lazy="raise" (Wave B). The NotificationService code accesses these
    chains when building the email body.
"""

import logging
from typing import Optional

from Backend.app.models.issue import Issue
from Backend.app.models.issue_assignment import IssueAssignment
from sqlalchemy.orm import Session
from sqlalchemy import select , selectinload

from app.workers.celery_app import celery_app
from app.workers.call_tasks import _db_session   # shared sync session factory

logger = logging.getLogger(__name__)


@celery_app.task(
    name="notification_tasks.send_escalation_email",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def send_escalation_email(escalation_id: int) -> bool:
    """
    Load the Escalation by ID using a fresh sync session,
    then invoke NotificationService.send_escalation_email.

    Retries up to 3 times on failure (transient SMTP outages).
    """
    from app.models.escalation import Escalation
    from app.services.notification_service import NotificationService

    db: Session = _db_session()
    try:
        #explicit eager loading — email builder accesses
        # escalation.issue.site and escalation.assignment.assigned_solver,
        # both of which are now lazy="raise".
        escalation = db.execute(
            select(Escalation)
            .where(Escalation.id == escalation_id)
            .options(
                selectinload(Escalation.issue).selectinload(Issue.site),
                selectinload(Escalation.assignment)
                    .selectinload(IssueAssignment.assigned_solver),
            )
        ).scalar_one_or_none()
        if not escalation:
            logger.warning(
                "[send_escalation_email] escalation #%s not found", escalation_id
            )
            return False

        success = NotificationService(db).send_escalation_email(escalation)
        if not success:
            # Let Celery retry (acks_late + max_retries=3)
            logger.warning(
                "[send_escalation_email] failed for escalation #%s — will retry",
                escalation_id,
            )
        return success
    finally:
        db.close()