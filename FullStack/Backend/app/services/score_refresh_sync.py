"""
app/services/score_refresh_sync.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHY TWO SEPARATE SERVICES?
═══════════════════════════
FastAPI uses asyncpg (async PostgreSQL driver) + AsyncSession.
Celery runs in a worker process with its own event loop created
per-task via asyncio.new_event_loop().

The crash happens because asyncpg's connection pool binds itself
to the event loop that existed when the engine was FIRST created
(during FastAPI startup). When Celery creates a NEW loop, asyncpg
refuses to use it — "Future attached to a different loop".

THE CLEAN SOLUTION:
  ✓ FastAPI         → async service   (AsyncSession + asyncpg)
  ✓ Celery workers  → sync service    (Session + psycopg2)

SAME LOGIC. SAME SQL. SAME SCORE FORMULA.
The only difference is `await` vs no `await`, and which DB driver.

This file is the SYNC version — used only by Celery tasks.
The ASYNC version (score_refresh_service.py) is used by FastAPI routes.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.db.session import SessionLocal 

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# SYNC ENGINE — psycopg2 driver (NOT asyncpg)
# Created fresh per Celery worker process, not shared with FastAPI
# ─────────────────────────────────────────────────────────────────

def _make_sync_url() -> str:
    """
    Builds a psycopg2-compatible URL from the configured DATABASE_URL.

    Handles two common cases:
      postgresql+asyncpg://... → postgresql+psycopg2://...
      postgresql://...         → postgresql+psycopg2://...

    Also strips ?ssl=require and replaces with sslmode=require
    which is the psycopg2 syntax (not asyncpg syntax).
    """
    url = settings.DATABASE_URL

    # Remove async driver suffix
    url = url.replace("+asyncpg", "")
    url = url.replace("postgresql://", "postgresql+psycopg2://")

    # Fix SSL parameter format: asyncpg uses ?ssl=require
    # psycopg2 uses ?sslmode=require
    if "ssl=" in url and "sslmode=" not in url:
        url = url.replace("ssl=", "sslmode=")
    elif "sslmode=" not in url and "?" in url:
        url = url + "&sslmode=require"
    elif "sslmode=" not in url:
        url = url + "?sslmode=require"

    return url


def _make_sync_session() -> Session:
    """
    Creates a fresh sync SQLAlchemy session.
    Called once per Celery task — each task gets its own session.
    """
    engine = create_engine(
        _make_sync_url(),
        pool_pre_ping=True,
        pool_size=2,       # small pool — Celery tasks are short-lived
        max_overflow=2,
    )
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    return factory()


# ─────────────────────────────────────────────────────────────────
# SCORE FORMULA — shared constants
# Keep in sync with score_refresh_service.py (async version)
# ─────────────────────────────────────────────────────────────────

def _solver_label(score: int) -> str:
    if score >= 80:
        return "Top Performer"
    elif score >= 55:
        return "Good"
    return "Needs Attention"


def _site_health(score: int) -> str:
    if score < 50:
        return "Critical"
    elif score < 80:
        return "Needs Attention"
    return "Healthy"


# ─────────────────────────────────────────────────────────────────
# SYNC SCORE REFRESH SERVICE
# ─────────────────────────────────────────────────────────────────

class ScoreRefreshServiceSync:
    """
    Sync version of ScoreRefreshService.
    Uses plain psycopg2 Session — safe to call from Celery tasks.

    Usage in Celery tasks:
        service = ScoreRefreshServiceSync()
        service.refresh_solver(solver_id)
        # No await, no event loop, no asyncpg conflicts
    """

    def __init__(self):
        # Each instance gets its own session
        # Session is closed in the finally block of each public method
        self._db: Optional[Session] = None

    def _get_db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def _close(self) -> None:
        if self._db is not None:
            self._db.close()
            self._db = None

    # ══════════════════════════════════════════════════════════════
    # PUBLIC: Entry points called from Celery tasks
    # ══════════════════════════════════════════════════════════════

    def refresh_all(self) -> dict:
        """Refresh ALL solvers and ALL sites. Called by periodic beat task."""
        db = self._get_db()
        try:
            solver_count = self._refresh_all_solvers(db)
            site_count   = self._refresh_all_sites(db)
            db.commit()
            logger.info(
                "[ScoreRefreshSync] Full refresh — solvers: %d, sites: %d",
                solver_count, site_count,
            )
            return {"solvers_updated": solver_count, "sites_updated": site_count}
        except Exception:
            db.rollback()
            raise
        finally:
            self._close()

    def refresh_solver(self, solver_id: int) -> None:
        """Refresh one solver. Called after assignment/complaint mutations."""
        db = self._get_db()
        try:
            self._upsert_solver_score(db, solver_id)
            db.commit()
            logger.info("[ScoreRefreshSync] Solver #%s refreshed", solver_id)
        except Exception:
            db.rollback()
            raise
        finally:
            self._close()

    def refresh_site(self, site_id: int) -> None:
        """Refresh one site. Called after issue status mutations."""
        db = self._get_db()
        try:
            self._upsert_site_score(db, site_id)
            db.commit()
            logger.info("[ScoreRefreshSync] Site #%s refreshed", site_id)
        except Exception:
            db.rollback()
            raise
        finally:
            self._close()

    def refresh_for_issue(self, issue_id: int) -> None:
        """
        Refresh both site and solver scores linked to this issue.
        Called after any issue mutation (create, complete, approve, etc.)
        """
        db = self._get_db()
        try:
            # Single query to get site_id + all solver IDs for this issue
            row = db.execute(
                text("""
                    SELECT i.site_id,
                           array_agg(DISTINCT ia.assigned_to_solver_id)
                               FILTER (WHERE ia.assigned_to_solver_id IS NOT NULL)
                               AS solver_ids
                    FROM issues i
                    LEFT JOIN issue_assignments ia ON ia.issue_id = i.id
                    WHERE i.id = :issue_id
                    GROUP BY i.site_id
                """),
                {"issue_id": issue_id},
            ).first()

            if not row:
                logger.warning(
                    "[ScoreRefreshSync] Issue #%s not found — skipping", issue_id
                )
                return

            self._upsert_site_score(db, row.site_id)

            for sid in (row.solver_ids or []):
                if sid:
                    self._upsert_solver_score(db, sid)

            db.commit()
            logger.info(
                "[ScoreRefreshSync] Issue #%s — site #%s + %d solvers refreshed",
                issue_id, row.site_id, len(row.solver_ids or []),
            )
        except Exception:
            db.rollback()
            raise
        finally:
            self._close()

    # ══════════════════════════════════════════════════════════════
    # SOLVER SCORE — all in pure SQL, no Python loops over rows
    # ══════════════════════════════════════════════════════════════

    def _refresh_all_solvers(self, db: Session) -> int:
        solver_ids = [
            row[0] for row in db.execute(
                text("""
                    SELECT id FROM users
                    WHERE role = 'problemsolver' AND is_active = true
                """)
            ).all()
        ]
        for sid in solver_ids:
            self._upsert_solver_score(db, sid)
        return len(solver_ids)

    def _upsert_solver_score(self, db: Session, solver_id: int) -> None:
        """
        Compute and upsert one solver's score.
        Uses 5 SQL queries — same logic as the async version.
        All queries use text() with named params — no ORM, no N+1.
        """
        now = datetime.now(timezone.utc)

        # ── Q1: Assignment counts + issue status join ─────────────
        asgn = db.execute(
            text("""
                SELECT
                    COUNT(ia.id)                                             AS total_assigned,
                    COUNT(ia.id) FILTER (WHERE ia.status = 'COMPLETED')     AS completed_count,
                    COUNT(ia.id) FILTER (
                        WHERE ia.status IN ('ACTIVE', 'REOPENED')
                          AND i.status = 'IN_PROGRESS'
                    )                                                        AS in_progress_count,
                    COUNT(ia.id) FILTER (
                        WHERE ia.status IN ('ACTIVE', 'REOPENED')
                          AND i.status IN ('ASSIGNED', 'OPEN')
                    )                                                        AS assigned_not_started,
                    COUNT(ia.id) FILTER (WHERE ia.status = 'REOPENED')      AS reopened_count,
                    COUNT(ia.id) FILTER (WHERE i.status = 'ESCALATED')      AS escalated_count,
                    COUNT(ia.id) FILTER (
                        WHERE ia.due_date < :now
                          AND ia.status != 'COMPLETED'
                    )                                                        AS overdue_count
                FROM issue_assignments ia
                LEFT JOIN issues i ON i.id = ia.issue_id
                WHERE ia.assigned_to_solver_id = :solver_id
            """),
            {"solver_id": solver_id, "now": now},
        ).first()

        total_assigned       = asgn.total_assigned or 0
        completed_count      = asgn.completed_count or 0
        in_progress_count    = asgn.in_progress_count or 0
        assigned_not_started = asgn.assigned_not_started or 0
        reopened_count       = asgn.reopened_count or 0
        escalated_count      = asgn.escalated_count or 0
        overdue_count        = asgn.overdue_count or 0
        active_count         = in_progress_count + assigned_not_started + reopened_count

        # ── Q2: On-time completions (LATERAL join) ────────────────
        on_time = db.execute(
            text("""
                SELECT COUNT(*) AS on_time_count
                FROM issue_assignments ia
                JOIN LATERAL (
                    SELECT MIN(ih.created_at) AS completed_at
                    FROM issue_history ih
                    WHERE ih.issue_id = ia.issue_id
                      AND ih.new_status = 'COMPLETED'
                ) completion ON true
                WHERE ia.assigned_to_solver_id = :solver_id
                  AND ia.status = 'COMPLETED'
                  AND ia.due_date IS NOT NULL
                  AND completion.completed_at <= ia.due_date
            """),
            {"solver_id": solver_id},
        ).first()
        on_time_count = on_time.on_time_count or 0

        # ── Q3: Call stats ────────────────────────────────────────
        calls = db.execute(
            text("""
                SELECT
                    COUNT(*)                                       AS total_calls,
                    COUNT(*) FILTER (WHERE status = 'ANSWERED')   AS answered_calls
                FROM call_logs
                WHERE solver_id = :solver_id
            """),
            {"solver_id": solver_id},
        ).first()
        total_calls    = calls.total_calls or 0
        answered_calls = calls.answered_calls or 0

        # ── Q4: Complaint count ───────────────────────────────────
        comps = db.execute(
            text("SELECT COUNT(*) AS cnt FROM complaints WHERE target_solver_id = :sid"),
            {"sid": solver_id},
        ).first()
        complaint_count = comps.cnt or 0

        # ── Q5: Skills + site names + solver name (one query) ─────
        meta = db.execute(
            text("""
                SELECT
                    u.name                             AS solver_name,
                    array_agg(DISTINCT pss.skill_type) AS skills,
                    array_agg(DISTINCT s.name)         AS sites
                FROM users u
                LEFT JOIN problem_solver_skills pss ON pss.solver_id = u.id
                LEFT JOIN sites s ON s.id = pss.site_id
                WHERE u.id = :solver_id
                GROUP BY u.name
            """),
            {"solver_id": solver_id},
        ).first()

        solver_name = meta.solver_name if meta else f"Solver #{solver_id}"
        skills      = [x for x in (meta.skills or []) if x] if meta else []
        sites       = [x for x in (meta.sites  or []) if x] if meta else []

        # ── Score formula ─────────────────────────────────────────
        completion_rate  = completed_count / total_assigned if total_assigned > 0 else 0.0
        on_time_rate     = on_time_count   / completed_count if completed_count > 0 else 0.0
        call_answer_rate = answered_calls  / total_calls     if total_calls > 0 else 1.0

        completion_score  = completion_rate  * 40
        on_time_score     = on_time_rate     * 30
        call_score        = call_answer_rate * 20
        complaint_penalty = min(complaint_count * 3, 10)
        complaint_score   = 10 - complaint_penalty

        total_score = max(0, min(100, round(
            completion_score + on_time_score + call_score + complaint_score
        )))

        breakdown = {
            "total_assigned":             total_assigned,
            "completed_count":            completed_count,
            "active_count":               active_count,
            "in_progress_count":          in_progress_count,
            "assigned_not_started_count": assigned_not_started,
            "reopened_count":             reopened_count,
            "escalated_count":            escalated_count,
            "overdue_count":              overdue_count,
            "completion_rate":            round(completion_rate  * 100),
            "on_time_rate":               round(on_time_rate     * 100),
            "call_answer_rate":           round(call_answer_rate * 100),
            "total_calls":                total_calls,
            "answered_calls":             answered_calls,
            "missed_calls":               total_calls - answered_calls,
            "complaint_count":            complaint_count,
            "skills":                     skills,
            "sites":                      sites,
        }

        # ── UPSERT ────────────────────────────────────────────────
        db.execute(
            text("""
                INSERT INTO score_cache
                    (entity_type, entity_id, entity_name, score, label,
                     health, breakdown, computed_at, updated_at)
                VALUES
                    ('solver', :entity_id, :entity_name, :score, :label,
                     NULL, :breakdown::jsonb, :computed_at, :computed_at)
                ON CONFLICT (entity_type, entity_id) DO UPDATE SET
                    entity_name = EXCLUDED.entity_name,
                    score       = EXCLUDED.score,
                    label       = EXCLUDED.label,
                    breakdown   = EXCLUDED.breakdown,
                    computed_at = EXCLUDED.computed_at,
                    updated_at  = EXCLUDED.computed_at
            """),
            {
                "entity_id":   solver_id,
                "entity_name": solver_name,
                "score":       float(total_score),
                "label":       _solver_label(total_score),
                "breakdown":   __import__("json").dumps(breakdown),
                "computed_at": now,
            },
        )

    # ══════════════════════════════════════════════════════════════
    # SITE SCORE — all in pure SQL
    # ══════════════════════════════════════════════════════════════

    def _refresh_all_sites(self, db: Session) -> int:
        site_ids = [
            row[0] for row in db.execute(text("SELECT id FROM sites")).all()
        ]
        for sid in site_ids:
            self._upsert_site_score(db, sid)
        return len(site_ids)

    def _upsert_site_score(self, db: Session, site_id: int) -> None:
        """
        Compute and upsert one site's score.
        Uses 3 SQL queries — same logic as the async version.
        """
        now = datetime.now(timezone.utc)

        # ── Q1: Issue counts (all statuses in one query) ──────────
        stats = db.execute(
            text("""
                SELECT
                    COUNT(*)                                                     AS total,
                    COUNT(*) FILTER (WHERE status = 'OPEN')                     AS open_issues,
                    COUNT(*) FILTER (WHERE status = 'ASSIGNED')                 AS assigned_issues,
                    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')              AS in_progress_issues,
                    COUNT(*) FILTER (WHERE status = 'RESOLVED_PENDING_REVIEW')  AS resolved_pending,
                    COUNT(*) FILTER (WHERE status = 'COMPLETED')                AS completed_issues,
                    COUNT(*) FILTER (WHERE status = 'ESCALATED')                AS escalated_issues,
                    COUNT(*) FILTER (WHERE status = 'REOPENED')                 AS reopened_issues,
                    COUNT(*) FILTER (
                        WHERE deadline_at < :now AND status != 'COMPLETED'
                    )                                                            AS overdue_count
                FROM issues
                WHERE site_id = :site_id
            """),
            {"site_id": site_id, "now": now},
        ).first()

        total            = stats.total or 0
        open_issues      = stats.open_issues or 0
        assigned_issues  = stats.assigned_issues or 0
        in_progress      = stats.in_progress_issues or 0
        resolved_pending = stats.resolved_pending or 0
        completed_issues = stats.completed_issues or 0
        escalated_issues = stats.escalated_issues or 0
        reopened_issues  = stats.reopened_issues or 0
        overdue_count    = stats.overdue_count or 0

        # ── Q2: Site meta + complaint + solver counts (one query) ─
        meta = db.execute(
            text("""
                SELECT
                    s.name                                   AS site_name,
                    s.location                               AS site_location,
                    COUNT(DISTINCT c.id)                     AS complaints_count,
                    COUNT(DISTINCT pss.solver_id)            AS solver_count
                FROM sites s
                LEFT JOIN issues i   ON i.site_id = s.id
                LEFT JOIN complaints c ON c.issue_id = i.id
                LEFT JOIN problem_solver_skills pss ON pss.site_id = s.id
                WHERE s.id = :site_id
                GROUP BY s.name, s.location
            """),
            {"site_id": site_id},
        ).first()

        site_name        = meta.site_name     if meta else f"Site #{site_id}"
        site_location    = meta.site_location if meta else None
        complaints_count = meta.complaints_count or 0
        solver_count     = meta.solver_count or 0

        # ── Score formula ─────────────────────────────────────────
        score = 100
        if total > 0:
            penalty = (
                (overdue_count    * 5)  +
                (escalated_issues * 5)  +
                (complaints_count * 10)
            )
            bonus = completed_issues * 2
            score = max(0, min(100, round(100 - penalty + bonus)))

        breakdown = {
            "total_issues":             total,
            "open_issues":              open_issues,
            "assigned_issues":          assigned_issues,
            "in_progress_issues":       in_progress,
            "resolved_pending_review":  resolved_pending,
            "completed_issues":         completed_issues,
            "escalated_issues":         escalated_issues,
            "reopened_issues":          reopened_issues,
            "overdue_count":            overdue_count,
            "complaints_count":         complaints_count,
            "solver_count":             solver_count,
            "location":                 site_location,
        }

        # ── UPSERT ────────────────────────────────────────────────
        db.execute(
            text("""
                INSERT INTO score_cache
                    (entity_type, entity_id, entity_name, score, label,
                     health, breakdown, computed_at, updated_at)
                VALUES
                    ('site', :entity_id, :entity_name, :score, NULL,
                     :health, :breakdown::jsonb, :computed_at, :computed_at)
                ON CONFLICT (entity_type, entity_id) DO UPDATE SET
                    entity_name = EXCLUDED.entity_name,
                    score       = EXCLUDED.score,
                    health      = EXCLUDED.health,
                    breakdown   = EXCLUDED.breakdown,
                    computed_at = EXCLUDED.computed_at,
                    updated_at  = EXCLUDED.computed_at
            """),
            {
                "entity_id":   site_id,
                "entity_name": site_name,
                "score":       float(score),
                "health":      _site_health(score),
                "breakdown":   __import__("json").dumps(breakdown),
                "computed_at": now,
            },
        )