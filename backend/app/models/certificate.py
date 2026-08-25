"""Certificate template uploaded by organizers.

One certificate design is active at any time. When a team is approved (or an
organizer triggers a bulk send), every participant of approved teams receives
the file as an email attachment through the transactional outbox.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Certificate(Base):
    """A certificate file (PDF/PNG/JPEG) stored in the database."""

    __tablename__ = "certificates"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    # Only one row is active at a time; older uploads are kept for audit.
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    uploaded_by: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
