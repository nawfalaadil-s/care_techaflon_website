from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class ProblemStatement(Base):
    """A challenge published by organizers that teams can adopt.

    Only ``published`` statements appear on the public site; drafts stay
    hidden until an organizer flips the flag.
    """

    __tablename__ = "problem_statements"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    track: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    difficulty: Mapped[str] = mapped_column(
        String(20), nullable=False, default="medium"
    )
    sponsor: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
