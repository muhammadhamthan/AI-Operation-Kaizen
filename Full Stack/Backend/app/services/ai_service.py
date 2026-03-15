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

Use the database to answer the question.
Only SELECT queries allowed.
If the user refers to something like "his", "that issue", or "that supervisor",
use the conversation history to resolve it.
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
- If result is empty, explain WHY logically.
- Use role information if available.
- Do not show raw SQL output like [].
- Give a human explanation.
"""
        },
        {
            "role": "user",
            "content": f"""
User Question:
{user_input}

Database Result:
{result}

Explain the result clearly.
"""
        }
    ],
    temperature=0
)

        final_answer = explanation.choices[0].message.content

    except Exception as e:

        print("SQL Agent Error:", e)
        final_answer = "⚠️ Database query failed."

    # Save new conversation to Redis
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

IMPORTANT — ARGUMENT COLLECTION FROM CONVERSATION:
- The conversation history above contains prior turns.
- If a user previously stated an intent (e.g. "approve") and now sends just a number (e.g. "X"), treat that number as the issue_id for the previous intent.
- If a user previously stated an issue_id and now states an action, combine both and call the function.
- If a user previously stated an intent (e.g. "complete") and now sends just a number (e.g. "X"), treat that number as the issue_id for the previous intent.
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
10. llm_function        → required: [message]

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
SITE CONTEXT RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- When the user says a vague action word ONLY (e.g. "approve", "extend", "complete", "reassign") 
  WITHOUT providing an issue_id, ALWAYS call query_function FIRST to fetch their issues list.
- Query to use: "show all open issues for this user"
- Show the result to the user so they can pick an issue_id.
- After the user picks an issue_id, proceed with the intended function.

EXAMPLE:
  User: "approve"
  → No issue_id found
  → CALL query_function(query="show all open issues for this user")
  → Show list to user: "Here are your open issues: #3 - Pipe leak, #7 - Power outage. Which one would you like to approve?"
  → User: "3"
  → CALL approve_completion(issue_id=3)
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INVALID VALUE PROTECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For any required argument:

If the value is missing OR contains placeholders such as:
null
"null"
"unknown"
"none"
"undefined"
""

Treat the argument as MISSING.

NEVER pass these values to any function.

Instead, ask the user for the missing argument.

Example:

User: "still didnt complete my work yet"

solver_report_blocker requires:
issue_id

Since issue_id is missing:

Respond:
"Please provide the Issue ID so I can report the blocker."

DO NOT call the function until a valid integer issue_id is available.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MULTI-FUNCTION RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- If the user's message contains TWO or more distinct actions, detect ALL of them.
- Call ALL matching functions in the same response.
- Each function must have ALL its required args satisfied independently.
- If one function has all args but another is missing args, call the complete one 
  and ask for the missing arg of the incomplete one.

EXAMPLE 1 — Both complete:
  User: "approve issue 5 and extend deadline by 2 days"
  → Function 1: approve_completion(issue_id=5)      ✅ all args present
  → Function 2: extend_deadlines(issue_id=5, days=2) ✅ all args present
  → CALL BOTH immediately

EXAMPLE 2 — One complete, one missing arg:
  User: "approve issue 5 and reassign it"
  → Function 1: approve_completion(issue_id=5)   ✅ call immediately
  → Function 2: reassign_solver(issue_id=5, solver_name=?) ❌ missing solver_name
  → CALL approve_completion(issue_id=5) now
  → Ask: "Who should I reassign Issue #5 to?"

EXAMPLE 3 — Same issue_id shared across actions:
  User: "extend deadline for issue 3 by 3 days and update priority to high"
  → Function 1: extend_deadlines(issue_id=3, days=3)     ✅
  → Function 2: update_priority(issue_id=3, priority="HIGH") ✅
  → CALL BOTH immediately

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARGUMENT COLLECTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — Detect ALL functions that match the user intent (can be more than one).
STEP 2 — For EACH function, check if ALL required args are present.
          Search the current message AND the conversation history for each arg.
STEP 3A — If ALL required args are found for a function → call it immediately.
STEP 3B — If ANY required arg is missing → DO NOT call that function.
           Instead, ask ONLY for the single most important missing arg.
           Ask one question at a time. Never ask for two args in one message.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MISSING ARG RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When an arg is missing, respond in plain text like:
  "To approve the issue, I need the Issue ID. Could you share it?"
  "What priority should I set — LOW, MEDIUM, or HIGH?"
  "Please provide the Issue ID to extend the deadline."

Never call a function with null, undefined, or placeholder values.
Never guess or assume arg values.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTENT → FUNCTION MAPPING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- User reports a problem / issue at a site          → create_issue
- Supervisor approves completed work                → approve_completion
- User wants to change issue priority               → update_priority
- User wants more time / extend deadline            → extend_deadlines
- Solver says work is done / finished               → solver_complete_work
- Solver says blocked / can't proceed               → solver_report_blocker
- User complains about an issue                     → raise_complaint
- User wants to reassign work to another solver     → reassign_solver
- User asks data / info about issues, sites, users  → query_function
- General conversation, greetings, unrelated chat   → llm_function

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA TYPE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- issue_id    → always INTEGER (e.g. X, not "X" or "issue X") this a example only the issue_id is based on user input
- days        → always INTEGER (e.g. X, not "X days")
- priority    → always one of: "LOW", "MEDIUM", "HIGH" (uppercase)
- solver_name → string as provided by user
- message     → full original user message as string

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE 1 — Missing arg, ask for it:
  User: "approve issue"
  History: (empty)
  → Function detected: approve_completion
  → Required: [issue_id] → NOT found
  → Response: "Sure! To approve the issue, please share the Issue ID."
  


EXAMPLE 2 — Arg arrives in follow-up, merge with history:
  History: "User: approve issue | AI: Please share the Issue ID."
  User: "5"
  → Merge history: intent = approve_completion, issue_id = 5
  → All required args present → CALL approve_completion(issue_id=5)
  
   
   
  User: "extend deadline for issue 12"
  History: (empty)
  → Function detected: extend_deadlines
  → Required: [issue_id] and days → NOT found
  → Response: "Sure! To approve the issue, please share the Issue ID and deadline days."

EXAMPLE 3 — All args in one message:
  User: "extend deadline for issue 12 by 3 days"
  → Function: extend_deadlines, issue_id=12, days=3
  → All args present → CALL immediately

EXAMPLE 4 — Multiple missing args, ask one at a time:
  User: "reassign issue"
  → Required: [issue_id, solver_name] → both missing
  → Ask only for the first: "Which Issue ID do you want to reassign?"
  [User: "7"]
  → issue_id=7, solver_name still missing
  → Ask: "Who should I reassign Issue #7 to? Please provide the solver's name."
  [User: "Ravi"]
  → All args present → CALL reassign_solver(issue_id=7, solver_name="Ravi")

EXAMPLE 5 — Complaint needs both args:
  User: "I want to raise a complaint"
  → Required: [issue_id, message] → both missing
  → Ask: "Which Issue ID is this complaint about?"
  [User: "issue 9"]
  → issue_id=9, message missing
  → Ask: "What is your complaint regarding Issue #9?"
  [User: "solver is not responding"]
  → CALL raise_complaint(issue_id=9, message="solver is not responding")

EXAMPLE 6 — Vague action, show issues list first:
  User: "approve"
  → No issue_id found
  → CALL query_function(query="show all open issues for this user")
  → Display list → user picks issue_id → CALL approve_completion

EXAMPLE 7 — Two actions, both complete:
  User: "approve issue 5 and extend the deadline by 2 days"
  → CALL approve_completion(issue_id=5)
  → CALL extend_deadlines(issue_id=5, days=2)
  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEQUENTIAL ARGUMENT COLLECTION RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When the AI has already asked for a missing arg and the user replies:
→ TREAT that reply as the answer to the LAST asked question
→ COMBINE it with all previously collected args from history
→ CHECK if all required args are now satisfied
→ If YES → CALL the function immediately
→ If NO → Ask for the NEXT missing arg only

CRITICAL: When user provides MULTIPLE args in a single reply:
→ Extract ALL provided values from that single message
→ Map each value to its correct argument
→ If all required args are now complete → CALL the function immediately
→ NEVER ask for args that were just provided in the same message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXACT SCENARIO EXAMPLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Turn 1:
  User: "I want to reassign"
  → issue_id = MISSING, solver_name = MISSING
  → Ask: "To reassign an issue, could you please share the Issue ID and the solver's name?"

Turn 2:
  User: "116 and suresh pillai"
  → Extract from reply:
      issue_id    = 116          ✅ (first number = issue_id)
      solver_name = "suresh pillai" ✅ (name = solver_name)
  → All required args satisfied
  → ✅ CALL reassign_solver(issue_id=116, solver_name="suresh pillai")
  → NEVER ask again for issue_id or solver_name

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MORE SEQUENTIAL EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE A — User answers asked question + adds extra arg:
  Turn 1: User: "raise a complaint"
  → Ask: "Which Issue ID is this complaint about?"
  Turn 2: User: "issue 9, solver is not responding"
  → issue_id = 9 (answers the asked question)
  → message = "solver is not responding" (bonus arg extracted)
  → All args complete → CALL raise_complaint(issue_id=9, message="solver is not responding")

EXAMPLE B — User answers with only the asked arg, next arg still missing:
  Turn 1: User: "reassign issue"
  → Ask: "Which Issue ID do you want to reassign?"
  Turn 2: User: "42"
  → issue_id = 42 ✅ (from this reply)
  → solver_name = MISSING ❌
  → Ask: "Who should I reassign Issue #42 to?"
  Turn 3: User: "Anand Kumar"
  → solver_name = "Anand Kumar" ✅
  → All args complete → CALL reassign_solver(issue_id=42, solver_name="Anand Kumar")

EXAMPLE C — User gives all args upfront in one message after vague start:
  Turn 1: User: "update priority"
  → Ask: "Which Issue ID should I update the priority for?"
  Turn 2: User: "issue 7 set it to high"
  → issue_id = 7 ✅
  → priority = "HIGH" ✅
  → All args complete → CALL update_priority(issue_id=7, priority="HIGH")
  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARG EXTRACTION FROM COMBINED REPLIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When user sends a combined reply like "116 and suresh pillai":
→ Numbers / digits        = issue_id or days (based on pending function)
→ Person names            = solver_name
→ LOW / MEDIUM / HIGH     = priority
→ Descriptive sentences   = message

Map each extracted value to the correct pending argument.
NEVER re-ask for something already extracted from the current reply.




━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ALWAYS scan the user's latest reply for ALL possible arg values.
2. ALWAYS merge latest reply with full conversation history before deciding.
3. NEVER ask for an arg that was answered in the current or any prior turn.
4. NEVER ask two questions in one response — one missing arg at a time.
5. The moment ALL required args are collected across any turns → CALL immediately.  



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT RULES — NEVER BREAK THESE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. NEVER call a function if any required arg is missing.
2. NEVER assume or fabricate argument values.
3. ALWAYS check conversation history before asking for an arg — it may already be there.
4. ALWAYS ask for only ONE missing arg per response.
5. issue_id MUST always be cast to INTEGER before calling any function.
6. For query_function, always pass the raw user message as the query value.
7. For llm_function, use it ONLY when no other function fits the intent.
8. If user input triggers multiple functions, detect and call ALL of them.
9. If user gives a vague action with no issue_id, call query_function first to show their issues.


"""

async def master_agent(session_id: str, user_input: str):
    print("---session_id---",session_id)
    print("---user_input---",user_input)
    memory = load_memory(session_id)

    history_messages = memory.chat_memory.messages[-10:]
    history_text = ""

    for msg in history_messages:
        role = "User" if msg.type == "human" else "AI"
        history_text += f"{role}: {msg.content}\n"

    messages = [
    {"role": "system", "content": SYSTEM_PROMPT.replace("{chat_history}", history_text)}
]
    
    print("------------------------------",messages)
    for msg in history_messages:
        role = "user" if msg.type == "human" else "assistant"
        messages.append({"role": role, "content": msg.content})

    messages.append({"role": "user", "content": user_input})

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
        temperature=0
    )

    msg = response.choices[0].message

    if msg.tool_calls:

        # ✅ Handle multiple tool calls
        all_calls = []
        clarifications = []

        for tool_call in msg.tool_calls:
            name = tool_call.function.name
            args = json.loads(tool_call.function.arguments or "{}")

            if "issue_id" in args:
                args["issue_id"] = int(args["issue_id"])

            if name == "query_function":
                args = {"query": user_input}

            # Check missing args for each function
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

        # If we have complete calls, return them all
        if all_calls:
            summary = " | ".join(
                [f"{c['function']}({c['args']})" for c in all_calls]
            )
            clarification_text = (" Also: " + " ".join(clarifications)) if clarifications else ""
            print("Calling functions:", clarification_text)

            memory.chat_memory.add_user_message(user_input)
            memory.chat_memory.add_ai_message(f"Called: {summary}{clarification_text}")
            save_memory(session_id, memory)

            # ✅ Return list of function calls
            result = {
                "intent": "function_call",
                "calls": all_calls,          # list of {function, args}
                "clarifications": clarifications
            }
            return result

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