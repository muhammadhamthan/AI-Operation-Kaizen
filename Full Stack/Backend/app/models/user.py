"""
Table: users
Stores supervisors, problem solvers, managers with auth info.
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, Index,
    func,
)
from sqlalchemy.dialects.postgresql import ENUM, TIMESTAMP
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.core.enums import UserRole


class User(Base):
    __tablename__ = "users"

    # ── Columns ──────────────────────────────────────────
    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    name = Column(
        String(100),
        nullable=False,
    )
    phone = Column(
        String(20),
        unique=True,
        nullable=False,
        comment="Used for authentication and Twilio calling",
    )
    email = Column(
        String(100),
        nullable=True,
        comment="Used for escalation email notifications",
    )
    role = Column(
        ENUM(UserRole, name="user_role", create_type=True),
        nullable=False,
        comment="supervisor | problemsolver | manager",
    )
    password_hash = Column(
        String(255),
        nullable=False,
        server_default="",
        comment="Hashed password for authentication",
    )
    #IT IS ADDITIONL
    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="Soft delete / deactivation flag",
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    #IT IS ADDITIONL
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ────────────────────────────────────
    # Sites this supervisor manages (many-to-many)
    supervised_sites = relationship(
        "Site",
        secondary="supervisor_sites",
        back_populates="supervisors",
        lazy="selectin",
    )

    # Issues raised by this supervisor
    raised_issues = relationship(
        "Issue",
        back_populates="raised_by_supervisor",
        foreign_keys="Issue.raised_by_supervisor_id",
        lazy="dynamic",
    )

    # Assignments where this user is the solver
    solver_assignments = relationship(
        "IssueAssignment",
        back_populates="assigned_solver",
        foreign_keys="IssueAssignment.assigned_to_solver_id",
        lazy="dynamic",
    )

    # Assignments created by this supervisor
    created_assignments = relationship(
        "IssueAssignment",
        back_populates="assigned_by_supervisor",
        foreign_keys="IssueAssignment.assigned_by_supervisor_id",
        lazy="dynamic",
    )

    # Call logs for this solver
    call_logs = relationship(
        "CallLog",
        back_populates="solver",
        lazy="dynamic",
    )

    # Images uploaded by this user
    uploaded_images = relationship(
        "IssueImage",
        back_populates="uploaded_by_user",
        lazy="dynamic",
    )

    # Complaints raised by this supervisor
    raised_complaints = relationship(
        "Complaint",
        back_populates="raised_by_supervisor",
        foreign_keys="Complaint.raised_by_supervisor_id",
        lazy="dynamic",
    )

    # Complaints targeting this solver
    complaints_against = relationship(
        "Complaint",
        back_populates="target_solver",
        foreign_keys="Complaint.target_solver_id",
        lazy="dynamic",
    )

    # Solver skills
    skills = relationship(
        "ProblemSolverSkill",
        back_populates="solver",
        lazy="selectin",
    )

    # Chat messages sent by this user
    chat_messages = relationship(
        "ChatHistory",
        back_populates="user",
        lazy="dynamic",
    )

    # Issue history entries made by this user
    history_entries = relationship(
        "IssueHistory",
        back_populates="changed_by_user",
        lazy="dynamic",
    )
    
    # Chat sessions owned by this user
    chat_sessions = relationship(
        "ChatSession",
        back_populates="user",
        lazy="dynamic",
        order_by="ChatSession.updated_at.desc()",
    )

    # ── Indexes ──────────────────────────────────────────
    __table_args__ = (
        Index("idx_users_role", "role"),
        Index("idx_users_phone", "phone"),
        Index("idx_users_email", "email"),
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, name='{self.name}', role={self.role})>"