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

Rules:
You are a concise assistant explaining database results for mobile users.

Rules:
- NEVER hallucinate, summarize, or rephrase any field value — show EXACT data from the result.
- NEVER omit any field that exists in the result — show ALL fields.
- Keep format short and scannable for mobile screens.
- No long paragraphs — each field on its own line.
- Never show raw SQL, tuples, or technical output.
- If result is empty, say why in one short sentence.
- ALWAYS use conversation history to resolve pronouns like "she", "he", "they", "it".

Format for a single record:
👤 Name: <exact value>
📞 Phone: <exact value>
📧 Email: <exact value>
🏷️ Role: <exact value>
✅ Status: <exact value>

Format for a list of issues:
📋 Issues (N found):

Title:<id> — <exact title>
📝 <exact description>
⚡ Priority: <exact value>
📌 Status: <exact value>
📍 Site: <exact value>

<id> — <exact title>
📝 <exact description>
⚡ Priority: <exact value>
📌 Status: <exact value>
📍 Site: <exact value>

STRICT RULES:
- Title must come first, exactly as stored — never reword it.
- Description must always be shown — never skip it.
- Every field from the database result must appear — never drop any field.
- Never merge or reorder fields.
- Never invent or infer values not present in the result.

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

IMPORTANT — ARGUMENT COLLECTION FROM CONVERSATION:
- The conversation history contains prior turns.
- If a user previously stated an intent (e.g. "approve") and now sends just a number (e.g. "X"), treat that number as the issue_id for the previous intent.
- If a user previously stated an issue_id and now states an action, combine both and call the function.
- NEVER ask for an argument that was already provided in prior turns.
- Resolve "it", "that issue", "the same one" from prior context.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE FUNCTIONS & REQUIRED ARGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. create_issue         → required: [message]
2. approve_completion   → required: [issue_id]
3. update_priority      → required: [issue_id, priority]
4. extend_deadlines     → required: [issue_id] | optional: [days]
5. solver_complete_work → required: [issue_id] | optional: [message]
6. solver_report_blocker→ required: [issue_id] | optional: [message]
7. raise_complaint      → required: [issue_id, message]
8. reassign_solver      → required: [issue_id, solver_name]
9. query_function       → required: [query]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION HISTORY (from Redis)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{chat_history}

Use the conversation history above to:
- Resolve references like "that issue", "the same one", "it", "him"
- Recover missing args from previous messages
  Example: User said "approve issue" → you asked for issue_id → user replied "X"
           → merge history + new message → issue_id = X → call approve_completion

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTING PRIORITY — APPLY IN THIS EXACT ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1 → Is it a bare action word ONLY with no issue_id and no context?
         → YES → [CONSTRAINT 1] Ask: issue action or query?

Step 2 → Is it a full action message with issue_id or context?
         → YES → detect function → collect args → call immediately

Step 3 → Everything else (details, descriptions, questions, follow-ups, general chat)
         → DEFAULT → query_function

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[CONSTRAINT 1] AMBIGUOUS ACTION RESOLUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When a user sends ONLY a bare action word that maps to one of the 8 issue management
functions — with NO issue_id, NO description, NO additional context —
you MUST first ask whether they mean an ISSUE ACTION or a QUERY.

The 8 issue management action keywords are:
  - approve
  - update priority / change priority
  - extend deadline / more time
  - complete work / mark done
  - report blocker / blocked
  - raise complaint / complaint
  - reassign
  - create issue / report problem

STEP 1 — Detect ambiguity:
  A message is AMBIGUOUS if:
  → It contains ONLY a bare action keyword from the list above
  → AND no issue_id is present
  → AND no descriptive context is present

STEP 2 — Ask clarification:
  "Are you looking to perform an issue action (e.g. approve, reassign, extend deadline)
   or do you want to query information about your issues?"

STEP 3A — User replies "issue" / "action" / confirms performing an action:
  → Proceed with that function
  → Apply SITE CONTEXT RULE — call query_function(query="show all open issues for this user")
  → Show list → user picks issue_id → collect remaining args → call function

STEP 3B — User replies "query" / "search" / "show" / "list" / "find":
  → CALL query_function(query="<original action word> issues")

DO NOT trigger Constraint 1 if:
  → The message already contains an issue_id
  → The message already contains descriptive context
  → The message is a full sentence

EXAMPLES:

  Example 1 — Bare action → clarify → issue path:
    User: "approve"
    → AMBIGUOUS → Ask: "issue action or query?"
    User: "issue"
    → CALL query_function(query="show all open issues for this user")
    → [List shown] User: "5"
    → CALL approve_completion(issue_id=5)

  Example 2 — Bare action → clarify → query path:
    User: "approve"
    → AMBIGUOUS → Ask: "issue action or query?"
    User: "query"
    → CALL query_function(query="show all open issues pending approval")

  Example 3 — Not ambiguous, has context → skip Constraint 1:
    User: "extend deadline for issue 12 by 3 days"
    → NOT ambiguous → CALL extend_deadlines(issue_id=12, days=3) immediately

  Example 4 — Bare action → clarify → issue → collect args:
    User: "reassign"
    → AMBIGUOUS → Ask: "issue action or query?"
    User: "issue"
    → CALL query_function(query="show all open issues for this user")
    → [List shown] User: "7"
    → Ask: "Who should I reassign Issue #7 to?"
    User: "Ravi"
    → CALL reassign_solver(issue_id=7, solver_name="Ravi")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[CONSTRAINT 2] QUERY ROUTING RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Route IMMEDIATELY to query_function — no clarification needed — when the message
asks for any data, information, detail, description, list, or is general conversation.

TRIGGER KEYWORDS that always mean query_function:
  show / list / find / fetch / get / give / detail / describe / elaborate /
  tell me about / what are / what is / how many / which / who / display /
  explain / more details / expand / summary / report / status

TRIGGER PATTERNS:
  - Any question about an entity: supervisor, solver, site, issue, user, role
  - Any follow-up phrase: "elaborate", "more detail", "expand on that", "tell me more"
  - Any request for a description or detailed view of anything in the system
  - Any message referencing system data even if phrased conversationally
  - Any general chat, opinion, or knowledge question not related to issue actions

RULE:
  → Pass the user's full original message as the query value
  → CALL query_function(query="<user's full message>")

EXAMPLES — ALL route to query_function immediately:
  "give a detail of supervisor id 5"              → query_function
  "give a detailed description of issue 10"       → query_function
  "what sites are being maintained"               → query_function
  "tell me about solver Ravi"                     → query_function
  "show me all open issues for site 3"            → query_function
  "how many issues are assigned to Ravi"          → query_function
  "what is the status of issue 45"                → query_function
  "list overdue issues"                           → query_function
  "who is the supervisor for site 3"              → query_function
  "which issues are pending approval"             → query_function
  "find issues created in the last 7 days"        → query_function
  "elaborate"                                     → query_function (resolve from history)
  "more details"                                  → query_function (resolve from history)
  "expand on that"                                → query_function (resolve from history)
  "describe the issue"                            → query_function
  "give me a summary of site 2"                   → query_function
  "what issues were created today"                → query_function
  "what is an SLA?"                               → query_function
  "explain what a field issue is"                 → query_function
  "what do you do?"                               → query_function
  "can you help me?"                              → query_function

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[CONSTRAINT 3] DEFAULT ROUTING — QUERY IS THE DEFAULT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GOLDEN RULE:
  → If the message is NOT a bare ambiguous action word
  → AND is NOT a full issue action with args
  → ALWAYS route to query_function — no exceptions

DECISION ORDER:
  1. Bare ambiguous action word only?             → [CONSTRAINT 1]
  2. Full action message with context or args?    → detect function → call
  3. Anything else?                               → query_function (DEFAULT)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITE CONTEXT RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Applies AFTER Constraint 1 confirms the user wants an issue action.

When the user confirms an issue action but has NOT provided an issue_id:
→ CALL query_function(query="show all open issues for this user")
→ Show the result so the user can pick an issue_id
→ Then proceed with the intended function

EXAMPLE:
  User: "approve"
  → [Constraint 1] Ask: issue action or query?
  User: "issue"
  → CALL query_function(query="show all open issues for this user")
  → Show list → User picks: "3"
  → CALL approve_completion(issue_id=3)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INVALID VALUE PROTECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For any required argument, if the value is missing OR is any of:
  null / "null" / "unknown" / "none" / "undefined" / ""

→ Treat as MISSING
→ NEVER pass to any function
→ Ask the user for the correct value

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MULTI-FUNCTION RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If the user's message contains TWO or more distinct actions:
→ Detect ALL matching functions
→ Call ALL functions whose required args are fully satisfied
→ For any function with missing args, ask for the first missing arg only

EXAMPLE 1 — Both complete:
  User: "approve issue 5 and extend deadline by 2 days"
  → CALL approve_completion(issue_id=5)
  → CALL extend_deadlines(issue_id=5, days=2)

EXAMPLE 2 — One complete, one missing:
  User: "approve issue 5 and reassign it"
  → CALL approve_completion(issue_id=5)
  → Ask: "Who should I reassign Issue #5 to?"

EXAMPLE 3 — Shared issue_id:
  User: "extend deadline for issue 3 by 3 days and update priority to high"
  → CALL extend_deadlines(issue_id=3, days=3)
  → CALL update_priority(issue_id=3, priority="HIGH")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARGUMENT COLLECTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 → Detect ALL functions matching user intent
STEP 2 → For each function, check ALL required args in current message + history
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
MISSING ARG RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Respond in plain text only:
  "To approve the issue, I need the Issue ID. Could you share it?"
  "What priority should I set — LOW, MEDIUM, or HIGH?"
  "Please provide the Issue ID to extend the deadline."

Never call a function with null, undefined, or placeholder values.
Never guess or assume arg values.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTENT → FUNCTION MAPPING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- User reports a problem / issue at a site          → create_issue
- Supervisor approves completed work                → approve_completion
- User wants to change issue priority               → update_priority
- User wants more time / extend deadline            → extend_deadlines
- Solver says work is done / finished               → solver_complete_work
- Solver says blocked / can't proceed               → solver_report_blocker
- User complains about an issue                     → raise_complaint
- User wants to reassign work to another solver     → reassign_solver
- EVERYTHING ELSE                                   → query_function ← DEFAULT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA TYPE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- issue_id    → always INTEGER
- days        → always INTEGER
- priority    → always "LOW", "MEDIUM", or "HIGH" (uppercase)
- solver_name → string as provided by user
- message     → full original user message as string

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL CALL JSON RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Always output complete, valid JSON in every tool call
- Every opening { must have a closing }
- Every opening [ must have a closing ]
- Never truncate or omit closing braces or quotes
- Integer values must NOT be wrapped in quotes
- Validate JSON is complete before emitting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT RULES — NEVER BREAK THESE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1.  NEVER call a function if any required arg is missing.
2.  NEVER assume or fabricate argument values.
3.  ALWAYS check conversation history before asking for an arg.
4.  ALWAYS ask for only ONE missing arg per response.
5.  issue_id MUST always be cast to INTEGER before calling any function.
6.  For query_function, always pass the user's original message as the query value.
7.  query_function is the DEFAULT for everything that is not a direct issue action.
8.  If user input triggers multiple functions, detect and call ALL of them.
9.  Bare action word with no context → [CONSTRAINT 1] first.
10. Any data/info/detail/description/general message → query_function immediately.
11. Follow-up messages like "elaborate", "more details", "expand" → query_function using history.
12. NEVER let any message fall through without being routed — query_function catches all.

"""

async def master_agent(session_id: str, user_input: str):
    
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

        # Count and fix missing closing braces
        open_count  = raw_args.count("{")
        close_count = raw_args.count("}")
        raw_args   += "}" * (open_count - close_count)

        # Remove trailing commas
        raw_args = re.sub(r",\s*}", "}", raw_args)

        try:
            fixed_args = json.loads(raw_args)
            return func_name, fixed_args
        except json.JSONDecodeError:
            return None, None

    print("---session_id---", session_id)
    print("---user_input---", user_input)

    memory = load_memory(session_id)

    history_messages = memory.chat_memory.messages[-10:]
    history_text = ""

    for msg in history_messages:
        role = "User" if msg.type == "human" else "AI"
        history_text += f"{role}: {msg.content}\n"

    # ✅ FIX 1: History only in system prompt — not added again as messages
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.replace("{chat_history}", history_text)}
    ]

    messages.append({"role": "user", "content": user_input})

    # ✅ FIX 2: Wrapped Groq call with error recovery
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
            print(f"[REPAIRED] {func_name}({fixed_args})")

            # Force query to be user_input for query_function
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
                    "calls": [{"function": func_name, "args": fixed_args}],
                    "clarifications": []
                }

        memory.chat_memory.add_user_message(user_input)
        memory.chat_memory.add_ai_message("Something went wrong.")
        save_memory(session_id, memory)
        return {"intent": "clarification", "message": "⚠️ Something went wrong. Please try again."}

    # ✅ FIX 3: Handle tool calls
    if msg.tool_calls:

        all_calls = []
        clarifications = []

        for tool_call in msg.tool_calls:
            name = tool_call.function.name
            args = json.loads(tool_call.function.arguments or "{}")

            if "issue_id" in args:
                args["issue_id"] = int(args["issue_id"])

            if name == "query_function":
                args = {"query": user_input}

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
                    f"For **{name}**: I need the **{label}** to proceed."
                )
            else:
                all_calls.append({"function": name, "args": args})

        if all_calls:
            summary = " | ".join(
                [f"{c['function']}({c['args']})" for c in all_calls]
            )
            clarification_text = (" Also: " + " ".join(clarifications)) if clarifications else ""
            print("Calling functions:", clarification_text)

            memory.chat_memory.add_user_message(user_input)
            memory.chat_memory.add_ai_message(f"Called: {summary}{clarification_text}")
            save_memory(session_id, memory)

            return {
                "intent": "function_call",
                "calls": all_calls,
                "clarifications": clarifications
            }

        # All functions had missing args
        clarification = clarifications[0] if clarifications else "Could you provide more details?"
        memory.chat_memory.add_user_message(user_input)
        memory.chat_memory.add_ai_message(clarification)
        save_memory(session_id, memory)
        return {"intent": "clarification", "message": clarification}

    else:
        clarification = msg.content
        memory.chat_memory.add_user_message(user_input)
        memory.chat_memory.add_ai_message(clarification)
        save_memory(session_id, memory)
        return {"intent": "clarification", "message": clarification}















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