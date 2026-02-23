"""
PURPOSE: Authentication endpoints — login, register, profile.
──────────────────────────────────────────────────────────────
JWT auth DISABLED for Postman testing.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_db, get_current_user, require_role
from app.models.user import User
from app.core.enums import UserRole
# from app.core.security import get_password_hash, verify_password, create_access_token   # COMMENTED OUT
from app.schemas.user_schema import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserListResponse,
    TokenResponse,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(require_role([UserRole.MANAGER])),    # COMMENTED OUT
):
    existing = db.query(User).filter(User.phone == user_data.phone).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Phone {user_data.phone} already registered")

    if user_data.email:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(status_code=409, detail=f"Email already registered")

    new_user = User(
        name=user_data.name,
        phone=user_data.phone,
        email=user_data.email,
        role=user_data.role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post(
    "/login",
    # response_model=TokenResponse,                                      # COMMENTED OUT
    summary="Login — returns user info (JWT disabled)",
)
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.phone == login_data.phone,
        User.is_active == True,
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid phone or account deactivated")

    # ── JWT DISABLED — just return user info ─────────────
    # access_token = create_access_token(
    #     data={"sub": user.id, "role": user.role.value, "name": user.name}
    # )
    # return TokenResponse(
    #     access_token=access_token,
    #     token_type="bearer",
    #     user=UserResponse.model_validate(user),
    # )

    # ── TESTING MODE — return user directly ──────────────
    return {
        "message": "Login successful (JWT disabled for testing)",
        "user": UserResponse.model_validate(user),
    }


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get(
    "/users",
    response_model=UserListResponse,
    summary="List all users",
)
def list_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    # current_user: User = Depends(require_role([UserRole.MANAGER])),    # COMMENTED OUT
):
    query = db.query(User)
    if role:
        try:
            role_enum = UserRole(role)
            query = query.filter(User.role == role_enum)
        except ValueError:
            raise HTTPException(400, f"Invalid role: {role}")

    users = query.order_by(User.id).all()
    return UserListResponse(
        total=len(users),
        users=[UserResponse.model_validate(u) for u in users],
    )