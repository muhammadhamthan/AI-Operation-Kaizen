"""
Import every model so that Base.metadata contains all tables.
Alembic and create_all() need this single import point.
"""

from app.models.user import User
from app.models.site import Site
from app.models.supervisor_site import SupervisorSite
from app.models.issue import Issue
from app.models.issue_assignment import IssueAssignment
from app.models.call_log import CallLog
from app.models.issue_image import IssueImage
from app.models.complaint import Complaint
from app.models.issue_history import IssueHistory
from app.models.chat_history import ChatHistory
from app.models.problem_solver_skill import ProblemSolverSkill
from app.models.escalation_rule import EscalationRule
from app.models.escalation import Escalation
from app.models.chat_session import ChatSession  


__all__ = [
    "User",
    "Site",
    "supervisor_sites",
    "Issue",
    "IssueAssignment",
    "CallLog",
    "IssueImage",
    "Complaint",
    "IssueHistory",
    "ChatHistory",
    "ProblemSolverSkill",
    "EscalationRule",
    "ChatSession",
]