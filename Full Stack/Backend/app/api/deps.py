"""
PURPOSE: Shared FastAPI dependencies used across all API routes.
─────────────────────────────────────────────────────────────────
get_db()           → Yields a SQLAlchemy session per request
get_current_user() → Decodes JWT and returns User object
require_role()     → Factory that checks user role
"""

from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import decode_access_token
from app.core.enums import UserRole

# ── Security scheme ──────────────────────────────────────
security = HTTPBearer()


# ── Database session dependency ──────────────────────────
def get_db():
    """
    Yields one SQLAlchemy session per HTTP request.
    Automatically closes when the request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Current user dependency ──────────────────────────────
def get_current_user(
    db: Session = Depends(get_db),
) -> User:
    return db.query(User).first()


# # ── Role-based access factory ────────────────────────────
# def require_role(allowed_roles: List[UserRole]):
#     """
#     Factory that returns a dependency checking user role.

#     Usage:
#         @router.get("/admin-only", dependencies=[Depends(require_role([UserRole.MANAGER]))])
#     """
#     def role_checker(current_user: User = Depends(get_current_user)) -> User:
#         if current_user.role not in allowed_roles:
#             raise HTTPException(
#                 status_code=status.HTTP_403_FORBIDDEN,
#                 detail=f"Role '{current_user.role.value}' not authorized. Required: {[r.value for r in allowed_roles]}",
#             )
#         return current_user
#     return role_checker