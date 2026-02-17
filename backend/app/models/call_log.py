from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..core.database import Base

class CallStatus(str, enum.Enum):
    INITIATED = "INITIATED"
    RINGING = "RINGING"
    ANSWERED = "ANSWERED"
    NO_ANSWER = "NO_ANSWER"
    BUSY = "BUSY"
    FAILED = "FAILED"

class CallLog(Base):
    __tablename__ = "call_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    solver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    attempt_number = Column(Integer, default=1)
    status = Column(Enum(CallStatus), default=CallStatus.INITIATED)
    duration_seconds = Column(Integer, default=0)
    exotel_call_sid = Column(String(100))
    initiated_at = Column(DateTime, default=datetime.utcnow)
    answered_at = Column(DateTime)
    ended_at = Column(DateTime)
    
    # Relationships
    issue = relationship("Issue", back_populates="call_logs")
    solver = relationship("User")
