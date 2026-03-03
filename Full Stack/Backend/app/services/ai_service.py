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

from langchain_groq import ChatGroq
from groq import Groq
from twilio.rest import Client
import os
import json
import re
from dotenv import load_dotenv

# from agents.issue_agent import handle_issue
# from agents.sql_agent import sql_agent_executor

from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits.sql.base import create_sql_agent
from app.db.session import engine,SessionLocal
from app.core.config import settings


# ==================================================
# 🔐 CONFIG
# ==================================================
GROQ_API_KEY = Groq(api_key=settings.GROQ_API_KEY)

DB_CONFIG = settings.DATABASE_URL
client = GROQ_API_KEY

TWILIO_ACCOUNT_SID = settings.TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN = settings.TWILIO_AUTH_TOKEN
TWILIO_PHONE = settings.TWILIO_PHONE_NUMBER

twilio_client = Client(
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN
)


# ----------------------------------
# BUFFER MEMORY (Session-based)
# ----------------------------------
chat_history = ChatMessageHistory()


def get_buffer_context():
    # Keep last 5 interactions (10 messages total)
    chat_history.messages = chat_history.messages[-10:]

    context = ""
    for msg in chat_history.messages:
        role = "User" if msg.type == "human" else "AI"
        context += f"{role}: {msg.content}\n"
        print("to see the chat history",context)

    return context


# ----------------------------------
# SAFE JSON PARSER
# ----------------------------------
def safe_json_parse(text):
    text = re.sub(r"```json|```", "", text)
    try:
        return json.loads(text)
    except:
        return {}


# ----------------------------------
# INTENT DETECTION
# ----------------------------------
def detect_intent(user_input):

    context = get_buffer_context()

    prompt = f"""
Conversation History:
{context}

Classify latest message:
"{user_input}"

Return:
{{"intent":"issue" or "query"}}
"""

    response = GROQ_API_KEY.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "Return JSON only"},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    return safe_json_parse(response.choices[0].message.content).get("intent", "query")


# ----------------------------------
# MASTER AGENT
# ----------------------------------
def master_agent(user_input):

    intent = detect_intent(user_input)
    print("🧠 Intent:", intent)

    # Add user message to memory
    chat_history.add_user_message(user_input)

    if intent == "issue":
        result = handle_issue(user_input)

    else:
        context = get_buffer_context()

        contextual_query = f"""
                                Conversation History:
                                {context}

                                Current Question:
                                {user_input}
                            """

        # 🔥 Correct way to call SQL agent
        agent = sql_agent_executor() 
        response = agent.invoke({"input": contextual_query})
        result = response.get("output", str(response))

    # Add AI response to memory (MUST be string)
    chat_history.add_ai_message(result)

    return result


def get_database():
    return SQLDatabase.from_uri(
        settings.AI_DATABASE_URL,
        sample_rows_in_table_info=3,
        engine_args={
            "connect_args": {
                "options": "-c statement_timeout=5000"
            }
        }
    )
    
    
# ================= PHONE FORMATTER (+91 INDIA) =================
def format_phone_india(phone):
    phone = str(phone).strip()
    phone = phone.replace(" ", "").replace("-", "")

    if phone.startswith("+"):
        return phone

    if phone.startswith("0"):
        phone = phone[1:]

    return "+91" + phone

# ================= SAFE JSON PARSER =================
def safe_json_parse(text):
    text = re.sub(r"```json|```", "", text)
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        return json.loads(text[start:end])
    except:
        return {}

# ================= AI EXTRACTION =================
def extract_issue(user_input):

    prompt = f"""
Extract:
- skill_name
- site_location
- days_to_fix (integer)

Message: "{user_input}"

Return JSON only.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "Return strict JSON only"},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    return safe_json_parse(response.choices[0].message.content)


def connect_db():
    return SessionLocal()

# ================= MAIN FUNCTION =================
def handle_issue(user_input):

    data = extract_issue(user_input)

    skill = data.get("skill_name")
    location = data.get("site_location")
    days = data.get("days_to_fix")

    try:
        days = int(days)
    except:
        days = 2

    if not skill or not location:
        return "❌ Could not understand issue."

    conn = connect_db()

    try:
        # 🔹 Get Site
        result = conn.execute(
            "SELECT id FROM sites WHERE LOWER(location) LIKE LOWER(%s) LIMIT 1",
            (f"%{location}%",)
        )
        site = result.fetchone()
        if not site:
            return "❌ Site not found."

        site_id = site[0]

        # 🔹 Get Available Solver
        conn.execute("""
            SELECT u.id, u.name, u.phone
            FROM problem_solver_skills pss
            JOIN users u ON u.id = pss.solver_id
            WHERE LOWER(pss.skill_type) LIKE LOWER(%s)
              AND pss.is_available = true
            LIMIT 1
        """, (f"%{skill}%",))

        solver = conn.fetchone()
        if not solver:
            return "❌ No solver available."

        solver_id, name, phone = solver
        phone = format_phone_india(phone)

        # 🔹 Get Supervisor (NOT NULL)
        conn.execute("""
            SELECT id FROM users
            WHERE role = 'SUPERVISOR'
            LIMIT 1
        """)
        supervisor = conn.fetchone()

        if not supervisor:
            return "❌ No supervisor found."

        supervisor_id = supervisor[0]

        deadline = datetime.now() + timedelta(days=days)

        # 🔥 Insert Issue
        conn.execute("""
            INSERT INTO issues
            (title, description, priority, status,
             created_at, deadline_at, site_id,
             raised_by_supervisor_id)
            VALUES (%s, %s, 'MEDIUM', 'OPEN',
                    NOW(), %s, %s, %s)
            RETURNING id
        """, (
            user_input,
            user_input,
            deadline,
            site_id,
            supervisor_id
        ))

        issue_id = conn.fetchone()[0]
        conn.commit()

        print("\n✅ Assigned Solver:", name)
        print("📞 Calling:", phone)

        # ================= VOICE CALL =================
        try:
            call = twilio_client.calls.create(
                twiml=f"""
                <Response>
                    <Say voice="alice">
                        Hello {name}.
                        You have been assigned Issue number {issue_id}.
                        The deadline is {deadline.strftime('%Y-%m-%d')}.
                        Please check the system immediately.
                    </Say>
                </Response>
                """,
                from_=TWILIO_PHONE,
                to=phone
            )

            print("📞 Call SID:", call.sid)

        except Exception as call_error:
            print("❌ Call Failed:", call_error)

    except Exception as e:
        conn.rollback()
        return f"❌ Database Error: {str(e)}"

    finally:
        conn.close()
    return f"✅ Issue #{issue_id} created and voice call placed to {name}"

def sql_agent_executor():
    db = get_database()
    
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=settings.GROQ_API_KEY,
        temperature=0
   )
    return create_sql_agent(
        llm=llm,
        db=db,
        verbose=True,
        handle_parsing_errors=True
    )

# ----------------------------------
# MAIN LOOP
# ----------------------------------
if __name__ == "__main__":

    print("🔥 MASTER AI SYSTEM READY")

    while True:

        msg = input("\nYou: ")

        if msg.lower() in ["exit", "quit"]:
            break

        result = master_agent(msg)

        print("\n==============================")
        print(result)
        print("==============================")








# # ==================================================
# # 💾 GLOBAL CACHE
# # ==================================================
# query_cache = {}


# # ==================================================
# # 📄 AUTO FETCH REAL SCHEMA
# # ==================================================
# def get_schema():
#     with engine.connect() as conn:
#         result = conn.execute(
#             __import__("sqlalchemy").text("""
#                 SELECT table_name, column_name, data_type
#                 FROM information_schema.columns
#                 WHERE table_schema = 'public'
#                 ORDER BY table_name, ordinal_position;
#             """)
#         )
#         rows = result.fetchall()

#     schema_dict = {}
#     for table, column, dtype in rows:
#         schema_dict.setdefault(table, []).append(f"- {column} ({dtype})")

#     schema_text = ""
#     for table, columns in schema_dict.items():
#         schema_text += f"\nTable: {table}\nColumns:\n"
#         schema_text += "\n".join(columns)
#         schema_text += "\n"

#     return schema_text


# # ==================================================
# # 🛡️ SAFE SQL EXECUTION
# # ==================================================
# def execute_sql(sql_query):
#     try:
#         query = sql_query.strip().lower()

#         # Allow only SELECT
#         if not query.startswith("select"):
#             return {"success": False, "error": "Only SELECT queries allowed."}

#         # Block dangerous keywords
#         blocked = ["insert", "update", "delete", "drop", "alter", "truncate"]
#         if any(word in query for word in blocked):
#             return {"success": False, "error": "Dangerous query blocked."}

#         # Block multiple statements
#         if ";" in query[:-1]:
#             return {"success": False, "error": "Multiple statements not allowed."}

#         with engine.connect() as conn:
#             from sqlalchemy import text
#             result = conn.execute(text(sql_query))
#             columns = list(result.keys())
#             rows = result.fetchall()

#         formatted = [dict(zip(columns, row)) for row in rows]

#         return {
#             "success": True,
#             "count": len(formatted),
#             "data": formatted[:30]
#         }

#     except Exception as e:
#         return {
#             "success": False,
#             "error": str(e),
#             "count": 0,
#             "data": []
#         }


# # ==================================================
# # 🤖 AUTONOMOUS MULTI-TABLE SQL AGENT WITH CACHE
# # ==================================================
# def sql_agent(user_query):
#     return "Agent functionality is currently disabled for testing purposes."
# #     today = date.today()
#     schema = get_schema()
#     global query_cache

#     # --------------------------------------------------
#     # Check cache first
#     # --------------------------------------------------
#     cache_key = user_query.strip().lower()
#     if cache_key in query_cache:
#         print("💾 Using cached result for repeated user query")
#         return query_cache[cache_key]["final_answer"]

#     # --------------------------------------------------
#     # SYSTEM PROMPT
#     # --------------------------------------------------
#     system_prompt = f"""
# You are a production-grade Industrial SQL AI Agent.

# Today's date: {today}

# Live Database Schema:
# {schema}

# ====================================================
# RELATIONSHIPS:
# ====================================================

# users.id = supervisor_sites.supervisor_id
# users.id = issues.raised_by_supervisor_id
# users.id = issue_assignments.assigned_to_solver_id
# users.id = issue_assignments.assigned_by_supervisor_id
# users.id = complaints.raised_by_supervisor_id
# users.id = complaints.target_solver_id
# users.id = call_logs.solver_id
# users.id = issue_images.uploaded_by_user_id
# users.id = issue_history.changed_by_user_id
# users.id = problem_solver_skills.solver_id

# sites.id = supervisor_sites.site_id
# sites.id = issues.site_id
# sites.id = problem_solver_skills.site_id

# issues.id = issue_assignments.issue_id
# issues.id = complaints.issue_id
# issues.id = issue_images.issue_id
# issues.id = issue_history.issue_id

# issue_assignments.id = call_logs.assignment_id
# issue_assignments.id = complaints.assignment_id

# ====================================================
# INTENT RULES:
# ====================================================

# If user says:
# - "give id 2 details" → default to users table
# - "supervisor id 2" → users WHERE role='supervisor'
# - "site id 3" → sites table
# - "issue id 4" → issues table
# - "assignment id 1" → issue_assignments
# - "who fixed issue 1" → join issue_assignments + users
# - "complaints for issue 2" → join complaints + users
# - "call attempts for issue 1" → join call_logs + issue_assignments
# - "available plumber in site 1" → problem_solver_skills + users
# - "issues today" → DATE(created_at) = CURRENT_DATE

# If ambiguous → ask clarification.

# ====================================================
# STRICT RULES:
# ====================================================

# - ONLY generate SELECT queries.
# - NO multiple statements.
# - Use LOWER(column) LIKE '%keyword%' for text search.
# - Use correct JOINs when needed.
# - If retrieving multiple rows → ORDER BY newest date DESC.
# - If single row by ID → no ORDER BY needed.
# - If SQL fails → analyze error and fix it.
# - When finished → summarize clearly.

# ====================================================
# Respond ONLY in JSON:

# {{{{
#   "thought": "...",
#   "action": "execute_sql",
#   "action_input": "SELECT ...",
#   "final_answer": null
# }}}}

# OR

# {{{{
#   "thought": "...",
#   "final_answer": "clear human readable summary"
# }}}}
# """

#     conversation = [
#         {"role": "system", "content": system_prompt},
#         {"role": "user", "content": user_query}
#     ]

#     for _ in range(max_iterations):
#         response = client.chat.completions.create(
#             model="llama-3.3-70b-versatile",
#             messages=conversation,
#             temperature=0
#         )

#         reply = response.choices[0].message.content.strip()

#         try:
#             decision = json.loads(reply)
#         except:
#             return reply

#         thought = decision.get("thought")
#         action = decision.get("action")
#         action_input = decision.get("action_input")
#         final_answer = decision.get("final_answer")

#         print(f"\n💭 THOUGHT: {thought}")

#         if final_answer:
#             query_cache[cache_key] = {"final_answer": final_answer}
#             return final_answer

#         if action == "execute_sql":
#             print(f"🔧 SQL:\n{action_input}")
#             result = execute_sql(action_input)

#             if result["success"]:
#                 observation = f"""
# Query Success.
# Rows Found: {result['count']}
# Data:
# {json.dumps(result['data'], indent=2, default=str)}
# """
#                 final_answer = f"Retrieved {result['count']} rows. Data sample:\n{json.dumps(result['data'], indent=2, default=str)}"
#                 query_cache[cache_key] = {"final_answer": final_answer}
#             else:
#                 observation = f"SQL Error: {result['error']}"
#                 final_answer = observation
#                 query_cache[cache_key] = {"final_answer": final_answer}

#         else:
#             observation = "Invalid action."
#             final_answer = observation
#             query_cache[cache_key] = {"final_answer": final_answer}

#         conversation.append({"role": "assistant", "content": json.dumps(decision)})
#         conversation.append({
#             "role": "user",
#             "content": f"Observation:\n{observation}\nContinue reasoning or return final_answer."
#         })

#     return "⚠️ Max iterations reached."
