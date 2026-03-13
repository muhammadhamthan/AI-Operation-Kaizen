"""
Table: supervisor_sites
Junction table — one supervisor can manage many sites.
Composite primary key, no timestamps as per requirements.
"""

from sqlalchemy import (
    Table, Column, Integer, Boolean, ForeignKey, MetaData,
)

from app.db.base import Base

# Define as a pure Table object for use with many-to-many relationships
SupervisorSite = Table(
    "supervisor_sites",
    Base.metadata,
    Column(
        "supervisor_id",
        Integer,
        ForeignKey("users.id"),
        primary_key=True
    ),
    Column(
        "site_id",
        Integer,
        ForeignKey("sites.id"),
        primary_key=True
    ),
    Column(
        "is_active",
        Boolean,
        default=True
    )
)
