from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.database.base import engine
from app.schemas.health import DatabaseHealth, HealthResponse

router = APIRouter(prefix="/health", tags=["health"])


def _check_database() -> DatabaseHealth:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return DatabaseHealth(connected=True)
    except Exception as exc:  # noqa: BLE001 - health check must never raise
        # Never leak connection strings/exception text to unauthenticated
        # callers; operators can consult server logs for the real error.
        detail = (
            str(exc) if settings.ENVIRONMENT != "production" else "Database unavailable."
        )
        return DatabaseHealth(connected=False, detail=detail)


@router.get("", response_model=HealthResponse)
@router.get("/", response_model=HealthResponse, include_in_schema=False)
def health_check() -> HealthResponse:
    db_health = _check_database()
    return HealthResponse(
        status="ok",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        database=db_health,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
