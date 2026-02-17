from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..core.database import Base

class IssueStatus(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED_PENDING_REVIEW = "RESOLVED_PENDING_REVIEW"
    COMPLETED = "COMPLETED"
    REOPENED = "REOPENED"
    ESCALATED = "ESCALATED"

class IssuePriority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"

class Issue(Base):
    __tablename__ = "issues"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    issue_type = Column(String(50))  # Electrical, Plumbing, Safety, etc.
    priority = Column(Enum(IssuePriority), default=IssuePriority.medium)
    status = Column(Enum(IssueStatus), default=IssueStatus.OPEN)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    raised_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    deadline_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    site = relationship("Site", back_populates="issues")
    raised_by = relationship("User", back_populates="raised_issues", foreign_keys=[raised_by_user_id])
    assignment = relationship("IssueAssignment", back_populates="issue", uselist=False)
    call_logs = relationship("CallLog", back_populates="issue")
    images = relationship("IssueImage", back_populates="issue")
    complaints = relationship("Complaint", back_populates="issue")
    history = relationship("IssueHistory", back_populates="issue")
