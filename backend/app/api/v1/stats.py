from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin
from app.database.base import get_db
from app.models.user import User
from app.services.stats import analytics, overview

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/overview")
def stats_overview(
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Dashboard aggregates for the admin CRM (organizer/admin only)."""
    _ = current
    return overview(db)


@router.get("/analytics")
def stats_analytics(
    days: int = Query(default=30, ge=7, le=90),
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Trends: signups over time, funnel, institutions, tracks (admin only)."""
    _ = current
    return analytics(db, days=days)
