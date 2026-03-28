"""
PURPOSE: Escalation rule configuration + escalation event tracking.
──────────────────────────────────────────────────────────────────
Escalation RULES are configured by admin through a setup endpoint.
Escalation EVENTS are created automatically by the system when:
  1. Solver doesn't answer calls → NO_RESPONSE (Stage 4)
  2. Issue approaches deadline → DEADLINE_APPROACHING (Stage 7)

Users see escalation info through:
  - Chat: "show me escalated issues" → queries escalation data
  - Dashboard: active escalation count and details
  - Email: automatic SMTP alerts sent to managers/supervisors

USED BY:
  - POST /api/v1/escalation-rules → EscalationRuleCreate (admin config)
  - GET  /api/v1/escalation-rules → List[EscalationRuleResponse] (admin read)
  - GET  /api/v1/escalations → EscalationListResponse (read-only)
  - chatbot_service.py → query_escalations intent handler
  - call_service.py → creates Escalation records internally
  - workers/escalation.py → creates deadline Escalation records
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from app.core.enums import Priority


# ══════════════════════════════════════════════════════════
# REQUEST: Admin configures escalation rules
# ══════════════════════════════════════════════════════════

class EscalationRuleCreate(BaseModel):
    """
    Admin defines thresholds per priority level.
    This is one of the FEW traditional form endpoints
    because escalation rules are system configuration, not user interaction.
    
    Example rules:
      high:   escalate to manager after 3 missed calls OR 2 minutes
      medium: escalate to supervisor after 2 missed calls OR 1 hour
      low:    escalate to manager after 5 missed calls OR 4 hours
    """
    priority: Priority = Field(
        ...,
        description="Which priority level this rule applies to",
        examples=["high"],
    )
    max_call_attempts: int = Field(
        ...,
        ge=1, le=20,
        description="Number of missed calls before escalation triggers",
        examples=[3],
    )
    max_time_without_response_minutes: int = Field(
        ...,
        ge=1,
        description="Minutes without solver response before escalation",
        examples=[120],
    )
    escalate_to_role: str = Field(
        ...,
        description="Who to notify: manager | supervisor | admin",
        examples=["manager"],
    )

    @property
    def max_time_as_interval(self) -> timedelta:
        """Convert minutes to timedelta for PostgreSQL INTERVAL storage."""
        return timedelta(minutes=self.max_time_without_response_minutes)


# ══════════════════════════════════════════════════════════
# RESPONSE: Escalation rule configuration
# ══════════════════════════════════════════════════════════

class EscalationRuleResponse(BaseModel):
    """Escalation rule — admin view."""
    id: int
    priority: Priority
    max_call_attempts: int
    max_time_without_response: Optional[str] = Field(
        None,
        description="PostgreSQL INTERVAL as string (e.g., '02:00:00')",
    )
    escalate_to_role: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════
# RESPONSE: Escalation event record
# ══════════════════════════════════════════════════════════

class EscalationResponse(BaseModel):
    """
    Record of an escalation event that occurred.
    
    Created automatically when:
      - NO_RESPONSE: solver didn't answer calls (Stage 4)
      - DEADLINE_APPROACHING: issue near deadline (Stage 7)
    
    Shown when manager asks "show escalated issues" in chat.
    Also displayed in manager dashboard.
    """
    id: int
    issue_id: int
    issue_title: Optional[str] = None
    site_name: Optional[str] = None
    assignment_id: Optional[int] = None
    solver_name: Optional[str] = Field(
        None,
        description="Solver who didn't respond (for NO_RESPONSE type)",
    )
    escalation_type: str = Field(
        ...,
        description="NO_RESPONSE | DEADLINE_APPROACHING | MANUAL",
    )
    escalated_to_role: str = Field(
        ...,
        description="Who was notified: manager | supervisor | admin",
    )
    escalated_by_user_id: Optional[int] = None
    reason: str = Field(
        ...,
        description="Human-readable explanation of why escalation occurred",
    )
    total_missed_calls: Optional[int] = None
    time_elapsed_without_response: Optional[str] = Field(
        None,
        description="Time since first call (for NO_RESPONSE)",
    )
    notification_sent: bool = Field(
        ...,
        description="Whether email alerts have been dispatched",
    )
    notification_sent_at: Optional[datetime] = None
    resolved: bool = Field(
        ...,
        description="Whether the escalation has been addressed",
    )
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EscalationListResponse(BaseModel):
    """
    Paginated escalation list.
    Used by manager dashboard and "show escalated issues" chat query.
    """
    total: int
    escalations: List[EscalationResponse]