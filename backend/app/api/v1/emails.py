"""Admin email outbox — inspect the log and retry delivery."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin
from app.database.base import get_db
from app.models.user import User
from app.schemas.email import EmailListResponse, EmailMessageResponse, EmailMessageSummary
from app.services.email import count_messages, get_message, list_messages, resend_message

router = APIRouter(prefix="/emails", tags=["emails"])


@router.get("", response_model=EmailListResponse)
def list_emails(
    limit: int = Query(default=50, ge=1, le=200),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> EmailListResponse:
    """Newest-first delivery log (organizer/admin only)."""
    _ = current
    items = list_messages(db, limit=limit, status_filter=status_filter)
    total = count_messages(db, status_filter=status_filter)
    return EmailListResponse(
        items=[EmailMessageSummary.model_validate(m) for m in items],
        total=total,
    )


@router.get("/{message_id}", response_model=EmailMessageResponse)
def read_email(
    message_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> EmailMessageResponse:
    _ = current
    return EmailMessageResponse.model_validate(get_message(db, message_id))


@router.post("/{message_id}/resend", response_model=EmailMessageResponse)
def resend_email(
    message_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> EmailMessageResponse:
    """Retry delivery of a failed/logged message (organizer/admin only)."""
    _ = current
    message = resend_message(db, message_id)
    return EmailMessageResponse.model_validate(message)
