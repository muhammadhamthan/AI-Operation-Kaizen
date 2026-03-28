"""
PURPOSE: Site analytics response schemas.
Replaces frontend's computeSiteAnalytics() — now computed on backend.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SiteSolverBrief(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    avatar: Optional[str] = None
    active_assignments: int = 0


class SiteAnalytics(BaseModel):
    """Computed analytics for a single site."""
    total_issues: int = 0
    open_issues: int = 0
    assigned_issues: int = 0
    in_progress_issues: int = 0
    resolved_pending_review: int = 0
    completed_issues: int = 0
    escalated_issues: int = 0
    reopened_issues: int = 0
    overdue_count: int = 0
    complaints_count: int = 0
    score: int = Field(default=100, ge=0, le=100)
    health: str = Field(default="Healthy", description="Healthy | Needs Attention | Critical")
    solvers: List[SiteSolverBrief] = Field(default_factory=list)

    # ML predictions (powered by XGBoost)
    predicted_issues_next_week: Optional[int] = Field(
        None, description="XGBoost: predicted new issues in next 7 days"
    )
    escalation_risk: Optional[str] = Field(
        None, description="XGBoost: LOW | MEDIUM | HIGH risk of escalation"
    )


class SiteWithAnalytics(BaseModel):
    """Site + computed analytics — replaces frontend enrichment."""
    id: int
    name: str
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    analytics: SiteAnalytics
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SiteAnalyticsListResponse(BaseModel):
    total: int
    sites: List[SiteWithAnalytics]