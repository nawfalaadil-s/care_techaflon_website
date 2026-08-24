from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Submission(Base):
    """A team's hackathon project submission.

    One-to-one with :class:`~app.models.team.Team` — a team has at most one
    submission, enforced by a unique ``registration_id`` (which stores the
    team's UUID).
    """

    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    registration_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    project_name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    repo_url: Mapped[str] = mapped_column(String(500))
    demo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("registration_id", name="uq_submissions_registration"),
    )
