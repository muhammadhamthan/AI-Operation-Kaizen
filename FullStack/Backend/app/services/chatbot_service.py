"""
chatbot_service.py  —  OPTIMIZED
Key fixes vs original:
  1. get_sessions(): was N+1 queries (2 per session). Now 3 queries total for any session count.
  2. process_message(): indentation was broken (for loop outside try block). Fixed.
  3. process_message(): clarification path was returning BEFORE logging AI reply. Fixed.
  4. rename_session() / delete_session(): were using sync self.db.commit(). Now await.
  5. get_history(): was calling await on a non-awaitable scalar(). Fixed.
  6. _get_or_create_session(): was calling self.db.flush() (sync). Now await.
  7. get_session_detail(): m.user lazy-loaded inside loop → fixed with selectinload.
  8. session.updated_at = sql_func.now() → use update() statement instead.
"""

import logging
from typing import Optional, Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sql_func, update
from sqlalchemy.orm import selectinload

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

    # ══════════════════════════════════════════════════════════
    # MAIN: Process message with session tracking
    # ══════════════════════════════════════════════════════════

    async def process_message(
        self,
        user: User,
        message: str,
        session_id: Optional[int] = None,
        image_url: Optional[str] = None,
        issue_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        indent : Optional[str] = None
    ) -> ChatResponse:
# ── 1. Get or create session ──────────────────────────
        session = await self._get_or_create_session(
            user=user,
            session_id=session_id,
            first_message=message,
            issue_id=issue_id,
        )
        

        # ── 2. Log USER message ───────────────────────────────
        await self._log_chat(
            session_id=session.id,
            user_id=user.id,
            issue_id=issue_id,
            role=ChatRole.USER,
            message=message,
            attachments=[image_url] if image_url else [],
        )

        # ── 3. Call AI agent ──────────────────────────────────
        from app.services.ai_service import master_agent,run_sql_agent
        from app.services.issue_service import IssueService
        from app.schemas.chatbot_schema import ChatResponse

        
        if indent == "sql_query":
            result_text = await run_sql_agent(str(user.id), message)
            response = ChatResponse(
                session_id=session.id,
                message=result_text,
                intent="sql_query",
                actions_taken=["sql_agent"]
            )
            
        else:
            # Issue / approval / workflow actions
            agent_response = await master_agent(user.id, message, indent)
            logger.info("Agent decision: %s", agent_response.get("intent"))

            intent = agent_response.get("intent")
            issue_service = IssueService(self.db)

            # ── 4. Build response (ALL paths build `response` first,
            #       then we log it ONCE at step 5 before returning) ─
            #
            #   OLD (broken):
            #     if clarification → log → return   ← returned before step 5
            #     if function_call → build response
            #     step 5: log       ← only ran for function_call
            #
            #   NEW (fixed):
            #     if clarification  → build response  ┐
            #     elif function_call → build response  ├─ no return yet
            #     else               → build response  ┘
            #     step 5: log AI reply  ← always runs
            #     step 6: commit + return

            if intent == "clarification":
                # AI needs more info from the user
                ai_message = agent_response.get("message", "Could you provide more details?")
                response = ChatResponse(
                    session_id=session.id,
                    message=ai_message,
                    intent="clarification",
                    actions_taken=[],
                )

            elif intent == "function_call":
                # One or more functions to execute
                calls = agent_response.get("calls") or [
                    {
                        "function": agent_response.get("function"),
                        "args": agent_response.get("args", {}),
                    }
                ]
                clarifications = agent_response.get("clarifications", [])
                call_responses: List[ChatResponse] = []

                for call in calls:
                    func = call["function"]
                    args = call["args"]

                    if func == "create_issue":
                        r = await issue_service.create_from_chat(
                            user=user,
                            message=args["message"],
                            image_url=image_url,
                        )

                    elif func == "approve_completion":
                        r = await issue_service.approve_completion(user, args["issue_id"])

                    elif func == "update_priority":
                        r = await issue_service.update_priority(
                            user, args["issue_id"], args["priority"]
                        )

                    elif func == "extend_deadlines":
                        r = await issue_service.extend_deadline(
                            user, args["issue_id"], args.get("days", 3)
                        )

                    elif func == "solver_complete_work":
                        r = await issue_service.solver_complete_work(
                            user,
                            args.get("message", "completed work"),
                            image_url,
                            args["issue_id"],
                            None,
                        )

                    elif func == "solver_report_blocker":
                        r = await issue_service.solver_report_blocker(
                            user,
                            args.get("message", "blocker reported"),
                            args["issue_id"],
                        )

                    elif func == "raise_complaint":
                        from app.services.complaint_service import ComplaintService
                        r = await ComplaintService(self.db).create_from_chat(
                            user=user,
                            issue_id=args["issue_id"],
                            message=args["message"],
                            image_url=image_url,
                        )

                    elif func == "reassign_solver":
                        from app.services.assignment_service import AssignmentService
                        r = await AssignmentService(self.db).reassign_from_chat(
                            user=user,
                            issue_id=args.get("issue_id"),
                            solver_name=args.get("solver_name"),
                        )

                    elif func == "query_function":
                        from app.services.ai_service import run_sql_agent
                        result_text = await run_sql_agent(user.id, args["query"])
                        r = ChatResponse(
                            message=result_text,
                            intent="query_function",
                            actions_taken=["sql_agent"],
                        )

                    elif func == "llm_function":
                        r = ChatResponse(
                            message=args.get("message", ""),
                            intent="llm_function",
                            actions_taken=["llm_response"],
                        )
                        

                    else:
                        r = ChatResponse(
                            message="Unknown function.",
                            intent="unknown",
                            actions_taken=[],
                        )

                    call_responses.append(r)

                combined_message = "\n\n".join(r.message for r in call_responses)
                if clarifications:
                    combined_message += "\n\n⚠️ " + "\n".join(clarifications)

                response = ChatResponse(
                    session_id=session.id,
                    message=combined_message,
                    intent="function_call",
                    actions_taken=[c["function"] for c in calls],
                )

            else:
                # Unknown / fallback intent
                ai_msg = agent_response.get("message", "I'm not sure how to help with that.")
                response = ChatResponse(
                    session_id=session.id,
                    message=ai_msg,
                    intent=intent or "unknown",
                    actions_taken=[],
                )

        # ── 5. Log AI reply — runs for EVERY intent path ──────
        await self._log_chat(
            session_id=session.id,
            user_id=None,
            issue_id=issue_id,
            role=ChatRole.AI,
            message=response.message,
            attachments=[],
        )
        
        from app.services.redis_memory_service import load_memory, save_memory
        memory = load_memory(user.id)
        memory.chat_memory.add_user_message(message)      # ← user message
        memory.chat_memory.add_ai_message(response.message)  # ← full AI response
        save_memory(user.id, memory)
        
        if response.message.startswith("[PENDING:"):
            from app.services.redis_memory_service import load_memory, save_memory
            memory = load_memory(user.id)
            memory.chat_memory.add_ai_message(response.message)
            save_memory(user.id, memory)

        # ── 6. Touch session + commit ─────────────────────────
        await self._touch_session(session.id)
        await self.db.commit()

        return response

    # ══════════════════════════════════════════════════════════
    # SESSION MANAGEMENT
    # ══════════════════════════════════════════════════════════

    async def _get_or_create_session(
        self,
        user: User,
        session_id: Optional[int],
        first_message: str,
        issue_id: Optional[int],
    ) -> ChatSession:
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

        title = self._generate_session_title(first_message)
        session = ChatSession(
            user_id=user.id,
            title=title,
            issue_id=issue_id,
            is_active=True,
        )
        self.db.add(session)
        await self.db.flush()  # async flush to get session.id before commit

        logger.info(
            "New session #%s created for user %s: '%s'",
            session.id, user.name, title,
        )
        return session

    @staticmethod
    def _generate_session_title(message: str) -> str:
        title = message.strip()
        if title:
            title = title[0].upper() + title[1:]
        if len(title) > 60:
            title = title[:57] + "..."
        return title or "New Chat"

    async def _touch_session(self, session_id: int) -> None:
        """Update session updated_at without fetching the ORM object."""
        await self.db.execute(
            update(ChatSession)
            .where(ChatSession.id == session_id)
            .values(updated_at=sql_func.now())
        )

    # ══════════════════════════════════════════════════════════
    # SESSION LIST — Sidebar (was N+1, now 3 queries total)
    # ══════════════════════════════════════════════════════════

    async def get_sessions(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> ChatSessionListResponse:
        """
        OLD: 1 + 2*N queries (last_msg + count per session).
        NEW: 3 queries total regardless of session count.
          Q1: COUNT sessions
          Q2: Fetch sessions (paginated)
          Q3: Single aggregation — last_msg + count for ALL sessions at once
        """
        # Q1 — total count
        count_result = await self.db.execute(
            select(sql_func.count(ChatSession.id)).where(
                ChatSession.user_id == user_id,
                ChatSession.is_active == True,
            )
        )
        total = count_result.scalar() or 0

        if total == 0:
            return ChatSessionListResponse(total=0, sessions=[])

        # Q2 — paginated sessions
        sessions_result = await self.db.execute(
            select(ChatSession)
            .where(
                ChatSession.user_id == user_id,
                ChatSession.is_active == True,
            )
            .order_by(ChatSession.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        sessions = sessions_result.scalars().all()
        if not sessions:
            return ChatSessionListResponse(total=total, sessions=[])

        session_ids = [s.id for s in sessions]

        # Q3 — aggregate last message + count for ALL sessions in one query
        last_msg_subq = (
            select(
                ChatHistory.session_id,
                sql_func.max(ChatHistory.id).label("last_id"),
                sql_func.count(ChatHistory.id).label("msg_count"),
            )
            .where(ChatHistory.session_id.in_(session_ids))
            .group_by(ChatHistory.session_id)
            .subquery()
        )
        agg_result = await self.db.execute(
            select(
                last_msg_subq.c.session_id,
                last_msg_subq.c.msg_count,
                ChatHistory.message,
                ChatHistory.created_at,
            )
            .join(ChatHistory, ChatHistory.id == last_msg_subq.c.last_id)
        )
        agg_rows = agg_result.all()

        # Build lookup map: session_id → (count, message, created_at)
        agg_map: Dict[int, tuple] = {
            row.session_id: (row.msg_count, row.message, row.created_at)
            for row in agg_rows
        }

        items = []
        for s in sessions:
            count, last_text, last_at = agg_map.get(s.id, (0, None, None))
            preview = None
            if last_text:
                preview = last_text[:80] + "..." if len(last_text) > 80 else last_text

            items.append(
                ChatSessionItem(
                    id=s.id,
                    title=s.title,
                    issue_id=s.issue_id,
                    last_message_preview=preview,
                    last_message_at=last_at or s.created_at,
                    message_count=count,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                )
            )

        return ChatSessionListResponse(total=total, sessions=items)

    # ══════════════════════════════════════════════════════════
    # SESSION DETAIL — eager-load user to avoid lazy-load
    # ══════════════════════════════════════════════════════════

    async def get_session_detail(
        self,
        session_id: int,
        user_id: int,
        user_name:str,
    ) -> Optional[ChatSessionDetailResponse]:
        
        #SECURITY CHECK: ensure session belongs to user and is active 
        session_result = await self.db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id,
                ChatSession.is_active == True,
            )
        )
        session = session_result.scalars().first()
        if not session:
            return None

        
        msg_result = await self.db.execute(
            select(ChatHistory)
            .where(ChatHistory.session_id == session_id)
            .order_by(ChatHistory.created_at.asc())
        )
        messages = msg_result.scalars().all()

        return ChatSessionDetailResponse(
            id=session.id,
            title=session.title,
            issue_id=session.issue_id,#doubt 
            messages=[
                ChatMessageInSession(
                    id=m.id,
                    user_id=m.user_id,
                    user_name=user_name if m.user_id is not None else None,
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

    # ══════════════════════════════════════════════════════════
    # SESSION ACTIONS
    # ══════════════════════════════════════════════════════════

    async def rename_session(
        self,
        session_id: int,
        user_id: int,
        new_title: str,
    ) -> Optional[ChatSession]:
        result = await self.db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id,
            )
        )
        session = result.scalars().first()
        if not session:
            return None

        session.title = new_title
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def delete_session(
        self,
        session_id: int,
        user_id: int,
    ) -> bool:
        result = await self.db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id,
            )
        )
        session = result.scalars().first()
        if not session:
            return False

        session.is_active = False
        await self.db.commit()
        return True

    # ══════════════════════════════════════════════════════════
    # LEGACY: Get history (backward compatible)
    # ══════════════════════════════════════════════════════════

    async def get_history(
        self,
        user_id: int,
        user_role,
        issue_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> ChatHistoryListResponse:
        base_stmt = select(ChatHistory)

        if issue_id:
            base_stmt = base_stmt.where(ChatHistory.issue_id == issue_id)
        else:
            base_stmt = base_stmt.where(ChatHistory.user_id == user_id)

        count_result = await self.db.execute(
            select(sql_func.count()).select_from(base_stmt.subquery())
        )
        total = count_result.scalar() or 0

        msg_result = await self.db.execute(
            base_stmt
            .options(selectinload(ChatHistory.user))
            .order_by(ChatHistory.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        messages = msg_result.scalars().all()

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

    # ══════════════════════════════════════════════════════════
    # PRIVATE: Log chat message
    # ══════════════════════════════════════════════════════════

    async def _log_chat(
        self,
        session_id: int,
        user_id: Optional[int],
        issue_id: Optional[int],
        role: ChatRole,
        message: str,
        attachments: list,
    ) -> None:
        entry = ChatHistory(
            session_id=session_id,
            user_id=user_id,
            issue_id=issue_id,
            role_in_chat=role,
            message=message,
            attachments=attachments or [],
        )
        self.db.add(entry)
        await self.db.flush()