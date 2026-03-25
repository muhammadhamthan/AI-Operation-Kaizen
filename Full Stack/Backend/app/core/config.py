from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    All env variables loaded from .env file.
    """
    BASE_URL: str = "http://localhost:8000"  # Default for local development; override in .env for production
    # ── Database ──
    DATABASE_URL: str
    SQL_ECHO: bool = False
    
    AI_DATABASE_URL:str

    # ── JWT / Auth ──
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440       # 24 hours

    # ── Groq AI ──
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # ── Twilio ──
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str

    # ── ImageKit ──
    IMAGEKIT_PRIVATE_KEY: str
    IMAGEKIT_PUBLIC_KEY: str
    IMAGEKIT_URL_ENDPOINT: str

    # ── Email / SMTP ──
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = ""

    # ── Celery ──
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # ── App ──
    APP_NAME: str = "Facility Management AI System"
    DEBUG: bool = False

    class Config: #Pydantic is designed to look for a nested class named Config inside your model.
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()