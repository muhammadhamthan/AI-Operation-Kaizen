"""
PURPOSE: Read-only SQL queries from natural language.
OPTIMIZATIONS:
  1. SQLDatabase + agent created ONCE at module load (not per request)
  2. lazy_table_reflection=True — no metadata.reflect() on init
  3. include_tables limits scope to only your app's tables
  4. Custom prefix replaces LangChain's verbose default prompt
  5. Eliminated separate "humanize" LLM call — agent output IS the answer
  6. Memory loaded once, shared with ai_service via session_id
  7. top_k=5 limits result size (prevents context window blowout)
"""

import logging
from functools import lru_cache

from langchain_groq import ChatGroq
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits.sql.base import create_sql_agent
from langchain.agents.agent_types import AgentType

from app.core.config import settings
from app.workers.redis_memory import load_memory, save_memory

logger = logging.getLogger(__name__)

# ── Your app's tables (never changes at runtime) ─────────
_APP_TABLES = [
    "users", "sites", "supervisor_sites", "issues",
    "issue_assignments", "call_logs", "issue_images",
    "complaints", "issue_history", "problem_solver_skills",
    "escalation_rules", "escalations",
]

# ── Custom prefix: 60% smaller than LangChain default ────
_SQL_PREFIX = """You answer questions about a facility management database.

Tables: users, sites, issues, issue_assignments, call_logs, complaints, 
issue_history, problem_solver_skills, escalations, escalation_rules,
issue_images, supervisor_sites.

Key relationships:
- issues.site_id → sites.id
- issues.raised_by_supervisor_id → users.id  
- issue_assignments.issue_id → issues.id
- issue_assignments.assigned_to_solver_id → users.id
- complaints.issue_id → issues.id

Rules:
- Only SELECT queries. Never INSERT/UPDATE/DELETE.
- Limit results to {top_k} rows unless user specifies.
- Always check query syntax before executing.
- Return clear, natural language answers.
"""


@lru_cache(maxsize=1)
def _get_db() -> SQLDatabase:
    """
    Created ONCE and cached forever.
    lazy_table_reflection=True means schema is fetched only when
    the agent actually needs a specific table, not all at init.
    include_tables limits to only our app's tables.
    """
    return SQLDatabase.from_uri(
        settings.AI_DATABASE_URL,
        include_tables=_APP_TABLES,
        lazy_table_reflection=True,
        sample_rows_in_table_info=2,  # 2 not 3: saves ~30% schema tokens
    )


@lru_cache(maxsize=1)
def _get_llm() -> ChatGroq:
    """Created ONCE and cached."""
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=settings.GROQ_API_KEY,
        temperature=0,
    )


@lru_cache(maxsize=1)
def _get_agent():
    """
    Agent created ONCE at first call, then reused.
    This eliminates the 2-5 second metadata.reflect() per request.
    """
    return create_sql_agent(
        llm=_get_llm(),
        db=_get_db(),
        agent_type=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True,
        handle_parsing_errors=True,
        top_k=5,
        prefix=_SQL_PREFIX,
    )


async def run_sql_query(session_id: str, user_input: str) -> str:
    """
    Runs a natural language query against the DB.
    
    Optimization: No separate "humanize" call.
    The agent's output IS already natural language because
    LangChain SQL agent's final step is "Answer the question
    based on the query results" — that's the summarization.
    """
    memory = load_memory(session_id)

    # Build minimal history context (only last 4 exchanges)
    history_text = ""
    for msg in memory.chat_memory.messages[-8:]:
        role = "User" if msg.type == "human" else "AI"
        history_text += f"{role}: {msg.content}\n"

    agent = _get_agent()

    try:
        response = agent.invoke({
            "input": (
                f"Context from conversation:\n{history_text}\n\n"
                f"Question: {user_input}"
            ) if history_text else user_input,
        })
        answer = response.get("output", str(response))

    except Exception as e:
        logger.exception("SQL agent failed: %s", e)
        answer = "I couldn't find that information. Could you rephrase your question?"

    # Save to memory (single load, no double-load)
    memory.chat_memory.add_user_message(user_input)
    memory.chat_memory.add_ai_message(answer)
    save_memory(session_id, memory)

    return answer