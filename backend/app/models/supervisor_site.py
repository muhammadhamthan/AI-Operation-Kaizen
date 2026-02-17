from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class SupervisorSite(Base):
    __tablename__ = "supervisor_sites"
    
    id = Column(Integer, primary_key=True, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    supervisor = relationship("User", back_populates="supervised_sites")
    site = relationship("Site", back_populates="supervisor_sites")
