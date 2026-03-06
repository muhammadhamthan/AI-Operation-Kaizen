"""
AI MASTER SERVICE
Intent detection + SQL agent + Issue creation + Voice call + Final Answer Summarizer
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
# GREETING DETECTION
# ==================================================

def is_greeting(message):
    greetings = [
        "hi",
        "hello",
        "hey",
        "good morning",
        "good evening",
        "good afternoon",
        "thanks",
        "thank you",
        "ok"
    ]
    msg = message.lower().strip()
    return msg in greetings

def greeting_response():
    return "👋 Hello! How can I assist you today?\nYou can ask about issues, sites, supervisors, or create a new issue."

# ==================================================
# SAFE JSON PARSER
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
# FINAL ANSWER SUMMARIZER
# ==================================================

def summarize_sql_answer(question, sql_result):
    prompt = f"""
You convert database query results into clear human answers.

User Question:
{question}

SQL Result:
{sql_result}

Rules:
- Answer in 1 or 2 sentences
- Be clear and natural
- Do not show SQL or tuples

Example:

Question: give detail of supervisor id 5
Result: [(5, 'Rajesh')]
Answer: The supervisor name is Rajesh and his ID is 5.

Question: list all sites
Result: [(1,'Chennai'),(2,'Delhi')]
Answer: The available sites are Chennai and Delhi.

Return only the final answer.
"""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "Return only final user answer"},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    return response.choices[0].message.content.strip()

# ==================================================
# DATABASE CONNECTION
# ==================================================

def connect_db():
    return SessionLocal()

# ==================================================
# FORMAT PHONE
# ==================================================

def format_phone_india(phone):
    phone = str(phone).strip().replace(" ", "").replace("-", "")
    if phone.startswith("+"):
        return phone
    if phone.startswith("0"):
        phone = phone[1:]
    return "+91" + phone

# ==================================================
# ISSUE EXTRACTION
# ==================================================

def extract_issue(user_input):
    prompt = f"""
Extract fields:

skill_name
site_location
days_to_fix

Message:
{user_input}

Return JSON only.
"""
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "Return JSON only"},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )
    return safe_json_parse(response.choices[0].message.content)

# ==================================================
# HANDLE ISSUE
# ==================================================

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
        site = conn.execute(
            text("SELECT id FROM sites WHERE LOWER(location) LIKE LOWER(:loc) LIMIT 1"),
            {"loc": f"%{location}%"}
        ).fetchone()
        if not site:
            return "❌ Site not found."
        site_id = site[0]

        solver = conn.execute(
            text("""
            SELECT u.id, u.name, u.phone
            FROM problem_solver_skills pss
            JOIN users u ON u.id = pss.solver_id
            WHERE LOWER(pss.skill_type) LIKE LOWER(:skill)
            AND pss.is_available = true
            LIMIT 1
            """),
            {"skill": f"%{skill}%"}
        ).fetchone()
        if not solver:
            return "❌ No solver available."
        solver_id, name, phone = solver
        phone = format_phone_india(phone)

        supervisor = conn.execute(
            text("SELECT id FROM users WHERE role='SUPERVISOR' LIMIT 1")
        ).fetchone()
        if not supervisor:
            return "❌ Supervisor not found."
        supervisor_id = supervisor[0]

        deadline = datetime.now() + timedelta(days=days)

        issue_id = conn.execute(
            text("""
            INSERT INTO issues
            (title, description, priority, status,
             created_at, deadline_at, site_id,
             raised_by_supervisor_id)
            VALUES
            (:title, :desc, 'MEDIUM', 'OPEN',
             NOW(), :deadline, :site_id, :supervisor)
            RETURNING id
            """),
            {
                "title": user_input,
                "desc": user_input,
                "deadline": deadline,
                "site_id": site_id,
                "supervisor": supervisor_id
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
            print("Twilio Call Failed:", call_error)

    except Exception as e:
        conn.rollback()
        return f"❌ Database Error: {str(e)}"

    finally:
        conn.close()

    return f"✅ Issue #{issue_id} created and solver {name} notified."

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
        handle_parsing_errors=True
    )
    return agent

# ==================================================
# INTENT DETECTION (Greeting / Issue / Query)
# ==================================================

def detect_intent(user_input):
    msg = user_input.lower().strip()

    if is_greeting(msg):
        return "greeting"

    data = extract_issue(user_input)
    skill = data.get("skill_name")
    location = data.get("site_location")
    days = data.get("days_to_fix")

    if skill and location and days:
        return "issue"

    return "query"

# ==================================================
# MASTER AGENT
# ==================================================

def master_agent(user_input):
    intent = detect_intent(user_input)
    print("🧠 Intent:", intent)
    chat_history.add_user_message(user_input)

    if intent == "greeting":
        result = greeting_response()
    elif intent == "issue":
        result = handle_issue(user_input)
    else:
        context = get_buffer_context()
        contextual_query = f"""
Conversation History:
{context}

User Question:
{user_input}
"""
        agent = sql_agent_executor()
        try:
            response = agent.invoke({"input": contextual_query})
            raw_result = response.get("output", str(response))
            result = summarize_sql_answer(user_input, raw_result)
        except Exception as e:
            print("SQL Agent Error:", e)
            result = "❌ AI query failed."

    chat_history.add_ai_message(result)
    return result

# ==================================================
# CLI LOOP
# ==================================================

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