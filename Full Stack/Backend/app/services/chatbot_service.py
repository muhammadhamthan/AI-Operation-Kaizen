# """
# PURPOSE: THIN orchestrator — routes to fetch agent.
# """

# import logging
# from typing import Optional, Dict, Any

# from sqlalchemy.orm import Session

# from app.models.user import User
# from app.models.chat_history import ChatHistory
# from app.core.enums import ChatRole, UserRole
# from app.schemas.chatbot_schema import (
#     ChatResponse,
#     ChatHistoryResponse,
#     ChatHistoryListResponse,
# )
# from app.services.ai_service import sql_agent

# logger = logging.getLogger(__name__)


# class ChatbotService:

#     def __init__(self, db: Session):
#         self.db = db

#     async def process_message(
#         self,
#         user: User,
#         message: str,
#         image_url: Optional[str] = None,
#         issue_id: Optional[int] = None,
#         metadata: Optional[Dict[str, Any]] = None,
#     ) -> ChatResponse:

#         # ── 1. Log user message ──────────────────────────
#         self._log_chat(
#             user_id=user.id,
#             issue_id=issue_id,
#             role=ChatRole.USER,
#             message=message,
#             attachments=[image_url] if image_url else [],
#         )

#         # ── 2. Call SQL ReAct Agent directly ─────────────
#         try:
#             agent_response = sql_agent(message)

#             response = ChatResponse(
#                 message=agent_response,
#                 intent="fetch",
#                 actions_taken=["sql_agent"],
#             )

#         except Exception as e:
#             logger.error(f"Agent error: {e}", exc_info=True)
#             response = ChatResponse(
#                 message=f"❌ Something went wrong: {str(e)}",
#                 intent="error",
#                 actions_taken=[f"error: {str(e)}"],
#             )

#         # ── 3. Log AI response ───────────────────────────
#         self._log_chat(
#             user_id=None,
#             issue_id=response.issue_id or issue_id,
#             role=ChatRole.AI,
#             message=response.message,
#             attachments=[],
#         )

#         return response

#     def get_history(
#         self,
#         user_id: int,
#         user_role: UserRole,
#         issue_id: Optional[int] = None,
#         skip: int = 0,
#         limit: int = 50,
#     ) -> ChatHistoryListResponse:
#         from app.models.issue import Issue
#         from app.models.issue_assignment import IssueAssignment
#         from app.models.supervisor_site import supervisor_sites

#         query = self.db.query(ChatHistory)

#         if issue_id:
#             query = query.filter(ChatHistory.issue_id == issue_id)
#         elif user_role == UserRole.SUPERVISOR:
#             site_ids = [
#                 r[0]
#                 for r in self.db.query(supervisor_sites.c.site_id)
#                 .filter(supervisor_sites.c.supervisor_id == user_id)
#                 .all()
#             ]
#             issue_ids = (
#                 [
#                     r[0]
#                     for r in self.db.query(Issue.id)
#                     .filter(Issue.site_id.in_(site_ids))
#                     .all()
#                 ]
#                 if site_ids
#                 else []
#             )
#             query = query.filter(
#                 (ChatHistory.user_id == user_id)
#                 | (ChatHistory.issue_id.in_(issue_ids))
#             )
#         elif user_role == UserRole.PROBLEMSOLVER:
#             assigned_ids = [
#                 r[0]
#                 for r in self.db.query(IssueAssignment.issue_id)
#                 .filter(IssueAssignment.assigned_to_solver_id == user_id)
#                 .all()
#             ]
#             query = query.filter(
#                 (ChatHistory.user_id == user_id)
#                 | (ChatHistory.issue_id.in_(assigned_ids))
#             )

#         total = query.count()
#         messages = (
#             query.order_by(ChatHistory.created_at.desc())
#             .offset(skip)
#             .limit(limit)
#             .all()
#         )

#         return ChatHistoryListResponse(
#             total=total,
#             issue_id=issue_id,
#             messages=[
#                 ChatHistoryResponse(
#                     id=m.id,
#                     user_id=m.user_id,
#                     user_name=m.user.name if m.user else None,
#                     issue_id=m.issue_id,
#                     role_in_chat=m.role_in_chat,
#                     message=m.message,
#                     attachments=m.attachments or [],
#                     created_at=m.created_at,
#                 )
#                 for m in messages
#             ],
#         )

#     def _log_chat(self, user_id, issue_id, role, message, attachments):
#         entry = ChatHistory(
#             user_id=user_id,
#             issue_id=issue_id,
#             role_in_chat=role,
#             message=message,
#             attachments=attachments or [],
#         )
#         self.db.add(entry)
#         self.db.commit()



# app/services/chatbot_service.py — just the top part that needs fixing

from dataclasses import dataclass


@dataclass
class FakeUser:
    """Fallback when no auth."""
    id: int = 1
    name: str = "Priya Sharma"
    email: str = "priya.sharma@example.com"
    role: str = "supervisor"


class ChatbotService:

    def __init__(self, db):
        self.db = db

    async def process_message(self, user, message, image_url=None, issue_id=None, metadata=None):

        # ✅ Handle None user
        if user is None:
            user = FakeUser()

        # ── 1. Skip chat logging for now (avoids DB issues) ──
        # self._log_chat(...)

        # ── 2. Call SQL ReAct Agent ──
        try:
            from app.services.ai_service import sql_agent
            agent_response = sql_agent(message)
            print(f"Agent response: {agent_response}")

            from app.schemas.chatbot_schema import ChatResponse
            return ChatResponse(
                message=agent_response,
                intent="fetch",
                actions_taken=["sql_agent"],
            )

        except Exception as e:
            from app.schemas.chatbot_schema import ChatResponse
            return ChatResponse(
                message=f"❌ Something went wrong: {str(e)}",
                intent="error",
                actions_taken=[f"error: {str(e)}"],
            )