"""
PURPOSE: THE PRIMARY SCHEMA — All user interaction flows through here.
──────────────────────────────────────────────────────────────────────

USED BY: POST /api/v1/chat  (the SINGLE universal endpoint)
         GET  /api/v1/chat/history (read conversation history)

ARCHITECTURE:
  Users ONLY interact through free text chat.
  They type natural language messages.
  AI figures out what to do.
  System performs actions automatically.
  Response tells user what happened.

  ┌──────────────────────────────────────────────────────────────┐
  │ SUPERVISOR CHAT EXAMPLES:                                     │
  │                                                               │
  │ "pipe broken in vepery site need to fix in 5 days"           │
  │   → intent: create_issue                                      │
  │   → AI extracts: plumbing, Vepery, 5 days, high priority    │
  │   → Backend: create issue → match solver → assign → call     │
  │   → Response: "Issue #1 created! Solver Ramesh assigned."    │
  │                                                               │
  │ "what are my open issues?"                                    │
  │   → intent: query_issues                                      │
  │   → Backend: query issues for this supervisor's sites         │
  │   → Response: "You have 3 issues: #1 Pipe Leak [high]..."   │
  │                                                               │
  │ "work not done properly, leak still visible"                 │
  │   → intent: raise_complaint                                   │
  │   → Backend: create complaint → reopen issue → re-call       │
  │   → Response: "Complaint filed. Issue reopened. Calling..."  │
  │                                                               │
  │ "show me status of issue 5"                                  │
  │   → intent: check_status                                      │
  │   → Backend: fetch issue #5 with details                      │
  │   → Response: "Issue #5: Water Pump [ASSIGNED] due Feb 12"  │
  │                                                               │
  │ "change priority of issue 3 to high"                         │
  │   → intent: update_issue                                      │
  │   → Backend: update issue #3 priority                         │
  │   → Response: "Issue #3 priority changed to HIGH."           │
  │                                                               │
  │ "mark issue 8 as completed, work looks good"                 │
  │   → intent: approve_completion                                │
  │   → Backend: issue #8 → COMPLETED, assignment → COMPLETED   │
  │   → Response: "Issue #8 marked as COMPLETED. Good job!"     │
  │                                                               │
  │ "extend deadline of issue 2 by 3 days"                       │
  │   → intent: update_issue                                      │
  │   → Backend: add 3 days to issue #2 deadline                  │
  │   → Response: "Issue #2 deadline extended to Feb 16."        │
  │                                                               │
  │ "hello" / "thanks" / "help"                                  │
  │   → intent: general_chat                                      │
  │   → Response: conversational AI response                      │
  ├──────────────────────────────────────────────────────────────┤
  │ SOLVER CHAT EXAMPLES:                                         │
  │                                                               │
  │ "what is my current assignment?"                             │
  │   → intent: check_assignment                                  │
  │   → Backend: fetch active assignments for this solver         │
  │   → Response: "You have Assignment #1: Pipe Leak at Vepery" │
  │                                                               │
  │ "I have started working on the pipe repair"                  │
  │   → intent: update_work_status                                │
  │   → Backend: issue → IN_PROGRESS                              │
  │   → Response: "Great! Issue #1 marked as IN_PROGRESS."      │
  │                                                               │
  │ "work completed, here is the photo"  [+ image_url]           │
  │   → intent: complete_work                                     │
  │   → Backend: create AFTER image → issue RESOLVED_PENDING     │
  │   → AI verifies photo → notifies supervisor                  │
  │   → Response: "Photo uploaded. Supervisor notified for review"│
  │                                                               │
  │ "I cannot reach the site today"                              │
  │   → intent: report_blocker                                    │
  │   → Backend: log message → notify supervisor                  │
  │   → Response: "Noted. Supervisor has been notified."         │
  ├──────────────────────────────────────────────────────────────┤
  │ MANAGER CHAT EXAMPLES:                                        │
  │                                                               │
  │ "show me all escalated issues"                               │
  │   → intent: query_escalations                                 │
  │   → Backend: fetch all unresolved escalations                 │
  │   → Response: "3 escalated issues: #7 Generator [HIGH]..."  │
  │                                                               │
  │ "what is the performance of solver Ramesh?"                  │
  │   → intent: query_solver_performance                          │
  │   → Backend: aggregate solver stats                           │
  │   → Response: "Ramesh: 5 completed, 1 reopened, 2 active"   │
  │                                                               │
  │ "show overdue issues"                                        │
  │   → intent: query_overdue                                     │
  │   → Backend: fetch issues past deadline                       │
  │   → Response: "2 overdue: #3 AC Breakdown, #7 Generator"    │
  │                                                               │
  │ "reassign issue 7 to solver Suresh"                          │
  │   → intent: reassign_solver                                   │
  │   → Backend: create new assignment → call new solver          │
  │   → Response: "Issue #7 reassigned to Suresh. Calling..."   │
  └──────────────────────────────────────────────────────────────┘
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.core.enums import ChatRole


# ══════════════════════════════════════════════════════════
# REQUEST: User sends a free text message
# ══════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    """
    THE universal input schema. 
    User types ANY free text message + optional image.
    This is the ONLY way users interact with the system after login.
    
    The backend AI (Groq llama-3.3-70b) analyzes the message to:
      1. Detect intent (what does the user want?)
      2. Extract entities (issue numbers, site names, priorities)
      3. Route to the correct internal service
      4. Execute the action
      5. Return natural language response
    """
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description=(
            "Free text message from user — any natural language. "
            "Can be a problem report, a question, a complaint, "
            "a status update, or general conversation."
        ),
        examples=[
            "pipe broken in vepery site need to fix in 5 days",
            "what are my open issues?",
            "work not done properly, leak still visible",
            "show me status of issue 5",
            "I have started working on the AC repair",
            "work completed, uploading photo",
            "mark issue 8 as completed, work looks good",
            "change priority of issue 3 to high",
            "extend deadline of issue 2 by 3 days",
            "show me all escalated issues",
            "reassign issue 7 to solver Suresh",
            "hello",
            "thanks for the update",
        ],
    )
    image_url: Optional[str] = Field(
        None,
        max_length=500,
        description=(
            "ImageKit CDN URL of uploaded photo. "
            "Supervisor sends BEFORE photo when reporting an issue. "
            "Solver sends AFTER photo when completing work. "
            "Supervisor sends evidence photo when filing complaint. "
            "The file is uploaded via POST /api/v1/images/upload first, "
            "then the returned URL is passed here."
        ),
        examples=[
            "https://ik.imagekit.io/abc/issues/pipe-leak-before.jpg",
            "https://ik.imagekit.io/abc/issues/pipe-fixed-after.jpg",
            None,
        ],
    )
    issue_id: Optional[int] = Field(
        None,
        description=(
            "Optional context: if user is replying about a specific issue. "
            "The chat UI may pass this when user taps on an issue card. "
            "If None, AI figures out the issue from message content. "
            "Example: user taps issue #5 card then types 'change to high priority'"
        ),
        examples=[1, 5, None],
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description=(
            "Extra context from frontend: GPS coordinates, "
            "current screen, device type, etc. "
            "Helps AI make better decisions."
        ),
        examples=[
            {"gps_lat": 13.083, "gps_lng": 80.270, "screen": "home"},
            {"screen": "issue_detail", "viewing_issue": 5},
            {},
        ],
    )


# ══════════════════════════════════════════════════════════
# RESPONSE: System responds after processing
# ══════════════════════════════════════════════════════════

class ChatResponse(BaseModel):
    """
    The complete response after AI processes user's free text.
    
    Contains:
      message      → Natural language response shown in chat bubble
      intent       → What action was detected
      actions_taken→ List of things the system did automatically
      data         → Structured data for UI rendering (cards, lists)
      IDs          → Referenced issue/assignment/complaint for navigation
    """
    message: str = Field(
        ...,
        description=(
            "Natural language response displayed in the chat UI. "
            "This is what the user reads. Written in a friendly, "
            "professional tone with emoji for visual clarity."
        ),
        examples=[
            (
                "✅ Issue #1 created successfully!\n"
                "📍 Site: Vepery Site\n"
                "🔧 Type: plumbing\n"
                "⚡ Priority: high\n"
                "📅 Deadline: 2026-02-15 18:00\n"
                "👷 Assigned to: Ramesh K\n"
                "📞 Calling solver now..."
            ),
            "📋 You have 3 open issues:\n🔴 #1 Pipe Leak [high]\n🟡 #2 Power Outage [medium]",
            "⚠️ Complaint filed for Issue #1. Assignment reopened. Calling solver again.",
            "👋 Hello! I'm your facility management assistant. How can I help?",
        ],
    )
    intent: str = Field(
        ...,
        description=(
            "The detected intent — what the user wanted to do. "
            "Used by frontend to optionally render different UI elements."
        ),
        examples=[
            "create_issue",
            "query_issues",
            "check_status",
            "raise_complaint",
            "approve_completion",
            "update_issue",
            "update_work_status",
            "complete_work",
            "check_assignment",
            "report_blocker",
            "query_escalations",
            "query_overdue",
            "query_solver_performance",
            "reassign_solver",
            "general_chat",
        ],
    )
    issue_id: Optional[int] = Field(
        None,
        description="Created or referenced issue ID — for UI navigation",
    )
    assignment_id: Optional[int] = Field(
        None,
        description="Created or referenced assignment ID",
    )
    complaint_id: Optional[int] = Field(
        None,
        description="Created complaint ID (when complaint is filed via chat)",
    )
    actions_taken: List[str] = Field(
        default_factory=list,
        description=(
            "List of automated actions the system performed. "
            "Shown as a summary or activity log in the UI."
        ),
        examples=[
            [
                "Issue #1 created: 'Pipe Leakage'",
                "Solver Ramesh K matched and assigned (Assignment #1)",
                "Twilio call initiated to 9876543210",
                "BEFORE image saved",
                "Chat history logged",
            ],
            [
                "Complaint #3 created",
                "Issue #1 status → REOPENED",
                "Assignment #1 status → REOPENED",
                "Re-calling solver via Twilio",
            ],
            [],
        ],
    )
    data: Optional[Dict[str, Any]] = Field(
        None,
        description=(
            "Structured data for UI rendering. "
            "Can contain issue lists, issue details, solver stats, etc. "
            "Frontend uses this to render cards, tables, charts."
        ),
        examples=[
            {
                "issue_id": 1,
                "site": "Vepery Site",
                "problem_type": "plumbing",
                "priority": "high",
                "solver_name": "Ramesh K",
                "solver_phone": "9876543210",
            },
            {
                "issues": [
                    {"id": 1, "title": "Pipe Leak", "status": "ASSIGNED", "priority": "high"},
                    {"id": 2, "title": "Power Outage", "status": "OPEN", "priority": "medium"},
                ],
                "total": 2,
            },
            None,
        ],
    )


# ══════════════════════════════════════════════════════════
# CHAT HISTORY: For retrieving past conversations
# ══════════════════════════════════════════════════════════

class ChatHistoryResponse(BaseModel):
    """
    Single chat message in the conversation history.
    Used to render the chat UI with all past messages.
    
    role_in_chat:
      USER   → Message typed by supervisor/solver/manager
      AI     → Response from the AI system
      SYSTEM → Automated notification (escalation, assignment, deadline)
    """
    id: int
    user_id: Optional[int] = Field(
        None,
        description="NULL for AI and SYSTEM messages",
    )
    user_name: Optional[str] = Field(
        None,
        description="Name of the user who sent (NULL for AI/SYSTEM)",
    )
    issue_id: Optional[int] = Field(
        None,
        description="Issue this message relates to (NULL for general chat)",
    )
    role_in_chat: ChatRole = Field(
        ...,
        description="USER | AI | SYSTEM",
    )
    message: str = Field(
        ...,
        description="Message content",
    )
    attachments: List[str] = Field(
        default_factory=list,
        description="Array of image URLs attached to this message",
    )
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryListResponse(BaseModel):
    """
    Paginated list of chat messages.
    Used by GET /api/v1/chat/history?issue_id=1
    """
    total: int = Field(..., description="Total messages matching query")
    issue_id: Optional[int] = Field(
        None,
        description="If filtered by issue, shows which issue",
    )
    messages: List[ChatHistoryResponse]