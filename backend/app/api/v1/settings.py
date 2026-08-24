"""Site settings — public read + admin edit."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin
from app.database.base import get_db
from app.models.user import User
from app.schemas.site_settings import SiteSettingsRead, SiteSettingsUpdate
from app.services.site_settings import get_settings, reset_setting, update_settings

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/public", response_model=SiteSettingsRead)
def read_public_settings(db: Session = Depends(get_db)) -> SiteSettingsRead:
    """Public-safe event facts (all keys are audience-facing)."""
    return get_settings(db)


@router.get("", response_model=SiteSettingsRead)
def read_settings(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> SiteSettingsRead:
    """Full settings payload for the CRM editor (organizer/admin only)."""
    _ = current
    return get_settings(db)


@router.patch("", response_model=SiteSettingsRead)
def patch_settings(
    payload: SiteSettingsUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> SiteSettingsRead:
    """Apply partial updates (organizer/admin only)."""
    _ = current
    return update_settings(db, payload)


@router.delete("/{key}", response_model=SiteSettingsRead)
def delete_override(
    key: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> SiteSettingsRead:
    """Reset one setting back to its built-in default (organizer/admin only)."""
    _ = current
    return reset_setting(db, key)
