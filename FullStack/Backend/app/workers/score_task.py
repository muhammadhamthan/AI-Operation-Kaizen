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
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run an async coroutine from within a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _refresh_all_async():
    from app.db.session import AsyncSessionLocal
    from app.services.score_refresh import ScoreRefreshService

    async with AsyncSessionLocal() as db:
        service = ScoreRefreshService(db)
        return await service.refresh_all()


async def _refresh_solver_async(solver_id: int):
    from app.db.session import AsyncSessionLocal
    from app.services.score_refresh import ScoreRefreshService

    async with AsyncSessionLocal() as db:
        service = ScoreRefreshService(db)
        await service.refresh_solver(solver_id)


async def _refresh_site_async(site_id: int):
    from app.db.session import AsyncSessionLocal
    from app.services.score_refresh import ScoreRefreshService

    async with AsyncSessionLocal() as db:
        service = ScoreRefreshService(db)
        await service.refresh_site(site_id)


async def _refresh_issue_async(issue_id: int):
    from app.db.session import AsyncSessionLocal
    from app.services.score_refresh import ScoreRefreshService

    async with AsyncSessionLocal() as db:
        service = ScoreRefreshService(db)
        await service.refresh_for_issue(issue_id)


# ══════════════════════════════════════════════════════════════
# PERIODIC: Called by Celery beat every 15 minutes
# ══════════════════════════════════════════════════════════════

@celery_app.task(name="score_tasks.refresh_all_scores", max_retries=2)
def refresh_all_scores() -> dict:
    """Full score refresh for all solvers and sites."""
    logger.info("[score_tasks] Starting full score refresh at %s", datetime.now(timezone.utc))
    result = _run_async(_refresh_all_async())
    logger.info("[score_tasks] Full refresh done: %s", result)
    return result


# ══════════════════════════════════════════════════════════════
# EVENT-DRIVEN: Targeted refresh (fast, called after mutations)
# ══════════════════════════════════════════════════════════════

@celery_app.task(name="score_tasks.trigger_solver_score_refresh", max_retries=2)
def trigger_solver_score_refresh(solver_id: int) -> None:
    """Refresh one solver's score. Call after assignment/complaint events."""
    logger.info("[score_tasks] Refreshing solver #%s score", solver_id)
    _run_async(_refresh_solver_async(solver_id))


@celery_app.task(name="score_tasks.trigger_site_score_refresh", max_retries=2)
def trigger_site_score_refresh(site_id: int) -> None:
    """Refresh one site's score. Call after issue status changes."""
    logger.info("[score_tasks] Refreshing site #%s score", site_id)
    _run_async(_refresh_site_async(site_id))

@celery_app.task(name="score_tasks.trigger_issue_score_refresh", max_retries=2)
def trigger_issue_score_refresh(issue_id: int) -> None:
    """Refresh scores for the site and solver linked to this issue."""
    logger.info("[score_tasks] Refreshing scores for issue #%s", issue_id)
    _run_async(_refresh_issue_async(issue_id))