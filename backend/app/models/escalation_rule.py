from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from ..core.database import Base

class EscalationRule(Base):
    __tablename__ = "escalation_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_type = Column(String(50), nullable=False)
    priority = Column(String(20), nullable=False)
    max_response_hours = Column(Integer, nullable=False)
    escalation_after_hours = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
