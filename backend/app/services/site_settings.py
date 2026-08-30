"""Site settings — defaults, typed reads, and validated updates.

Settings live in the ``site_settings`` table as JSON values. Every known
key has a default here so the platform works with an empty table; the
admin API validates types/shapes before persisting.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import HTTPException, status
from sqlalchemy import select

from app.models.site_setting import SiteSetting
from app.schemas.site_settings import SiteSettingsRead, SiteSettingsUpdate

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session

# ---------------------------------------------------------------------------
# Defaults — single source of truth for every known key.
# ---------------------------------------------------------------------------

DEFAULTS: dict[str, object] = {
    "event_name": "HackFest 2026",
    "tagline": "48 hours to build something that matters",
    "registration_open": True,
    "registration_deadline": None,
    "contact_email": "hello@hackfest.edu",
    "announcement": "",
    # When true, every newly registered team is auto-allocated a unique
    # problem statement (matched by theme) on the spot.
    "auto_allocate_enabled": False,
    # Master switch for the LEADER/MEMBER portal certificate section.
    # Certificates show in portals only when this is on — team approval and
    # an active certificate must also hold. Admin upload/email tooling is
    # unaffected and stays usable while the portal section is hidden.
    "certificates_visible": False,
}

_SETTING_KEYS = frozenset(DEFAULTS)


def get_settings(db: "Session") -> SiteSettingsRead:
    """Merge DB rows over defaults and return the typed payload."""
    stored = {
        row.key: row.value
        for row in db.scalars(select(SiteSetting).where(SiteSetting.key.in_(_SETTING_KEYS)))
    }
    merged = {**DEFAULTS, **stored}
    return SiteSettingsRead(**merged)  # type: ignore[arg-type]


def is_registration_open(db: "Session") -> bool:
    """Cheap gate check used by the registration endpoint."""
    row = db.get(SiteSetting, "registration_open")
    if row is None:
        return bool(DEFAULTS["registration_open"])
    return bool(row.value)


def are_certificates_visible(db: "Session") -> bool:
    """Cheap portal-switch check used by the certificate endpoints."""
    row = db.get(SiteSetting, "certificates_visible")
    if row is None:
        return bool(DEFAULTS["certificates_visible"])
    return bool(row.value)


def update_settings(db: "Session", payload: SiteSettingsUpdate) -> SiteSettingsRead:
    """Persist only the fields present in the PATCH body."""
    changes = payload.model_dump(exclude_unset=True, exclude_none=False)
    for key, value in changes.items():
        if key not in _SETTING_KEYS:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown setting '{key}'.",
            )
        row = db.get(SiteSetting, key)
        if row is None:
            row = SiteSetting(key=key, value=value)
            db.add(row)
        else:
            row.value = value
    db.commit()
    return get_settings(db)


def reset_setting(db: "Session", key: str) -> SiteSettingsRead:
    """Drop one override so its default applies again (admin utility)."""
    if key not in _SETTING_KEYS:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Unknown setting '{key}'.",
        )
    row = db.get(SiteSetting, key)
    if row is not None:
        db.delete(row)
        db.commit()
    return get_settings(db)
