"""
PURPOSE: Assignment response schemas — INTERNAL + READ ONLY.
─────────────────────────────────────────────────────────────
Assignments are NEVER created by user action directly.
They are created AUTOMATICALLY by the backend when:
  1. Chatbot creates an issue → auto-matching algorithm runs
  2. Manager types "reassign issue 7 to Suresh" in chat → backend creates new assignment

SolverMatchResult is used INTERNALLY by assignment_service
to return the result of the smart matching algorithm.

AssignmentResponse is used to:
  - Show assignment info inside ChatResponse.data
  - Display in solver's dashboard
  - Nested inside IssueDetailResponse

USED BY:
  - assignment_service.py → SolverMatchResult (internal matching output)
  - chatbot_service.py → AssignmentResponse (chat responses)
  - dashboard_service.py → AssignmentResponse (dashboard data)
  - GET /api/v1/assignments → AssignmentListResponse (read-only)
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.core.enums import AssignmentStatus


# ══════════════════════════════════════════════════════════
# INTERNAL: Solver matching result — NOT exposed to users
# ══════════════════════════════════════════════════════════

class SolverMatchResult(BaseModel):
    """
    INTERNAL SCHEMA — returned by the smart matching algorithm (Stage 2).
    
    When chatbot_service creates an issue, it calls
    assignment_service.auto_assign_solver() which:
      1. Queries problem_solver_skills for matching skill_type
      2. Filters by site_id OR NULL (works all sites)
      3. Filters by is_available = TRUE
      4. Sorts by exact site match → priority DESC
      5. Picks solver with lowest current workload
      6. Returns this result
    
    This is then used to create the IssueAssignment record
    and format the chat response to the supervisor.
    """
    solver_id: int = Field(
        ..., description="ID of the matched problem solver",
    )
    solver_name: str = Field(
        ..., description="Name for the chat response message",
    )
    solver_phone: str = Field(
        ..., description="Phone number for Twilio calling",
    )
    skill_type: str = Field(
        ..., description="Matched skill (e.g., plumber)",
    )
    site_match: bool = Field(
        ..., description="True if solver is assigned to exact site",
    )
    priority_score: int = Field(
        ..., description="Solver priority score (1-10 from problem_solver_skills)",
    )
    current_workload: int = Field(
        ..., description="Number of currently active assignments",
    )
    match_reason: str = Field(
        ...,
        description="Explanation of why this solver was selected",
        examples=["Exact site match with highest priority and lowest workload"],
    )


# ══════════════════════════════════════════════════════════
# RESPONSE: Assignment data — for chat and dashboard display
# ══════════════════════════════════════════════════════════

class AssignmentResponse(BaseModel):
    """
    Assignment details — shown in chat responses and dashboards.
    
    When solver asks "what is my current assignment?" in chat,
    the chatbot returns this data inside ChatResponse.data
    
    When supervisor asks "who is assigned to issue 5?",
    this data is included in the response.
    """
    id: int
    issue_id: int
    issue_title: Optional[str] = Field(
        None, description="Issue title for display",
    )
    assigned_to_solver_id: int
    solver_name: Optional[str] = None
    solver_phone: Optional[str] = None
    assigned_by_supervisor_id: int
    supervisor_name: Optional[str] = None
    due_date: Optional[datetime] = None
    status: AssignmentStatus
    call_attempts: Optional[int] = Field(
        None, description="Total Twilio call attempts",
    )
    last_call_status: Optional[str] = Field(
        None, description="Status of most recent call attempt",
    )
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssignmentListResponse(BaseModel):
    """Paginated assignment list for dashboard and chat queries."""
    total: int
    assignments: List[AssignmentResponse]