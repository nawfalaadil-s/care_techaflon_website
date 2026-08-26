from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# Valid themes for TechAFlon
TEAM_THEMES = {"ai-ml", "web"}

# Themes selectable during public registration (event offers exactly two).
REGISTRATION_THEMES = {"ai-ml", "web"}

# Valid departments
DEPARTMENT_OPTIONS = {"CSE", "AI & DS"}

# Valid academic years (stored values; UI may display II / III / IV)
YEAR_OPTIONS = {"2nd Year", "3rd Year", "Final Year"}

# Team size constraints
MIN_TEAM_SIZE = 3
MAX_TEAM_SIZE = 4

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class TeamMember(BaseModel):
    """A single team member (excluding the leader)."""

    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    register_number: str = Field(min_length=1, max_length=50)
    department: str = Field(min_length=2, max_length=50)
    year: str = Field(min_length=2, max_length=20)
    # Legacy column kept nullable-at-app-level; not collected during
    # registration anymore.
    section: str = Field(default="", max_length=10)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not EMAIL_RE.match(value):
            raise ValueError("enter a valid email address")
        return value

    @field_validator("name", "register_number")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("this field is required")
        return value


class TeamCreate(BaseModel):
    """Create a new TechAFlon team (public registration flow)."""

    team_name: str = Field(min_length=2, max_length=120)
    theme: str = Field(min_length=2, max_length=64)

    # Leader info
    leader_name: str = Field(min_length=2, max_length=120)
    leader_email: str = Field(min_length=3, max_length=320)
    leader_phone: str = Field(default="", max_length=32)
    leader_register_number: str = Field(min_length=1, max_length=50)
    leader_department: str = Field(min_length=2, max_length=50)
    leader_year: str = Field(min_length=2, max_length=20)
    leader_section: str = Field(default="", max_length=10)

    # Additional members (leader counts as member 1).
    members: list[TeamMember] = Field(min_length=2, max_length=MAX_TEAM_SIZE - 1)

    @field_validator("team_name", "leader_name", "leader_register_number")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("this field is required")
        return value

    @field_validator("leader_email")
    @classmethod
    def _validate_leader_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not EMAIL_RE.match(value):
            raise ValueError("enter a valid email address")
        return value

    @field_validator("theme")
    @classmethod
    def _validate_theme(cls, value: str) -> str:
        theme = value.strip().lower()
        if theme not in REGISTRATION_THEMES:
            raise ValueError(
                f"theme must be one of: {', '.join(sorted(REGISTRATION_THEMES))}"
            )
        return theme

    @field_validator(
        "leader_department",
        "leader_year",
        mode="after",
    )
    @classmethod
    def _validate_leader_fields(cls, value: str, info) -> str:  # noqa: ANN001
        value = value.strip()
        if info.field_name == "leader_department":
            if value not in DEPARTMENT_OPTIONS:
                raise ValueError(
                    f"department must be one of: {', '.join(sorted(DEPARTMENT_OPTIONS))}"
                )
        elif value not in YEAR_OPTIONS:
            raise ValueError(
                f"year must be one of: {', '.join(sorted(YEAR_OPTIONS))}"
            )
        return value

    @field_validator("members")
    @classmethod
    def _validate_members(cls, value: list[TeamMember]) -> list[TeamMember]:
        for member in value:
            if member.department not in DEPARTMENT_OPTIONS:
                raise ValueError(
                    f"department must be one of: {', '.join(sorted(DEPARTMENT_OPTIONS))}"
                )
            if member.year not in YEAR_OPTIONS:
                raise ValueError(
                    f"year must be one of: {', '.join(sorted(YEAR_OPTIONS))}"
                )
        return value

    @model_validator(mode="after")
    def _no_internal_duplicates(self) -> "TeamCreate":
        """Register numbers and emails must be unique inside one team."""
        reg_numbers = [self.leader_register_number.strip().lower()]
        emails = [self.leader_email.strip().lower()]
        for member in self.members:
            reg = member.register_number.strip().lower()
            mail = member.email.strip().lower()
            if reg in reg_numbers or mail in emails:
                raise ValueError(
                    "each student may appear only once per team "
                    "(check register numbers and emails)"
                )
            reg_numbers.append(reg)
            emails.append(mail)
        return self


class TeamResponse(BaseModel):
    """Team response with all details."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    team_id: str
    team_name: str
    theme: str
    status: str
    registered_at: datetime
    approved_at: datetime | None
    leader_name: str
    leader_email: str
    leader_phone: str
    leader_register_number: str
    leader_department: str
    leader_year: str
    leader_section: str
    members: list[TeamMember]
    problem_statement_id: str | None
    ps_allocated_at: datetime | None
    venue_name: str
    venue_location: str
    created_at: datetime
    updated_at: datetime
    # Resolved server-side; participants never browse statements — they only
    # see the title of the one allocated to their team.
    problem_statement_title: str | None = None


def resolve_ps_title(db, problem_statement_id: str | None) -> str | None:
    """Look up an allocated statement's title (None when unallocated)."""
    if not problem_statement_id:
        return None
    from app.models.problem_statement import ProblemStatement

    statement = db.get(ProblemStatement, problem_statement_id)
    return statement.title if statement else None


class TeamUpdate(BaseModel):
    """Partial team update."""

    team_name: str | None = Field(default=None, min_length=2, max_length=120)
    theme: str | None = Field(default=None, min_length=2, max_length=64)
    venue_name: str | None = Field(default=None, min_length=2, max_length=120)
    venue_location: str | None = Field(default=None, min_length=2, max_length=500)

    @field_validator("theme")
    @classmethod
    def _validate_theme(cls, value: str | None) -> str | None:
        if value is None:
            return value
        theme = value.strip().lower()
        if theme not in TEAM_THEMES:
            raise ValueError(f"theme must be one of: {', '.join(sorted(TEAM_THEMES))}")
        return theme


class TeamStatusUpdate(BaseModel):
    """Admin update for team status."""

    status: str = Field(min_length=4, max_length=20)

    @field_validator("status")
    @classmethod
    def _validate_status(cls, value: str) -> str:
        status_value = value.strip().lower()
        if status_value not in {"pending", "approved", "rejected", "disqualified"}:
            raise ValueError(
                f"status must be one of: pending, approved, rejected, disqualified"
            )
        return status_value


class TeamBulkStatusUpdate(BaseModel):
    """Admin bulk update for team statuses."""

    team_ids: list[str] = Field(min_length=1, max_length=100)
    status: str = Field(min_length=4, max_length=20)

    @field_validator("status")
    @classmethod
    def _validate_status(cls, value: str) -> str:
        status_value = value.strip().lower()
        if status_value not in {"pending", "approved", "rejected", "disqualified"}:
            raise ValueError(
                f"status must be one of: pending, approved, rejected, disqualified"
            )
        return status_value


class TeamBulkDelete(BaseModel):
    """Admin bulk delete for teams."""

    team_ids: list[str] = Field(min_length=1, max_length=100)


class BulkOperationResult(BaseModel):
    """Result of a bulk operation."""

    updated: int = 0
    deleted: int = 0
    errors: list[str] = []
