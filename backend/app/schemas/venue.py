from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class VenueBase(BaseModel):
    """Base venue fields."""

    name: str = Field(min_length=2, max_length=120)
    location: str = Field(min_length=2, max_length=500)
    capacity: int = Field(ge=1, le=1000)
    description: str | None = Field(default=None, max_length=2000)


class VenueCreate(VenueBase):
    """Create a new venue."""


class VenueUpdate(BaseModel):
    """Partial venue update."""

    name: str | None = Field(default=None, min_length=2, max_length=120)
    location: str | None = Field(default=None, min_length=2, max_length=500)
    capacity: int | None = Field(default=None, ge=1, le=1000)
    description: str | None = Field(default=None, max_length=2000)


class VenueResponse(VenueBase):
    """Venue response with all details."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class TeamSeatBase(BaseModel):
    """Base team seat fields."""

    seat_number: int = Field(ge=1)


class TeamSeatCreate(TeamSeatBase):
    """Create a seat assignment for a team."""

    team_id: str


class TeamSeatUpdate(BaseModel):
    """Partial seat assignment update."""

    seat_number: int | None = Field(default=None, ge=1)


class TeamBulkSeatAssign(BaseModel):
    """Bulk assign a list of teams to a venue (no per-seat selection)."""

    team_ids: list[str] = Field(min_length=1, max_length=400)


class TeamBulkUnassign(BaseModel):
    """Bulk remove a list of teams from their venue assignments."""

    team_ids: list[str] = Field(min_length=1, max_length=400)


class TeamSeatResponse(TeamSeatBase):
    """Team seat response with details."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    venue_id: str
    team_id: str
    created_at: datetime
    updated_at: datetime


class VenueWithSeats(VenueResponse):
    """Venue with seat assignments."""

    seats: list[TeamSeatResponse] = []
    available_seats: int = 0