"""
Celery application instance.

Start worker (run from project root):
    celery -A app.workers.celery_app worker --loglevel=info -Q calls

The worker uses a sync SQLAlchemy Session because Celery tasks
run in a separate process outside FastAPI's async event loop.
"""

from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "facility_mgmt",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.call_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Retry delivery on worker crash
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # Route all call tasks to dedicated queue
    task_routes={"call_tasks.*": {"queue": "calls"}},
)