"""
PURPOSE: Email + notification handling.
────────────────────────────────────────
Based on your existing email code.
"""

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.escalation import Escalation
from app.schemas.notification_schema import NotificationResponse

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def send_escalation_email(self, escalation: Escalation) -> bool:
        """Sends email when escalation occurs."""
        try:
            issue = escalation.issue

            msg = MIMEMultipart()
            msg['From'] = settings.SMTP_SENDER_EMAIL
            msg['To'] = settings.SMTP_RECIPIENT_EMAIL
            msg['Subject'] = f"⚠️ ESCALATION: Issue #{issue.id} — {issue.title}"

            body = f"""
            <html><body>
            <h2>Escalation Alert</h2>
            <p><b>Issue #{issue.id}:</b> {issue.title}</p>
            <p><b>Type:</b> {escalation.escalation_type}</p>
            <p><b>Reason:</b> {escalation.reason}</p>
            <p><b>Priority:</b> {issue.priority.value}</p>
            <p><b>Time:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
            <p style="color:red;"><b>Action Required!</b></p>
            </body></html>
            """

            msg.attach(MIMEText(body, 'html'))

            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_SENDER_EMAIL, settings.SMTP_RECIPIENT_EMAIL, msg.as_string())

            escalation.notification_sent = True
            escalation.notification_sent_at = datetime.now()
            self.db.commit()

            logger.info(f"Escalation email sent for issue #{issue.id}")
            return True

        except Exception as e:
            logger.error(f"Email failed: {e}")
            return False

    def get_user_notifications(self, user_id: int, skip=0, limit=20) -> List[NotificationResponse]:
        """Placeholder for in-app notifications."""
        return []