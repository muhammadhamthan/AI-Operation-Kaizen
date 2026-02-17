from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class ProblemSolverSkill(Base):
    __tablename__ = "problem_solver_skills"
    
    id = Column(Integer, primary_key=True, index=True)
    solver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_type = Column(String(50), nullable=False)  # Electrical, Plumbing, HVAC, etc.
    proficiency_level = Column(String(20), default="intermediate")  # beginner, intermediate, expert
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    solver = relationship("User", back_populates="skills")
