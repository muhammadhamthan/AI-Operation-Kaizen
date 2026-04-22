"""
FastAPI Application Entry Point
================================
Responsible for:
- Creating FastAPI app instance
- Registering routers
- Adding middleware (CORS, auth, logging)
- Handling startup/shutdown lifecycle
- Health check endpoint
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine
from app.db.base import Base

# Import all models so metadata knows every table
import app.models  # noqa


# ──────────────────────────────────────────────────────────
# Lifecycle Management
# ──────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
    print(f"🚀 Starting {settings.APP_NAME}")
    print(f"📦 Environment: {'DEBUG' if settings.DEBUG else 'PRODUCTION'}")

    # Dev convenience: auto-create tables
    if settings.DEBUG:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables verified")

    yield

    # ── SHUTDOWN ──
    await engine.dispose()
    print("🛑 Database connections closed")


# ──────────────────────────────────────────────────────────
# Create FastAPI App
# ──────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered facility management backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ──────────────────────────────────────────────────────────
# Middleware Registration
# ──────────────────────────────────────────────────────────

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Middleware
# from app.middleware.auth_middleware import AuthMiddleware
# from app.middleware.logging_middleware import LoggingMiddleware

# app.add_middleware(LoggingMiddleware)
# app.add_middleware(AuthMiddleware)


# ──────────────────────────────────────────────────────────
# Router Registration
# ──────────────────────────────────────────────────────────

# from app.api.auth import router as auth_router
# from app.api.chatbot import router as chatbot_router
# from app.api.issues import router as issues_router
# from app.api.assignments import router as assignments_router
# from app.api.images import router as images_router
# from app.api.complaints import router as complaints_router
# from app.api.dashboard import router as dashboard_router
# from app.api.notifications import router as notifications_router
# from app.api.webhooks import router as webhooks_router
# from app.api.history import router as history_router

# app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
# app.include_router(chatbot_router, prefix="/api/v1/chat", tags=["Chatbot"])
# app.include_router(issues_router, prefix="/api/v1/issues", tags=["Issues"])
# app.include_router(assignments_router, prefix="/api/v1/assignments", tags=["Assignments"])
# app.include_router(images_router, prefix="/api/v1/images", tags=["Images"])
# app.include_router(complaints_router, prefix="/api/v1/complaints", tags=["Complaints"])
# app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["Dashboard"])
# app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["Notifications"])
# app.include_router(webhooks_router, prefix="/api/v1/webhooks", tags=["Webhooks"])
# app.include_router(history_router, prefix="/api/v1/history", tags=["History"])


# ──────────────────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs",
        "health": "/health",
    }










































# from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.security import OAuth2PasswordRequestForm
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy import select, func
# from sqlalchemy.orm import selectinload
# from pydantic import BaseModel
# from typing import Optional, List
# from datetime import datetime
# from dotenv import load_dotenv
# import os

# load_dotenv()

# from app.core.database import get_db, Base, async_engine
# from app.core.security import verify_password, create_access_token, get_current_user
# from app.models.user import User, UserRole
# from app.models.site import Site
# from app.models.issue import Issue, IssueStatus, IssuePriority
# from app.models.issue_assignment import IssueAssignment
# from app.models.complaint import Complaint
# from app.models.issue_image import IssueImage
# from app.models.issue_history import IssueHistory
# from app.models.call_log import CallLog

# # Create FastAPI app
# app = FastAPI(title="AI OpEx Platform API", version="2.0.0")

# # CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # API Router
# api_router = APIRouter(prefix="/api")

# # ==================== PYDANTIC SCHEMAS ====================

# class Token(BaseModel):
#     access_token: str
#     token_type: str

# class UserResponse(BaseModel):
#     id: int
#     username: str
#     name: str
#     email: str
#     phone: Optional[str]
#     role: str
#     avatar_url: Optional[str]
    
#     class Config:
#         from_attributes = True

# class LoginResponse(BaseModel):
#     access_token: str
#     token_type: str
#     user: UserResponse

# class SiteResponse(BaseModel):
#     id: int
#     name: str
#     location: Optional[str]
#     latitude: Optional[float]
#     longitude: Optional[float]
#     address: Optional[str]
    
#     class Config:
#         from_attributes = True

# class IssueResponse(BaseModel):
#     id: int
#     title: str
#     description: Optional[str]
#     issue_type: Optional[str]
#     priority: str
#     status: str
#     site_id: int
#     site: Optional[SiteResponse]
#     raised_by_user_id: int
#     raised_by: Optional[UserResponse]
#     deadline_at: Optional[datetime]
#     created_at: datetime
#     updated_at: datetime
    
#     class Config:
#         from_attributes = True

# class DashboardStats(BaseModel):
#     totalIssues: int
#     notFixedIssues: int
#     fixedIssues: int
#     complaints: int

# class ComplaintResponse(BaseModel):
#     id: int
#     issue_id: int
#     raised_by_user_id: int
#     target_solver_id: Optional[int]
#     complaint_details: str
#     status: str
#     created_at: datetime
    
#     class Config:
#         from_attributes = True

# # ==================== AUTH ENDPOINTS ====================

# @api_router.post("/auth/login", response_model=LoginResponse)
# async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
#     """Authenticate user and return JWT token"""
#     result = await db.execute(select(User).where(User.username == form_data.username))
#     user = result.scalar_one_or_none()
    
#     if not user or not verify_password(form_data.password, user.password_hash):
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect username or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
    
#     if not user.is_active:
#         raise HTTPException(status_code=400, detail="Inactive user")
    
#     access_token = create_access_token(data={"sub": str(user.id)})
    
#     return LoginResponse(
#         access_token=access_token,
#         token_type="bearer",
#         user=UserResponse(
#             id=user.id,
#             username=user.username,
#             name=user.name,
#             email=user.email,
#             phone=user.phone,
#             role=user.role.value,
#             avatar_url=user.avatar_url
#         )
#     )

# @api_router.get("/auth/me", response_model=UserResponse)
# async def get_me(current_user: User = Depends(get_current_user)):
#     """Get current authenticated user"""
#     return UserResponse(
#         id=current_user.id,
#         username=current_user.username,
#         name=current_user.name,
#         email=current_user.email,
#         phone=current_user.phone,
#         role=current_user.role.value,
#         avatar_url=current_user.avatar_url
#     )

# # ==================== ISSUES ENDPOINTS ====================

# @api_router.get("/issues", response_model=List[IssueResponse])
# async def get_issues(
#     status: Optional[str] = None,
#     priority: Optional[str] = None,
#     site_id: Optional[int] = None,
#     db: AsyncSession = Depends(get_db),
#     current_user: User = Depends(get_current_user)
# ):
#     """Get all issues with optional filters"""
#     query = select(Issue).options(
#         selectinload(Issue.site),
#         selectinload(Issue.raised_by)
#     )
    
#     # Role-based filtering
#     if current_user.role == UserRole.problem_solver:
#         # Solver sees only assigned issues
#         query = query.join(IssueAssignment).where(
#             IssueAssignment.assigned_to_solver_id == current_user.id
#         )
#     elif current_user.role == UserRole.supervisor:
#         # Supervisor sees issues from their sites
#         from app.models.supervisor_site import SupervisorSite
#         subquery = select(SupervisorSite.site_id).where(
#             SupervisorSite.supervisor_id == current_user.id
#         )
#         query = query.where(Issue.site_id.in_(subquery))
#     # Manager sees all issues
    
#     # Apply filters
#     if status:
#         query = query.where(Issue.status == status)
#     if priority:
#         query = query.where(Issue.priority == priority)
#     if site_id:
#         query = query.where(Issue.site_id == site_id)
    
#     query = query.order_by(Issue.created_at.desc())
    
#     result = await db.execute(query)
#     issues = result.scalars().all()
    
#     return [IssueResponse(
#         id=issue.id,
#         title=issue.title,
#         description=issue.description,
#         issue_type=issue.issue_type,
#         priority=issue.priority.value,
#         status=issue.status.value,
#         site_id=issue.site_id,
#         site=SiteResponse(
#             id=issue.site.id,
#             name=issue.site.name,
#             location=issue.site.location,
#             latitude=issue.site.latitude,
#             longitude=issue.site.longitude,
#             address=issue.site.address
#         ) if issue.site else None,
#         raised_by_user_id=issue.raised_by_user_id,
#         raised_by=UserResponse(
#             id=issue.raised_by.id,
#             username=issue.raised_by.username,
#             name=issue.raised_by.name,
#             email=issue.raised_by.email,
#             phone=issue.raised_by.phone,
#             role=issue.raised_by.role.value,
#             avatar_url=issue.raised_by.avatar_url
#         ) if issue.raised_by else None,
#         deadline_at=issue.deadline_at,
#         created_at=issue.created_at,
#         updated_at=issue.updated_at
#     ) for issue in issues]

# @api_router.get("/issues/{issue_id}", response_model=IssueResponse)
# async def get_issue(issue_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
#     """Get single issue by ID"""
#     query = select(Issue).options(
#         selectinload(Issue.site),
#         selectinload(Issue.raised_by)
#     ).where(Issue.id == issue_id)
    
#     result = await db.execute(query)
#     issue = result.scalar_one_or_none()
    
#     if not issue:
#         raise HTTPException(status_code=404, detail="Issue not found")
    
#     return IssueResponse(
#         id=issue.id,
#         title=issue.title,
#         description=issue.description,
#         issue_type=issue.issue_type,
#         priority=issue.priority.value,
#         status=issue.status.value,
#         site_id=issue.site_id,
#         site=SiteResponse(
#             id=issue.site.id,
#             name=issue.site.name,
#             location=issue.site.location,
#             latitude=issue.site.latitude,
#             longitude=issue.site.longitude,
#             address=issue.site.address
#         ) if issue.site else None,
#         raised_by_user_id=issue.raised_by_user_id,
#         raised_by=UserResponse(
#             id=issue.raised_by.id,
#             username=issue.raised_by.username,
#             name=issue.raised_by.name,
#             email=issue.raised_by.email,
#             phone=issue.raised_by.phone,
#             role=issue.raised_by.role.value,
#             avatar_url=issue.raised_by.avatar_url
#         ) if issue.raised_by else None,
#         deadline_at=issue.deadline_at,
#         created_at=issue.created_at,
#         updated_at=issue.updated_at
#     )

# # ==================== DASHBOARD ENDPOINTS ====================

# @api_router.get("/dashboard/stats", response_model=DashboardStats)
# async def get_dashboard_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
#     """Get dashboard statistics"""
#     # Total issues
#     total_query = select(func.count(Issue.id))
#     total_result = await db.execute(total_query)
#     total_issues = total_result.scalar()
    
#     # Not fixed issues (OPEN, ASSIGNED, IN_PROGRESS, REOPENED, ESCALATED)
#     not_fixed_statuses = [IssueStatus.OPEN, IssueStatus.ASSIGNED, IssueStatus.IN_PROGRESS, IssueStatus.REOPENED, IssueStatus.ESCALATED]
#     not_fixed_query = select(func.count(Issue.id)).where(Issue.status.in_(not_fixed_statuses))
#     not_fixed_result = await db.execute(not_fixed_query)
#     not_fixed_issues = not_fixed_result.scalar()
    
#     # Fixed issues (COMPLETED)
#     fixed_query = select(func.count(Issue.id)).where(Issue.status == IssueStatus.COMPLETED)
#     fixed_result = await db.execute(fixed_query)
#     fixed_issues = fixed_result.scalar()
    
#     # Complaints
#     complaints_query = select(func.count(Complaint.id))
#     complaints_result = await db.execute(complaints_query)
#     complaints_count = complaints_result.scalar()
    
#     return DashboardStats(
#         totalIssues=total_issues,
#         notFixedIssues=not_fixed_issues,
#         fixedIssues=fixed_issues,
#         complaints=complaints_count
#     )

# # ==================== COMPLAINTS ENDPOINTS ====================

# @api_router.get("/complaints", response_model=List[ComplaintResponse])
# async def get_complaints(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
#     """Get all complaints"""
#     query = select(Complaint).order_by(Complaint.created_at.desc())
#     result = await db.execute(query)
#     complaints = result.scalars().all()
    
#     return [ComplaintResponse(
#         id=c.id,
#         issue_id=c.issue_id,
#         raised_by_user_id=c.raised_by_user_id,
#         target_solver_id=c.target_solver_id,
#         complaint_details=c.complaint_details,
#         status=c.status.value,
#         created_at=c.created_at
#     ) for c in complaints]

# # ==================== SITES ENDPOINTS ====================

# @api_router.get("/sites", response_model=List[SiteResponse])
# async def get_sites(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
#     """Get all sites"""
#     query = select(Site)
#     result = await db.execute(query)
#     sites = result.scalars().all()
    
#     return [SiteResponse(
#         id=s.id,
#         name=s.name,
#         location=s.location,
#         latitude=s.latitude,
#         longitude=s.longitude,
#         address=s.address
#     ) for s in sites]

# # ==================== CHATBOT ENDPOINTS (MOCKED) ====================

# class ChatMessage(BaseModel):
#     message: str

# class ChatResponse(BaseModel):
#     response: str
#     intent: Optional[str]

# @api_router.post("/chatbot/message", response_model=ChatResponse)
# async def send_chat_message(chat: ChatMessage, current_user: User = Depends(get_current_user)):
#     """Process chatbot message (MOCKED - will integrate with Groq/OpenAI later)"""
#     message_lower = chat.message.lower()
    
#     # Simple intent detection (MOCKED)
#     if "report" in message_lower or "issue" in message_lower or "problem" in message_lower:
#         return ChatResponse(
#             response="I can help you report a new issue. Please describe the problem and I'll guide you through the process.",
#             intent="report_issue"
#         )
#     elif "status" in message_lower or "update" in message_lower:
#         return ChatResponse(
#             response="I can check the status of your issues. Would you like to see all your active issues or a specific one?",
#             intent="check_status"
#         )
#     elif "analytics" in message_lower or "report" in message_lower or "dashboard" in message_lower:
#         return ChatResponse(
#             response="I can show you analytics and reports. What would you like to see - issue trends, completion rates, or site performance?",
#             intent="analytics"
#         )
#     else:
#         return ChatResponse(
#             response=f"Hello {current_user.name}! I'm your AI assistant. I can help you with:\n• Reporting new issues\n• Checking issue status\n• Viewing analytics\n\nWhat would you like to do?",
#             intent="greeting"
#         )

# # ==================== HEALTH CHECK ====================

# @api_router.get("/health")
# async def health_check():
#     """Health check endpoint"""
#     return {"status": "healthy", "version": "2.0.0", "database": "postgresql"}

# # Include router
# app.include_router(api_router)

# # Startup event
# @app.on_event("startup")
# async def startup():
#     print("Starting AI OpEx Platform API v2.0.0")
#     print("Database: PostgreSQL")

# @app.on_event("shutdown")
# async def shutdown():
#     print("Shutting down AI OpEx Platform API")



















# from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.security import OAuth2PasswordRequestForm
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy import select, func
# from sqlalchemy.orm import selectinload
# from pydantic import BaseModel
# from typing import Optional, List
# from datetime import datetime
# from dotenv import load_dotenv
# import os

# load_dotenv()

# from app.core.database import get_db, Base, async_engine
# from app.core.security import verify_password, create_access_token, get_current_user
# from app.models.user import User, UserRole
# from app.models.site import Site
# from app.models.issue import Issue, IssueStatus, IssuePriority
# from app.models.issue_assignment import IssueAssignment
# from app.models.complaint import Complaint
# from app.models.issue_image import IssueImage
# from app.models.issue_history import IssueHistory
# from app.models.call_log import CallLog

# # Create FastAPI app
# app = FastAPI(title="AI OpEx Platform API", version="2.0.0")

# # CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # API Router
# api_router = APIRouter(prefix="/api")

# # ==================== PYDANTIC SCHEMAS ====================

# class Token(BaseModel):
#     access_token: str
#     token_type: str

# class UserResponse(BaseModel):
#     id: int
#     username: str
#     name: str
#     email: str
#     phone: Optional[str]
#     role: str
#     avatar_url: Optional[str]
    
#     class Config:
#         from_attributes = True

# class LoginResponse(BaseModel):
#     access_token: str
#     token_type: str
#     user: UserResponse

# class SiteResponse(BaseModel):
#     id: int
#     name: str
#     location: Optional[str]
#     latitude: Optional[float]
#     longitude: Optional[float]
#     address: Optional[str]
    
#     class Config:
#         from_attributes = True

# class IssueResponse(BaseModel):
#     id: int
#     title: str
#     description: Optional[str]
#     issue_type: Optional[str]
#     priority: str
#     status: str
#     site_id: int
#     site: Optional[SiteResponse]
#     raised_by_user_id: int
#     raised_by: Optional[UserResponse]
#     deadline_at: Optional[datetime]
#     created_at: datetime
#     updated_at: datetime
    
#     class Config:
#         from_attributes = True

# class DashboardStats(BaseModel):
#     totalIssues: int
#     notFixedIssues: int
#     fixedIssues: int
#     complaints: int

# class ComplaintResponse(BaseModel):
#     id: int
#     issue_id: int
#     raised_by_user_id: int
#     target_solver_id: Optional[int]
#     complaint_details: str
#     status: str
#     created_at: datetime
    
#     class Config:
#         from_attributes = True

# # ==================== AUTH ENDPOINTS ====================

# @api_router.post("/auth/login", response_model=LoginResponse)
# async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
#     """Authenticate user and return JWT token"""
#     result = await db.execute(select(User).where(User.username == form_data.username))
#     user = result.scalar_one_or_none()
    
#     if not user or not verify_password(form_data.password, user.password_hash):
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect username or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
    
#     if not user.is_active:
#         raise HTTPException(status_code=400, detail="Inactive user")
    
#     access_token = create_access_token(data={"sub": str(user.id)})
    
#     return LoginResponse(
#         access_token=access_token,
#         token_type="bearer",
#         user=UserResponse(
#             id=user.id,
#             username=user.username,
#             name=user.name,
#             email=user.email,
#             phone=user.phone,
#             role=user.role.value,
#             avatar_url=user.avatar_url
#         )
#     )

# @api_router.get("/auth/me", response_model=UserResponse)
# async def get_me(current_user: User = Depends(get_current_user)):
#     """Get current authenticated user"""
#     return UserResponse(
#         id=current_user.id,
#         username=current_user.username,
#         name=current_user.name,
#         email=current_user.email,
#         phone=current_user.phone,
#         role=current_user.role.value,
#         avatar_url=current_user.avatar_url
#     )

# # ==================== ISSUES ENDPOINTS ====================

# @api_router.get("/issues", response_model=List[IssueResponse])
# async def get_issues(
#     status: Optional[str] = None,
#     priority: Optional[str] = None,
#     site_id: Optional[int] = None,
#     db: AsyncSession = Depends(get_db),
#     current_user: User = Depends(get_current_user)
# ):
#     """Get all issues with optional filters"""
#     query = select(Issue).options(
#         selectinload(Issue.site),
#         selectinload(Issue.raised_by)
#     )
    
#     # Role-based filtering
#     if current_user.role == UserRole.problem_solver:
#         # Solver sees only assigned issues
#         query = query.join(IssueAssignment).where(
#             IssueAssignment.assigned_to_solver_id == current_user.id
#         )
#     elif current_user.role == UserRole.supervisor:
#         # Supervisor sees issues from their sites
#         from app.models.supervisor_site import SupervisorSite
#         subquery = select(SupervisorSite.site_id).where(
#             SupervisorSite.supervisor_id == current_user.id
#         )
#         query = query.where(Issue.site_id.in_(subquery))
#     # Manager sees all issues
    
#     # Apply filters
#     if status:
#         query = query.where(Issue.status == status)
#     if priority:
#         query = query.where(Issue.priority == priority)
#     if site_id:
#         query = query.where(Issue.site_id == site_id)
    
#     query = query.order_by(Issue.created_at.desc())
    
#     result = await db.execute(query)
#     issues = result.scalars().all()
    
#     return [IssueResponse(
#         id=issue.id,
#         title=issue.title,
#         description=issue.description,
#         issue_type=issue.issue_type,
#         priority=issue.priority.value,
#         status=issue.status.value,
#         site_id=issue.site_id,
#         site=SiteResponse(
#             id=issue.site.id,
#             name=issue.site.name,
#             location=issue.site.location,
#             latitude=issue.site.latitude,
#             longitude=issue.site.longitude,
#             address=issue.site.address
#         ) if issue.site else None,
#         raised_by_user_id=issue.raised_by_user_id,
#         raised_by=UserResponse(
#             id=issue.raised_by.id,
#             username=issue.raised_by.username,
#             name=issue.raised_by.name,
#             email=issue.raised_by.email,
#             phone=issue.raised_by.phone,
#             role=issue.raised_by.role.value,
#             avatar_url=issue.raised_by.avatar_url
#         ) if issue.raised_by else None,
#         deadline_at=issue.deadline_at,
#         created_at=issue.created_at,
#         updated_at=issue.updated_at
#     ) for issue in issues]

# @api_router.get("/issues/{issue_id}", response_model=IssueResponse)
# async def get_issue(issue_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
#     """Get single issue by ID"""
#     query = select(Issue).options(
#         selectinload(Issue.site),
#         selectinload(Issue.raised_by)
#     ).where(Issue.id == issue_id)
    
#     result = await db.execute(query)
#     issue = result.scalar_one_or_none()
    
#     if not issue:
#         raise HTTPException(status_code=404, detail="Issue not found")
    
#     return IssueResponse(
#         id=issue.id,
#         title=issue.title,
#         description=issue.description,
#         issue_type=issue.issue_type,
#         priority=issue.priority.value,
#         status=issue.status.value,
#         site_id=issue.site_id,
#         site=SiteResponse(
#             id=issue.site.id,
#             name=issue.site.name,
#             location=issue.site.location,
#             latitude=issue.site.latitude,
#             longitude=issue.site.longitude,
#             address=issue.site.address
#         ) if issue.site else None,
#         raised_by_user_id=issue.raised_by_user_id,
#         raised_by=UserResponse(
#             id=issue.raised_by.id,
#             username=issue.raised_by.username,
#             name=issue.raised_by.name,
#             email=issue.raised_by.email,
#             phone=issue.raised_by.phone,
#             role=issue.raised_by.role.value,
#             avatar_url=issue.raised_by.avatar_url
#         ) if issue.raised_by else None,
#         deadline_at=issue.deadline_at,
#         created_at=issue.created_at,
#         updated_at=issue.updated_at
#     )

# # ==================== DASHBOARD ENDPOINTS ====================

# @api_router.get("/dashboard/stats", response_model=DashboardStats)
# async def get_dashboard_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
#     """Get dashboard statistics"""
#     # Total issues
#     total_query = select(func.count(Issue.id))
#     total_result = await db.execute(total_query)
#     total_issues = total_result.scalar()
    
#     # Not fixed issues (OPEN, ASSIGNED, IN_PROGRESS, REOPENED, ESCALATED)
#     not_fixed_statuses = [IssueStatus.OPEN, IssueStatus.ASSIGNED, IssueStatus.IN_PROGRESS, IssueStatus.REOPENED, IssueStatus.ESCALATED]
#     not_fixed_query = select(func.count(Issue.id)).where(Issue.status.in_(not_fixed_statuses))
#     not_fixed_result = await db.execute(not_fixed_query)
#     not_fixed_issues = not_fixed_result.scalar()
    
#     # Fixed issues (COMPLETED)
#     fixed_query = select(func.count(Issue.id)).where(Issue.status == IssueStatus.COMPLETED)
#     fixed_result = await db.execute(fixed_query)
#     fixed_issues = fixed_result.scalar()
    
#     # Complaints
#     complaints_query = select(func.count(Complaint.id))
#     complaints_result = await db.execute(complaints_query)
#     complaints_count = complaints_result.scalar()
    
#     return DashboardStats(
#         totalIssues=total_issues,
#         notFixedIssues=not_fixed_issues,
#         fixedIssues=fixed_issues,
#         complaints=complaints_count
#     )

# # ==================== COMPLAINTS ENDPOINTS ====================

# @api_router.get("/complaints", response_model=List[ComplaintResponse])
# async def get_complaints(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
#     """Get all complaints"""
#     query = select(Complaint).order_by(Complaint.created_at.desc())
#     result = await db.execute(query)
#     complaints = result.scalars().all()
    
#     return [ComplaintResponse(
#         id=c.id,
#         issue_id=c.issue_id,
#         raised_by_user_id=c.raised_by_user_id,
#         target_solver_id=c.target_solver_id,
#         complaint_details=c.complaint_details,
#         status=c.status.value,
#         created_at=c.created_at
#     ) for c in complaints]

# # ==================== SITES ENDPOINTS ====================

# @api_router.get("/sites", response_model=List[SiteResponse])
# async def get_sites(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
#     """Get all sites"""
#     query = select(Site)
#     result = await db.execute(query)
#     sites = result.scalars().all()
    
#     return [SiteResponse(
#         id=s.id,
#         name=s.name,
#         location=s.location,
#         latitude=s.latitude,
#         longitude=s.longitude,
#         address=s.address
#     ) for s in sites]

# # ==================== CHATBOT ENDPOINTS (MOCKED) ====================

# class ChatMessage(BaseModel):
#     message: str

# class ChatResponse(BaseModel):
#     response: str
#     intent: Optional[str]

# @api_router.post("/chatbot/message", response_model=ChatResponse)
# async def send_chat_message(chat: ChatMessage, current_user: User = Depends(get_current_user)):
#     """Process chatbot message (MOCKED - will integrate with Groq/OpenAI later)"""
#     message_lower = chat.message.lower()
    
#     # Simple intent detection (MOCKED)
#     if "report" in message_lower or "issue" in message_lower or "problem" in message_lower:
#         return ChatResponse(
#             response="I can help you report a new issue. Please describe the problem and I'll guide you through the process.",
#             intent="report_issue"
#         )
#     elif "status" in message_lower or "update" in message_lower:
#         return ChatResponse(
#             response="I can check the status of your issues. Would you like to see all your active issues or a specific one?",
#             intent="check_status"
#         )
#     elif "analytics" in message_lower or "report" in message_lower or "dashboard" in message_lower:
#         return ChatResponse(
#             response="I can show you analytics and reports. What would you like to see - issue trends, completion rates, or site performance?",
#             intent="analytics"
#         )
#     else:
#         return ChatResponse(
#             response=f"Hello {current_user.name}! I'm your AI assistant. I can help you with:\n• Reporting new issues\n• Checking issue status\n• Viewing analytics\n\nWhat would you like to do?",
#             intent="greeting"
#         )

# # ==================== HEALTH CHECK ====================

# @api_router.get("/health")
# async def health_check():
#     """Health check endpoint"""
#     return {"status": "healthy", "version": "2.0.0", "database": "postgresql"}

# # Include router
# app.include_router(api_router)

# # Startup event
# @app.on_event("startup")
# async def startup():
#     print("Starting AI OpEx Platform API v2.0.0")
#     print("Database: PostgreSQL")

# @app.on_event("shutdown")
# async def shutdown():
#     print("Shutting down AI OpEx Platform API")
