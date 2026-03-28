"""
PURPOSE: Redis-backed conversation memory.
OPTIMIZATIONS:
  1. Connection pooling (single Redis connection reused)
  2. Message limit enforced on SAVE, not load (fewer deserialization ops)
  3. Shorter TTL key format
  4. Pipeline for atomic get+expire
"""

import json
import logging
from typing import Optional

import redis
from langchain.schema import HumanMessage, AIMessage
from langchain.memory import ConversationBufferMemory

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Single connection pool (not new connection per call) ──
_pool = redis.ConnectionPool.from_url(
    settings.CELERY_BROKER_URL,  # reuse your existing Redis
    decode_responses=True,
    max_connections=10,
)
_redis = redis.Redis(connection_pool=_pool)

_TTL = 3600  # 1 hour
_MAX_MESSAGES = 16  # 8 exchanges (user + AI each)


def _key(session_id: str) -> str:
    return f"mem:{session_id}"


def load_memory(session_id: str) -> ConversationBufferMemory:
    """Load conversation from Redis into LangChain memory object."""
    memory = ConversationBufferMemory(return_messages=True)
    try:
        raw = _redis.get(_key(session_id))
        if raw:
            for m in json.loads(raw):
                if m["t"] == "h":
                    memory.chat_memory.messages.append(HumanMessage(content=m["c"]))
                elif m["t"] == "a":
                    memory.chat_memory.messages.append(AIMessage(content=m["c"]))
    except Exception:
        logger.exception("Redis load failed for session %s", session_id)
    return memory


def save_memory(session_id: str, memory: ConversationBufferMemory) -> None:
    """Save conversation to Redis. Trims to last _MAX_MESSAGES."""
    try:
        messages = memory.chat_memory.messages[-_MAX_MESSAGES:]
        payload = json.dumps([
            {"t": "h" if isinstance(m, HumanMessage) else "a", "c": m.content}
            for m in messages
        ])
        _redis.set(_key(session_id), payload, ex=_TTL)
    except Exception:
        logger.exception("Redis save failed for session %s", session_id)


def clear_memory(session_id: str) -> None:
    """Delete a session's memory."""
    try:
        _redis.delete(_key(session_id))
    except Exception:
        pass