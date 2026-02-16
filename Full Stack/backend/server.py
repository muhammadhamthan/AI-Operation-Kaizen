"""
Server Module - Core Business Logic
This module handles all the core processing logic:
- Database connections
- AI processing with Groq
- Data extraction and saving

This module is called by api_handler.py which handles API routes
"""

import psycopg2
from datetime import datetime, timedelta
import os
from groq import Groq
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Groq API (FREE)
client = Groq(api_key="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")

# Connect to PostgreSQL
def connect_db():
    conn = psycopg2.connect(
        host="localhost",
        database="AI-Operation",
        user="postgres",
        password="1234"
    )
    return conn

# Extract info using Groq AI
def extract_problem_info(user_input):
    """
    Extract problem information from user input using Groq AI
    Returns structured JSON with problem details
    """
    prompt = f"""
Extract the following from this text: "{user_input}"

Return ONLY in this exact JSON format:
{{
  "problem_type": "type of problem (e.g., plumbing, electrical)",
  "location": "location mentioned",
  "days_to_fix": number of days mentioned or null
}}
"""
    
    chat_completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a data extraction assistant. Always return valid JSON."},
            {"role": "user", "content": prompt}
        ],
        model="llama-3.3-70b-versatile",
        temperature=0,
    )
    
    # Handle None response from API
    message_content = chat_completion.choices[0].message.content
    if not message_content:
        raise ValueError("Empty response from AI model")
    
    extracted = json.loads(message_content)
    return extracted

# Insert into database
def save_to_db(problem_type, site, problem_date, original_text):
    """
    Save problem information to PostgreSQL database
    Returns the inserted data as dictionary
    """
    conn = connect_db()
    cursor = conn.cursor()
    
    insert_query = """
    INSERT INTO problems (problem_type, problem_date, problem_text, site)
    VALUES (%s, %s, %s, %s)
    RETURNING id, problem_type, problem_date, site, problem_text
    """
    
    cursor.execute(insert_query, (
        problem_type,
        problem_date,
        original_text,
        site
    ))
    
    # Fetch the inserted record
    result = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    
    if result:
        logger.info("✅ Problem saved to database!")
        return {
            "id": result[0],
            "problem_type": result[1],
            "problem_date": str(result[2]),
            "location": result[3],
            "problem_text": result[4]
        }
    return None

# Main function
def process_problem(user_input):
    """
    Process a problem from user input
    Returns a structured response dictionary
    """
    logger.info(f"📝 Processing: {user_input}\n")
    
    try:
        # Extract problem information
        extracted = extract_problem_info(user_input)
        
        problem_type = extracted.get("problem_type", "Unknown")
        location = extracted.get("location", "Unknown")
        days_to_fix = extracted.get("days_to_fix")
        
        # Calculate target date
        if days_to_fix is not None:
            problem_date = (datetime.now() + timedelta(days=days_to_fix)).date()
        else:
            problem_date = datetime.now().date()
        
        logger.info(f"🔍 Extracted:")
        logger.info(f"   Problem Type: {problem_type}")
        logger.info(f"   Location: {location}")
        logger.info(f"   Target Date: {problem_date}\n")
        
        # Save to database and get returned data
        db_result = save_to_db(problem_type, location, problem_date, user_input)
        
        # Create formatted response for frontend
        response = {
            "status": "success",
            "message": "Problem received and processed successfully",
            "data": {
                "problem_type": problem_type,
                "location": location,
                "days_to_fix": days_to_fix,
                "target_date": str(problem_date),
                "original_message": user_input,
                "database": db_result
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Error processing problem: {str(e)}")
        return {
            "status": "error",
            "message": f"Error processing problem: {str(e)}",
            "data": None,
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    # Manual input - user types their problem here
    print("🔧 Problem Tracking System")
    print("-" * 50)
    user_input = input("Enter your problem description: ")
    
    if user_input.strip():
        process_problem(user_input)
    else:
        print("❌ No problem provided!")
