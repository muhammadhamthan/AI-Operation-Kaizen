# app/api/deps.py

"""
PURPOSE: Shared FastAPI dependencies used across all API routes.
─────────────────────────────────────────────────────────────────
get_db()           → Yields an async SQLAlchemy session per request
get_current_user() → Decodes JWT and returns User object
require_role()     → Factory that checks user role

without this function in nested function 
Problem:

Now it only works for MANAGER.

You can't change allowed roles per route.

You would need multiple functions:
"""

from typing import List
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.core.security import get_current_user  # JWT-based
from app.core.enums import UserRole


# ── Re-export for convenience ────────────────────────────
# Other modules do: from app.api.deps import get_db, get_current_user
get_db = get_db
get_current_user = get_current_user


# app/api/deps.py

"""
PURPOSE: Shared FastAPI dependencies used across all API routes.
─────────────────────────────────────────────────────────────────
get_db()           → Yields an async SQLAlchemy session per request
get_current_user() → Decodes JWT and returns User object
require_role()     → Factory that checks user role
"""

from typing import List
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.core.security import get_current_user  # JWT-based
from app.core.enums import UserRole


# ── Re-export for convenience ────────────────────────────
# Other modules do: from app.api.deps import get_db, get_current_user
get_db = get_db
get_current_user = get_current_user


# ── Role-based access factory ────────────────────────────
def require_role(allowed_roles: List[UserRole]):
    """
    Factory that returns a dependency checking user role.

    Usage:
        @router.get(
            "/admin-only",
            dependencies=[Depends(require_role([UserRole.MANAGER]))]
        )

    Or as a parameter dependency:
        current_user: User = Depends(require_role([UserRole.MANAGER]))
    """
    async def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Role '{current_user.role.value}' not authorized. "
                    f"Required: {[r.value for r in allowed_roles]}"
                ),
            )
        return current_user

    return role_checker




'''
🔥 Option 2 — Class-Based Dependency (Clean Alternative)

Instead of nested function, you can use a class.

This is actually a very good alternative 👇

class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(status_code=403)
        return current_user     
'''