from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

URL_RE = re.compile(r"^https?://\S+\.\S+")


def _check_url(value: str) -> str:
    value = value.strip()
    if not URL_RE.match(value):
        raise ValueError("must be a valid http(s) URL")
    return value


class SubmissionPayload(BaseModel):
    """Create-or-update payload for a team's project submission."""

    project_name: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=10, max_length=2000)
    repo_url: str = Field(min_length=8, max_length=500)
    demo_url: str | None = Field(default=None, max_length=500)

    @field_validator("project_name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("description")
    @classmethod
    def _strip_description(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 10:
            raise ValueError("describe the project in at least 10 characters")
        return value

    @field_validator("repo_url", "demo_url")
    @classmethod
    def _validate_urls(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if value == "":
            return None  # empty demo URL means "no demo"
        return _check_url(value)


class SubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    registration_id: str
    project_name: str
    description: str
    repo_url: str
    demo_url: str | None
    locked: bool = False
    created_at: datetime
    updated_at: datetime


class SubmissionStatusResponse(BaseModel):
    """GET response — ``submission`` is null until the team submits."""

    submission: SubmissionResponse | None


class SubmissionLockRequest(BaseModel):
    """Admin toggle for a team's submission lock."""

    locked: bool
