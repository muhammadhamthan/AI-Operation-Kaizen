import redis
import os
import json

from langchain.schema import HumanMessage, AIMessage
from langchain.memory import ConversationBufferMemory

from app.core.config import settings

REDIS_URL = settings.CELERY_BROKER_URL or os.getenv("REDIS_URL")
if not REDIS_URL:
    raise ValueError("REDIS_URL environment variable is not set")

redis_client = redis.from_url(
    REDIS_URL,
    decode_responses=True
)

TTL = 3600  # 1 hour session memory


def redis_key(user):
    return f"chat_memory:{user}"


def serialize(messages):
    return [{"type": m.__class__.__name__, "content": m.content} for m in messages]


def deserialize(data):
    msgs = []
    for m in data:
        if m["type"] == "HumanMessage":
            msgs.append(HumanMessage(content=m["content"]))
        elif m["type"] == "AIMessage":
            msgs.append(AIMessage(content=m["content"]))
    return msgs


def load_memory(user):
    key = redis_key(user)
    raw = redis_client.get(key)
    memory = ConversationBufferMemory(return_messages=True)
    if raw:
        payload = json.loads(raw)
        memory.chat_memory.messages = deserialize(payload.get("messages", []))
    return memory


def save_memory(user, memory):
    key = redis_key(user)
    msgs = memory.chat_memory.messages
    payload = {"messages": serialize(msgs)}
    redis_client.set(key, json.dumps(payload), ex=TTL)