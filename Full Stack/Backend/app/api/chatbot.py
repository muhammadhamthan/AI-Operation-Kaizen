"""
PURPOSE: THE PRIMARY API ENDPOINT — All user interaction flows here.
──────────────────────────────────────────────────────────────────────
POST /api/v1/chat           → Process free text message
GET  /api/v1/chat/history   → Retrieve conversation history

EVERY action in the system flows through POST /api/v1/chat:
  - Issue creation
  - Issue status updates
  - Complaints
  - Status queries
  - Work updates (solver)
  - Approval/rejection (supervisor)
  - Escalation queries (manager)
  - General conversation

The ChatbotService orchestrates everything:
  1. Receives free text
  2. AI detects intent
  3. Routes to correct handler
  4. Executes backend actions
  5. Returns natural language response


from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.chatbot_service import ChatbotService
from app.schemas.chatbot_schema import (
    ChatRequest,
    ChatResponse,
    ChatHistoryListResponse,
)

router = APIRouter()


@router.post(
    "",
    response_model=ChatResponse,
    summary="Send a chat message — THE universal endpoint",
)
async def send_chat_message(
    chat_request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    THE main endpoint. User sends free text, system does everything.

    Examples:
      Supervisor: "pipe broken in vepery site need to fix in 5 days"
      Solver: "I have started working on the AC repair"
      Manager: "show me all escalated issues"
      Anyone: "hello" / "what are my issues?"

    chatbot_service = ChatbotService(db)

    response = await chatbot_service.process_message(
        user=current_user,
        message=chat_request.message,
        image_url=chat_request.image_url,
        issue_id=chat_request.issue_id,
        metadata=chat_request.metadata,
    )

    return response


@router.get(
    "/history",
    response_model=ChatHistoryListResponse,
    summary="Get chat conversation history",
)
def get_chat_history(
    issue_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    Retrieves chat messages.
    If issue_id provided → messages for that issue.
    Otherwise → all messages for this user.

    chatbot_service = ChatbotService(db)

    return chatbot_service.get_history(
        user_id=current_user.id,
        user_role=current_user.role,
        issue_id=issue_id,
        skip=skip,
        limit=limit,
    )
    
    
"""

# app/api/chatbot.py

# app/api/chatbot.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db import get_db
from app.services.chatbot_service import ChatbotService
from app.schemas.chatbot_schema import (
    ChatRequest,
    ChatResponse,
    ChatHistoryListResponse,
)

router = APIRouter()


@router.post("/message", response_model=ChatResponse)
async def send_chat_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    No auth required — user is handled inside chatbot_service.
    Frontend: POST /api/v1/chat/message
    Body: {"message": "...", "image_url": null, "issue_id": null}
    """
    chatbot_service = ChatbotService(db)

    response = await chatbot_service.process_message(
        user=None,
        message=request.message,
        image_url=request.image_url,
        issue_id=request.issue_id,
        metadata=request.metadata,
    )

    return response


@router.get("/history", response_model=ChatHistoryListResponse)
async def get_chat_history(
    issue_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """No auth required for now."""
    chatbot_service = ChatbotService(db)

    return chatbot_service.get_history(
        user_id=1,
        user_role="supervisor",
        issue_id=issue_id,
        skip=skip,
        limit=limit,
    )