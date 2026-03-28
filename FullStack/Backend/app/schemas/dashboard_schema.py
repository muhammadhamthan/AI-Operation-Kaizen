"""
PURPOSE: Role-based dashboard data — READ ONLY aggregation.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ══════════════════════════════════════════════════════════
# SHARED
# ══════════════════════════════════════════════════════════

class DashboardSummary(BaseModel):
    total_issues: int = Field(default=0)
    open_issues: int = Field(default=0)
    assigned_issues: int = Field(default=0)
    in_progress_issues: int = Field(default=0)
    resolved_pending_review: int = Field(default=0)
    completed_issues: int = Field(default=0)
    reopened_issues: int = Field(default=0)
    escalated_issues: int = Field(default=0)


# ══════════════════════════════════════════════════════════
# SUPERVISOR DASHBOARD
# ══════════════════════════════════════════════════════════

class RecentIssue(BaseModel):
    id: int
    title: str
    status: str
    priority: str
    site_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SupervisorDashboard(BaseModel):
    summary: DashboardSummary
    pending_reviews: int = Field(default=0)
    my_sites: List[str] = Field(default_factory=list)
    recent_issues: List[RecentIssue] = Field(default_factory=list)
    active_escalations: int = Field(default=0)
    issues_approaching_deadline: int = Field(default=0)


# ══════════════════════════════════════════════════════════
# MANAGER DASHBOARD
# ══════════════════════════════════════════════════════════

class SolverPerformance(BaseModel):
    solver_id: int
    solver_name: str
    total_assignments: int = Field(default=0)
    completed: int = Field(default=0)
    reopened: int = Field(default=0)
    avg_response_time_hours: Optional[float] = None
    complaints_count: int = Field(default=0)


class ManagerDashboard(BaseModel):
    summary: DashboardSummary
    active_escalations: int = Field(default=0)
    unresolved_escalations: List[Dict[str, Any]] = Field(default_factory=list)
    overdue_issues: int = Field(default=0)
    solver_performance: List[SolverPerformance] = Field(default_factory=list)
    issues_by_site: Dict[str, int] = Field(default_factory=dict)
    issues_by_priority: Dict[str, int] = Field(default_factory=dict)


# ══════════════════════════════════════════════════════════
# SOLVER DASHBOARD — THIS WAS MISSING
# ══════════════════════════════════════════════════════════

class SolverAssignment(BaseModel):
    assignment_id: int
    issue_id: int
    issue_title: str
    site_name: Optional[str] = None
    site_location: Optional[str] = None
    priority: str
    due_date: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SolverDashboard(BaseModel):
    """
    Solver sees:
      - Active assignments with details
      - Completed count
      - Complaints against them
    """
    active_assignments: List[SolverAssignment] = Field(default_factory=list)
    total_active: int = Field(default=0)
    total_completed: int = Field(default=0)
    complaints_against: int = Field(default=0)