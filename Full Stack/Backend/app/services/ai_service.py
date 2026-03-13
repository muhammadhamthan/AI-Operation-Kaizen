"""
AI MASTER SERVICE
Intent detection + SQL agent + Issue creation + Voice call + Final Answer Summarizer
"""

"""
AI MASTER SERVICE
Intent detection + SQL agent + Issue creation + Voice call
READ ONLY SQL agent (SELECT queries only)
"""

import os
import json
import re
from datetime import datetime, timedelta

from dotenv import load_dotenv
from groq import Groq

from langchain_groq import ChatGroq
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits.sql.base import create_sql_agent

from sqlalchemy import text
from twilio.rest import Client

from app.db.session import SessionLocal
from app.core.config import settings

load_dotenv()

# ==================================================
# CONFIG
# ==================================================

groq_client = Groq(api_key=settings.GROQ_API_KEY)

twilio_client = Client(
    settings.TWILIO_ACCOUNT_SID,
    settings.TWILIO_AUTH_TOKEN
)

TWILIO_PHONE = settings.TWILIO_PHONE_NUMBER

# ==================================================
# CHAT MEMORY
# ==================================================

chat_history = ChatMessageHistory()

def get_buffer_context():

    chat_history.messages = chat_history.messages[-10:]

    context = ""

    for msg in chat_history.messages:

        role = "User" if msg.type == "human" else "AI"

        context += f"{role}: {msg.content}\n"

    return context

# ==================================================
# STATE VARIABLES
# ==================================================

pending_issue_context = None
pending_issue_data = None
awaiting_deadline = False

# ==================================================
# GREETING
# ==================================================

async def route_intent(user_input: str):
    """
    AI decides which function should handle the request.
    Returns a JSON response describing the function to call.
    """

    prompt = f"""
You are an AI router.

Decide which function should handle the user request.

Available functions:

create_issue
query_issues
check_status
update_issue
extend_deadline
approve_completion
solver_update_status
solver_complete_work
report_blocker
query_escalations
query_overdue
sql_query

Rules:
- If user wants to CREATE issue → create_issue
- If user asks about issues list → query_issues
- If user asks status of issue → check_status
- If user asks to change something → update_issue
- If user asks extend deadline → extend_deadline
- If supervisor approves issue → approve_completion
- If solver updates progress → solver_update_status
- If solver completes work → solver_complete_work
- If solver reports problem → report_blocker
- If asking escalations → query_escalations
- If asking overdue issues → query_overdue
- If general data question → sql_query

Return JSON only:

{{
 "function": "...",
 "issue_id": number or null
}}

User message:
{user_input}
"""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    return safe_json_parse(response.choices[0].message.content)


# ==================================================
# TOOL DEFINITIONS
# ==================================================

TOOLS = [

# ISSUE MANAGEMENT
{
"type":"function",
"function":{
"name":"create_issue",
"description":"Create a new issue when a user reports a problem.",
"parameters":{
"type":"object",
"properties":{
"message":{"type":"string"}
},
"required":["message"]
}
}
},

{
"type":"function",
"function":{
"name":"approve_completion",
"description":"Supervisor approves solver completed work.",
"parameters":{
"type":"object",
"properties":{
"issue_id":{"type":"integer"}
},
"required":["issue_id"]
}
}
},

{
"type":"function",
"function":{
"name":"update_priority",
"description":"Update issue priority.",
"parameters":{
"type":"object",
"properties":{
"issue_id":{"type":"integer"},
"priority":{"type":"string"}
},
"required":["issue_id","priority"]
}
}
},

{
"type":"function",
"function":{
"name":"extend_deadlines",
"description":"Extend issue deadline.",
"parameters":{
"type":"object",
"properties":{
"issue_id":{"type":"integer"},
"days":{"type":"integer"}
},
"required":["issue_id"]
}
}
},

{
"type":"function",
"function":{
"name":"solver_update_status",
"description":"Solver updates the status of an issue.",
"parameters":{
"type":"object",
"properties":{
"issue_id":{"type":"integer"},
"message":{"type":"string"}
},
"required":["message","issue_id"]
}
}
},

{
"type":"function",
"function":{
"name":"solver_complete_work",
"description":"Solver marks issue work as completed.",
"parameters":{
"type":"object",
"properties":{
"issue_id":{"type":"integer"},
"message":{"type":"string"}
},
"required":["issue_id"]
}
}
},

{
"type":"function",
"function":{
"name":"solver_report_blocker",
"description":"Solver reports blocker preventing work.",
"parameters":{
"type":"object",
"properties":{
"issue_id":{"type":"integer"},
"message":{"type":"string"}
},
"required":["issue_id"]
}
}
},

{
"type":"function",
"function":{
"name":"raise_complaint",
"description":"Raise complaint about issue.",
"parameters":{
"type":"object",
"properties":{
"issue_id":{"type":"integer"},
"message":{"type":"string"}
},
"required":["issue_id","message"]
}
}
},

# DATABASE QUERY
{
"type":"function",
"function":{
"name":"query_function",
"description":"Query database for issues, sites, users, reports or analytics.",
"parameters":{
"type":"object",
"properties":{
"query":{"type":"string"}
},
"required":["query"]
}
}
},

# NORMAL LLM CHAT
{
"type":"function",
"function":{
"name":"llm_function",
"description":"General conversation not related to issues or database.",
"parameters":{
"type":"object",
"properties":{
"message":{"type":"string"}
},
"required":["message"]
}
}
}

]

def check_missing_required(tool_name, args):
    for tool in TOOLS:
        if tool["function"]["name"] == tool_name:
            required = tool["function"]["parameters"].get("required", [])
            missing = [param for param in required if param not in args]
            return missing
    return []



def is_greeting(message):

    greetings = [
        "hi","hello","hey",
        "good morning","good evening",
        "good afternoon","thanks",
        "thank you","ok"
    ]

    msg = message.lower().strip()

    return msg in greetings


def greeting_response():

    return "👋 Hello! How can I assist you today?\nYou can ask about issues, sites, supervisors, or create a new issue."

# ==================================================
# SAFE JSON
# ==================================================

def safe_json_parse(text):

    text = re.sub(r"```json|```", "", text)

    try:

        start = text.find("{")
        end = text.rfind("}") + 1

        return json.loads(text[start:end])

    except:

        return {}

# ==================================================
# ISSUE EXTRACTION
# ==================================================

async def extract_issue(message: str,available_sites = None):

    prompt = f"""
Extract issue details from the message.

Available Sites:
{available_sites}

User Message:
{message}

Return ONLY JSON in this format:

{{
  "skill_name": "string",
  "site_location": "string",
  "days_to_fix": "integer",
  "title": "string",
    "description": "string",
    "priority": "LOW, MEDIUM or HIGH BASED ON CURRENT DATE AND DEADLINE"
}}
"""

    response = groq_client.chat.completions.create(

        model="llama-3.3-70b-versatile",

        messages=[
            {"role":"system","content":"Return JSON only"},
            {"role":"user","content":prompt}
        ],

        temperature=0
    )

    return safe_json_parse(response.choices[0].message.content)

# ==================================================
# DATABASE
# ==================================================

def connect_db():
    return SessionLocal()

# ==================================================
# PHONE FORMAT
# ==================================================

def format_phone_india(phone):

    phone = str(phone).strip().replace(" ","").replace("-","")

    if phone.startswith("+"):
        return phone

    if phone.startswith("0"):
        phone = phone[1:]

    return "+91"+phone

# ==================================================
# ISSUE CREATION
# ==================================================

def create_issue_from_data(data):

    skill = data.get("skill_name")
    location = data.get("site_location")
    days = data.get("days_to_fix",2)

    conn = connect_db()

    try:

        site = conn.execute(
            text("SELECT id FROM sites WHERE LOWER(location) LIKE LOWER(:loc) LIMIT 1"),
            {"loc":f"%{location}%"}
        ).fetchone()

        if not site:
            return "❌ Site not found."

        site_id = site[0]

        solver = conn.execute(
            text("""
            SELECT u.id,u.name,u.phone
            FROM problem_solver_skills pss
            JOIN users u ON u.id = pss.solver_id
            WHERE LOWER(pss.skill_type) LIKE LOWER(:skill)
            AND pss.is_available = true
            LIMIT 1
            """),
            {"skill":f"%{skill}%"}
        ).fetchone()

        if not solver:
            return f"❌ No solver available for skill: {skill}"

        solver_id,name,phone = solver

        phone = format_phone_india(phone)

        supervisor = conn.execute(
            text("SELECT id FROM users WHERE role='SUPERVISOR' LIMIT 1")
        ).fetchone()

        supervisor_id = supervisor[0]

        deadline = datetime.now() + timedelta(days=int(days))

        issue_id = conn.execute(
            text("""
            INSERT INTO issues
            (title,description,priority,status,
            created_at,deadline_at,site_id,
            raised_by_supervisor_id)
            VALUES
            (:title,:desc,'MEDIUM','OPEN',
            NOW(),:deadline,:site_id,:supervisor)
            RETURNING id
            """),
            {
                "title":skill,
                "desc":f"{skill} issue at {location}",
                "deadline":deadline,
                "site_id":site_id,
                "supervisor":supervisor_id
            }
        ).fetchone()[0]

        conn.commit()

        try:

            twilio_client.calls.create(

                twiml=f"""
<Response>
<Say voice="alice">
Hello {name}. You have been assigned issue {issue_id}.
Deadline is {deadline.strftime('%Y-%m-%d')}.
</Say>
</Response>
""",

                from_=TWILIO_PHONE,
                to=phone
            )

        except Exception as call_error:

            print("Twilio error:",call_error)

    except Exception as e:

        conn.rollback()

        return f"❌ Database error: {str(e)}"

    finally:

        conn.close()

    return f"✅ Issue #{issue_id} created and solver {name} notified."

# ==================================================
# SQL SAFETY (READ ONLY)
# ==================================================

def enforce_readonly_query(query):

    forbidden = [
        "insert","update","delete","drop",
        "alter","truncate","create","grant"
    ]

    q = query.lower()

    for word in forbidden:

        if word in q:
            raise Exception("❌ Only SELECT queries allowed.")

    return query

# ==================================================
# DATABASE CONTEXT
# ==================================================

DB_CONTEXT = """
Database tables:

users
- id
- name
- phone
- role (SUPERVISOR, SOLVER, MANAGER)

sites
- id
- location

issues
- id
- title
- description
- priority
- status
- created_at
- deadline_at
- site_id
- raised_by_supervisor_id

issue_assignments
- id
- issue_id
- assigned_to_solver_id
- status

problem_solver_skills
- solver_id
- skill_type
- is_available

call_logs
- id
- issue_id
- solver_id
- call_status
- created_at

complaints
- id
- issue_id
- description

Relationships:

issues.site_id → sites.id
issues.raised_by_supervisor_id → users.id
issue_assignments.issue_id → issues.id
issue_assignments.assigned_to_solver_id → users.id

Rules:
Only generate SELECT queries.
Never modify database.
"""

# ==================================================
# SQL AGENT
# ==================================================

def get_database():

    return SQLDatabase.from_uri(
        settings.AI_DATABASE_URL,
        sample_rows_in_table_info=3
    )


def sql_agent_executor():

    db = get_database()

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=settings.GROQ_API_KEY,
        temperature=0
    )

    agent = create_sql_agent(
        llm=llm,
        db=db,
        verbose=True,
        handle_parsing_errors=True,
        top_k=5
    )

    return agent

# ==================================================
# INTENT DETECTION
# ==================================================

def detect_intent(user_input):

    if is_greeting(user_input):
        return "greeting"

    data = extract_issue(user_input)

    skill = data.get("skill_name")
    location = data.get("site_location")
    days = data.get("days_to_fix")

    if skill and location and days:
        return "issue"

    if skill and location and not days:
        return "clarify"

    return "query"

# ==================================================
# CLARIFICATION
# ==================================================

def ask_issue_or_query(user_input):

    global pending_issue_context
    global pending_issue_data

    pending_issue_context = user_input
    pending_issue_data = extract_issue(user_input)

    return """
⚠️ I detected a possible issue.

Do you want to:

1️⃣ Create ISSUE
2️⃣ Ask QUERY

Reply: ISSUE or QUERY
"""

# ==================================================
# MASTER AGENT
# ==================================================

async def master_agent(user_input: str):

    messages = [
        {
            "role":"system",
            "content":f"""
You are an AI operations assistant.

You must choose the correct function.

Available intents:

create_issue
approve_completion
update_priority
extend_deadlines
solver_complete_work
solver_report_blocker
raise_complaint
query_function
llm_function

Rules:

issue id must be in a interger format.

If user reports problem → create_issue

If supervisor approves issue → approve_completion

If user wants priority change → update_priority

If user wants deadline extension → extend_deadlines

If solver finished work → solver_complete_work

If solver reports blocker → solver_report_blocker

If user complains about issue → raise_complaint

If question requires database information → query_function

If question is general conversation → llm_function
"""
        },
        {
            "role":"user",
            "content":user_input
        }
    ]

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
        temperature=0
    )

    msg = response.choices[0].message

    if msg.tool_calls:

        tool = msg.tool_calls[0]

        name = tool.function.name
        args = json.loads(tool.function.arguments)

        return {
            "intent":"function_call",
            "function":name,
            "args":args
        }

    return {
        "intent":"llm_function",
        "message":msg.content
    }

# ==================================================
# CLI
# ==================================================

if __name__ == "__main__":

    print("🔥 MASTER AI SYSTEM READY")

    while True:

        msg = input("\nYou: ")

        if msg.lower() in ["exit","quit"]:
            break

        result = master_agent(msg)

        print("\n==============================")
        print(result)
        print("==============================")















# """
# AI MASTER SERVICE
# Intent detection + SQL agent + Issue creation + Voice call + Final Answer Summarizer
# """

# import os
# import json
# import re
# from datetime import datetime, timedelta

# from dotenv import load_dotenv
# from groq import Groq

# from langchain_groq import ChatGroq
# from langchain_community.chat_message_histories import ChatMessageHistory
# from langchain_community.utilities import SQLDatabase
# from langchain_community.agent_toolkits.sql.base import create_sql_agent

# from sqlalchemy import text
# from twilio.rest import Client

# from app.db.session import SessionLocal
# from app.core.config import settings

# load_dotenv()

# # ==================================================
# # CONFIG
# # ==================================================

# groq_client = Groq(api_key=settings.GROQ_API_KEY)

# twilio_client = Client(
#     settings.TWILIO_ACCOUNT_SID,
#     settings.TWILIO_AUTH_TOKEN
# )

# TWILIO_PHONE = settings.TWILIO_PHONE_NUMBER

# # ==================================================
# # CHAT MEMORY
# # ==================================================

# chat_history = ChatMessageHistory()

# def get_buffer_context():

#     chat_history.messages = chat_history.messages[-10:]

#     context = ""
#     for msg in chat_history.messages:
#         role = "User" if msg.type == "human" else "AI"
#         context += f"{role}: {msg.content}\n"

#     return context


# # ==================================================
# # GREETING DETECTION
# # ==================================================

# def is_greeting(message):

#     greetings = [
#         "hi",
#         "hello",
#         "hey",
#         "good morning",
#         "good evening",
#         "good afternoon",
#         "thanks",
#         "thank you",
#         "ok"
#     ]

#     msg = message.lower().strip()

#     return msg in greetings


# def greeting_response():

#     return "👋 Hello! How can I assist you today?\nYou can ask about issues, sites, supervisors, or create a new issue."


# # ==================================================
# # SAFE JSON PARSER
# # ==================================================

# def safe_json_parse(text):

#     text = re.sub(r"```json|```", "", text)

#     try:
#         start = text.find("{")
#         end = text.rfind("}") + 1
#         return json.loads(text[start:end])
#     except:
#         return {}


# # ==================================================
# # FINAL ANSWER SUMMARIZER
# # ==================================================

# def summarize_sql_answer(question, sql_result):

#     prompt = f"""
# You convert database query results into clear human answers.

# User Question:
# {question}

# SQL Result:
# {sql_result}

# Rules:
# - Answer in 1 or 2 sentences
# - Be clear and natural
# - Do not show SQL or tuples

# Example:

# Question: give detail of supervisor id 5
# Result: [(5, 'Rajesh')]
# Answer: The supervisor name is Rajesh and his ID is 5.

# Question: list all sites
# Result: [(1,'Chennai'),(2,'Delhi')]
# Answer: The available sites are Chennai and Delhi.

# Return only the final answer.
# """

#     response = groq_client.chat.completions.create(
#         model="llama-3.3-70b-versatile",
#         messages=[
#             {"role": "system", "content": "Return only final user answer"},
#             {"role": "user", "content": prompt}
#         ],
#         temperature=0
#     )

#     return response.choices[0].message.content.strip()


# # ==================================================
# # INTENT DETECTION
# # ==================================================

# def detect_intent(user_input):

#     context = get_buffer_context()

#     prompt = f"""
# Conversation History:
# {context}

# Classify the latest message.

# Message:
# {user_input}

# Return JSON only.

# Example:
# {{"intent":"issue"}}
# or
# {{"intent":"query"}}
# """

#     response = groq_client.chat.completions.create(
#         model="llama-3.3-70b-versatile",
#         messages=[
#             {"role": "system", "content": "Return JSON only"},
#             {"role": "user", "content": prompt}
#         ],
#         temperature=0
#     )

#     result = safe_json_parse(response.choices[0].message.content)

#     return result.get("intent", "query")


# # ==================================================
# # DATABASE CONNECTION
# # ==================================================

# def connect_db():
#     return SessionLocal()


# # ==================================================
# # FORMAT PHONE
# # ==================================================

# def format_phone_india(phone):

#     phone = str(phone).strip()
#     phone = phone.replace(" ", "").replace("-", "")

#     if phone.startswith("+"):
#         return phone

#     if phone.startswith("0"):
#         phone = phone[1:]

#     return "+91" + phone


# # ==================================================
# # ISSUE EXTRACTION
# # ==================================================

# def extract_issue(user_input):

#     prompt = f"""
# Extract fields:

# skill_name
# site_location
# days_to_fix

# Message:
# {user_input}

# Return JSON only.
# """

#     response = groq_client.chat.completions.create(
#         model="llama-3.3-70b-versatile",
#         messages=[
#             {"role": "system", "content": "Return JSON only"},
#             {"role": "user", "content": prompt}
#         ],
#         temperature=0
#     )

#     return safe_json_parse(response.choices[0].message.content)


# # ==================================================
# # HANDLE ISSUE
# # ==================================================

# def handle_issue(user_input):

#     data = extract_issue(user_input)

#     skill = data.get("skill_name")
#     location = data.get("site_location")
#     days = data.get("days_to_fix")

#     try:
#         days = int(days)
#     except:
#         days = 2

#     if not skill or not location:
#         return "❌ Could not understand issue."

#     conn = connect_db()

#     try:

#         site = conn.execute(
#             text("SELECT id FROM sites WHERE LOWER(location) LIKE LOWER(:loc) LIMIT 1"),
#             {"loc": f"%{location}%"}
#         ).fetchone()

#         if not site:
#             return "❌ Site not found."

#         site_id = site[0]

#         solver = conn.execute(
#             text("""
#             SELECT u.id, u.name, u.phone
#             FROM problem_solver_skills pss
#             JOIN users u ON u.id = pss.solver_id
#             WHERE LOWER(pss.skill_type) LIKE LOWER(:skill)
#             AND pss.is_available = true
#             LIMIT 1
#             """),
#             {"skill": f"%{skill}%"}
#         ).fetchone()

#         if not solver:
#             return "❌ No solver available."

#         solver_id, name, phone = solver
#         phone = format_phone_india(phone)

#         supervisor = conn.execute(
#             text("SELECT id FROM users WHERE role='SUPERVISOR' LIMIT 1")
#         ).fetchone()

#         if not supervisor:
#             return "❌ Supervisor not found."

#         supervisor_id = supervisor[0]

#         deadline = datetime.now() + timedelta(days=days)

#         issue_id = conn.execute(
#             text("""
#             INSERT INTO issues
#             (title, description, priority, status,
#              created_at, deadline_at, site_id,
#              raised_by_supervisor_id)

#             VALUES
#             (:title, :desc, 'MEDIUM', 'OPEN',
#              NOW(), :deadline, :site_id, :supervisor)

#             RETURNING id
#             """),
#             {
#                 "title": user_input,
#                 "desc": user_input,
#                 "deadline": deadline,
#                 "site_id": site_id,
#                 "supervisor": supervisor_id
#             }
#         ).fetchone()[0]

#         conn.commit()

#         try:

#             twilio_client.calls.create(
#                 twiml=f"""
# <Response>
# <Say voice="alice">
# Hello {name}. You have been assigned issue {issue_id}.
# Deadline is {deadline.strftime('%Y-%m-%d')}.
# </Say>
# </Response>
# """,
#                 from_=TWILIO_PHONE,
#                 to=phone
#             )

#         except Exception as call_error:

#             print("Twilio Call Failed:", call_error)

#     except Exception as e:

#         conn.rollback()
#         return f"❌ Database Error: {str(e)}"

#     finally:

#         conn.close()

#     return f"✅ Issue #{issue_id} created and solver {name} notified."


# # ==================================================
# # SQL AGENT
# # ==================================================

# def get_database():

#     return SQLDatabase.from_uri(
#         settings.AI_DATABASE_URL,
#         sample_rows_in_table_info=3
#     )


# def sql_agent_executor():

#     db = get_database()

#     llm = ChatGroq(
#         model="llama-3.3-70b-versatile",
#         groq_api_key=settings.GROQ_API_KEY,
#         temperature=0
#     )

#     agent = create_sql_agent(
#         llm=llm,
#         db=db,
#         verbose=True,
#         handle_parsing_errors=True
#     )

#     return agent


# # ==================================================
# # MASTER AGENT
# # ==================================================

# def master_agent(user_input):

#     if is_greeting(user_input):
#         return greeting_response()

#     intent = detect_intent(user_input)

#     print("🧠 Intent:", intent)

#     chat_history.add_user_message(user_input)

#     if intent == "issue":

#         result = handle_issue(user_input)

#     else:

#         context = get_buffer_context()

#         contextual_query = f"""
# Conversation History:
# {context}

# User Question:
# {user_input}
# """

#         agent = sql_agent_executor()

#         try:

#             response = agent.invoke({"input": contextual_query})

#             raw_result = response.get("output", str(response))

#             result = summarize_sql_answer(user_input, raw_result)

#         except Exception as e:

#             print("SQL Agent Error:", e)
#             result = "❌ AI query failed."

#     chat_history.add_ai_message(result)

#     return result


# # ==================================================
# # CLI LOOP
# # ==================================================

# if __name__ == "__main__":

#     print("🔥 MASTER AI SYSTEM READY")

#     while True:

#         msg = input("\nYou: ")

#         if msg.lower() in ["exit", "quit"]:
#             break

#         result = master_agent(msg)

#         print("\n==============================")
#         print(result)
#         print("==============================")