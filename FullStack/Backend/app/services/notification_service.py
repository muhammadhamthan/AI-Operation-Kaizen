"""
PURPOSE: Email notifications for escalations.
───────────────────────────────────────────────
Sends escalation alert to:
  1. ALL managers in the system
  2. The supervisor(s) who manage the issue's site

Both groups get the same email in one send (To + CC pattern):
  To  → all managers
  CC  → site supervisors

If a user has no email set, they are skipped with a warning log.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from typing import List

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import settings
from app.core.enums import UserRole
from app.models.escalation import Escalation
from app.models.user import User
from app.models.supervisor_site import SupervisorSite   # the Table object

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    # ══════════════════════════════════════════════════════
    # PUBLIC
    # ══════════════════════════════════════════════════════

    def send_escalation_email(self, escalation: Escalation) -> bool:
        """
        Sends one escalation email:
          To  → all managers in the system
          CC  → supervisors who manage the issue's site

        Returns True on success, False on any failure.
        """
        try:
            issue   = escalation.issue
            site_id = issue.site_id if issue else None

            # ── Collect recipients ─────────────────────────
            manager_emails    = self._get_all_manager_emails()
            supervisor_emails = self._get_site_supervisor_emails(site_id) if site_id else []

            # Remove any user with no email set
            to_list = [e for e in manager_emails    if e]
            cc_list = [e for e in supervisor_emails if e and e not in to_list]

            if not to_list and not cc_list:
                logger.error(
                    "No recipients found for escalation #%s — no managers or supervisors have emails set",
                    escalation.id,
                )
                return False

            # If somehow no managers exist, promote CC to To
            if not to_list:
                to_list = cc_list
                cc_list = []

            logger.info(
                "Sending escalation #%s email → managers: %s | supervisors (CC): %s",
                escalation.id, to_list, cc_list,
            )

            # ── Build and send email ───────────────────────
            msg = self._build_message(escalation, issue, to_list, cc_list)
            self._send(msg, to_list + cc_list)

            # ── Mark sent ─────────────────────────────────
            escalation.notification_sent    = True
            escalation.notification_sent_at = datetime.now(timezone.utc)
            self.db.commit()

            logger.info(
                "Escalation email sent — escalation #%s issue #%s | to=%s cc=%s",
                escalation.id, issue.id, to_list, cc_list,
            )
            return True

        except Exception:
            logger.exception(
                "Escalation email failed — escalation #%s issue #%s",
                escalation.id, escalation.issue_id,
            )
            return False

    # ══════════════════════════════════════════════════════
    # PRIVATE — RECIPIENT QUERIES
    # ══════════════════════════════════════════════════════

    def _get_all_manager_emails(self) -> List[str]:
        """Returns emails of every active MANAGER in the system."""
        rows = self.db.execute(
            select(User.email)
            .where(
                User.role == UserRole.MANAGER,
                User.is_active == True,
                User.email.isnot(None),
            )
        ).scalars().all()

        emails = [e for e in rows if e and e.strip()]

        if not emails:
            logger.warning("No managers with email found in the system")

        return emails

    def _get_site_supervisor_emails(self, site_id: int) -> List[str]:
        """
        Returns emails of all active supervisors assigned to this site.
        SupervisorSite is a plain Table (not a model), so we join manually.
        Column is supervisor_id (not user_id).
        """
        rows = self.db.execute(
            select(User.email)
            .join(SupervisorSite, SupervisorSite.c.supervisor_id == User.id)
            .where(
                SupervisorSite.c.site_id == site_id,
                SupervisorSite.c.is_active == True,
                User.role == UserRole.SUPERVISOR,
                User.is_active == True,
                User.email.isnot(None),
            )
        ).scalars().all()

        emails = [e for e in rows if e and e.strip()]

        if not emails:
            logger.warning("No supervisors with email found for site #%s", site_id)

        return emails

    # ══════════════════════════════════════════════════════
    # PRIVATE — EMAIL BUILD
    # ══════════════════════════════════════════════════════

    def _build_message(
        self,
        escalation: Escalation,
        issue,
        to_list: List[str],
        cc_list: List[str],
    ) -> MIMEMultipart:

        msg = MIMEMultipart("alternative")
        msg["From"]    = settings.EMAIL_FROM
        msg["To"]      = ", ".join(to_list)
        msg["Subject"] = (
            f"⚠️ ESCALATION — Issue #{issue.id} | "
            f"{issue.priority.value.upper()} Priority | {issue.title}"
        )
        if cc_list:
            msg["Cc"] = ", ".join(cc_list)

        msg.attach(MIMEText(self._build_body(escalation, issue), "html"))
        return msg

    @staticmethod
    def _build_body(escalation: Escalation, issue) -> str:
        site_name   = issue.site.name if issue and issue.site else "Unknown Site"
        solver_name = (
            escalation.assignment.assigned_solver.name
            if escalation.assignment and escalation.assignment.assigned_solver
            else "Unknown"
        )
        missed      = escalation.total_missed_calls or 0
        timestamp   = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        color = {
            "critical": "#dc2626",
            "high":     "#ea580c",
            "medium":   "#ca8a04",
            "low":      "#16a34a",
        }.get(issue.priority.value.lower(), "#6b7280")

        return f"""
        <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">

          <div style="background:{color};padding:16px;border-radius:8px 8px 0 0;">
            <h2 style="color:white;margin:0;">⚠️ Escalation Alert</h2>
            <p style="color:white;margin:4px 0 0;opacity:.9;">Immediate action required</p>
          </div>

          <div style="border:1px solid #e5e7eb;padding:24px;border-radius:0 0 8px 8px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px;color:#6b7280;width:35%;">Issue</td>
                <td style="padding:8px;font-weight:bold;">#{issue.id} — {issue.title}</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:8px;color:#6b7280;">Site</td>
                <td style="padding:8px;">{site_name}</td>
              </tr>
              <tr>
                <td style="padding:8px;color:#6b7280;">Priority</td>
                <td style="padding:8px;">
                  <span style="background:{color};color:white;padding:2px 10px;
                               border-radius:12px;font-size:12px;">
                    {issue.priority.value.upper()}
                  </span>
                </td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:8px;color:#6b7280;">Assigned Solver</td>
                <td style="padding:8px;">{solver_name}</td>
              </tr>
              <tr>
                <td style="padding:8px;color:#6b7280;">Missed Calls</td>
                <td style="padding:8px;color:#dc2626;font-weight:bold;">{missed}</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:8px;color:#6b7280;">Reason</td>
                <td style="padding:8px;">{escalation.reason}</td>
              </tr>
              <tr>
                <td style="padding:8px;color:#6b7280;">Escalated To</td>
                <td style="padding:8px;">{escalation.escalated_to_role}</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:8px;color:#6b7280;">Time</td>
                <td style="padding:8px;">{timestamp}</td>
              </tr>
            </table>

            <div style="margin-top:20px;padding:14px;background:#fef2f2;
                        border-left:4px solid #dc2626;border-radius:4px;">
              <p style="margin:0;color:#991b1b;font-weight:bold;">
                Please reassign the issue or contact the solver directly.
              </p>
            </div>
          </div>

        </body></html>
        """

    # ══════════════════════════════════════════════════════
    # PRIVATE — SMTP SEND
    # ══════════════════════════════════════════════════════

    @staticmethod
    def _send(msg: MIMEMultipart, all_recipients: List[str]) -> None:
        """
        Port 465 → SMTP_SSL
        Port 587 → SMTP + STARTTLS  (Gmail, Outlook, most providers)
        """
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM, all_recipients, msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM, all_recipients, msg.as_string())