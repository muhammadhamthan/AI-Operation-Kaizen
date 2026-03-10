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


# ══════════════════════���═══════════════════════════════════
# CRUD ENDPOINTS (existing — unchanged)
# ══════════════════════════════════════════════════════════

@router.get("", response_model=SiteListResponse, summary="List all sites")
async def list_sites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Site).order_by(Site.id))
    sites = result.scalars().all()
    return SiteListResponse(
        total=len(sites),
        sites=[SiteResponse.model_validate(s) for s in sites],
    )


# @router.post(
#     "",
#     response_model=SiteResponse,
#     status_code=status.HTTP_201_CREATED,
#     summary="Create new site (manager only)",
# )
# async def create_site(
#     site_data: SiteCreate,
#     db: AsyncSession = Depends(get_db),
#     current_user: User = Depends(require_role([UserRole.MANAGER])),
# ):
#     site = Site(
#         name=site_data.name,
#         location=site_data.location,
#         latitude=site_data.latitude,
#         longitude=site_data.longitude,
#     )
#     db.add(site)
#     await db.flush()
#     await db.refresh(site)
#     return site


@router.post("/assign", summary="Assign supervisor to sites (manager only)")
async def assign_supervisor_sites(
    data: SupervisorSiteAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER])),
):
    result = await db.execute(
        select(User).where(User.id == data.supervisor_id, User.role == UserRole.SUPERVISOR)
    )
    supervisor = result.scalar_one_or_none()
    if not supervisor:
        raise HTTPException(404, f"Supervisor {data.supervisor_id} not found")

    for site_id in data.site_ids:
        result = await db.execute(select(Site).where(Site.id == site_id))
        if not result.scalar_one_or_none():
            raise HTTPException(404, f"Site {site_id} not found")

    await db.execute(
        SupervisorSite.delete().where(SupervisorSite.c.supervisor_id == data.supervisor_id)
    )
    for site_id in data.site_ids:
        await db.execute(SupervisorSite.insert().values(supervisor_id=data.supervisor_id, site_id=site_id))

    return {
        "message": f"Supervisor {supervisor.name} assigned to {len(data.site_ids)} sites",
        "supervisor_id": data.supervisor_id,
        "site_ids": data.site_ids,
    }