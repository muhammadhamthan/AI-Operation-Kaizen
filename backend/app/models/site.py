from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class Site(Base):
    __tablename__ = "sites"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    address = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    supervisor_sites = relationship("SupervisorSite", back_populates="site")
    issues = relationship("Issue", back_populates="site")
