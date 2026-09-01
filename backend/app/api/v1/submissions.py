import csv
import io
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin, get_current_user
from app.database.base import get_db
from app.models.submission import Submission
from app.models.team import Team
from app.models.user import User
from app.schemas.submission import (
    SubmissionLockRequest,
    SubmissionPayload,
    SubmissionResponse,
    SubmissionStatusResponse,
)
from app.schemas.team import resolve_ps_title
from app.services.submission import (
    delete_for_team,
    get_submission_for_user,
    set_lock,
    upsert_for_team,
)
from app.workers.email_tasks import task_send_submission_received

router = APIRouter(prefix="/teams", tags=["submissions"])


def _is_privileged(user: User) -> bool:
    """Organizers/admins may read any team's submission."""
    return bool(user.is_admin or user.role in {"organizer", "admin"})


@router.get(
    "/all/submissions",
    response_model=list[dict],
)
def list_all_submissions(
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Every project submission with its team context (admin only)."""
    rows = db.execute(
        select(Submission, Team)
        .join(Team, Team.id == Submission.registration_id)
        .order_by(Submission.updated_at.desc())
    ).all()

    return [
        {
            "team_uuid": team.id,
            "team_id": team.team_id,
            "team_name": team.team_name,
            "theme": team.theme,
            "status": team.status,
            "leader_email": team.leader_email,
            "project_name": submission.project_name,
            "repo_url": submission.repo_url,
            "demo_url": submission.demo_url,
            "locked": submission.locked,
            "updated_at": submission.updated_at.isoformat(),
        }
        for submission, team in rows
    ]


@router.get("/all/submissions/export/csv")
def export_all_submissions_csv(
    theme: str | None = None,
    status: str | None = None,
    lock: str | None = None,
    q: str | None = None,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Export every project submission as a CSV file (admin only).

    The static ``/all/submissions/export/csv`` path is declared before the
    dynamic ``/{registration_id}/submission`` routes so it never collides
    with a registration named ``all``. Respects the same filters
    (theme / status / lock / free-text ``q``) used by the admin UI.
    """
    rows = db.execute(
        select(Submission, Team)
        .join(Team, Team.id == Submission.registration_id)
        .order_by(Submission.updated_at.desc())
    ).all()

    if q:
        needle = q.strip().lower()
        rows = [
            (submission, team)
            for submission, team in rows
            if needle in team.team_name.lower()
            or needle in team.team_id.lower()
            or needle in submission.project_name.lower()
            or needle in team.leader_email.lower()
        ]

    buf = io.StringIO()
    buf.write("\ufeff")  # UTF-8 BOM so Excel opens non-ASCII correctly.
    writer = csv.writer(buf)
    writer.writerow(
        [
            "Team ID",
            "Team Name",
            "Problem Statement",
            "Project Name",
            "Project Description",
            "GitHub URL",
        ]
    )

    for submission, team in rows:
        if theme and team.theme != theme:
            continue
        if status and team.status != status:
            continue
        if lock == "locked" and not submission.locked:
            continue
        if lock == "unlocked" and submission.locked:
            continue

        writer.writerow(
            [
                team.team_id,
                team.team_name,
                resolve_ps_title(db, team.problem_statement_id) or "",
                submission.project_name,
                submission.description,
                submission.repo_url,
            ]
        )

    buf.seek(0)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"submissions_{timestamp}.csv"

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/{registration_id}/submission",
    response_model=SubmissionStatusResponse,
)
def read_submission(
    registration_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubmissionStatusResponse:
    """The team's current submission, or null before the first submit.

    Leaders can only read their own team; admins may read any team's.
    """
    if _is_privileged(current):
        from fastapi import HTTPException

        if db.get(Team, registration_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found.",
            )
        submission = db.scalar(
            select(Submission).where(Submission.registration_id == registration_id)
        )
    else:
        _, submission = get_submission_for_user(db, current)
    return SubmissionStatusResponse(
        submission=(
            SubmissionResponse.model_validate(submission)
            if submission is not None
            else None
        )
    )


@router.put(
    "/{registration_id}/submission",
    response_model=SubmissionResponse,
)
def save_submission(
    registration_id: str,
    payload: SubmissionPayload,
    background: BackgroundTasks,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubmissionResponse:
    """Create or update the team's project submission (idempotent upsert).

    Raises 403 if submission is already locked.
    """
    submission, created = upsert_for_team(db, current, registration_id, payload)
    if created:
        background.add_task(
            task_send_submission_received,
            submission.registration_id,
            submission.project_name,
            submission.repo_url,
            submission.demo_url,
        )
    return SubmissionResponse.model_validate(submission)


@router.patch(
    "/{registration_id}/submission/lock",
    response_model=SubmissionResponse,
)
def lock_submission(
    registration_id: str,
    payload: SubmissionLockRequest,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> SubmissionResponse:
    """Lock/unlock a team's submission (admin only).

    Submissions auto-lock on submit; unlock only when a team genuinely
    needs to correct something.
    """
    return SubmissionResponse.model_validate(
        set_lock(db, registration_id, payload.locked)
    )


@router.delete("/{registration_id}/submission", status_code=status.HTTP_204_NO_CONTENT)
def withdraw_submission(
    registration_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Withdraw the team's submission."""
    delete_for_team(db, current, registration_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
