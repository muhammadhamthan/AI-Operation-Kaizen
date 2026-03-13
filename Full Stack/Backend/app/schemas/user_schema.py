"""
PURPOSE: User authentication and profile schemas.
──────────────────────────────────────────────────
Auth is the ONE area that uses traditional form-based endpoints.
Users cannot login through chat — they need structured login first.
After login, ALL interaction happens through the chat endpoint.

USED BY:
  POST /api/v1/auth/register  → UserCreate
  POST /api/v1/auth/login     → UserLogin → TokenResponse
  GET  /api/v1/auth/me        → UserResponse
  GET  /api/v1/auth/users     → UserListResponse (admin/manager)
  PUT  /api/v1/auth/users/{id}→ UserUpdate (admin only)
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.core.enums import UserRole


class UserCreate(BaseModel):
    """
    Admin registers a new user.
    Phone is mandatory — used for Twilio calls and login.
    """
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Full name of the user",
        examples=["Priya Sharma"],
    )
    phone: str = Field(
        ...,
        min_length=10,
        max_length=20,
        description="Unique phone — used for auth and Twilio calling",
        examples=["9123456789"],
    )
    email: Optional[str] = Field(
        None,
        max_length=100,
        description="Email for escalation notifications",
        examples=["priya@company.com"],
    )
    role: UserRole = Field(
        ...,
        description="supervisor | problemsolver | manager",
        examples=["supervisor"],
    )
    password: str = Field(
        ...,
        min_length=6,
        max_length=128,
        description="Login password (will be hashed with bcrypt)",
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Phone must contain only digits and optional + prefix."""
        cleaned = v.replace("+", "").replace("-", "").replace(" ", "")
        if not cleaned.isdigit():
            raise ValueError("Phone must contain only digits")
        return v

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and "@" not in v:
            raise ValueError("Invalid email format")
        return v


class UserUpdate(BaseModel):
    """
    Partial update — admin changes user details.
    Only provided fields are modified.
    """
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserLogin(BaseModel):
    """Phone + password login to get JWT token."""
    phone: str = Field(
        ...,
        description="Registered phone number",
        examples=["9123456789"],
    )
    password: str = Field(
        ...,
        description="Account password",
    )


class TokenResponse(BaseModel):
    """
    Returned after successful login.
    Frontend stores access_token and sends in every subsequent request:
      Authorization: Bearer <access_token>
    After this, ALL interaction happens through POST /api/v1/chat
    """
    access_token: str = Field(..., description="JWT bearer token")
    token_type: str = Field(default="bearer")
    user: "UserResponse" = Field(..., description="Logged-in user details")


class UserResponse(BaseModel):
    """
    Standard user response — never exposes password.
    Used in auth responses and nested inside other schemas.
    """
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "name": "Priya Sharma",
                    "phone": "9123456789",
                    "email": "priya@company.com",
                    "role": "supervisor",
                    "is_active": True,
                    "created_at": "2026-02-01T10:00:00+05:30",
                    "updated_at": "2026-02-01T10:00:00+05:30",
                }
            ]
        },
    }


class UserListResponse(BaseModel):
    """Paginated user list for admin/manager viewing."""
    total: int = Field(..., description="Total matching users")
    users: List[UserResponse]