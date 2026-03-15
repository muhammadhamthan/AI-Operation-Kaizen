"""
PURPOSE: AI intent detection + tool routing.
─────────────────────────────────────────────
SINGLE LLM call that:
  1. Detects what the user wants
  2. Extracts ALL required fields
  3. Asks for clarification if fields are missing

NO separate extract_issue() call. NO second LLM call.
"""

import json
import time
import random
import re
import logging
from groq import Groq, BadRequestError

from app.core.config import settings

logger = logging.getLogger(__name__)

groq_client = Groq(api_key=settings.GROQ_API_KEY)

# ── Greetings handled without LLM call ────────────────────
_GREETINGS = frozenset({
    "hi", "hello", "hey", "good morning", "good evening",
    "good afternoon", "thanks", "thank you", "ok", "bye",
})

# ══════════════════════════════════════════════════════════
# TOOL DEFINITIONS — Extract ALL fields in ONE call
# ══════════════════════════════════════════════════════════

TOOLS = [
    # ── ISSUE CREATION: All fields extracted by the LLM directly ──
    {
        "type": "function",
        "function": {
            "name": "create_issue",
            "description": (
                "Create a new issue when a user reports a facility problem. "
                "Extract ALL fields from the message. "
                "skill_name must be one of: plumbing, electrical, hvac, carpentry, "
                "painting, network, mechanical. "
                "If site or skill cannot be determined, still call this function "
                "with your best guess based on context."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Short issue title, max 50 chars. E.g. 'Pipe Leakage in Main Hall'",
                    },
                    "description": {
                        "type": "string",
                        "description": "Professional description of the problem, 1-2 sentences",
                    },
                    "skill_name": {
                        "type": "string",
                        "enum": [
                            "plumbing", "electrical", "hvac", "carpentry",
                            "painting", "network", "mechanical",
                        ],
                        "description": "Type of skill needed to fix this problem",
                    },
                    "site_location": {
                        "type": "string",
                        "description": "Site name mentioned by user. Must match available sites.",
                    },
                    "days_to_fix": {
                        "type": "integer",
                        "description": "Days to fix. Extract from message, default 3 if not mentioned.",
                        "default": 3,
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["LOW", "MEDIUM", "HIGH"],
                        "description": (
                            "Urgency level. "
                            "urgent/emergency/critical/asap/now = HIGH, "
                            "soon/important = MEDIUM, "
                            "no urgency keywords = MEDIUM"
                        ),
                    },
                },
                "required": ["title", "description", "skill_name", "site_location", "priority"],
            },
        },
    },

    # ── APPROVE COMPLETION ──
    {
        "type": "function",
        "function": {
            "name": "approve_completion",
            "description": "Supervisor approves that work on an issue has been completed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "issue_id": {
                        "type": "integer",
                        "description": "The issue ID to approve",
                    },
                },
                "required": ["issue_id"],
            },
        },
    },

    # ── UPDATE PRIORITY ──
    {
        "type": "function",
        "function": {
            "name": "update_priority",
            "description": "Change the priority level of an existing issue.",
            "parameters": {
                "type": "object",
                "properties": {
                    "issue_id": {
                        "type": "integer",
                        "description": "The issue ID",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["LOW", "MEDIUM", "HIGH"],
                    },
                },
                "required": ["issue_id", "priority"],
            },
        },
    },

    # ── EXTEND DEADLINE ──
    {
        "type": "function",
        "function": {
            "name": "extend_deadlines",
            "description": "Extend the deadline of an issue by a number of days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "issue_id": {
                        "type": "integer",
                        "description": "The issue ID",
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of days to extend",
                        "default": 3,
                    },
                },
                "required": ["issue_id"],
            },
        },
    },

    # ── SOLVER COMPLETE WORK ──
    {
        "type": "function",
        "function": {
            "name": "solver_complete_work",
            "description": "Solver marks their work as completed on an issue.",
            "parameters": {
                "type": "object",
                "properties": {
                    "issue_id": {
                        "type": "integer",
                        "description": "The issue ID",
                    },
                    "message": {
                        "type": "string",
                        "description": "Completion notes",
                    },
                },
                "required": ["issue_id"],
            },
        },
    },

    # ── SOLVER REPORT BLOCKER ──
    {
        "type": "function",
        "function": {
            "name": "solver_report_blocker",
            "description": "Solver reports a blocker preventing work on an issue.",
            "parameters": {
                "type": "object",
                "properties": {
                    "issue_id": {
                        "type": "integer",
                        "description": "The issue ID",
                    },
                    "message": {
                        "type": "string",
                        "description": "Description of the blocker",
                    },
                },
                "required": ["issue_id"],
            },
        },
    },

    # ── RAISE COMPLAINT ──
    {
        "type": "function",
        "function": {
            "name": "raise_complaint",
            "description": (
                "File a complaint about the quality of work on an issue. "
                "Used when supervisor says work is not done properly."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "issue_id": {
                        "type": "integer",
                        "description": "The issue ID. If not mentioned, leave empty.",
                    },
                    "message": {
                        "type": "string",
                        "description": "Complaint details describing what is wrong",
                    },
                },
                "required": ["message"],
            },
        },
    },

    # ── REASSIGN SOLVER ──
    {
        "type": "function",
        "function": {
            "name": "reassign_solver",
            "description": "Reassign an issue to a different solver.",
            "parameters": {
                "type": "object",
                "properties": {
                    "issue_id": {
                        "type": "integer",
                        "description": "The issue ID",
                    },
                    "solver_name": {
                        "type": "string",
                        "description": "Name of the new solver",
                    },
                },
                "required": ["issue_id", "solver_name"],
            },
        },
    },

    # ── DATABASE QUERY ──
    {
        "type": "function",
        "function": {
            "name": "query_function",
            "description": (
                "Query the database for information about issues, sites, users, "
                "analytics, summaries, status, reports, or any data lookup question."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The natural language question to look up",
                    },
                },
                "required": ["query"],
            },
        },
    },

    # ── GENERAL CHAT ──
    {
        "type": "function",
        "function": {
            "name": "llm_function",
            "description": "General conversation, greetings, help, or anything that doesn't fit other tools.",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "The conversational message",
                    },
                },
                "required": ["message"],
            },
        },
    },
]

# ── Build required params lookup once ─────────────────────
_REQUIRED_PARAMS: dict[str, list[str]] = {
    t["function"]["name"]: t["function"]["parameters"].get("required", [])
    for t in TOOLS
}

_FRIENDLY_LABELS = {
    "issue_id": "Issue ID (number)",
    "priority": "priority (LOW / MEDIUM / HIGH)",
    "message": "a description",
    "solver_name": "solver name",
    "days": "number of days",
    "query": "your question",
    "title": "issue title",
    "description": "problem description",
    "skill_name": "skill type (plumbing, electrical, etc.)",
    "site_location": "site name",
}

# ══════════════════════════════════════════════════════════
# SYSTEM PROMPT — Tells LLM to extract ALL fields in ONE call
# ══════════════════════════════════════════════════════════

_SYSTEM_PROMPT = """\
You are an AI assistant for a facility management system.

Route user messages to the correct function and extract ALL required parameters in ONE call.

Function routing guide:
- Problem report (pipe broken, AC not working, etc.) → create_issue
  Extract: title, description, skill_name, site_location, days_to_fix, priority
  skill_name must be one of: plumbing, electrical, hvac, carpentry, painting, network, mechanical
  If user says "fix now" or "urgent" → priority = HIGH
  If days not mentioned → default days_to_fix = 3
  
- Approve work → approve_completion
- Priority change → update_priority
- Deadline extension → extend_deadlines
- Solver done → solver_complete_work
- Solver blocked → solver_report_blocker
- Work complaint → raise_complaint
- Reassign solver → reassign_solver
- Data/status/summary/analytics questions → query_function
- Greetings/general → llm_function

Rules:
- issue_id must be integer
- If user asks to BOTH report a problem AND query data, call BOTH functions (parallel tool calls)
- Check conversation history for missing args before asking the user
- Extract as many fields as possible from the message — do NOT make a second call
- Only ask the user for clarification if critical info is truly missing and cannot be inferred
- For create_issue: infer skill_name from problem description (pipe/water=plumbing, wire/power=electrical, AC/cooling=hvac, etc.)
"""

# ── Max retries for tool_use_failed ───────────────────────
_MAX_RETRIES = 3


def _call_groq_with_retry(messages: list, tools: list) -> object:
    """
    Call Groq API with retry logic for tool_use_failed errors.
    Llama 3.3 sometimes generates XML-style function tags instead
    of proper tool_calls. Retrying usually fixes it.
    """
    for attempt in range(_MAX_RETRIES):
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0,
            )
            return response
        except BadRequestError as e:
            error_body = getattr(e, "body", {}) or {}
            error_info = error_body.get("error", {}) if isinstance(error_body, dict) else {}
            error_code = error_info.get("code", "")

            if error_code == "tool_use_failed" and attempt < _MAX_RETRIES - 1:
                failed_gen = error_info.get("failed_generation", "")
                logger.warning(
                    "Groq tool_use_failed (attempt %d/%d). "
                    "Model generated invalid format: %s. Retrying...",
                    attempt + 1, _MAX_RETRIES, failed_gen[:200],
                )
                time.sleep(0.5 * (2 ** attempt) + random.uniform(0, 0.3))
                continue
            else:
                raise

    raise RuntimeError("Max retries exceeded for Groq API call")


# ══════════════════════════════════════════════════════════
# MAIN ROUTER — Single LLM call does EVERYTHING
# ══════════════════════════════════════════════════════════

async def detect_and_route(session_id: str, user_input: str) -> dict:
    """
    Main router. ONE LLM call that:
      1. Detects intent
      2. Extracts ALL required fields
      3. Returns ready-to-execute function call(s)

    Returns:
      {"intent": "function_call",       "function": name, "args": {...}}
      {"intent": "multi_function_call", "calls": [{...}, ...]}
      {"intent": "clarification",       "message": "..."}
      {"intent": "greeting",            "message": "..."}
    """
    # ── Tier 1: Skip LLM for simple greetings ────────────
    stripped = user_input.lower().strip().rstrip("!.,?")
    if stripped in _GREETINGS:
        return {
            "intent": "greeting",
            "message": "👋 Hello! How can I help you today? You can report issues, check status, or ask questions.",
        }

    # ── Load conversation history ─────────────────────────
    from app.workers.redis_memory import load_memory, save_memory

    memory = load_memory(session_id)
    history_messages = memory.chat_memory.messages[-8:]

    # ── Build messages array ──────────────────────────────
    messages = [{"role": "system", "content": _SYSTEM_PROMPT}]
    for msg in history_messages:
        role = "user" if msg.type == "human" else "assistant"
        messages.append({"role": role, "content": msg.content})
    messages.append({"role": "user", "content": user_input})

    # ── ONE Groq call — does intent + extraction ──────────
    response = _call_groq_with_retry(messages, TOOLS)
    msg = response.choices[0].message

    if msg.tool_calls:
        parsed_calls = []

        for tool_call in msg.tool_calls:
            name = tool_call.function.name
            args = json.loads(tool_call.function.arguments or "{}")

            # Coerce issue_id to int
            if "issue_id" in args:
                try:
                    args["issue_id"] = int(args["issue_id"])
                except (ValueError, TypeError):
                    pass

            # create_issue: set defaults for optional fields
            if name == "create_issue":
                if not args.get("days_to_fix"):
                    args["days_to_fix"] = 3
                try:
                    args["days_to_fix"] = int(args["days_to_fix"])
                except (ValueError, TypeError):
                    args["days_to_fix"] = 3

                if not args.get("priority"):
                    args["priority"] = "MEDIUM"
                args["priority"] = args["priority"].upper()
                if args["priority"] not in ("LOW", "MEDIUM", "HIGH"):
                    args["priority"] = "MEDIUM"

            # query_function: ensure raw user question is passed
            if name == "query_function" and not args.get("query"):
                args["query"] = user_input

            # Check missing required params
            missing = [p for p in _REQUIRED_PARAMS.get(name, []) if p not in args or not args[p]]
            if missing:
                label = _FRIENDLY_LABELS.get(missing[0], missing[0])
                clarification = f"I'd like to help with **{name.replace('_', ' ')}**, but could you provide the **{label}**?"
                memory.chat_memory.add_user_message(user_input)
                memory.chat_memory.add_ai_message(clarification)
                save_memory(session_id, memory)
                return {"intent": "clarification", "message": clarification}

            parsed_calls.append({"function": name, "args": args})

        # Save to memory
        memory.chat_memory.add_user_message(user_input)
        call_summary = ", ".join(f"{c['function']}({c['args']})" for c in parsed_calls)
        memory.chat_memory.add_ai_message(f"[{call_summary}]")
        save_memory(session_id, memory)

        # Single tool call → original format
        if len(parsed_calls) == 1:
            return {
                "intent": "function_call",
                "function": parsed_calls[0]["function"],
                "args": parsed_calls[0]["args"],
            }

        # Multiple tool calls
        return {
            "intent": "multi_function_call",
            "calls": parsed_calls,
        }

    # No tool call — LLM responded with text
    text = msg.content or "I'm not sure what you need. Could you rephrase?"
    memory.chat_memory.add_user_message(user_input)
    memory.chat_memory.add_ai_message(text)
    save_memory(session_id, memory)

    return {"intent": "clarification", "message": text}