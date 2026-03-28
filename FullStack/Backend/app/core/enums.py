"""
Python enums that mirror the PostgreSQL ENUM types exactly.
Used in both SQLAlchemy models and Pydantic schemas.
"""
import enum


# ── users.role ───────────────────────────────────────────
class UserRole(str, enum.Enum):
    SUPERVISOR = "supervisor"
    PROBLEMSOLVER = "problemsolver"
    MANAGER = "manager"


# ── issues.priority  /  escalation_rules.priority ────────
class Priority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# ── issues.status ────────────────────────────────────────
class IssueStatus(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED_PENDING_REVIEW = "RESOLVED_PENDING_REVIEW"
    COMPLETED = "COMPLETED"
    REOPENED = "REOPENED"
    ESCALATED = "ESCALATED"


# ── issue_assignments.status ─────────────────────────────
class AssignmentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    REOPENED = "REOPENED"


# ── call_logs.status ─────────────────────────────────────
class CallStatus(str, enum.Enum):
    INITIATED = "INITIATED"
    MISSED = "MISSED"
    ANSWERED = "ANSWERED"


# ── issue_images.image_type ──────────────────────────────
class ImageType(str, enum.Enum):
    BEFORE = "BEFORE"
    AFTER = "AFTER"


# ── issue_images.ai_flag ────────────────────────────────
class AIFlag(str, enum.Enum):
    OK = "OK"
    SUSPECT = "SUSPECT"
    NOT_CHECKED = "NOT_CHECKED"


# ── issue_history.action_type ────────────────────────────
class ActionType(str, enum.Enum):
    ASSIGN = "ASSIGN"
    UPDATE = "UPDATE"
    COMPLETE = "COMPLETE"
    REOPEN = "REOPEN"
    COMPLAINT = "COMPLAINT"


# ── chat_history.role_in_chat ────────────────────────────
class ChatRole(str, enum.Enum):
    USER = "USER"
    AI = "AI"
    SYSTEM = "SYSTEM"