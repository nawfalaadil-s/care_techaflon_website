"""Pydantic schemas for organizer-editable site settings."""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SiteSettingsRead(BaseModel):
    """The full public-safe settings payload (also what admins edit)."""

    model_config = ConfigDict(from_attributes=True)

    event_name: str
    tagline: str
    registration_open: bool
    registration_deadline: Optional[str] = None
    contact_email: str
    announcement: str
    auto_allocate_enabled: bool = False


class SiteSettingsUpdate(BaseModel):
    """PATCH body — every field optional; unknown keys are rejected by the router."""

    event_name: str | None = Field(default=None, min_length=2, max_length=120)
    tagline: str | None = Field(default=None, max_length=200)
    registration_open: bool | None = None
    # ISO date string (YYYY-MM-DD) or null to clear.
    registration_deadline: str | None = None
    contact_email: str | None = Field(default=None, max_length=320)
    announcement: str | None = Field(default=None, max_length=500)
    auto_allocate_enabled: bool | None = None

    @field_validator("registration_deadline")
    @classmethod
    def _validate_deadline(cls, value: str | None) -> str | None:
        if value in ("", None):
            return None
        from datetime import date

        try:
            date.fromisoformat(value)
        except ValueError:
            raise ValueError("registration_deadline must be an ISO date (YYYY-MM-DD).")
        return value

    @field_validator("contact_email")
    @classmethod
    def _validate_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("contact_email must be a valid email address.")
        return value
