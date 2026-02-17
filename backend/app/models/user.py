from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..core.database import Base

class UserRole(str, enum.Enum):
    manager = "manager"
    supervisor = "supervisor"
    problem_solver = "problem_solver"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20))
    role = Column(Enum(UserRole), nullable=False)
    avatar_url = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    supervised_sites = relationship("SupervisorSite", back_populates="supervisor")
    raised_issues = relationship("Issue", back_populates="raised_by", foreign_keys="Issue.raised_by_user_id")
    assignments = relationship("IssueAssignment", back_populates="assigned_to", foreign_keys="IssueAssignment.assigned_to_solver_id")
    skills = relationship("ProblemSolverSkill", back_populates="solver")
