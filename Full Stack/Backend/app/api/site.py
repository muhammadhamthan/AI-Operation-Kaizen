"""
PURPOSE: Site management — admin/manager endpoints.
────────────────────────────────────────────────────
ENDPOINTS:
  GET    /api/v1/sites          → List all sites
  POST   /api/v1/sites          → Create site (manager only)
  POST   /api/v1/sites/assign   → Assign supervisor to sites (manager only)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db, get_current_user, require_role
from app.models.user import User
from app.models.site import Site
from app.models.supervisor_site import supervisor_sites
from app.core.enums import UserRole
from app.schemas.site_schema import (
    SiteCreate,
    SiteResponse,
    SiteListResponse,
    SupervisorSiteAssign,
)

router = APIRouter()


@router.get("", response_model=SiteListResponse, summary="List all sites")
def list_sites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sites = db.query(Site).order_by(Site.id).all()
    return SiteListResponse(
        total=len(sites),
        sites=[SiteResponse.model_validate(s) for s in sites],
    )


@router.post(
    "",
    response_model=SiteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new site (manager only)",
)
def create_site(
    site_data: SiteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER])),
):
    site = Site(
        name=site_data.name,
        location=site_data.location,
        latitude=site_data.latitude,
        longitude=site_data.longitude,
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.post(
    "/assign",
    summary="Assign supervisor to sites (manager only)",
)
def assign_supervisor_sites(
    data: SupervisorSiteAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER])),
):
    # Validate supervisor exists
    supervisor = db.query(User).filter(
        User.id == data.supervisor_id,
        User.role == UserRole.SUPERVISOR,
    ).first()

    if not supervisor:
        raise HTTPException(404, f"Supervisor {data.supervisor_id} not found")

    # Validate all sites exist
    for site_id in data.site_ids:
        site = db.query(Site).filter(Site.id == site_id).first()
        if not site:
            raise HTTPException(404, f"Site {site_id} not found")

    # Clear existing and re-assign
    db.execute(
        supervisor_sites.delete().where(
            supervisor_sites.c.supervisor_id == data.supervisor_id
        )
    )

    for site_id in data.site_ids:
        db.execute(
            supervisor_sites.insert().values(
                supervisor_id=data.supervisor_id,
                site_id=site_id,
            )
        )

    db.commit()

    return {
        "message": f"Supervisor {supervisor.name} assigned to {len(data.site_ids)} sites",
        "supervisor_id": data.supervisor_id,
        "site_ids": data.site_ids,
    }