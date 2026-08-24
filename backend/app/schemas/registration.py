from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Same track set as the frontend registration form.
TRACKS = {"ai-ml", "web", "mobile", "sustainability"}
MAX_MEMBERS = 4

# Admin CRM review workflow states.
REGISTRATION_STATUSES = {"pending", "approved", "waitlisted", "rejected"}

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class Member(BaseModel):
    """A single team member (including the representative)."""

    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    phone: str = Field(min_length=5, max_length=32)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not EMAIL_RE.match(value):
            raise ValueError("enter a valid email address")
        return value


class RegistrationCreate(BaseModel):
    team_name: str = Field(min_length=2, max_length=120)
    representative_name: str = Field(min_length=2, max_length=120)
    representative_email: str = Field(min_length=3, max_length=320)
    representative_phone: str = Field(min_length=5, max_length=32)
    institution: str = Field(min_length=2, max_length=160)
    year_of_study: str = Field(min_length=1, max_length=40)
    track: str = Field(min_length=1, max_length=64)
    problem_statement: str | None = Field(default=None, max_length=120)
    members: list[Member] = Field(min_length=1, max_length=MAX_MEMBERS)

    @field_validator("representative_email")
    @classmethod
    def _validate_rep_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not EMAIL_RE.match(value):
            raise ValueError("enter a valid email address")
        return value

    @field_validator("track")
    @classmethod
    def _validate_track(cls, value: str) -> str:
        track = value.strip().lower()
        if track not in TRACKS:
            raise ValueError(f"track must be one of: {', '.join(sorted(TRACKS))}")
        return track

    @field_validator("team_name", "representative_name", "institution")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()

    @field_validator("members")
    @classmethod
    def _cap_members(cls, value: list[Member]) -> list[Member]:
        if len(value) > MAX_MEMBERS:
            raise ValueError(f"a team can have at most {MAX_MEMBERS} members")
        return value


class RegistrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_name: str
    representative_name: str
    representative_email: str
    representative_phone: str
    institution: str
    year_of_study: str
    track: str
    problem_statement: str | None
    members: list[Member]
    owner_id: str | None = None
    status: str = "pending"
    created_at: datetime


class RegistrationListResponse(BaseModel):
    items: list[RegistrationResponse]
    total: int


class RegistrationStatusUpdate(BaseModel):
    """Admin review decision for a registration."""

    status: str = Field(min_length=4, max_length=20)

    @field_validator("status")
    @classmethod
    def _validate_status(cls, value: str) -> str:
        status_value = value.strip().lower()
        if status_value not in REGISTRATION_STATUSES:
            raise ValueError(
                f"status must be one of: {', '.join(sorted(REGISTRATION_STATUSES))}"
            )
        return status_value


class TeamUpdate(BaseModel):
    """Partial team edit — every field optional; only provided fields change."""

    team_name: str | None = Field(default=None, min_length=2, max_length=120)
    track: str | None = Field(default=None, min_length=1, max_length=64)
    problem_statement: str | None = Field(default=None, max_length=120)
    members: list[Member] | None = None

    @field_validator("track")
    @classmethod
    def _validate_track(cls, value: str | None) -> str | None:
        if value is None:
            return value
        track = value.strip().lower()
        if track not in TRACKS:
            raise ValueError(f"track must be one of: {', '.join(sorted(TRACKS))}")
        return track

    @field_validator("team_name")
    @classmethod
    def _strip(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else value

    @field_validator("members")
    @classmethod
    def _cap_members(cls, value: list[Member] | None) -> list[Member] | None:
        if value is not None and len(value) > MAX_MEMBERS:
            raise ValueError(f"a team can have at most {MAX_MEMBERS} members")
        return value
