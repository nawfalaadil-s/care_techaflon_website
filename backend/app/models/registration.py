from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Registration(Base):
    """A hackathon team registration.

    One registration can hold up to ``MAX_MEMBERS`` members (student,
    teammate 1..N). ``contact_email`` is unique and used to send
    confirmation + build-time updates.
    """

    __tablename__ = "registrations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Team + leader
    team_name: Mapped[str] = mapped_column(String(120))
    representative_name: Mapped[str] = mapped_column(String(120))
    representative_email: Mapped[str] = mapped_column(String(320))
    representative_phone: Mapped[str] = mapped_column(String(32))
    institution: Mapped[str] = mapped_column(String(160))
    year_of_study: Mapped[str] = mapped_column(String(40))

    # Track + statement
    track: Mapped[str] = mapped_column(String(64))
    problem_statement: Mapped[Optional[str]] = mapped_column(
        String(120), nullable=True
    )

    # Members (leader + teammates), JSON array of member objects.
    members: Mapped[list] = mapped_column(JSON, default=list)

    # Owning account (team leader), set on registration or via claim.
    owner_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Admin CRM review workflow.
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )

    # System
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("representative_email", name="uq_registrations_email"),
    )