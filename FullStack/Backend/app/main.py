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
from app.db.session import async_engine
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
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables verified")

    yield

    # ── SHUTDOWN ──
    await async_engine.dispose()
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
    # allow_origins=[
    #     "http://localhost:8081",    # Expo web
    #     "http://localhost:19006",   # Expo web alt
    #     "http://localhost:3000",    # React dev
    #     "http://127.0.0.1:8001",
    #     "http://127.0.0.1:8000",
    #     "*",                        # Allow all for dev (remove in production)
    # ],
    allow_origins=["http://localhost:8081",
                    "https://ai-operation-kaizen123.vercel.app",
                    ],  # The URL of your frontend
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

from app.api.auth import router as auth_router
from app.api.chatbot import router as chatbot_router
from app.api.issues import router as issues_router
# from app.api.assignments import router as assignments_router
from app.api.complaints import router as complaints_router
from app.api.dashboard import router as dashboard_router
from app.api.solver import router as solvers_router
from app.api.site import router as site_router
# from app.api.notifications import router as notifications_router
from app.api.webhooks import router as webhooks_router
# from app.api.history import router as history_router
from app.api.dashboard_cards import router as dashboard_cards_router
from app.api.image import router as images_router



app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(chatbot_router, prefix="/api/v1/chat", tags=["Chatbot"])
app.include_router(issues_router, prefix="/api/v1/issues", tags=["Issues"])
# app.include_router(assignments_router, prefix="/api/v1/assignments", tags=["Assignments"])
app.include_router(complaints_router, prefix="/api/v1/complaints", tags=["Complaints"])
app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(solvers_router, prefix="/api/v1/solvers", tags=["Solvers"])
app.include_router(site_router, prefix="/api/v1/sites", tags=["Sites"])
# app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(webhooks_router, prefix="/api/v1/webhooks", tags=["Webhooks"])
# app.include_router(history_router, prefix="/api/v1/history", tags=["History"])
app.include_router(dashboard_cards_router,prefix="/api/v1/dashboard-cards",tags=["Dashboard Cards"])
app.include_router(images_router, prefix="/api/v1/images", tags=["Images"])

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