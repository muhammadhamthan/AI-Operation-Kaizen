# app/api/chatbot.py

from fastapi import APIRouter, Depends
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

router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def send_chat_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    THE universal endpoint. Requires JWT auth.
    Frontend: POST /api/v1/chat
    Headers: Authorization: Bearer <token>
    Body: {"message": "...", "image_url": null, "issue_id": null}
    """
    chatbot_service = ChatbotService(db)

    response = await chatbot_service.process_message(
        user=current_user,
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
    current_user: User = Depends(get_current_user),
):
    """Retrieve conversation history for authenticated user."""
    chatbot_service = ChatbotService(db)

    return chatbot_service.get_history(
        user_id=current_user.id,
        user_role=current_user.role,
        issue_id=issue_id,
        skip=skip,
        limit=limit,
    )