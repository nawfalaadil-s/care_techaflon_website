from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import TypeDecorator

from app.database.base import Base


class MembersJSON(TypeDecorator):
    """A JSON array persisted inside a plain TEXT column.

    Keeps the existing database schema untouched while letting the
    application work with a real ``list`` of member dicts.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):  # noqa: ANN001, D102
        if value is None:
            return "[]"
        if isinstance(value, str):
            return value
        return json.dumps(value)

    def process_result_value(self, value, dialect):  # noqa: ANN001, D102
        if value is None:
            return []
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else []
            except (TypeError, ValueError):
                return []
        return value


class Team(Base):
    """A TechAFlon team with approval, theme, and problem statement allocation."""

    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Team ID in format TFLN-2026-XXX
    team_id: Mapped[str] = mapped_column(
        String(20), unique=True, index=True, nullable=False
    )

    # Team basic info
    team_name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    theme: Mapped[str] = mapped_column(String(64), nullable=False)  # ai-ml, web, app
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )  # pending, approved, rejected, disqualified

    # Registration window dates
    registered_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Team leader contact
    leader_name: Mapped[str] = mapped_column(String(120), nullable=False)
    leader_email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    leader_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    leader_register_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    leader_department: Mapped[str] = mapped_column(String(50), nullable=False)  # CSE, AI-DS
    leader_year: Mapped[str] = mapped_column(String(20), nullable=False)  # 2nd Year, 3rd Year, Final Year
    leader_section: Mapped[str] = mapped_column(String(10), nullable=False)

    # Members (JSON array of member objects)
    members: Mapped[list] = mapped_column(
        MembersJSON(), default=list, nullable=False
    )

    # Problem statement allocation
    problem_statement_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("problem_statements.id", ondelete="SET NULL"), nullable=True
    )
    ps_allocated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Venue (admin-configurable)
    venue_name: Mapped[str] = mapped_column(String(120), default="TBD", nullable=False)
    venue_location: Mapped[str] = mapped_column(String(500), default="To be announced", nullable=False)

    # System
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
