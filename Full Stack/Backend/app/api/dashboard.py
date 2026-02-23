"""
PURPOSE: Role-based dashboard — READ ONLY aggregation.
────────────────────────────────────────────────────────
Returns different data based on user role.
Single endpoint that adapts to who is calling.

ENDPOINT:
  GET /api/v1/dashboard → Supervisor/Manager/Solver dashboard
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.dashboard_service import DashboardService
from app.core.enums import UserRole

router = APIRouter()


@router.get(
    "",
    summary="Get role-based dashboard data",
)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns different dashboard based on role:
      Supervisor → their sites' issues, pending reviews, escalations
      Manager → system-wide stats, solver performance, escalations
      Solver → active assignments, deadlines, completed count
    """
    service = DashboardService(db)

    if current_user.role == UserRole.SUPERVISOR:
        return service.get_supervisor_dashboard(current_user)
    elif current_user.role == UserRole.MANAGER:
        return service.get_manager_dashboard(current_user)
    elif current_user.role == UserRole.PROBLEMSOLVER:
        return service.get_solver_dashboard(current_user)
    else:
        return service.get_supervisor_dashboard(current_user)