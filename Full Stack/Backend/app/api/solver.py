"""
PURPOSE: Solver performance endpoints.
Replaces frontend performanceSlice.js + scoreEngine.js
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.solver_performance_service import SolverPerformanceService
from app.schemas.solver_performance_schema import (
    SolverPerformanceListResponse,
    SolverWithPerformance,
)

router = APIRouter()


@router.get(
    "",
    response_model=SolverPerformanceListResponse,
    summary="Get all solvers with performance scores (role-filtered)",
)
async def get_solvers_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Replaces frontend fetchSolversPerformance thunk.
    Returns solvers visible to this user + computed performance scores.
    Includes XGBoost predictions if models are trained.
    """
    service = SolverPerformanceService(db)
    result = await service.get_solvers_with_performance(current_user)
    return result


@router.get(
    "/{solver_id}",
    response_model=SolverWithPerformance,
    summary="Get single solver performance detail",
)
async def get_solver_detail(
    solver_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Replaces frontend solver-profile screen's data computation.
    Returns solver + full performance + ML predictions.
    """
    service = SolverPerformanceService(db)
    result = await service.get_solver_performance(solver_id)

    if not result:
        raise HTTPException(status_code=404, detail=f"Solver {solver_id} not found")

    return result