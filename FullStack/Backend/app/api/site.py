"""
PURPOSE: Site management + analytics endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db, get_current_user, require_role
from app.models.user import User
from app.models.site import Site
from app.models.supervisor_site import SupervisorSite
from app.core.enums import UserRole
from app.services.site_analytics_service import SiteAnalyticsService
from app.schemas.site_schema import (
    SiteCreate,
    SiteResponse,
    SiteListResponse,
    SupervisorSiteAssign,
)
from app.schemas.site_analytics_schema import (
    SiteAnalyticsListResponse,
    SiteWithAnalytics,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════
# ANALYTICS ENDPOINTS (what frontend actually needs)
# ══════════════════════════════════════════════════════════

@router.get(
    "/analytics",
    response_model=SiteAnalyticsListResponse,
    summary="Get all sites with computed analytics (role-filtered)",
)
async def get_sites_with_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Replaces frontend fetchSitesWithAnalytics thunk.
    Returns sites visible to this user + health score, issue counts, solvers.
    Includes XGBoost predictions if models are trained.
    """
    service = SiteAnalyticsService(db)
    return await service.get_sites_with_analytics(current_user)


@router.get(
    "/analytics/{site_id}",
    response_model=SiteWithAnalytics,
    summary="Get single site with full analytics",
)
async def get_site_analytics(
    site_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Replaces frontend site-detail screen's data computation.
    Returns site + analytics + ML predictions.
    """
    service = SiteAnalyticsService(db)
    result = await service.get_site_analytics(site_id)

    if not result:
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found")

    return result