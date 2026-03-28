"""
PURPOSE: Complaint response schemas — READ ONLY.
──────────────────────────────────────────────────
Complaints are NEVER created through a form or direct API call.
They are ONLY created when the chatbot detects a complaint intent
from the supervisor's free text message.

Example chat flow:
  Supervisor: "work not done properly, leak still visible"
  → AI detects intent: raise_complaint
  → chatbot_service finds the issue and active assignment
  → Creates complaint record
  → Updates issue → REOPENED
  → Updates assignment → REOPENED
  → Initiates new Twilio call to solver
  → Logs SYSTEM message in chat_history
  → Returns: "Complaint filed. Issue reopened. Calling solver."

These response schemas are used to:
  - Format complaint data in ChatResponse
  - Display complaint history in dashboards
  - Read-only retrieval

USED BY:
  - chatbot_service.py → ComplaintResponse (embedded in chat response)
  - dashboard_service.py → ComplaintResponse (solver performance data)
  - GET /api/v1/complaints → ComplaintListResponse (read-only, admin/manager)
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ComplaintResponse(BaseModel):
    """
    Complaint record — created via chat, read via API.
    
    Shown when:
      - Supervisor asks "show complaints for issue 5" in chat
      - Manager views solver performance dashboard
      - Issue detail view shows complaint history
    """
    id: int
    issue_id: int
    issue_title: Optional[str] = Field(
        None, description="Issue title for display",
    )
    assignment_id: int
    raised_by_supervisor_id: int
    supervisor_name: Optional[str] = None
    target_solver_id: int
    solver_name: Optional[str] = None
    complaint_details: str = Field(
        ..., description="Description extracted from supervisor's chat message",
    )
    complaint_image_url: Optional[str] = Field(
        None,
        description="Evidence photo URL if supervisor included one in chat",
    )
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ComplaintListResponse(BaseModel):
    """Paginated complaint list for dashboard and read-only views."""
    total: int
    complaints: List[ComplaintResponse]