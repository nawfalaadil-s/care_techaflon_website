"""Project submission service — owner-guarded 1:1 with a team."""

from typing import TYPE_CHECKING

from fastapi import HTTPException, status
from sqlalchemy import select

from app.models.submission import Submission
from app.models.user import User
from app.schemas.submission import SubmissionPayload

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session


def get_submission_for_user(
    db: "Session", user: User
) -> tuple[object, Submission | None]:
    """Return ``(team, submission_or_none)`` for a user's team.

    Raises 404 when the team does not exist or is not owned by ``user``.
    """
    from app.models.team import Team
    
    team = db.scalar(select(Team).where(Team.leader_email == user.email))
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found.",
        )
    submission = db.scalar(
        select(Submission).where(Submission.registration_id == team.id)
    )
    return team, submission


def check_submission_locked(db: "Session", team_id: str) -> bool:
    """Check if submission is locked for this team."""
    submission = db.scalar(
        select(Submission).where(Submission.registration_id == team_id)
    )
    return submission is not None and submission.locked


def get_or_create_submission(db: "Session", team_id: str) -> tuple[Submission, bool]:
    """Get existing submission or create new one. Returns ``(submission, created)``."""
    submission = db.scalar(
        select(Submission).where(Submission.registration_id == team_id)
    )
    created = submission is None
    if created:
        submission = Submission(registration_id=team_id)
        db.add(submission)
    return submission, created


def upsert_for_team(
    db: "Session", user: User, registration_id: str, payload: SubmissionPayload
) -> tuple[Submission, bool]:
    """Create the team's submission, locked immediately.

    A team gets exactly one shot: once submitted, edits and withdrawals are
    rejected (403). Organizers can unlock a team from the admin CRM when
    corrections are genuinely needed.
    """
    from app.models.team import Team
    from app.services.site_settings import are_submissions_open

    team = db.get(Team, registration_id)
    if team is None or team.leader_email != user.email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found or access denied.",
        )

    # Global submission window: when organizers have closed submissions,
    # creating or editing a project is rejected. Withdrawals stay allowed so
    # a team can always retract a submission the admins have reopened.
    if not are_submissions_open(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project submissions are currently closed by the organizers.",
        )

    # A locked submission is final for leaders. Admins can unlock it from
    # the CRM, which lets the team edit again until it is re-locked.
    existing = db.scalar(
        select(Submission).where(Submission.registration_id == registration_id)
    )
    if existing is not None and existing.locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Submission is locked. Contact the organizers to request changes.",
        )

    created = existing is None
    submission = existing or Submission(registration_id=registration_id)
    if created:
        # New submissions are final immediately.
        submission.locked = True

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(submission, field, value)

    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission, created


def set_lock(db: "Session", registration_id: str, locked: bool) -> Submission:
    """Admin-only: unlock a team's submission for corrections (or re-lock)."""
    submission = db.scalar(
        select(Submission).where(Submission.registration_id == registration_id)
    )
    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No submission found for this team.",
        )
    submission.locked = locked
    db.commit()
    db.refresh(submission)
    return submission


def delete_for_team(db: "Session", user: User, registration_id: str) -> None:
    """Withdraw the team's submission (no-op if none exists yet or locked)."""
    from app.models.team import Team
    
    team = db.get(Team, registration_id)
    if team is None or team.leader_email != user.email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found or access denied.",
        )
    
    # Check if submission is locked
    if check_submission_locked(db, registration_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot withdraw locked submission.",
        )
    
    submission = db.scalar(
        select(Submission).where(Submission.registration_id == registration_id)
    )
    if submission is not None:
        db.delete(submission)
        db.commit()
