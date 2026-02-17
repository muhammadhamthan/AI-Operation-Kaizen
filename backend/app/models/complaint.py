from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..core.database import Base

class ComplaintStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"

class Complaint(Base):
    __tablename__ = "complaints"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    raised_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_solver_id = Column(Integer, ForeignKey("users.id"))
    complaint_details = Column(Text, nullable=False)
    complaint_image_url = Column(String(500))
    status = Column(Enum(ComplaintStatus), default=ComplaintStatus.OPEN)
    resolution_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)
    
    # Relationships
    issue = relationship("Issue", back_populates="complaints")
    raised_by = relationship("User", foreign_keys=[raised_by_user_id])
    target_solver = relationship("User", foreign_keys=[target_solver_id])
