from sqlalchemy import Column, Integer, String, DateTime, Enum, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..core.database import Base

class ImageType(str, enum.Enum):
    BEFORE = "BEFORE"
    AFTER = "AFTER"

class AIFlag(str, enum.Enum):
    NOT_CHECKED = "NOT_CHECKED"
    OK = "OK"
    MISMATCH = "MISMATCH"
    UNCLEAR = "UNCLEAR"

class IssueImage(Base):
    __tablename__ = "issue_images"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500))
    image_type = Column(Enum(ImageType), nullable=False)
    ai_flag = Column(Enum(AIFlag), default=AIFlag.NOT_CHECKED)
    ai_confidence_score = Column(Float)
    latitude = Column(Float)
    longitude = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    issue = relationship("Issue", back_populates="images")
    uploaded_by = relationship("User")
