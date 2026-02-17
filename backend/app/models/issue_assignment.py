from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..core.database import Base

class AssignmentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    REASSIGNED = "REASSIGNED"

class IssueAssignment(Base):
    __tablename__ = "issue_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    assigned_to_solver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.ACTIVE)
    due_date = Column(DateTime)
    notes = Column(String(500))
    assigned_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    issue = relationship("Issue", back_populates="assignment")
    assigned_to = relationship("User", back_populates="assignments", foreign_keys=[assigned_to_solver_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_user_id])
