"""
PURPOSE: Chat orchestrator with SESSION management.
─────────────────────────────────────────────────────
Every conversation lives in a session.
First message → auto-creates session with AI-generated title.
Subsequent messages → attach to existing session.
"""

import logging
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sql_func, desc

from app.models.user import User
from app.models.chat_session import ChatSession
from app.models.chat_history import ChatHistory
from app.core.enums import ChatRole, UserRole
from app.schemas.chatbot_schema import (
    ChatResponse,
    ChatHistoryResponse,
    ChatHistoryListResponse,
)
from app.schemas.chat_session_schema import (
    ChatSessionItem,
    ChatSessionListResponse,
    ChatSessionDetailResponse,
    ChatMessageInSession,
)

logger = logging.getLogger(__name__)


class ChatbotService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════
    # MAIN: Process message with session tracking
    # ══════════════════════════════════════════════════════

    async def process_message(
        self,
        user: User,
        message: str,
        session_id: Optional[int] = None,
        image_url: Optional[str] = None,
        issue_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ChatResponse:

        # ── 1. Get or create session ────────────────────
        session = await self._get_or_create_session(
            user=user,
            session_id=session_id,
            first_message=message,
            issue_id=issue_id,
        )

        # ── 2. Log user message ─────────────────────────
        self._log_chat(
            session_id=session.id,
            user_id=user.id,
            issue_id=issue_id,
            role=ChatRole.USER,
            message=message,
            attachments=[image_url] if image_url else [],
        )

        # ── 3. Call AI agent ─────────────────────────────
        try:
            from app.services.ai_service import master_agent
            agent_response = master_agent(message)

            response = ChatResponse(
                message=agent_response,
                intent="fetch",
                session_id=session.id,
                actions_taken=["sql_agent"],
            )

        except Exception as e:
            logger.error(f"Agent error: {e}", exc_info=True)
            response = ChatResponse(
                message=f"❌ Something went wrong: {str(e)}",
                intent="error",
                session_id=session.id,
                actions_taken=[f"error: {str(e)}"],
            )

        # ── 4. Log AI response ──────────────────────────
        self._log_chat(
            session_id=session.id,
            user_id=None,
            issue_id=response.issue_id or issue_id,
            role=ChatRole.AI,
            message=response.message,
            attachments=[],
        )

        # ── 5. Update session timestamp ──────────────────
        session.updated_at = sql_func.now()
        self.db.commit()

        return response

    # ══════════════════════════════════════════════════════
    # SESSION MANAGEMENT
    # ══════════════════════════════════════════════════════

    async def _get_or_create_session(
        self,
        user: User,
        session_id: Optional[int],
        first_message: str,
        issue_id: Optional[int],
    ) -> ChatSession:
        """
        If session_id provided → find existing session.
        If not → create new session with auto-generated title.
        """
        # Try to find existing session
        if session_id:
            stmt = select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user.id,
                ChatSession.is_active == True,
            )
            result = await self.db.execute(stmt)
            session = result.scalars().first()

            if session:
                return session
                # If session not found, create new one (don't error out)

        # Create new session
        title = self._generate_session_title(first_message)

        session = ChatSession(
            user_id=user.id,
            title=title,
            issue_id=issue_id,
            is_active=True,
        )
        self.db.add(session)
        self.db.flush()  # Get the ID without committing

        logger.info(
            f"New session #{session.id} created for user {user.name}: '{title}'"
        )

        return session

    def _generate_session_title(self, message: str) -> str:
        """
        Generate a short title from the first message.
        Like ChatGPT: uses first ~50 chars of the message.

        Examples:
          "pipe broken in vepery site need to fix" → "Pipe broken in vepery site need..."
          "show me all open issues"                → "Show me all open issues"
          "hello"                                  → "Hello"
        """
        # Clean and truncate
        title = message.strip()

        # Capitalize first letter
        if title:
            title = title[0].upper() + title[1:]

        # Truncate to 60 chars
        if len(title) > 60:
            title = title[:57] + "..."

        return title or "New Chat"

    # ══════════════════════════════════════════════════════
    # SESSION LIST — Sidebar data
    # ══════════════════════════════════════════════════════

    async def get_sessions(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> ChatSessionListResponse:
        """
        Returns all sessions for the sidebar.
        Ordered by most recently updated (like ChatGPT).
        Includes last message preview and message count.
        """
        base_stmt = select(ChatSession).where(
            ChatSession.user_id == user_id,
            ChatSession.is_active == True,
        )

        # total count
        count_stmt = select(sql_func.count()).select_from(base_stmt.subquery())
        result = await self.db.execute(count_stmt)
        total = result.scalar() or 0

        # sessions list
        stmt = (
            base_stmt
            .order_by(ChatSession.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        sessions = result.scalars().all()

        items = []
        for s in sessions:
            # Get last message
            last_stmt = (
                select(ChatHistory)
                .where(ChatHistory.session_id == s.id)
                .order_by(ChatHistory.created_at.desc())
            )

            last_msg = await self.db.execute(last_stmt)
            last_msg = last_msg.scalars().first()

            # Get message count
            count_stmt = (
                select(sql_func.count(ChatHistory.id))
                .where(ChatHistory.session_id == s.id)
            )

            msg_count = await self.db.execute(count_stmt)
            msg_count = msg_count.scalar() or 0

            items.append(ChatSessionItem(
                id=s.id,
                title=s.title,
                issue_id=s.issue_id,
                last_message_preview=(
                    last_msg.message[:80] + "..."
                    if last_msg and len(last_msg.message) > 80
                    else last_msg.message if last_msg else None
                ),
                last_message_at=last_msg.created_at if last_msg else s.created_at,
                message_count=msg_count or 0,
                created_at=s.created_at,
                updated_at=s.updated_at,
            ))

        return ChatSessionListResponse(total=total, sessions=items)

    # ══════════════════════════════════════════════════════
    # SESSION DETAIL — All messages in a session
    # ══════════════════════════════════════════════════════

    async def get_session_detail(
        self,
        session_id: int,
        user_id: int,
    ) -> Optional[ChatSessionDetailResponse]:
        """
        Returns all messages in a specific session.
        Called when user clicks a session in the sidebar.
        """
        stmt = select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
            ChatSession.is_active == True,
        )

        session = await self.db.execute(stmt)
        session = session.scalars().first()

        if not session:
            return None

        msg_stmt = (
            select(ChatHistory)
            .where(ChatHistory.session_id == session_id)
            .order_by(ChatHistory.created_at.asc())
        )

        messages = await self.db.execute(msg_stmt)
        messages = messages.scalars().all()

        return ChatSessionDetailResponse(
            id=session.id,
            title=session.title,
            issue_id=session.issue_id,
            messages=[
                ChatMessageInSession(
                    id=m.id,
                    user_id=m.user_id,
                    user_name=m.user.name if m.user else None,
                    role_in_chat=m.role_in_chat.value,
                    message=m.message,
                    attachments=m.attachments or [],
                    created_at=m.created_at,
                )
                for m in messages
            ],
            total_messages=len(messages),
            created_at=session.created_at,
            updated_at=session.updated_at,
        )

    # ══════════════════════════════════════════════════════
    # SESSION ACTIONS — Rename, Delete, Archive
    # ══════════════════════════════════════════════════════

    async def rename_session(
        self,
        session_id: int,
        user_id: int,
        new_title: str,
    ) -> Optional[ChatSession]:
        """Rename a session (like ChatGPT pencil icon)."""
        stmt = select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
        )

        session = await self.db.execute(stmt)
        session = session.scalars().first()

        if not session:
            return None

        session.title = new_title
        self.db.commit()
        self.db.refresh(session)
        return session

    async def delete_session(
        self,
        session_id: int,
        user_id: int,
    ) -> bool:
        """
        Soft delete — marks session as inactive.
        Messages are preserved but hidden from sidebar.
        """
        stmt = select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
        )

        session = await self.db.execute(stmt)
        session = session.scalars().first()

        if not session:
            return False

        session.is_active = False
        self.db.commit()
        return True

    # ══════════════════════════════════════════════════════
    # LEGACY: Get history (kept for backward compatibility)
    # ══════════════════════════════════════════════════════

    async def get_history(
        self,
        user_id: int,
        user_role,
        issue_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> ChatHistoryListResponse:
        """
        Legacy method — returns messages filtered by issue or user.
        Use get_sessions() + get_session_detail() for new sidebar flow.
        """
        base_stmt = select(ChatHistory)

        if issue_id:
            base_stmt = base_stmt.where(ChatHistory.issue_id == issue_id)
        else:
            base_stmt = base_stmt.where(ChatHistory.user_id == user_id)

        # total
        count_stmt = select(sql_func.count()).select_from(base_stmt.subquery())
        total = await self.db.execute(count_stmt).scalars()

        # paginated
        stmt = (
            base_stmt
            .order_by(ChatHistory.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        messages = await self.db.execute(stmt)
        messages = messages.scalars().all()

        return ChatHistoryListResponse(
            total=total,
            issue_id=issue_id,
            messages=[
                ChatHistoryResponse(
                    id=m.id,
                    user_id=m.user_id,
                    user_name=m.user.name if m.user else None,
                    issue_id=m.issue_id,
                    role_in_chat=m.role_in_chat,
                    message=m.message,
                    attachments=m.attachments or [],
                    created_at=m.created_at,
                )
                for m in messages
            ],
        )

    # ══════════════════════════════════════════════════════
    # PRIVATE: Log chat message
    # ══════════════════════════════════════════════════════

    def _log_chat(self, session_id, user_id, issue_id, role, message, attachments):
        entry = ChatHistory(
            session_id=session_id,
            user_id=user_id,
            issue_id=issue_id,
            role_in_chat=role,
            message=message,
            attachments=attachments or [],
        )
        self.db.add(entry)
        self.db.flush()



# app/services/chatbot_service.py — just the top part that needs fixing

# from dataclasses import dataclass


# @dataclass
# class FakeUser:
#     """Fallback when no auth."""
#     id: int = 1
#     name: str = "Priya Sharma"
#     email: str = "priya.sharma@example.com"
#     role: str = "supervisor"


# class ChatbotService:

#     def __init__(self, db):
#         self.db = db

#     async def process_message(self, user, message, image_url=None, issue_id=None, metadata=None):

#         # ✅ Handle None user
#         if user is None:
#             user = FakeUser()

#         # ── 1. Skip chat logging for now (avoids DB issues) ──
#         # self._log_chat(...)

#         # ── 2. Call SQL ReAct Agent ──
#         try:
#             from app.services.ai_service import sql_agent
#             agent_response = sql_agent(message)
#             print(f"Agent response: {agent_response}")

#             from app.schemas.chatbot_schema import ChatResponse
#             return ChatResponse(
#                 message=agent_response,
#                 intent="fetch",
#                 actions_taken=["sql_agent"],
#             )

#         except Exception as e:
#             from app.schemas.chatbot_schema import ChatResponse
#             return ChatResponse(
#                 message=f"❌ Something went wrong: {str(e)}",
#                 intent="error",
#                 actions_taken=[f"error: {str(e)}"],
#             )