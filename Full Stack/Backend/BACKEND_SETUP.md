# Backend Architecture - Separated API Handler & Server

## Overview

Your backend is now split into two separate files for better organization:

```
Backend Structure:
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ HTTP POST /api/chatInput
       ↓
┌──────────────────┐
│  api_handler.py  │  ← Handles API routes & receives frontend requests
│  (FastAPI)       │
└────────┬─────────┘
         │ Calls functions from server.py
         ↓
┌──────────────────┐
│   server.py      │  ← Core processing logic
│ (Business Logic) │
└──────────────────┘
         │
         ↓
    Database (PostgreSQL)
    Groq AI API
```

---

## File Descriptions

### 1. **api_handler.py** - API & Routes (NEW)
**Purpose**: Handles all HTTP endpoints and communication with frontend

**Key Features**:
- FastAPI application with CORS middleware
- `/api/health` - Health check endpoint
- `/api/chatInput` - Main chat input endpoint
- Request/Response validation using Pydantic models
- Error handling and logging
- Imports and calls functions from server.py

**Endpoints**:
```bash
GET  /api/health          # Health check
POST /api/chatInput       # Send message to backend
```

### 2. **server.py** - Core Processing (UPDATED)
**Purpose**: Contains pure business logic functions

**Key Functions**:
- `connect_db()` - Database connection
- `extract_problem_info(user_input)` - Groq AI extraction
- `save_to_db(...)` - Database operations
- `process_problem(user_input)` - CLI processing (optional)

**Note**: No FastAPI code here, only functions for processing

---

## How It Works

### Request Flow:

```
1. Frontend sends POST request to /api/chatInput
   ├─ Includes: { message, user_id, conversation_id }
   
2. api_handler.py receives the request
   ├─ Validates input using ChatRequest model
   ├─ Logs the incoming request
   
3. api_handler.py calls server.extract_problem_info()
   ├─ server.py sends message to Groq AI
   ├─ Groq AI extracts problem information
   ├─ Returns extracted data as JSON
   
4. api_handler.py calls server.save_to_db()
   ├─ server.py saves to PostgreSQL database
   
5. api_handler.py creates ChatResponse
   ├─ Includes: bot response, extracted data, timestamp
   ├─ Sends response back to frontend
   
6. Frontend receives response
   ├─ Displays message and bot response
```

---

## Setup & Installation

### Step 1: Install Dependencies
```bash
cd backend
pip install fastapi uvicorn psycopg2 groq
```

### Step 2: Run the Backend
```bash
# Start the API handler (which imports server.py)
python -m uvicorn api_handler:app --reload --host 0.0.0.0 --port 8000
```

**Output**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Reload enabled
```

### Step 3: Test the API

**Test Health Check**:
```bash
curl http://localhost:8000/api/health
```

**Test Chat Input**:
```bash
curl -X POST http://localhost:8000/api/chatInput \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I have a plumbing issue in the kitchen",
    "user_id": "user123",
    "conversation_id": "conv456"
  }'
```

**Response**:
```json
{
  "success": true,
  "user_message": "I have a plumbing issue in the kitchen",
  "bot_response": "✓ Received your issue:\n• Problem: plumbing\n• Location: kitchen\n• Target Days: Not specified",
  "extracted_data": {
    "problem_type": "plumbing",
    "location": "kitchen",
    "days_to_fix": null
  },
  "timestamp": "2026-02-14T12:34:56.123456",
  "conversation_id": "conv456",
  "error": null
}
```

---

## API Models

### ChatRequest (Frontend → Backend)
```python
{
    "message": str,              # User's input
    "user_id": str (optional),   # User identifier
    "conversation_id": str (optional)  # Conversation identifier
}
```

### ChatResponse (Backend → Frontend)
```python
{
    "success": bool,             # Operation status
    "user_message": str,         # Original user message
    "bot_response": str,         # AI-generated response
    "extracted_data": dict,      # Extracted problem info
    "timestamp": str,            # ISO timestamp
    "conversation_id": str,      # Conversation ID
    "error": str or null         # Error message if any
}
```

---

## Error Handling

The API handler catches and handles errors gracefully:

### Types of Errors:

**1. Invalid JSON from Groq**
```json
{
  "success": false,
  "error": "Invalid response format: ..."
}
```

**2. Database Error**
```json
{
  "success": false,
  "error": "Server error: ..."
}
```

**3. Unexpected Error**
```json
{
  "success": false,
  "error": "An unexpected error occurred"
}
```

All errors are logged to console with timestamps.

---

## File Organization

```
backend/
├── api_handler.py       ← API routes (FastAPI) - START HERE
├── server.py            ← Core business logic
├── requirements.txt
└── README.md
```

---

## Frontend Integration

Update your `chatService.js` to point to the correct endpoint:

```javascript
const BACKEND_URL = 'http://localhost:8000';

export const sendChatMessage = async (message, userId, conversationId) => {
  const response = await axios.post('/api/chatInput', {
    message,
    user_id: userId,
    conversation_id: conversationId,
  });
  return response.data;
};
```

---

## Development Workflow

### Option 1: Using the API Handler (Recommended)
```bash
python -m uvicorn api_handler:app --reload
```
- API endpoint at `http://localhost:8000/api/chatInput`
- All frontend requests go through this

### Option 2: Testing Directly in Python (CLI Mode)
```bash
python server.py
```
- Interactive CLI for manual testing
- Good for debugging without frontend

---

## Debugging

### View Logs
Both files include logging. Watch the terminal for:
```
INFO:     Received chat input - User: user123, Message: I have...
INFO:     Extracted data: {'problem_type': '...', ...}
INFO:     Problem saved to database successfully
INFO:     Chat response sent successfully
```

### Common Issues

**Issue**: "Module not found: api_handler"
- **Solution**: Make sure you're running from the backend directory

**Issue**: "Connection refused to database"
- **Solution**: Check PostgreSQL is running and credentials are correct

**Issue**: "Groq API error"
- **Solution**: Check your API key and internet connection

---

## Next Steps

1. ✅ Start the API handler: `uvicorn api_handler:app --reload`
2. ✅ Test with curl or Postman
3. ✅ Connect frontend to `http://localhost:8000/api/chatInput`
4. ✅ Monitor logs in terminal

---

## Summary

- **api_handler.py**: Your API gateway - receives from frontend, sends responses
- **server.py**: Your business logic - processes data, talks to database
- Clean separation of concerns
- Easy to scale and maintain
- Better for testing and debugging
