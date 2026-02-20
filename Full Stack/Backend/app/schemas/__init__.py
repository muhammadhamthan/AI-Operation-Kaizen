"""
CHAT-FIRST ARCHITECTURE — Schema Registry
──────────────────────────────────────────
ALL user actions happen through POST /api/v1/chat
Backend APIs are either:
  - Auth (login/register — structured forms)
  - Chat (THE primary endpoint)
  - Dashboard (read-only aggregation)
  - Image upload (file handling)
  - Webhooks (Twilio callbacks)
  - History (read-only audit trail)

NO direct create/update endpoints for issues, assignments, complaints.
Those are ALL created by the chatbot_service based on user's free text.
"""

from app.schemas.user_schema import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    UserLogin,
    TokenResponse,
)
from app.schemas.site_schema import (
    SiteCreate,
    SiteUpdate,
    SiteResponse,
    SiteListResponse,
    SupervisorSiteAssign,
)
from app.schemas.chatbot_schema import (
    ChatRequest,
    ChatResponse,
    ChatHistoryResponse,
    ChatHistoryListResponse,
)
from app.schemas.issue_schema import (
    AIExtractionResult,
    IssueResponse,
    IssueListResponse,
    IssueDetailResponse,
    IssueImageBrief,
    AssignmentBrief,
)
from app.schemas.assignment_schema import (
    AssignmentResponse,
    AssignmentListResponse,
    SolverMatchResult,
)
from app.schemas.call_log_schema import (
    CallLogCreate,
    CallLogUpdate,
    CallLogResponse,
    CallLogListResponse,
    CallStatusCallback,
)
from app.schemas.image_schema import (
    ImageUploadResponse,
    ImageListResponse,
    AIVerificationResult,
)
from app.schemas.complaint_schema import (
    ComplaintResponse,
    ComplaintListResponse,
)
from app.schemas.escalation_schema import (
    EscalationRuleCreate,
    EscalationRuleResponse,
    EscalationResponse,
    EscalationListResponse,
)
from app.schemas.dashboard_schema import (
    DashboardSummary,
    SupervisorDashboard,
    ManagerDashboard,
    SolverAssignment,
)
from app.schemas.notification_schema import (
    EmailNotificationRequest,
    NotificationResponse,
)
from app.schemas.history_schema import (
    IssueHistoryResponse,
    IssueHistoryListResponse,
)

__all__ = [
    # User / Auth
    "UserCreate", "UserUpdate", "UserResponse", "UserListResponse",
    "UserLogin", "TokenResponse",
    # Site (admin)
    "SiteCreate", "SiteUpdate", "SiteResponse", "SiteListResponse",
    "SupervisorSiteAssign",
    # Chat (PRIMARY user interface)
    "ChatRequest", "ChatResponse",
    "ChatHistoryResponse", "ChatHistoryListResponse",
    # Issue (read-only responses — created via chat only)
    "AIExtractionResult", "IssueResponse", "IssueListResponse",
    "IssueDetailResponse", "IssueImageBrief", "AssignmentBrief",
    # Assignment (internal — created by backend after chat triggers)
    "AssignmentResponse", "AssignmentListResponse", "SolverMatchResult",
    # Call Log (internal + Twilio webhook)
    "CallLogCreate", "CallLogUpdate", "CallLogResponse",
    "CallLogListResponse", "CallStatusCallback",
    # Image (upload endpoint for file handling)
    "ImageUploadResponse", "ImageListResponse", "AIVerificationResult",
    # Complaint (read-only response — created via chat only)
    "ComplaintResponse", "ComplaintListResponse",
    # Escalation (internal + admin read)
    "EscalationRuleCreate", "EscalationRuleResponse",
    "EscalationResponse", "EscalationListResponse",
    # Dashboard (read-only aggregation)
    "DashboardSummary", "SupervisorDashboard",
    "ManagerDashboard", "SolverAssignment",
    # Notification
    "NotificationResponse", "EmailNotificationRequest",
    # History (read-only audit trail)
    "IssueHistoryResponse", "IssueHistoryListResponse",
]