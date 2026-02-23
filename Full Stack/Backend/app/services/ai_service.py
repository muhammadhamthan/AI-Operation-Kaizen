"""
PURPOSE: AI Service — SQL ReAct Agent for fetching data.
─────────────────────────────────────────────────────────
Contains ONLY:
  1. connect_db()    → psycopg2 connection
  2. get_schema()    → auto-fetch live DB schema
  3. execute_sql()   → safe SELECT-only execution
  4. sql_agent()     → autonomous ReAct agent with cache

ALL database access is psycopg2 ONLY.
"""

from datetime import date
import json

from groq import Groq

from app.db.session import engine,SessionLocal
from app.core.config import settings


# ==================================================
# 🔐 CONFIG
# ==================================================
GROQ_API_KEY = Groq(api_key=settings.GROQ_API_KEY)

DB_CONFIG = settings.DATABASE_URL
client = GROQ_API_KEY


# ==================================================
# 💾 GLOBAL CACHE
# ==================================================
query_cache = {}


# ==================================================
# 📄 AUTO FETCH REAL SCHEMA
# ==================================================
def get_schema():
    with engine.connect() as conn:
        result = conn.execute(
            __import__("sqlalchemy").text("""
                SELECT table_name, column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position;
            """)
        )
        rows = result.fetchall()

    schema_dict = {}
    for table, column, dtype in rows:
        schema_dict.setdefault(table, []).append(f"- {column} ({dtype})")

    schema_text = ""
    for table, columns in schema_dict.items():
        schema_text += f"\nTable: {table}\nColumns:\n"
        schema_text += "\n".join(columns)
        schema_text += "\n"

    return schema_text


# ==================================================
# 🛡️ SAFE SQL EXECUTION
# ==================================================
def execute_sql(sql_query):
    try:
        query = sql_query.strip().lower()

        # Allow only SELECT
        if not query.startswith("select"):
            return {"success": False, "error": "Only SELECT queries allowed."}

        # Block dangerous keywords
        blocked = ["insert", "update", "delete", "drop", "alter", "truncate"]
        if any(word in query for word in blocked):
            return {"success": False, "error": "Dangerous query blocked."}

        # Block multiple statements
        if ";" in query[:-1]:
            return {"success": False, "error": "Multiple statements not allowed."}

        with engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text(sql_query))
            columns = list(result.keys())
            rows = result.fetchall()

        formatted = [dict(zip(columns, row)) for row in rows]

        return {
            "success": True,
            "count": len(formatted),
            "data": formatted[:30]
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "count": 0,
            "data": []
        }


# ==================================================
# 🤖 AUTONOMOUS MULTI-TABLE SQL AGENT WITH CACHE
# ==================================================
def sql_agent(user_query, max_iterations=6):
    today = date.today()
    schema = get_schema()
    global query_cache

    # --------------------------------------------------
    # Check cache first
    # --------------------------------------------------
    cache_key = user_query.strip().lower()
    if cache_key in query_cache:
        print("💾 Using cached result for repeated user query")
        return query_cache[cache_key]["final_answer"]

    # --------------------------------------------------
    # SYSTEM PROMPT
    # --------------------------------------------------
    system_prompt = f"""
You are a production-grade Industrial SQL AI Agent.

Today's date: {today}

Live Database Schema:
{schema}

====================================================
RELATIONSHIPS:
====================================================

users.id = supervisor_sites.supervisor_id
users.id = issues.raised_by_supervisor_id
users.id = issue_assignments.assigned_to_solver_id
users.id = issue_assignments.assigned_by_supervisor_id
users.id = complaints.raised_by_supervisor_id
users.id = complaints.target_solver_id
users.id = call_logs.solver_id
users.id = issue_images.uploaded_by_user_id
users.id = issue_history.changed_by_user_id
users.id = problem_solver_skills.solver_id

sites.id = supervisor_sites.site_id
sites.id = issues.site_id
sites.id = problem_solver_skills.site_id

issues.id = issue_assignments.issue_id
issues.id = complaints.issue_id
issues.id = issue_images.issue_id
issues.id = issue_history.issue_id

issue_assignments.id = call_logs.assignment_id
issue_assignments.id = complaints.assignment_id

====================================================
INTENT RULES:
====================================================

If user says:
- "give id 2 details" → default to users table
- "supervisor id 2" → users WHERE role='supervisor'
- "site id 3" → sites table
- "issue id 4" → issues table
- "assignment id 1" → issue_assignments
- "who fixed issue 1" → join issue_assignments + users
- "complaints for issue 2" → join complaints + users
- "call attempts for issue 1" → join call_logs + issue_assignments
- "available plumber in site 1" → problem_solver_skills + users
- "issues today" → DATE(created_at) = CURRENT_DATE

If ambiguous → ask clarification.

====================================================
STRICT RULES:
====================================================

- ONLY generate SELECT queries.
- NO multiple statements.
- Use LOWER(column) LIKE '%keyword%' for text search.
- Use correct JOINs when needed.
- If retrieving multiple rows → ORDER BY newest date DESC.
- If single row by ID → no ORDER BY needed.
- If SQL fails → analyze error and fix it.
- When finished → summarize clearly.

====================================================
Respond ONLY in JSON:

{{{{
  "thought": "...",
  "action": "execute_sql",
  "action_input": "SELECT ...",
  "final_answer": null
}}}}

OR

{{{{
  "thought": "...",
  "final_answer": "clear human readable summary"
}}}}
"""

    conversation = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query}
    ]

    for _ in range(max_iterations):
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=conversation,
            temperature=0
        )

        reply = response.choices[0].message.content.strip()

        try:
            decision = json.loads(reply)
        except:
            return reply

        thought = decision.get("thought")
        action = decision.get("action")
        action_input = decision.get("action_input")
        final_answer = decision.get("final_answer")

        print(f"\n💭 THOUGHT: {thought}")

        if final_answer:
            query_cache[cache_key] = {"final_answer": final_answer}
            return final_answer

        if action == "execute_sql":
            print(f"🔧 SQL:\n{action_input}")
            result = execute_sql(action_input)

            if result["success"]:
                observation = f"""
Query Success.
Rows Found: {result['count']}
Data:
{json.dumps(result['data'], indent=2, default=str)}
"""
                final_answer = f"Retrieved {result['count']} rows. Data sample:\n{json.dumps(result['data'], indent=2, default=str)}"
                query_cache[cache_key] = {"final_answer": final_answer}
            else:
                observation = f"SQL Error: {result['error']}"
                final_answer = observation
                query_cache[cache_key] = {"final_answer": final_answer}

        else:
            observation = "Invalid action."
            final_answer = observation
            query_cache[cache_key] = {"final_answer": final_answer}

        conversation.append({"role": "assistant", "content": json.dumps(decision)})
        conversation.append({
            "role": "user",
            "content": f"Observation:\n{observation}\nContinue reasoning or return final_answer."
        })

    return "⚠️ Max iterations reached."