from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.team import TEAM_THEMES

DIFFICULTIES = {"easy", "medium", "hard"}


def _validate_track(value: str) -> str:
    track = value.strip().lower()
    if track not in TEAM_THEMES:
        raise ValueError(f"track must be one of: {', '.join(sorted(TEAM_THEMES))}")
    return track


def _validate_difficulty(value: str) -> str:
    difficulty = value.strip().lower()
    if difficulty not in DIFFICULTIES:
        raise ValueError(
            f"difficulty must be one of: {', '.join(sorted(DIFFICULTIES))}"
        )
    return difficulty


class ProblemStatementBase(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    summary: str = Field(min_length=10, max_length=300)
    description: str = Field(min_length=20, max_length=5000)
    track: str = Field(min_length=1, max_length=64)
    difficulty: str = Field(default="medium", min_length=3, max_length=20)
    sponsor: str | None = Field(default=None, max_length=120)

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: str) -> str:
        return value.strip()

    @field_validator("track")
    @classmethod
    def _check_track(cls, value: str) -> str:
        return _validate_track(value)

    @field_validator("difficulty")
    @classmethod
    def _check_difficulty(cls, value: str) -> str:
        return _validate_difficulty(value)


class ProblemStatementCreate(ProblemStatementBase):
    published: bool = False


class ProblemStatementUpdate(BaseModel):
    """Partial edit — only provided fields change."""

    title: str | None = Field(default=None, min_length=2, max_length=120)
    summary: str | None = Field(default=None, min_length=10, max_length=300)
    description: str | None = Field(default=None, min_length=20, max_length=5000)
    track: str | None = Field(default=None, min_length=1, max_length=64)
    difficulty: str | None = Field(default=None, min_length=3, max_length=20)
    sponsor: str | None = Field(default=None, max_length=120)
    published: bool | None = None

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else value

    @field_validator("track")
    @classmethod
    def _check_track(cls, value: str | None) -> str | None:
        return None if value is None else _validate_track(value)

    @field_validator("difficulty")
    @classmethod
    def _check_difficulty(cls, value: str | None) -> str | None:
        return None if value is None else _validate_difficulty(value)


class ProblemStatementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    summary: str
    description: str
    track: str
    difficulty: str
    sponsor: str | None
    published: bool
    created_at: datetime
    updated_at: datetime
