"""Pydantic schemas for the admin email outbox log."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class EmailMessageResponse(BaseModel):
    """Full notification detail (used for single-message view and resend)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    template: str
    to_email: str
    subject: str
    body: str
    body_html: Optional[str] = None
    status: str
    error: Optional[str] = None
    registration_id: Optional[str] = None
    certificate_id: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None


class EmailMessageSummary(BaseModel):
    """Lightweight outbox entry for list views — excludes body payloads."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    template: str
    to_email: str
    subject: str
    status: str
    error: Optional[str] = None
    certificate_id: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None


class EmailListResponse(BaseModel):
    items: list[EmailMessageSummary]
    total: int
