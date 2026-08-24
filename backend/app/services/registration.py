from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.registration import Registration
from app.schemas.registration import RegistrationCreate
from app.services.site_settings import is_registration_open

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session


def create_registration(db: "Session", payload: RegistrationCreate) -> Registration:
    """Persist a new registration, enforcing unique contact email."""
    if not is_registration_open(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is currently closed. Contact the organizers for help.",
        )

    existing = db.scalar(
        select(Registration).where(
            Registration.representative_email == payload.representative_email
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already registered.",
        )

    registration = Registration(
        team_name=payload.team_name,
        representative_name=payload.representative_name,
        representative_email=payload.representative_email,
        representative_phone=payload.representative_phone,
        institution=payload.institution,
        year_of_study=payload.year_of_study,
        track=payload.track,
        problem_statement=payload.problem_statement,
        members=[member.model_dump() for member in payload.members],
    )

    db.add(registration)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already registered.",
        ) from None

    db.refresh(registration)
    return registration


def list_registrations(db: "Session") -> list[Registration]:
    return list(
        db.scalars(select(Registration).order_by(Registration.created_at.desc()))
    )


def get_registration(db: "Session", registration_id: str) -> Registration:
    """Fetch any registration by ID (admin CRM detail view)."""
    registration = db.get(Registration, registration_id)
    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found.",
        )
    return registration


def set_status(
    db: "Session", registration_id: str, new_status: str
) -> Registration:
    """Apply an admin review decision (pending/approved/waitlisted/rejected)."""
    registration = get_registration(db, registration_id)
    registration.status = new_status
    db.commit()
    db.refresh(registration)
    return registration
