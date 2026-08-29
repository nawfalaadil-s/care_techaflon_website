from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Venue(Base):
    """A physical venue for hackathon teams."""

    __tablename__ = "venues"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    location: Mapped[str] = mapped_column(String(500), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # System
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    seats: Mapped[list["TeamSeat"]] = relationship(
        "TeamSeat", back_populates="venue", cascade="all, delete-orphan"
    )


class TeamSeat(Base):
    """A seat assignment for a team in a venue."""

    __tablename__ = "team_seats"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    venue_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False
    )
    team_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    seat_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # System
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    venue: Mapped["Venue"] = relationship("Venue", back_populates="seats")
    team: Mapped["Team"] = relationship("Team")

    __table_args__ = (
        UniqueConstraint("venue_id", "seat_number", name="uq_venue_seat"),
        UniqueConstraint("team_id", name="uq_team_seat"),
    )