"""
app/workers/score_tasks.py

Celery tasks for periodic and event-driven score refresh.

SCHEDULE (add to celery_app.conf.beat_schedule):
  refresh_all_scores:  every 15 minutes
  nightly_full_refresh: every night at 2am (full recalculation safety net)

EVENT-DRIVEN CALLS (called from services after mutations):
  trigger_solver_score_refresh.delay(solver_id)
  trigger_site_score_refresh.delay(site_id)
  trigger_issue_score_refresh.delay(issue_id)

WHAT CHANGED FROM OLD CODE
═══════════════════════════
OLD (broken):
  ✗ Used asyncio.new_event_loop() + loop.run_until_complete()
  ✗ Called AsyncSessionLocal() which uses asyncpg driver
  ✗ asyncpg binds its connection pool to the FastAPI startup event loop
  ✗ Celery creates a NEW loop per task → asyncpg refuses → RuntimeError
  ✗ _run_async() helper was the root cause of the crash

NEW (fixed):
  ✓ Zero asyncio — these are plain sync functions
  ✓ ScoreRefreshServiceSync uses psycopg2 (sync driver)
  ✓ Each task creates its own Session, uses it, closes it in finally
  ✓ FastAPI's asyncpg engine is completely untouched
  ✓ No event loop conflicts possible — different driver, different connection

HOW THE TWO SERVICES RELATE:
  score_refresh_service.py (async)  ← FastAPI routes use this
  score_refresh_sync.py   (sync)    ← Celery tasks use this
  Same SQL. Same score formula. Different DB drivers.
"""

import logging
from datetime import datetime, timezone

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════
# PERIODIC: Celery beat every 15 minutes
# ══════════════════════════════════════════════════════════════════

@celery_app.task(
    name="score_tasks.refresh_all_scores",
    max_retries=2,
    default_retry_delay=60,
)
def refresh_all_scores() -> dict:
    """
    Full score refresh for ALL solvers and ALL sites.
    Scheduled by Celery beat every 15 minutes.

    Add to celery_app.conf.update():
        beat_schedule={
            "refresh-scores-15min": {
                "task": "score_tasks.refresh_all_scores",
                "schedule": 15 * 60,
            },
        },
    """
    logger.info(
        "[score_tasks] Full refresh starting at %s",
        datetime.now(timezone.utc).isoformat(),
    )
    from app.services.score_refresh_sync import ScoreRefreshServiceSync
    result = ScoreRefreshServiceSync().refresh_all()
    logger.info("[score_tasks] Full refresh done: %s", result)
    return result


# ══════════════════════════════════════════════════════════════════
# EVENT-DRIVEN: Called after mutations in services
# ══════════════════════════════════════════════════════════════════

@celery_app.task(
    name="score_tasks.trigger_solver_score_refresh",
    max_retries=3,
    default_retry_delay=10,
)
def trigger_solver_score_refresh(solver_id: int) -> None:
    """
    Refresh one solver's score. Fire-and-forget after db.commit().

    Usage:
        from app.workers.score_tasks import trigger_solver_score_refresh
        trigger_solver_score_refresh.delay(solver_id)
    """
    logger.info("[score_tasks] Refreshing solver #%s", solver_id)
    from app.services.score_refresh_sync import ScoreRefreshServiceSync
    ScoreRefreshServiceSync().refresh_solver(solver_id)


@celery_app.task(
    name="score_tasks.trigger_site_score_refresh",
    max_retries=3,
    default_retry_delay=10,
)
def trigger_site_score_refresh(site_id: int) -> None:
    """
    Refresh one site's score. Fire-and-forget after db.commit().

    Usage:
        from app.workers.score_tasks import trigger_site_score_refresh
        trigger_site_score_refresh.delay(site_id)
    """
    logger.info("[score_tasks] Refreshing site #%s", site_id)
    from app.services.score_refresh_sync import ScoreRefreshServiceSync
    ScoreRefreshServiceSync().refresh_site(site_id)


@celery_app.task(
    name="score_tasks.trigger_issue_score_refresh",
    max_retries=3,
    default_retry_delay=10,
)
def trigger_issue_score_refresh(issue_id: int) -> None:
    """
    Refresh site + solver scores linked to an issue.
    This is the MAIN hook to call after any issue mutation.

    Add this ONE LINE after every db.commit() in:
      - issue_service.create_from_chat()
      - issue_service.approve_completion()
      - issue_service.solver_complete_work()
      - issue_service.update_priority()
      - issue_service.extend_deadline()
      - complaint_service.create_from_chat()
      - assignment_service.reassign_from_chat()

    Usage:
        from app.workers.score_tasks import trigger_issue_score_refresh
        trigger_issue_score_refresh.delay(issue.id)   # non-blocking
    """
    logger.info("[score_tasks] Refreshing scores for issue #%s", issue_id)
    from app.services.score_refresh_sync import ScoreRefreshServiceSync
    ScoreRefreshServiceSync().refresh_for_issue(issue_id)