from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Hackathon Platform API"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/hackathon"

    # Security
    # SECRET_KEY signs JWTs — MUST be replaced before production.
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # CORS — exact origins allowed to call the API (no trailing slashes).
    # Includes local dev plus the deployed Vercel frontend.
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://care-techaflon-website.vercel.app",
        "https://care-techaflon-website.onrender.com",
    ]

    # Email delivery. Three transports are supported, checked in order:
    #   1. Gmail API  — GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN set.
    #   2. Brevo API  — BREVO_API_KEY set (HTTPS, works where outbound
    #                   SMTP is blocked, e.g. Render free tier).
    #   3. SMTP       — SMTP_HOST set (e.g. Gmail's smtp.gmail.com:587 using
    #                   an App Password).
    # With neither configured the outbox runs in "log mode": every message
    # is rendered and recorded in email_messages, just not delivered.
    EMAIL_ENABLED: bool = True
    EMAIL_FROM: str = "TechAFlon <no-reply@example.edu>"

    # Transport 1: Gmail API via Google OAuth 2.0.
    GMAIL_CLIENT_ID: str = ""
    GMAIL_CLIENT_SECRET: str = ""
    GMAIL_REFRESH_TOKEN: str = ""

    # Transport 2: Brevo transactional email over HTTPS API
    # (api.brevo.com:443). Key from dashboard: SMTP & API -> API keys.
    BREVO_API_KEY: str = ""

    # Transport 3: generic SMTP (Gmail: smtp.gmail.com, port 587, STARTTLS,
    # username = full Gmail address, password = 16-char App Password from
    # https://myaccount.google.com/apppasswords).
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
