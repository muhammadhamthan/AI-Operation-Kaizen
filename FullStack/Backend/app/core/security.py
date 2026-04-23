# app/core/security.py

"""
JWT auth + current-user dependency.

WAVE B:
  - get_current_user no longer implicitly loads supervised_sites.
    User.supervised_sites is now lazy="raise"; callers that need the
    supervisor's sites must fetch them explicitly.

  - Added an OPTIONAL Redis cache gated by the ENABLE_USER_CACHE env var.
    When enabled, the cache stores a minimal dict of {id, role, name,
    email, phone, is_active} keyed by the JWT hash (sha256, first 32 chars).
    On cache hit we reconstruct a detached User instance — no DB query.
    On miss we fetch and populate.

    DISABLED BY DEFAULT. Enable via env var once Wave B is verified:
        ENABLE_USER_CACHE=true

  Cache invalidation:
    - 30-second TTL. If you update a user's role or deactivate them,
      there's a <30s window where cached requests still see old values.
      Acceptable for authorization decisions because:
        * we never cache the JWT itself, just a user snapshot
        * the JWT already has a 24h expiry
        * role changes are rare
      If you need immediate invalidation, add an explicit
      invalidate_user_cache(token) call in the relevant route.
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.enums import UserRole
from app.db.session import get_db

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ══════════════════════════════════════════════════════════════
# Optional Redis cache (gated by env)
# ══════════════════════════════════════════════════════════════

_USER_CACHE_ENABLED = str(
    getattr(settings, "ENABLE_USER_CACHE", "false")
).lower() in ("1", "true", "yes")
_USER_CACHE_TTL = 30  # seconds

_redis_client = None
if _USER_CACHE_ENABLED:
    try:
        import redis
        _redis_client = redis.from_url(
            settings.CELERY_BROKER_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        # Smoke-check the connection at import time so failures are loud.
        _redis_client.ping()
        logger.info("User cache ENABLED (Redis TTL=%ds)", _USER_CACHE_TTL)
    except Exception:
        logger.exception("User cache requested but Redis init failed — disabling")
        _redis_client = None


def _token_cache_key(token: str) -> str:
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()[:32]
    return f"auth:user:{digest}"


def _serialize_user(user) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "phone": user.phone,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "is_active": bool(user.is_active),
    }


def _cache_get(token: str) -> Optional[dict]:
    if not _redis_client:
        return None
    try:
        raw = _redis_client.get(_token_cache_key(token))
        if raw:
            return json.loads(raw)
    except Exception:
        logger.exception("Redis cache read failed")
    return None


def _cache_put(token: str, payload: dict) -> None:
    if not _redis_client:
        return
    try:
        _redis_client.set(
            _token_cache_key(token),
            json.dumps(payload),
            ex=_USER_CACHE_TTL,
        )
    except Exception:
        logger.exception("Redis cache write failed")


def invalidate_user_cache_for_token(token: str) -> None:
    """Call this from any route that mutates user role / is_active."""
    if not _redis_client:
        return
    try:
        _redis_client.delete(_token_cache_key(token))
    except Exception:
        logger.exception("Redis cache invalidate failed")


# ══════════════════════════════════════════════════════════════
# Password / token helpers
# ══════════════════════════════════════════════════════════════

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM],
        )
    except JWTError:
        return None


# ══════════════════════════════════════════════════════════════
# Dependency: get_current_user
# ══════════════════════════════════════════════════════════════

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    WAVE B:
      - Does NOT load any relationships.
      - If ENABLE_USER_CACHE=true, serves hits from Redis (no DB).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise credentials_exception

    from app.models.user import User

    # ── Cache fast path ──────────────────────────────────
    if _USER_CACHE_ENABLED:
        cached = _cache_get(token)
        if cached and cached.get("id") == user_id and cached.get("is_active"):
            # Reconstruct a detached, minimal User. No relationships attached.
            # Role comes back as string; rehydrate to enum for back-compat with
            # `user.role == UserRole.MANAGER` comparisons throughout the code.
            user = User(
                id=cached["id"],
                name=cached["name"],
                phone=cached["phone"],
                email=cached["email"],
                role=UserRole(cached["role"]),
                is_active=cached["is_active"],
            )
            return user

    # ── DB path ──────────────────────────────────────────
    # Narrow to columns only — no relationships. Models.User.__init__ doesn't
    # support partial column projections cleanly here, so we fetch the full row
    # (it's a single indexed lookup — still cheap).
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        # Don't cache deactivated users
        raise credentials_exception

    if _USER_CACHE_ENABLED:
        _cache_put(token, _serialize_user(user))

    return user