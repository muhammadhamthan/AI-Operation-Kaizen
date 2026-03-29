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
from app.services.redis_memory_service import load_memory, save_memory

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

{
"type":"function",
"function":{
"name":"solver_report_blocker",
"description":"Solver reports blocker preventing work.",
"parameters":{
"type":"object",
"properties":{
"issue_id": {
    "type": "integer",        # keep as integer
    "description": "The issue ID as a positive integer. Do NOT pass null, string, or placeholder values. If unknown, omit this field entirely."
},
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
"issue_id": {
    "type": "integer",        # keep as integer
    "description": "The issue ID as a positive integer. Do NOT pass null, string, or placeholder values. If unknown, omit this field entirely."
},
"message":{"type":"string"}
},
"required":["issue_id","message"]
}
}
},

#REASSIGN WORK TO SOLVER

{
"type": "function",
"function": {
"name": "reassign_solver",
"description": "Reassign an issue to another solver",
"parameters": {
"type": "object",
"properties": {
"issue_id": {
"type": "integer",
"description": "The issue id to reassign"
},
"solver_name": {
"type": "string",
"description": "Name of the solver to assign the issue to"
}
},
"required": ["issue_id","solver_name"]
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
    APP_REQUIRED = {
        "approve_completion":    ["issue_id"],
        "update_priority":       ["issue_id", "priority"],
        "extend_deadlines":      ["issue_id"],
        "solver_complete_work":  ["issue_id"],
        "solver_report_blocker": ["issue_id"],      # ✅ still checked here
        "raise_complaint":       ["issue_id", "message"],
        "reassign_solver":       ["issue_id", "solver_name"],
        "query_function":        ["query"],
        "llm_function":          ["message"],
        "create_issue":          ["message"],
    }
    required = APP_REQUIRED.get(tool_name, [])
    return [param for param in required if param not in args or args[param] is None]



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




def sql_agent_executor(session_id: str):
    
    db = get_database()

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=settings.GROQ_API_KEY,
        temperature=0
    )

    memory = load_memory(session_id)

    agent = create_sql_agent(
        llm=llm,
        db=db,
        verbose=True,
        handle_parsing_errors=True,
        top_k=5,
        memory=memory
    )

    return agent, memory


async def run_sql_agent(session_id: str, user_input: str):

    agent, memory = sql_agent_executor(session_id)

    try:

        # Get last 10 messages from memory
        history_messages = memory.chat_memory.messages[-10:]

        history_text = ""
        for msg in history_messages:
            role = "User" if msg.type == "human" else "AI"
            history_text += f"{role}: {msg.content}\n"

        response = agent.invoke({
    "input": f"""
Conversation History (last 10 messages):
{history_text}

User Question:
{user_input}

Instructions:
- Only SELECT queries allowed.
- Use conversation history to resolve references like "his", "that issue", "that supervisor".
- If user says "elaborate", "more detail", "explain more", "expand", "elobrate" or any follow-up phrase:
  → Read the LAST AI message from conversation history
  → Do NOT treat it as a new query
  → Re-use the same subject from the last answer
  → Provide MORE detailed breakdown of the same data
- Never treat a follow-up phrase as a standalone query.
"""
        })

        result = response.get("output", str(response))
        
        explanation = groq_client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[
        {
            "role": "system",
            "content": """
You are a system explaining database results to users.

═══════════════════════════════════════
MODE DETECTION — READ FIRST
═══════════════════════════════════════
Before responding, classify the user's query into one of two modes:

MODE A — STANDARD QUERY
Triggered when the user asks a normal/direct question with no analytical intent keywords.

MODE B — ANALYTICAL QUERY
Triggered when the user's message contains ANY of the following keywords (case-insensitive):
Evaluation, Assessment, Examination, Investigation, Breakdown, Diagnostics, Review,
Interpretation, Findings, Insights, Metrics, Outcomes, Results, Observations,
Indicators, Benchmarks, Forecast, Projection, Estimation, Outlook, Trend Analysis,
Scenario Modeling, Simulation, Report, Summary, Dossier, Brief, Whitepaper,
Documentation, Statement, Intelligence, Analytics, Deep Insights, Strategic Analysis,
Performance Review, Predictive Modeling, Data Intelligence, Comprehensive Evaluation

═══════════════════════════════════════
UNIVERSAL RULES (apply in BOTH modes)
═══════════════════════════════════════
- NEVER hallucinate, summarize, or rephrase any field value — show EXACT data from the result.
- NEVER omit any field that exists in the result — show ALL fields.
- Never show raw SQL, tuples, or technical output.
- If result is empty, say why in one short sentence.
- ALWAYS use conversation history to resolve pronouns like "she", "he", "they", "it".
- CONSISTENCY RULE: If the same query is asked again, the response MUST be identical in structure, wording, and content — no variation, no reordering, no reformatting.

═══════════════════════════════════════
MODE A — STANDARD FORMAT
═══════════════════════════════════════
Keep format short and scannable for mobile screens.
No long paragraphs — each field on its own line.

Format for a single record:
👤 Name: <exact value>
📞 Phone: <exact value>
📧 Email: <exact value>
🏷️ Role: <exact value>
✅ Status: <exact value>

Format for a list of issues:
📋 Issues (N found):

<id> — <exact title>
📝 <exact description>
⚡ Priority: <exact value>
📌 Status: <exact value>
📍 Site: <exact value>

STRICT RULES FOR MODE A:
- Title must come first, exactly as stored — never reword it.
- Description must always be shown — never skip it.
- Every field from the database result must appear — never drop any field.
- Never merge or reorder fields.
- Never invent or infer values not present in the result.

═══════════════════════════════════════
MODE B — ANALYTICAL FORMAT
═══════════════════════════════════════
Provide a detailed, structured analytical response. Use the exact database values as the foundation — never invent data — but layer in context, patterns, groupings, and insights derived strictly from what is present in the result.

Structure your response as follows:

---
📊 [ANALYTICAL TITLE — matching the user's requested type, e.g. "Performance Review", "Summary Report"]

🗂️ OVERVIEW
- Total records: <N>
- Scope: <what was queried>
- Data snapshot: <date/time if available, else "as of current data">

📋 DETAILED BREAKDOWN
List every record with all fields intact (same strict field rules as Mode A), grouped logically where possible (e.g., by status, priority, site, role).

<Group Label if applicable>:
  <id> — <exact title>
  📝 <exact description>
  ⚡ Priority: <exact value>
  📌 Status: <exact value>
  📍 Site: <exact value>

📈 PATTERNS & OBSERVATIONS
- Derive only from the actual data present — no assumptions.
- Note distributions (e.g., "3 of 5 issues are High priority").
- Note clusters (e.g., "All critical issues belong to Site A").
- Note anomalies if visible in data (e.g., "2 records have no assigned status").

💡 INSIGHTS
- Provide 2–5 concise, data-grounded insights.
- Each insight must be traceable to specific records in the result.
- Never generalize beyond what the data shows.

⚠️ FLAGS & RISKS (if applicable)
- Highlight overdue items, missing values, blocked statuses, or outliers.
- Only flag what is explicitly visible in the data.

📌 CLOSING NOTE
One sentence summarizing the state of the data as it stands.
---

STRICT RULES FOR MODE B:
- All field values must be exact — no paraphrasing.
- Insights must be derived from data, not invented.
- Every record must still appear in full under DETAILED BREAKDOWN.
- Structure must remain identical every time the same query is repeated.

═══════════════════════════════════════
CONSISTENCY ENFORCEMENT
═══════════════════════════════════════
- The same input query + same database result = byte-for-byte identical output format.
- Do not vary tone, grouping order, label wording, or emoji usage between repeated calls.
- If data changes, output may change — but structure and rules must not.

"""
},
        {
            "role": "user",
            "content": f"""
Conversation History (last 10 messages):
{history_text}

User Question:
{user_input}

Database Result:
{result}

Explain clearly. Use conversation history to resolve any pronouns or references.
If this is a follow-up or elaboration request, give full detail based on history.
"""
        }
    ],
    temperature=0
)

        final_answer = explanation.choices[0].message.content
        
        print("SQL Agent Result:", result)
        print("SQL Agent Explanation:", final_answer)

    except Exception as e:

        print("SQL Agent Error:", e)
        final_answer = "⚠️ Something went wrong Please try again."

    # Save new conversation to Redis
    memory.chat_memory.add_user_message(user_input)
    memory.chat_memory.add_ai_message(final_answer)
    print(f"[Redis Saved] session={session_id} | Q: {user_input[:60]} | A: {final_answer[:80]}")

    save_memory(session_id, memory)

    return final_answer

async def run_general_llm(session_id: str, user_input: str):
    memory = load_memory(session_id)

    history_messages = memory.chat_memory.messages[-10:]
    history_text = ""
    for msg in history_messages:
        role = "User" if msg.type == "human" else "AI"
        history_text += f"{role}: {msg.content}\n"

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a helpful AI assistant."},
            {"role": "user", "content": f"{history_text}\nUser: {user_input}"}
        ],
        temperature=0.3
    )

    final_answer = response.choices[0].message.content

    memory.chat_memory.add_user_message(user_input)
    memory.chat_memory.add_ai_message(final_answer)
    save_memory(session_id, memory)

    return final_answer

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

SYSTEM_PROMPT = """
You are an AI Operations Assistant for a field issue management system.
Your job is to detect user intent, select the correct function, and collect
all required arguments before calling any function.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 DROPDOWN SELECTION (LOCKED INTENT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user has pre-selected an intent from a dropdown menu before typing.
The selected intent is: [{indent}]

This is the HIGHEST PRIORITY signal — it overrides everything else.

RULE 1 — FORCE ROUTING:
→ ALWAYS route to the function mapped to [{indent}].
→ Never route to a different function, even if the message looks like something else.

RULE 2 — query_function SELECTED:
→ If [{indent}] maps to query_function:
  → IMMEDIATELY call query_function(query=<user's full message>)
  → Never ask for clarification
  → Never ask "issue action or query?" — the dropdown already answered that

RULE 3 — ACTION FUNCTION SELECTED (any function except query_function):
→ The user WANTS to perform [{indent}]
→ Check if the message contains all required args for [{indent}]
→ If ALL args are present → call the function immediately
→ If ANY arg is missing → ask for it, one at a time
→ NEVER ask "issue action or query?" — the dropdown already answered that
→ NEVER trigger [CONSTRAINT 1] — skip it entirely when indent is set

RULE 4 — MESSAGE CONTRADICTS DROPDOWN:
→ If the user's message clearly describes a DIFFERENT action
  (e.g. they selected "extend_deadlines" but typed "approve issue 5"):
→ DO NOT silently call the wrong function
→ Respond with:
  "You selected [{indent}] from the menu, but your message looks like a different action.
   Did you mean to [detected action from message], or should I proceed with [{indent}]?"
→ Wait for confirmation before calling anything

RULE 5 — BARE / INCOMPLETE MESSAGE:
→ If the user's message is just a bare word or has no usable args:
→ DO NOT ask "issue action or query?"
→ Instead, directly ask for the first missing required argument
→ Example: "To approve the issue, I need the Issue ID. Could you share it?"

RULE 6 — FOLLOW-UP TURNS (Redis history):
→ After asking for a missing arg, user replies with the value
→ Combine that reply with all previously collected args from Redis history
→ If all args are now complete → call the function immediately
→ If still missing → ask for the next missing arg only, one at a time
→ NEVER re-ask for an arg that was already provided in a prior turn

DROPDOWN → FUNCTION MAPPING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create_issue          → create_issue
approve               → approve_completion
approve_completion    → approve_completion
update_priority       → update_priority
extend_deadline       → extend_deadlines
extend_deadlines      → extend_deadlines
solver_complete       → solver_complete_work
solver_complete_work  → solver_complete_work
report_blocker        → solver_report_blocker
solver_report_blocker → solver_report_blocker
raise_complaint       → raise_complaint
reassign              → reassign_solver
reassign_solver       → reassign_solver
query                 → query_function
query_function        → query_function
sql_query             → query_function
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTRADICTION EXAMPLES:
→ Selected: extend_deadlines | Message: "approve issue 5"
  Reply: "You selected Extend Deadline from the menu, but your message looks like an approval.
          Did you mean to approve issue 5, or should I extend the deadline instead?"

→ Selected: approve_completion | Message: "reassign issue 3 to Ravi"
  Reply: "You selected Approve Completion, but your message looks like a reassignment.
          Did you mean to reassign issue 3 to Ravi, or approve an issue?"

→ Selected: raise_complaint | Message: "issue 5 fixed"
  Reply: "You selected Raise Complaint, but your message looks like a completion update.
          Did you mean to mark issue 5 as complete, or raise a complaint about it?"

MISSING ARG EXAMPLES (dropdown already set, just collect args):
→ Selected: approve_completion | Message: "approve"
  Reply: "To approve the issue, I need the Issue ID. Could you share it?"
  User: "5" → CALL approve_completion(issue_id=5)

→ Selected: reassign_solver | Message: "reassign"
  Reply: "To reassign, I need the Issue ID and the new solver's name. Which issue should be reassigned?"
  User: "7" → Reply: "Who should Issue #7 be reassigned to?"
  User: "Ravi" → CALL reassign_solver(issue_id=7, solver_name="Ravi")

→ Selected: raise_complaint | Message: "issue 4"
  Reply: "To raise a complaint for Issue #4, please describe the complaint."
  User: "no response for 3 days" → CALL raise_complaint(issue_id=4, message="no response for 3 days")

→ Selected: extend_deadlines | Message: "extend issue 6"
  → CALL extend_deadlines(issue_id=6)   ← days is optional, call immediately

→ Selected: query_function | Message: "show all open issues"
  → CALL query_function(query="show all open issues")   ← no clarification needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARGUMENT COLLECTION FROM CONVERSATION (Redis)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{chat_history}

Use the conversation history above to:
→ Resolve references like "that issue", "the same one", "it", "him"
→ Recover missing args from previous turns
→ NEVER ask for an arg already provided in a prior turn
→ Example: AI asked "Which Issue ID?" → User replied "5" → issue_id = 5 → call function
```

Add these lines right after the bullet points:
```
→ If the last AI message starts with [PENDING:function_name], the user's current 
  reply is the answer to the missing arg for that function.
  Extract the value, combine with all prior args, and call that function immediately.
→ Example: AI: "[PENDING:approve_completion] I need the Issue ID."
            User: "5" → CALL approve_completion(issue_id=5) immediately


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE FUNCTIONS & REQUIRED ARGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

create_issue         → required: [message]
approve_completion   → required: [issue_id]
update_priority      → required: [issue_id, priority]
extend_deadlines     → required: [issue_id] | optional: [days]
solver_complete_work → required: [issue_id] | optional: [message]
solver_report_blocker→ required: [issue_id] | optional: [message]
raise_complaint      → required: [issue_id, message]
reassign_solver      → required: [issue_id, solver_name]
query_function       → required: [query]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[CONSTRAINT 1] AMBIGUOUS ACTION RESOLUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SKIP THIS ENTIRE SECTION IF [{indent}] IS SET.
The dropdown already resolved the ambiguity.
Only apply Constraint 1 when indent is empty or missing.

When indent is NOT set and a user sends ONLY a bare action word
with NO issue_id, NO description, NO additional context:
→ Ask: "Are you looking to perform an issue action or query information about your issues?"
→ User replies "issue" → show open issues → user picks → call function
→ User replies "query" → call query_function(query=<original action word>)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[CONSTRAINT 2] QUERY ROUTING RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Route IMMEDIATELY to query_function when:
→ indent = query_function OR indent is empty AND message asks for data/info

TRIGGER KEYWORDS: show / list / find / fetch / get / give / detail /
describe / elaborate / tell me about / what are / what is / how many /
which / who / display / explain / more details / expand / summary / report / status

→ Pass the user's full original message as the query value
→ CALL query_function(query="<user's full message>")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[CONSTRAINT 3] DEFAULT ROUTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When indent IS set     → LOCKED INTENT rules above take over entirely
When indent is NOT set → query_function is the default for everything else

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE FUNCTIONS & REQUIRED ARGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

create_issue         → required: [message]
approve_completion   → required: [issue_id]
update_priority      → required: [issue_id, priority]
extend_deadlines     → required: [issue_id] | optional: [days]
solver_complete_work → required: [issue_id] | optional: [message]
solver_report_blocker→ required: [issue_id] | optional: [message]
raise_complaint      → required: [issue_id, message]
reassign_solver      → required: [issue_id, solver_name]
query_function       → required: [query]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MULTI-FUNCTION RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If the user's message contains TWO or more distinct actions:
→ When indent is set: primary function is always [{indent}]. Handle secondary if args are complete.
→ Detect ALL matching functions
→ Call ALL whose required args are fully satisfied
→ For any with missing args, ask for the first missing arg only

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARGUMENT COLLECTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 → Identify target function (from indent if set, else from message)
STEP 2 → Check ALL required args in current message + Redis history
STEP 3A → All args present → call immediately
STEP 3B → Any arg missing → DO NOT call → ask for ONE missing arg only

SEQUENTIAL COLLECTION:
When AI asked for a missing arg and user replies:
→ Treat reply as answer to last asked question
→ Combine with all previously collected args
→ If all args now complete → call immediately
→ If still missing → ask for next missing arg only

COMBINED REPLY EXTRACTION:
User sends "116 and suresh pillai":
→ Numbers         = issue_id or days (based on pending function)
→ Person names    = solver_name
→ LOW/MEDIUM/HIGH = priority
→ Full sentences  = message
→ Map all values immediately, NEVER re-ask for what was just provided

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA TYPE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
issue_id    → always INTEGER
days        → always INTEGER (use TIME MAPPING TABLE if given in natural language)
priority    → always "LOW", "MEDIUM", or "HIGH" (uppercase)
solver_name → string as provided by user
message     → full original user message as string

TIME MAPPING TABLE:
"a day" / "tomorrow"  → 1
"a couple of days"    → 2
"a few days"          → 3
"a week"              → 7
"two weeks"           → 14
"a month"             → 30

PRIORITY MAPPING TABLE:
urgent / critical / emergency / top / ASAP → "HIGH"
normal / moderate / mid / standard          → "MEDIUM"
minor / low-key / not urgent / can wait     → "LOW"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INVALID VALUE PROTECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For any required argument, if the value is missing OR is any of:
null / "null" / "unknown" / "none" / "undefined" / ""
→ Treat as MISSING → NEVER pass to any function → Ask the user

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MISSING ARG RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Respond in plain text only. Examples:
"To approve the issue, I need the Issue ID. Could you share it?"
"What priority should I set — LOW, MEDIUM, or HIGH?"
"Please provide the Issue ID to extend the deadline."
"To raise a complaint, please describe the issue you'd like to report."
Never call a function with null, undefined, or placeholder values.
Never guess or assume arg values.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL CALL JSON RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Always output complete, valid JSON in every tool call
Every opening { must have a closing }
Every opening [ must have a closing ]
Never truncate or omit closing braces or quotes
Integer values must NOT be wrapped in quotes
Validate JSON is complete before emitting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT RULES — NEVER BREAK THESE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER call a function if any required arg is missing.
NEVER assume or fabricate argument values.
ALWAYS check Redis history before asking for an arg.
ALWAYS ask for only ONE missing arg per response.
issue_id MUST always be cast to INTEGER.
When indent is set → LOCKED INTENT rules override ALL other routing.
When indent is set → NEVER trigger Constraint 1.
When indent is query_function → call query_function immediately, no questions.
When indent is set and message contradicts it → ask for confirmation first.
For query_function, always pass the user's original message as the query value.

"""

INDENT_TO_FUNCTION = {
    "approve":           "approve_completion",
    "approve_completion":"approve_completion",
    "create_issue":      "create_issue",
    "update_priority":   "update_priority",
    "extend_deadline":   "extend_deadlines",
    "extend_deadlines":  "extend_deadlines",
    "solver_complete":   "solver_complete_work",
    "solver_complete_work": "solver_complete_work",
    "report_blocker":    "solver_report_blocker",
    "solver_report_blocker": "solver_report_blocker",
    "raise_complaint":   "raise_complaint",
    "reassign":          "reassign_solver",
    "reassign_solver":   "reassign_solver",
    "query":             "query_function",
    "query_function":    "query_function",
    "sql_query":         "query_function",
}

# ==================================================
# INDENT-AWARE SYSTEM PROMPT INJECTION
# ==================================================

def build_indent_hint(indent: str) -> str:
    """
    Builds a strong routing hint block injected at the TOP of the system prompt.
    Tells the LLM exactly which function to call, with mismatch handling rules.
    """
    if not indent or indent.strip() == "":
        return ""

    normalized = indent.strip().lower()
    target_fn  = INDENT_TO_FUNCTION.get(normalized)

    if not target_fn:
        return ""

    if target_fn == "query_function":
        return f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 LOCKED INTENT FROM DROPDOWN: query_function
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user has selected "Query" from the dropdown menu.
→ ALWAYS call query_function regardless of message content.
→ Pass the user's full original message as the query value.
→ NEVER call any other function.
→ NEVER ask for clarification — just query.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

    return f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 LOCKED INTENT FROM DROPDOWN: {target_fn}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user has pre-selected "{indent}" from the dropdown menu.
This means their INTENDED function is: {target_fn}

RULE 1 — FORCE ROUTING:
→ ALWAYS route to {target_fn} — never to any other function.
→ Even if the message looks like a different action, the dropdown selection overrides it.

RULE 2 — COLLECT MISSING ARGS:
→ Check if the message contains all required args for {target_fn}.
→ If args are missing, ask for them one at a time as normal.
→ Use conversation history (Redis) to recover args from prior turns.

RULE 3 — MESSAGE CONTRADICTS SELECTION:
→ If the user's message clearly describes a DIFFERENT action (e.g. they selected 
  "approve" but typed "extend deadline for issue 5"), do NOT silently call the wrong function.
→ Instead respond:
  "You selected [{indent}] from the menu, but your message looks like a different action.
   Did you mean to [detected action], or should I proceed with [{target_fn}]?"
→ Wait for confirmation before calling anything.

RULE 4 — INCOMPLETE / BARE MESSAGE:
→ If the user's message is just a bare word (e.g. "approve", "done", "ok") with no args:
→ DO NOT ask "issue action or query?" — the dropdown already answered that.
→ Instead, directly ask for the first missing required argument.
  Example: "To {target_fn.replace('_',' ')}, I need the Issue ID. Could you share it?"

RULE 5 — PARTIAL ARGS IN MESSAGE:
→ Extract whatever args ARE present in the message.
→ Ask only for what is still missing, one at a time.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""


# ==================================================
# MASTER AGENT (INDENT-AWARE)
# ==================================================

async def master_agent(session_id: str, user_input: str, indent: str|None):

    # ✅ Greeting check — before anything else
    if is_greeting(user_input):
        reply = greeting_response()
        memory = load_memory(session_id)
        memory.chat_memory.add_user_message(user_input)
        memory.chat_memory.add_ai_message(reply)
        save_memory(session_id, memory)
        return {"intent": "clarification", "message": reply}

    def repair_failed_generation(error_str: str):
        """Extract and repair malformed tool call from Groq failed_generation error."""
        match = re.search(r"<function=(\w+)(\{.*?)(?:</function>|$)", error_str, re.DOTALL)
        if not match:
            return None, None

        func_name = match.group(1)
        raw_args  = match.group(2).strip()

        open_count  = raw_args.count("{")
        close_count = raw_args.count("}")
        raw_args   += "}" * (open_count - close_count)
        raw_args    = re.sub(r",\s*}", "}", raw_args)

        try:
            fixed_args = json.loads(raw_args)
            return func_name, fixed_args
        except json.JSONDecodeError:
            return None, None

    print("---session_id---", session_id)
    print("---user_input---", user_input)
    print("---indent---",     indent)

    # ✅ Load Redis memory
    memory = load_memory(session_id)

    history_messages = memory.chat_memory.messages[-10:]
    history_text = ""
    for msg in history_messages:
        role = "User" if msg.type == "human" else "AI"
        history_text += f"{role}: {msg.content}\n"

    # ✅ Build indent hint and inject at TOP of system prompt
    system_content = SYSTEM_PROMPT \
        .replace("{chat_history}", history_text) \
        .replace("{indent}", indent.strip() if indent else "not selected")

    messages = [{"role": "system", "content": system_content}]

    # Inject Redis history as real message turns
    for hist_msg in history_messages:
        if hist_msg.type == "human":
            messages.append({"role": "user", "content": hist_msg.content})
        else:
            messages.append({"role": "assistant", "content": hist_msg.content})

    # Current message goes last
    messages.append({"role": "user", "content": user_input})

    # ✅ Groq call with error recovery
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0
        )
        msg = response.choices[0].message

    except Exception as e:
        error_str = str(e)
        print(f"[Groq Error] {error_str}")

        func_name, fixed_args = repair_failed_generation(error_str)

        if func_name and fixed_args:
            print("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
            print(f"[REPAIRED] {func_name}({fixed_args})")

            if func_name == "query_function":
                fixed_args = {"query": user_input}

            if "issue_id" in fixed_args:
                fixed_args["issue_id"] = int(fixed_args["issue_id"])

            missing = check_missing_required(func_name, fixed_args)
            if not missing:
                memory.chat_memory.add_user_message(user_input)
                memory.chat_memory.add_ai_message(f"Called: {func_name}({fixed_args})")
                save_memory(session_id, memory)
                return {
                    "intent": "function_call",
                    "calls":  [{"function": func_name, "args": fixed_args}],
                    "clarifications": []
                }

        memory.chat_memory.add_user_message(user_input)
        memory.chat_memory.add_ai_message("Something went wrong.")
        save_memory(session_id, memory)
        return {"intent": "clarification", "message": "⚠️ Something went wrong. Please try again."}

    # ✅ Handle tool calls
    if msg.tool_calls:

        all_calls      = []
        clarifications = []

        # ── indent override: if a locked function is set, enforce it ──
        normalized_indent = indent.strip().lower() if indent else ""
        locked_fn         = INDENT_TO_FUNCTION.get(normalized_indent)

        for tool_call in msg.tool_calls:
            name = tool_call.function.name
            args = json.loads(tool_call.function.arguments or "{}")

            # Cast issue_id to int
            if "issue_id" in args:
                args["issue_id"] = int(args["issue_id"])

            # Force query args to original message
            if name == "query_function":
                args = {"query": user_input}

            # ── INDENT ENFORCEMENT ──
            # If LLM picked a different function than the locked one, override it
            if locked_fn and name != locked_fn:
                print(f"[Indent Override] LLM chose {name}, forcing {locked_fn}")
                name = locked_fn
                # ✅ Don't wipe args — only override for query_function
                if locked_fn == "query_function":
                    args = {"query": user_input}
                # else: keep parsed args, missing check will handle the rest

            missing = check_missing_required(name, args)

            if missing:
                FRIENDLY_LABELS = {
                    "issue_id":    "Issue ID",
                    "priority":    "priority (LOW / MEDIUM / HIGH)",
                    "message":     "details or description",
                    "solver_name": "solver name",
                    "days":        "number of days",
                    "query":       "your question",
                }
                label = FRIENDLY_LABELS.get(missing[0], missing[0])
                clarifications.append(
                    f"To proceed with **{name.replace('_', ' ')}**, I need the **{label}**. Could you share it?"
                )
            else:
                all_calls.append({"function": name, "args": args})

        if all_calls:
            summary = " | ".join(
                [f"{c['function']}({c['args']})" for c in all_calls]
            )
            clarification_text = (" Also: " + " ".join(clarifications)) if clarifications else ""

            memory.chat_memory.add_user_message(user_input)
            memory.chat_memory.add_ai_message(f"Called: {summary}{clarification_text}")
            save_memory(session_id, memory)

            return {
                "intent":         "function_call",
                "calls":          all_calls,
                "clarifications": clarifications
            }

        # All functions had missing args — ask for first missing
         # All functions had missing args — ask for first missing
        clarification = clarifications[0] if clarifications else "Could you provide more details?"

        # ✅ Tag with pending function so next turn knows what to resume
        pending_fn = name  # name is still in scope from the loop above
        tagged = f"[PENDING:{pending_fn}] {clarification}"

        memory.chat_memory.add_user_message(user_input)
        memory.chat_memory.add_ai_message(tagged)
        save_memory(session_id, memory)
        return {"intent": "clarification", "message": clarification}  # user sees clean message

    else:
        # LLM replied in plain text (clarification or mismatch warning)
        clarification = msg.content
        memory.chat_memory.add_user_message(user_input)
        memory.chat_memory.add_ai_message(clarification)
        save_memory(session_id, memory)
        return {"intent": "clarification", "message": clarification}
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