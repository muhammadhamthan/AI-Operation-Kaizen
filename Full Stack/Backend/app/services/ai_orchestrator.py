"""
PURPOSE: Execute AI-routed function calls.
──────────────────────────────────────────────
This is the BRIDGE between:
  - ai_service.py (decides WHAT to do)
  - issue_service / complaint_service / etc (actually DO it)

Handles:
  - Single function execution
  - Multi-function execution (parallel tool calls)
  - Combining results into one ChatResponse

Called by: api/chatbot.py (the thin route)
Calls:    issue_service, complaint_service, assignment_service, sql_agent_service
"""

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.chatbot_schema import ChatResponse
from app.services.issue_service import IssueService
from app.services.sql_agent_service import run_sql_query

logger = logging.getLogger(__name__)


class AIOrchestrator:
    """
    Executes function calls returned by ai_service.detect_and_route().
    Keeps api/chatbot.py thin — all business logic lives here.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ══════════════════════════════════════════════════════
    # PUBLIC: Main entry point — handles any route result
    # ══════════════════════════════════════════════════════

    async def execute(
        self,
        route: dict,
        current_user: User,
        session_id: str,
        image_url: Optional[str] = None,
    ) -> ChatResponse:
        """
        Takes the output of detect_and_route() and executes it.

        Route formats:
          {"intent": "greeting",            "message": "..."}
          {"intent": "clarification",       "message": "..."}
          {"intent": "function_call",       "function": "...", "args": {...}}
          {"intent": "multi_function_call", "calls": [{...}, {...}]}
        """
        intent = route["intent"]

        # ── Direct responses (no function execution) ──────
        if intent in ("greeting", "clarification"):
            return ChatResponse(
                message=route["message"],
                intent=intent,
                actions_taken=[],
            )

        # ── Single function call ──────────────────────────
        if intent == "function_call":
            return await self._execute_one(
                fn=route["function"],
                args=route["args"],
                user=current_user,
                session_id=session_id,
                image_url=image_url,
            )

        # ── Multiple function calls (parallel tool calls) ─
        if intent == "multi_function_call":
            return await self._execute_many(
                calls=route["calls"],
                user=current_user,
                session_id=session_id,
                image_url=image_url,
            )

        # ── Unknown intent (safety fallback) ──────────────
        logger.warning("Unknown intent from ai_service: %s", intent)
        return ChatResponse(
            message="I couldn't process that request. Could you rephrase?",
            intent="error",
            actions_taken=[],
        )

    # ══════════════════════════════════════════════════════
    # MULTI: Execute multiple calls, combine results
    # ══════════════════════════════════════════════════════

    async def _execute_many(
        self,
        calls: list[dict],
        user: User,
        session_id: str,
        image_url: Optional[str],
    ) -> ChatResponse:
        """
        Executes each function call sequentially and combines results.

        Example input:
          calls = [
            {"function": "create_issue", "args": {"message": "plumbing broken"}},
            {"function": "query_function", "args": {"query": "yesterday's issues"}},
          ]

        Example output:
          ChatResponse(
            message="🔧 **Issue Created:**\n✅ Issue #142 created...\n\n📊 **Query Result:**\nYesterday you created 2 issues...",
            intent="multi_function_call",
            actions_taken=["create_issue", "query_function"],
          )
        """
        combined_messages = []
        all_actions = []
        first_issue_id = None
        first_assignment_id = None
        first_complaint_id = None

        for call in calls:
            fn_name = call["function"]
            try:
                result = await self._execute_one(
                    fn=fn_name,
                    args=call["args"],
                    user=user,
                    session_id=session_id,
                    image_url=image_url,
                )

                # Extract message from response
                msg_text = result.message if hasattr(result, "message") else str(result)
                combined_messages.append(msg_text)

                # Collect actions
                if hasattr(result, "actions_taken") and result.actions_taken:
                    all_actions.extend(result.actions_taken)
                else:
                    all_actions.append(fn_name)

                # Capture first IDs for navigation
                if not first_issue_id and hasattr(result, "issue_id"):
                    first_issue_id = result.issue_id
                if not first_assignment_id and hasattr(result, "assignment_id"):
                    first_assignment_id = result.assignment_id
                if not first_complaint_id and hasattr(result, "complaint_id"):
                    first_complaint_id = result.complaint_id

            except Exception as e:
                logger.exception("Error executing %s: %s", fn_name, e)
                combined_messages.append(f"❌ **{fn_name}** failed: {str(e)}")
                all_actions.append(f"{fn_name} (failed)")

        # ── Combine with clear separators ─────────────────
        separator = "\n\n---\n\n"
        final_message = separator.join(combined_messages)

        return ChatResponse(
            message=final_message,
            intent="multi_function_call",
            issue_id=first_issue_id,
            assignment_id=first_assignment_id,
            complaint_id=first_complaint_id,
            actions_taken=all_actions,
        )

    # ══════════════════════════════════════════════════════
    # SINGLE: Execute one function call
    # ══════════════════════════════════════════════════════

    async def _execute_one(
        self,
        fn: str,
        args: dict,
        user: User,
        session_id: str,
        image_url: Optional[str] = None,
    ) -> ChatResponse:
        """
        Routes a single function call to the correct service.
        Each service method returns a ChatResponse.
        """
        issue_service = IssueService(self.db)

        if fn == "create_issue":
            return await issue_service.create_from_chat(
                user=user,
                message=args.get("description", args.get("title", "")),
                image_url=image_url,
                ai_service=None,
                # ── Pass ALL pre-extracted fields ──
                skill_name=args.get("skill_name"),
                site_location=args.get("site_location"),
                days_to_fix=args.get("days_to_fix", 3),
                priority_str=args.get("priority", "MEDIUM"),
                title=args.get("title"),
                description=args.get("description"),
            )

        # ── Supervisor: Approve completion ────────────────
        elif fn == "approve_completion":
            return await issue_service.approve_completion(
                user=user,
                issue_id=args["issue_id"],
            )

        # ── Supervisor: Update priority ───────────────────
        elif fn == "update_priority":
            return await issue_service.update_priority(
                user=user,
                issue_id=args["issue_id"],
                new_priority=args["priority"],
            )

        # ── Supervisor: Extend deadline ───────────────────
        elif fn == "extend_deadlines":
            return await issue_service.extend_deadline(
                user=user,
                issue_id=args["issue_id"],
                days=args.get("days", 3),
            )

        # ── Solver: Complete work ─────────────────────────
        elif fn == "solver_complete_work":
            return await issue_service.solver_complete_work(
                solver=user,
                message=args.get("message", "Work completed"),
                image_url=image_url,
                issue_id=args.get("issue_id"),
                ai_service=None,
            )

        # ── Solver: Report blocker ────────────────────────
        elif fn == "solver_report_blocker":
            return await issue_service.solver_report_blocker(
                solver=user,
                message=args.get("message", ""),
                issue_id=args.get("issue_id"),
            )

        # ── Supervisor: Raise complaint ───────────────────
        elif fn == "raise_complaint":
            from app.services.complaint_service import ComplaintService
            complaint_service = ComplaintService(self.db)
            return await complaint_service.create_from_chat(
                user=user,
                message=args["message"],
                image_url=image_url,
                issue_id=args.get("issue_id"),
            )

        # ── Manager: Reassign solver ─────────────────────
        elif fn == "reassign_solver":
            from app.services.assignment_service import AssignmentService
            assignment_service = AssignmentService(self.db)
            return await assignment_service.reassign_from_chat(
                user=user,
                issue_id=args.get("issue_id"),
                solver_name=args.get("solver_name"),
            )

        # ── Database query (SQL agent) ────────────────────
        elif fn == "query_function":
            answer = await run_sql_query(session_id, args["query"])
            return ChatResponse(
                message=answer,
                intent="query_function",
                actions_taken=["sql_agent"],
            )

        # ── General LLM conversation ─────────────────────
        elif fn == "llm_function":
            return ChatResponse(
                message=args.get("message", "How can I help?"),
                intent="llm_function",
                actions_taken=[],
            )

        # ── Unknown function ──────────────────────────────
        else:
            logger.warning("Unknown function: %s", fn)
            return ChatResponse(
                message=f"I don't know how to handle '{fn}'. Could you rephrase?",
                intent="error",
                actions_taken=[],
            )