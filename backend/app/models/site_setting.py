from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class SiteSetting(Base):
    """One editable site setting (key → JSON value).

    Organizers manage event facts from the CRM instead of code deploys.
    Unknown keys are rejected at the schema layer; every known key has a
    safe default in :mod:`app.services.site_settings`, so the public site
    renders correctly even with an empty table.
    """

    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[Any] = mapped_column(JSON, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
