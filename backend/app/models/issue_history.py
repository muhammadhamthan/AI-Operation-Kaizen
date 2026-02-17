from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class IssueHistory(Base):
    __tablename__ = "issue_history"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action_type = Column(String(50), nullable=False)  # CREATED, STATUS_CHANGED, ASSIGNED, ESCALATED, etc.
    old_value = Column(String(100))
    new_value = Column(String(100))
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    issue = relationship("Issue", back_populates="history")
    changed_by = relationship("User")
