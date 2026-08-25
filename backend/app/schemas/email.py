"""Pydantic schemas for the admin email outbox log."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class EmailMessageResponse(BaseModel):
    """One rendered notification in the outbox."""

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
    created_at: datetime
    sent_at: Optional[datetime] = None


class EmailListResponse(BaseModel):
    items: list[EmailMessageResponse]
    total: int
