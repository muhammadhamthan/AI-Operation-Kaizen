"""
PURPOSE: Chat endpoints with session management.
──────────────────────────────────────────────────
POST /api/v1/chat/                     → Send message (creates/continues session)
GET  /api/v1/chat/sessions             → List all sessions (sidebar)
GET  /api/v1/chat/sessions/{id}        → Get all messages in a session
PUT  /api/v1/chat/sessions/{id}/rename → Rename a session
DELETE /api/v1/chat/sessions/{id}      → Delete (archive) a session
GET  /api/v1/chat/history              → Legacy: filter by issue_id
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.chatbot_service import ChatbotService
from app.schemas.chatbot_schema import (
    ChatRequest,
    ChatResponse,
    ChatHistoryListResponse,
)
from app.schemas.chat_session_schema import (
    ChatSessionListResponse,
    ChatSessionDetailResponse,
    ChatSessionRename,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════
# PRIMARY: Send chat message
# ══════════════════════════════════════════════════════════

@router.post("/", response_model=ChatResponse)
async def send_chat_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    THE main endpoint. Now with session tracking.

    FIRST message in a conversation:
      POST /api/v1/chat/
      Body: {"message": "show overdue issues"}
      → Backend creates new session, returns session_id=7

    SUBSEQUENT messages (same conversation):
      POST /api/v1/chat/
      Body: {"message": "show details of issue 3", "session_id": 7}
      → Backend adds to existing session #7

    Frontend MUST:
      1. Store session_id from first response
      2. Send session_id in all subsequent messages
      3. When user clicks "New Chat" → send without session_id
    """
    chatbot_service = ChatbotService(db)

    response = await chatbot_service.process_message(
        user=current_user,
        message=request.message,
        session_id=request.session_id,
        image_url=request.image_url,
        issue_id=request.issue_id,
        metadata=request.metadata,
    )

    return response

# ══════════════════════════════════════════════════════════
# SESSIONS: List all sessions (sidebar)
# ══════════════════════════════════════════════════════════

@router.get("/sessions", response_model=ChatSessionListResponse)
async def list_sessions(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all chat sessions for the sidebar.
    Ordered by most recently updated.

    Response:
    {
      "total": 12,
      "sessions": [
        {
          "id": 7,
          "title": "Show overdue issues",
          "last_message_preview": "You have 3 overdue issues...",
          "last_message_at": "2026-02-10T14:30:00Z",
          "message_count": 4,
          "created_at": "2026-02-10T14:28:00Z"
        },
        ...
      ]
    }
    """
    chatbot_service = ChatbotService(db)

    return await chatbot_service.get_sessions(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )


# ══════════════════════════════════════════════════════════
# SESSION DETAIL: Get all messages in a session
# ══════════════════════════════════════════════════════════

@router.get("/sessions/{session_id}", response_model=ChatSessionDetailResponse)
async def get_session_detail(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns ALL messages in a specific session.
    Called when user clicks a session in the sidebar.

    Response:
    {
      "id": 7,
      "title": "Show overdue issues",
      "messages": [
        {"id": 1, "role_in_chat": "USER", "message": "show overdue issues", ...},
        {"id": 2, "role_in_chat": "AI", "message": "You have 3 overdue...", ...},
        {"id": 3, "role_in_chat": "USER", "message": "show details of issue 3", ...},
        {"id": 4, "role_in_chat": "AI", "message": "Issue #3: AC Breakdown...", ...}
      ],
      "total_messages": 4
    }
    """
    chatbot_service = ChatbotService(db)

    result = await chatbot_service.get_session_detail(
        session_id=session_id,
        user_id=current_user.id,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    return result


# ══════════════════════════════════════════════════════════
# SESSION RENAME
# ══════════════════════════════════════════════════════════

@router.put("/sessions/{session_id}/rename")
async def rename_session(
    session_id: int,
    data: ChatSessionRename,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rename a chat session (like ChatGPT pencil icon)."""
    chatbot_service = ChatbotService(db)

    result = await chatbot_service.rename_session(
        session_id=session_id,
        user_id=current_user.id,
        new_title=data.title,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    return {"message": f"Session renamed to '{data.title}'", "session_id": session_id}


# ══════════════════════════════════════════════════════════
# SESSION DELETE (soft delete)
# ══════════════════════════════════════════════════════════

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Soft delete — hides from sidebar but preserves messages.
    Like ChatGPT trash icon.
    """
    chatbot_service = ChatbotService(db)

    success = await chatbot_service.delete_session(
        session_id=session_id,
        user_id=current_user.id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    return {"message": f"Session {session_id} deleted", "session_id": session_id}


# ══════════════════════════════════════════════════════════
# LEGACY: History by issue (backward compatible)
# ══════════════════════════════════════════════════════════

@router.get("/history", response_model=ChatHistoryListResponse)
async def get_chat_history(
    issue_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Legacy endpoint — get messages filtered by issue_id."""
    chatbot_service = ChatbotService(db)

    return await chatbot_service.get_history(
        user_id=current_user.id,
        user_role=current_user.role,
        issue_id=issue_id,
        skip=skip,
        limit=limit,
    )