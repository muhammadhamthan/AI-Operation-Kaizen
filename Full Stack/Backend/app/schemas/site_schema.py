"""
PURPOSE: Site management — admin only endpoints.
─────────────────────────────────────────────────
Sites are referenced during AI extraction when matching
the location name mentioned in supervisor's chat message.

Example: Supervisor types "pipe broken in vepery site"
  → AI extracts location = "vepery"
  → System fuzzy-matches to Site(name="Vepery Site", id=1)

USED BY:
  POST   /api/v1/sites         → SiteCreate (admin)
  PUT    /api/v1/sites/{id}    → SiteUpdate (admin)
  GET    /api/v1/sites         → SiteListResponse
  POST   /api/v1/sites/assign  → SupervisorSiteAssign (admin)
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class SiteCreate(BaseModel):
    """Creates a new facility site with GPS coordinates."""
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Site identification name",
        examples=["Vepery Site"],
    )
    location: Optional[str] = Field(
        None,
        max_length=200,
        description="Human-readable address",
        examples=["Vepery, Chennai"],
    )
    latitude: Optional[Decimal] = Field(None, examples=[13.083944])
    longitude: Optional[Decimal] = Field(None, examples=[80.270014])

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and (v < -90 or v > 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and (v < -180 or v > 180):
            raise ValueError("Longitude must be between -180 and 180")
        return v


class SiteUpdate(BaseModel):
    """Partial update for existing site."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    location: Optional[str] = Field(None, max_length=200)
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None


class SupervisorSiteAssign(BaseModel):
    """Admin links a supervisor to one or more sites."""
    supervisor_id: int = Field(..., description="User ID of supervisor", examples=[1])
    site_ids: List[int] = Field(
        ..., min_length=1,
        description="List of site IDs to assign",
        examples=[[1, 5, 10]],
    )


class SiteResponse(BaseModel):
    id: int
    name: str
    location: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SiteListResponse(BaseModel):
    total: int
    sites: List[SiteResponse]