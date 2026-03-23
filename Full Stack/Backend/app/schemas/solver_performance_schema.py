"""
PURPOSE: Solver performance response schemas.
Replaces frontend's scoreEngine.js — now computed on backend.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SolverPerformanceDetail(BaseModel):
    """Complete solver performance — replaces frontend calculateSolverScore()."""
    solver_id: int
    score: int = Field(default=0, ge=0, le=100)
    label: str = Field(default="Evaluating", description="Top Performer | Good | Needs Attention")
    label_color: str = Field(default="#f59e0b")

    # Assignment counts
    total_assigned: int = 0
    completed_count: int = 0
    active_count: int = 0
    in_progress_count: int = 0
    assigned_not_started_count: int = 0
    reopened_count: int = 0
    escalated_count: int = 0
    overdue_count: int = 0

    # Rates (0-100)
    completion_rate: int = 0
    on_time_rate: int = 0
    call_answer_rate: int = 0

    # Call stats
    total_calls: int = 0
    answered_calls: int = 0
    missed_calls: int = 0

    # Complaint stats
    complaint_count: int = 0

    # ML predictions (XGBoost)
    predicted_completion_days: Optional[float] = Field(
        None, description="XGBoost: predicted avg days to complete next issue"
    )
    escalation_probability: Optional[float] = Field(
        None, description="XGBoost: probability solver's next issue escalates (0-1)"
    )


class SolverWithPerformance(BaseModel):
    """Solver user info + performance metrics."""
    id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None
    role: str
    is_active: bool
    performance: SolverPerformanceDetail
    sites: List[str] = Field(default_factory=list, description="Site names solver works at")
    skills: List[str] = Field(default_factory=list, description="Skill types")

    model_config = {"from_attributes": True}


class SolverPerformanceListResponse(BaseModel):
    total: int
    solvers: List[SolverWithPerformance]