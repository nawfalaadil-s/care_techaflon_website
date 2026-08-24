from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class EmailMessage(Base):
    """A transactional email in the outbox.

    Messages are rendered and persisted *before* any delivery attempt, so a
    Gmail outage never loses a notification: admins can inspect the log and
    resend from the CRM. ``status`` lifecycle:

    queued → sent   (Gmail API configured + delivery succeeded)
    queued → logged (no credentials — dev/test "log mode")
    queued → failed (delivery error; ``error`` holds the reason)
    """

    __tablename__ = "email_messages"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    template: Mapped[str] = mapped_column(String(60))
    to_email: Mapped[str] = mapped_column(String(320))
    subject: Mapped[str] = mapped_column(String(500))
    body: Mapped[str] = mapped_column(Text)

    status: Mapped[str] = mapped_column(
        String(20), default="queued", nullable=False, index=True
    )
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    registration_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("registrations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
