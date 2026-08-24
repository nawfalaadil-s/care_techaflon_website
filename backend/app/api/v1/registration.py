from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin
from app.core.ratelimit import rate_limit
from app.database.base import get_db
from app.models.user import User
from app.schemas.registration import (
    MAX_MEMBERS,
    RegistrationCreate,
    RegistrationListResponse,
    RegistrationResponse,
    RegistrationStatusUpdate,
)
from app.services.registration import (
    create_registration,
    get_registration,
    list_registrations,
    set_status,
)
from app.workers.email_tasks import (
    task_send_registration_confirmation,
    task_send_registration_decision,
)

router = APIRouter(prefix="/registration", tags=["registration"])

# Public write endpoint: cap spam bursts without hurting real teams.
limit_submit = rate_limit("registration-submit", limit=30, window_seconds=60)


@router.get("/meta", response_model=dict)
def registration_meta(db: Session = Depends(get_db)) -> dict:
    """Client-facing constants (member cap, tracks, open flag)."""
    from app.services.site_settings import get_settings

    settings = get_settings(db)
    return {
        "max_members": MAX_MEMBERS,
        "tracks": ["ai-ml", "web", "mobile", "sustainability"],
        "registration_open": settings.registration_open,
        "registration_deadline": settings.registration_deadline,
        "announcement": settings.announcement,
        "event_name": settings.event_name,
    }


@router.post(
    "",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_registration(
    payload: RegistrationCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: None = Depends(limit_submit),
) -> RegistrationResponse:
    registration = create_registration(db, payload)
    background.add_task(task_send_registration_confirmation, registration.id)
    return RegistrationResponse.model_validate(registration)


@router.get("", response_model=RegistrationListResponse)
def get_registrations(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> RegistrationListResponse:
    """Admin CRM feed — requires organizer/admin privileges."""
    items = list_registrations(db)
    return RegistrationListResponse(items=items, total=len(items))


@router.get("/{registration_id}", response_model=RegistrationResponse)
def get_registration_detail(
    registration_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> RegistrationResponse:
    """Full registration detail for the admin CRM."""
    _ = current
    return RegistrationResponse.model_validate(get_registration(db, registration_id))


@router.patch(
    "/{registration_id}/status",
    response_model=RegistrationResponse,
)
def set_registration_status(
    registration_id: str,
    payload: RegistrationStatusUpdate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> RegistrationResponse:
    """Apply a review decision (approved / rejected / waitlisted / pending)."""
    _ = current
    previous = get_registration(db, registration_id).status
    registration = set_status(db, registration_id, payload.status)

    if payload.status != previous:
        background.add_task(
            task_send_registration_decision, registration.id, registration.status
        )
    return RegistrationResponse.model_validate(registration)
