"""
PURPOSE: Chat session schemas — session list + session detail.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.core.enums import ChatRole


# ══════════════════════════════════════════════════════════
# SESSION LIST ITEM — shown in sidebar
# ══════════════════════════════════════════════════════════

class ChatSessionItem(BaseModel):
    """
    Single session in the sidebar list.
    Like ChatGPT: shows title + last message preview + timestamp.
    """
    id: int
    title: str = Field(..., description="Auto-generated from first message")
    issue_id: Optional[int] = None
    last_message_preview: Optional[str] = Field(
        None,
        description="First 80 chars of the last message in this session",
    )
    last_message_at: Optional[datetime] = Field(
        None,
        description="When the last message was sent",
    )
    message_count: int = Field(default=0)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionListResponse(BaseModel):
    """All sessions for the sidebar."""
    total: int
    sessions: List[ChatSessionItem]


# ══════════════════════════════════════════════════════════
# SESSION DETAIL — all messages in a session
# ══════════════════════════════════════════════════════════

class ChatMessageInSession(BaseModel):
    """Single message inside a session."""
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    role_in_chat: ChatRole  # USER | AI | SYSTEM
    message: str
    attachments: List[str] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionDetailResponse(BaseModel):
    """Full session with all messages — loaded when user clicks a session."""
    id: int
    title: str
    issue_id: Optional[int] = None
    messages: List[ChatMessageInSession]
    total_messages: int
    created_at: datetime
    updated_at: datetime


# ══════════════════════════════════════════════════════════
# CREATE / UPDATE
# ══════════════════════════════════════════════════════════

class ChatSessionCreate(BaseModel):
    """Create a new session — called when user clicks 'New Chat'."""
    title: Optional[str] = Field(
        default="New Chat",
        max_length=200,
    )
    issue_id: Optional[int] = None


class ChatSessionRename(BaseModel):
    """Rename a session."""
    title: str = Field(..., min_length=1, max_length=200)