"""
API Handler - Intermediary between Frontend and Backend Server
This file handles all API endpoints and routes requests to server.py
"""
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

# Import processing functions from server
from server import extract_problem_info, save_to_db, process_problem

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Kaizen Chat API",
    description="API for handling user chat inputs and responses",
    version="1.0.0"
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ Pydantic Models ============

class ChatRequest(BaseModel):
    """Model for incoming chat messages from frontend"""
    message: str
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    success: bool
    user_message: str
    bot_response: str
    extracted_data: Optional[Dict[str, Any]] = None
    timestamp: str
    conversation_id: Optional[str] = None
    error: Optional[str] = None


# ============ Health Check Endpoint ============

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint to verify backend is running
    """
    logger.info("Health check requested")
    return {
        "status": "Backend is running",
        "timestamp": datetime.now().isoformat(),
        "service": "Kaizen Chat API"
    }


# ============ Chat Input Endpoint ============

@app.post("/api/chatInput")
async def handle_chat_input(request: ChatRequest):
    """
    Main endpoint to handle user chat input
    
    Flow:
    1. Receive message from frontend
    2. Process via server.process_problem() which handles:
       - AI extraction of problem details
       - Database storage
       - Error handling
    3. Return structured response to frontend
    
    Args:
        request: ChatRequest object containing message, user_id, conversation_id
    
    Returns:
        ChatResponse object with bot response and extracted data
    """
    try:
        logger.info(f"Received chat input - User: {request.user_id}, Message: {request.message[:50]}...")
        
        # Process the user input - server.process_problem handles extraction and database save
        backend_response = process_problem(request.message)
        logger.info(f"Backend response: {backend_response}")
        
        # Check if processing was successful
        if backend_response["status"] == "success":
            # Extract data from backend response
            extracted_data = backend_response.get("data", {})
            problem_type = extracted_data.get("problem_type", "Unknown")
            location = extracted_data.get("location", "Unknown")
            days_to_fix = extracted_data.get("days_to_fix", "Not specified")
            target_date = extracted_data.get("target_date", "Not set")
            
            # Build bot response message
            bot_response = (
                f"✓ Issue received and logged successfully\n"
                f"━━━━━━━━━━━━━━━━━\n"
                f"📋 Problem Type: {problem_type}\n"
                f"📍 Location: {location}\n"
                f"⏱️  Target Days: {days_to_fix}\n"
                f"📅 Target Date: {target_date}"
            )
            
            # Build response dict
            response_dict = {
                "success": True,
                "user_message": request.message,
                "bot_response": bot_response,
                "extracted_data": extracted_data,
                "timestamp": backend_response.get("timestamp", datetime.now().isoformat()),
                "conversation_id": request.conversation_id,
                "error": None
            }
            logger.info(f"Sending success response: {response_dict}")
            return response_dict
        else:
            # Handle errors from backend processing
            error_msg = backend_response.get("message", "Processing failed")
            bot_response = f"⚠️ Error: {error_msg}"
            
            response_dict = {
                "success": False,
                "user_message": request.message,
                "bot_response": bot_response,
                "extracted_data": {},
                "timestamp": backend_response.get("timestamp", datetime.now().isoformat()),
                "conversation_id": request.conversation_id,
                "error": error_msg
            }
            logger.info(f"Sending error response: {response_dict}")
            return response_dict
        
    except ValueError as e:
        # Handle JSON parsing errors from Groq
        error_msg = f"Invalid response format: {str(e)}"
        logger.error(error_msg)
        response_dict = {
            "success": False,
            "user_message": request.message,
            "bot_response": "⚠️ Error: Could not process your message. Please check the format and try again.",
            "extracted_data": {},
            "timestamp": datetime.now().isoformat(),
            "conversation_id": request.conversation_id,
            "error": error_msg
        }
        logger.info(f"Sending ValueError response: {response_dict}")
        return response_dict
    
    except Exception as e:
        # Handle all other errors
        error_msg = f"Server error: {str(e)}"
        logger.error(f"Unexpected error in handle_chat_input: {error_msg}", exc_info=True)
        response_dict = {
            "success": False,
            "user_message": request.message,
            "bot_response": "⚠️ Error: An unexpected server error occurred. Please try again later.",
            "extracted_data": {},
            "timestamp": datetime.now().isoformat(),
            "conversation_id": request.conversation_id,
            "error": error_msg
        }
        logger.info(f"Sending Exception response: {response_dict}")
        return response_dict


# ============ Error Handlers ============

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler for unhandled errors
    """
    logger.error(f"Unhandled exception: {str(exc)}")
    return {
        "success": False,
        "error": "An unexpected error occurred",
        "timestamp": datetime.now().isoformat()
    }


# ============ Main Entry Point ============

if __name__ == "__main__":
    import uvicorn
    
    # Run the FastAPI server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
