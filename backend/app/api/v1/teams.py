import csv
import io
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin, get_current_user
from app.database.base import get_db
from app.models.user import User
from app.schemas.team import (
    TeamBulkDelete,
    TeamBulkStatusUpdate,
    TeamCreate,
    TeamResponse,
    TeamUpdate,
    TeamStatusUpdate,
    BulkOperationResult,
    resolve_ps_title,
)
from app.services.team import (
    bulk_delete_teams,
    bulk_update_team_status,
    create_team,
    delete_team,
    get_team_by_id,
    get_team_for_leader,
    update_team,
    update_team_status,
    list_teams,
    update_problem_statement,
)
from app.services.user import ensure_leader_account
from app.workers.email_tasks import (
    task_send_team_certificates,
    task_send_team_confirmation,
    task_send_team_status_update,
)

router = APIRouter(prefix="/teams", tags=["teams"])


def _is_privileged(user: User) -> bool:
    """Organizers/admins bypass leader-only ownership checks."""
    return bool(user.is_admin or user.role in {"organizer", "admin"})


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team_endpoint(
    payload: TeamCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> TeamResponse:
    """Create a new TechAFlon team."""
    team = create_team(db, payload)

    # Provision the leader's portal login: email = leader email,
    # password = Demo@1234 (must be changed on first sign-in).
    try:
        ensure_leader_account(db, team.leader_email, team.leader_name)
    except Exception:
        # Registration must not fail because of account provisioning.
        db.rollback()

    background.add_task(task_send_team_confirmation, team.id)
    response = TeamResponse.model_validate(team)
    response.problem_statement_title = resolve_ps_title(db, team.problem_statement_id)
    return response


@router.get("/mine", response_model=TeamResponse)
def my_team(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamResponse:
    """Get the team owned by the current user (leader)."""
    team = get_team_for_leader(db, current)
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No team found for your account.",
        )
    response = TeamResponse.model_validate(team)
    response.problem_statement_title = resolve_ps_title(db, team.problem_statement_id)
    return response


# ------------------------------------------------------------------
# Admin bulk operations — static paths MUST come before /{team_id}
# ------------------------------------------------------------------


@router.patch("/bulk-status", response_model=BulkOperationResult)
def bulk_update_status_endpoint(
    payload: TeamBulkStatusUpdate,
    background: BackgroundTasks,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> BulkOperationResult:
    """Update approval status for multiple teams at once (admin only)."""
    updated_count, errors = bulk_update_team_status(db, payload.team_ids, payload.status)

    # Queue status-change emails + certificate sends for each updated team.
    if payload.status == "approved":
        from sqlalchemy import select as _select
        from app.models.certificate import Certificate

        certificate = db.scalar(
            _select(Certificate).where(Certificate.active.is_(True))
        )
    else:
        certificate = None

    for tid in payload.team_ids:
        team = get_team_by_id(db, tid)
        if team is None:
            continue
        background.add_task(task_send_team_status_update, team.id, payload.status)
        if payload.status == "approved" and certificate is not None:
            background.add_task(task_send_team_certificates, team.id, certificate.id)

    return BulkOperationResult(updated=updated_count, errors=errors)


@router.post("/bulk-delete", response_model=BulkOperationResult)
def bulk_delete_endpoint(
    payload: TeamBulkDelete,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> BulkOperationResult:
    """Delete multiple teams at once (admin only)."""
    deleted_count, errors = bulk_delete_teams(db, payload.team_ids)
    return BulkOperationResult(deleted=deleted_count, errors=errors)


@router.get("/export/csv")
def export_teams_csv(
    department: str | None = None,
    theme: str | None = None,
    status: str | None = None,
    q: str | None = None,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Export teams as a CSV file (admin only). Respects the same filters
    (department / theme / status / free-text ``q``) used by the admin UI."""
    teams = list_teams(db, department=department, theme=theme, status=status)

    # Mirror the RegistrationsPage free-text search (team, id, leader, ...).
    if q:
        needle = q.strip().lower()
        teams = [
            t
            for t in teams
            if needle in t.team_name.lower()
            or needle in t.team_id.lower()
            or needle in t.leader_name.lower()
            or needle in t.leader_email.lower()
            or needle in t.leader_register_number.lower()
        ]

    # Pull the 1:1 submissions for every team in one query.
    from sqlalchemy import select as _select

    from app.models.submission import Submission

    subs: dict[str, Submission] = {}
    if teams:
        rows = db.scalars(_select(Submission)).all()
        subs = {s.registration_id: s for s in rows}

    buf = io.StringIO()
    buf.write("\ufeff")  # UTF-8 BOM so Excel opens non-ASCII correctly.
    writer = csv.writer(buf)

    header = [
        "Team ID",
        "Team Name",
        "Theme",
        "Status",
        "Registered At",
        "Approved At",
        "Leader Name",
        "Leader Email",
        "Leader Phone",
        "Leader Register Number",
        "Leader Department",
        "Leader Year",
        "Leader Section",
        "Members",
        "Member Count",
        "Problem Statement",
        "PS Allocated At",
        "Venue Name",
        "Venue Location",
        "Project Name",
        "Project Description",
        "Repository URL",
        "Demo URL",
        "Submitted At",
    ]
    writer.writerow(header)

    def _fmt_dt(dt: datetime | None) -> str:
        if dt is None:
            return ""
        return dt.strftime("%Y-%m-%d %H:%M:%S")

    for t in teams:
        members = t.members or []
        member_parts: list[str] = []
        for m in members:
            if isinstance(m, dict):
                name = m.get("name", "")
                reg = m.get("register_number", "")
                email = m.get("email", "")
                dept = m.get("department", "")
                year = m.get("year", "")
                section = m.get("section", "")
                member_parts.append(
                    f"{name} ({reg} | {email} | {dept} | {year} | {section})"
                )

        ps_title = resolve_ps_title(db, t.problem_statement_id) or ""

        sub = subs.get(t.id)
        project_name = sub.project_name if sub else ""
        description = sub.description if sub else ""
        repo_url = sub.repo_url if sub else ""
        demo_url = sub.demo_url if sub else ""
        submitted_at = _fmt_dt(sub.updated_at) if sub else ""

        writer.writerow([
            t.team_id,
            t.team_name,
            t.theme,
            t.status,
            _fmt_dt(t.registered_at),
            _fmt_dt(t.approved_at),
            t.leader_name,
            t.leader_email,
            t.leader_phone,
            t.leader_register_number,
            t.leader_department,
            t.leader_year,
            t.leader_section,
            "; ".join(member_parts),
            len(members),
            ps_title,
            _fmt_dt(t.ps_allocated_at),
            t.venue_name,
            t.venue_location,
            project_name,
            description,
            repo_url,
            demo_url,
            submitted_at,
        ])

    buf.seek(0)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"teams_export_{timestamp}.csv"

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/registration-csv")
def export_registration_csv(
    department: str | None = None,
    theme: str | None = None,
    status: str | None = None,
    q: str | None = None,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Export registration summary as a CSV — one row PER participant
    (leader + members) with Team ID, Team Name, member details and Theme.

    The leader is the first participant; their role is marked 'Leader'.
    """
    teams = list_teams(db, department=department, theme=theme, status=status)

    if q:
        needle = q.strip().lower()
        teams = [
            t
            for t in teams
            if needle in t.team_name.lower()
            or needle in t.team_id.lower()
            or needle in t.leader_name.lower()
            or needle in t.leader_email.lower()
            or needle in t.leader_register_number.lower()
        ]

    buf = io.StringIO()
    buf.write("\ufeff")  # UTF-8 BOM for Excel.
    writer = csv.writer(buf)

    header = [
        "Team ID",
        "Team Name",
        "Theme",
        "Role",
        "Member Name",
        "Register Number",
        "Email",
        "Department",
        "Year",
        "Section",
        "Status",
    ]
    writer.writerow(header)

    for t in teams:
        theme_label = t.theme

        # Leader is always participant #1.
        writer.writerow([
            t.team_id,
            t.team_name,
            theme_label,
            "Leader",
            t.leader_name,
            t.leader_register_number,
            t.leader_email,
            t.leader_department,
            t.leader_year,
            t.leader_section,
            t.status,
        ])

        for m in t.members or []:
            if not isinstance(m, dict):
                continue
            writer.writerow([
                t.team_id,
                t.team_name,
                theme_label,
                "Member",
                m.get("name", ""),
                m.get("register_number", ""),
                m.get("email", ""),
                m.get("department", ""),
                m.get("year", ""),
                m.get("section", ""),
                t.status,
            ])

    buf.seek(0)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"registrations_{timestamp}.csv"

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamResponse:
    """Get team details."""
    team = get_team_by_id(db, team_id)
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found.",
        )
    
    # Team leader can view their own team
    # Admin can view any team
    if team.leader_email != current.email and not _is_privileged(current):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this team.",
        )
    
    response = TeamResponse.model_validate(team)
    response.problem_statement_title = resolve_ps_title(db, team.problem_statement_id)
    return response


@router.patch("/{team_id}", response_model=TeamResponse)
def update_team_endpoint(
    team_id: str,
    payload: TeamUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamResponse:
    """Update team information."""
    team = get_team_by_id(db, team_id)
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found.",
        )
    
    # Team leader can update their own team; organizers/admins may act on
    # any team (venue assignment, fixing names, etc.).
    if team.leader_email != current.email and not _is_privileged(current):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this team.",
        )
    
    # Check for duplicates (excluding this team)
    if payload.team_name:
        from app.services.team import check_duplicate_team_name
        check_duplicate_team_name(db, payload.team_name, exclude_team_id=team_id)
    
    if payload.theme:
        # Validate theme
        theme = payload.theme.strip().lower()
        if theme not in {"ai-ml", "web"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"theme must be one of: ai-ml, web, app",
            )
    
    updated = update_team(db, team, payload)
    response = TeamResponse.model_validate(updated)
    response.problem_statement_title = resolve_ps_title(db, updated.problem_statement_id)
    return response


@router.patch("/{team_id}/status", response_model=TeamResponse)
def update_team_status_endpoint(
    team_id: str,
    payload: TeamStatusUpdate,
    background: BackgroundTasks,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> TeamResponse:
    """Update team approval status (admin only)."""
    team = get_team_by_id(db, team_id)
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found.",
        )

    # Compare against the status BEFORE mutating the row, then queue the
    # notifications on the *injected* BackgroundTasks so they actually run
    # after the response is sent.
    previous_status = team.status
    updated = update_team_status(db, team, payload)

    if payload.status != previous_status:
        background.add_task(task_send_team_status_update, updated.id, payload.status)

        # Certificate automation: an approval (with a certificate uploaded)
        # emails the award file to every participant of the team.
        if payload.status == "approved":
            from sqlalchemy import select as _select

            from app.models.certificate import Certificate

            certificate = db.scalar(
                _select(Certificate).where(Certificate.active.is_(True))
            )
            if certificate is not None:
                background.add_task(
                    task_send_team_certificates, updated.id, certificate.id
                )

    response = TeamResponse.model_validate(updated)
    response.problem_statement_title = resolve_ps_title(db, updated.problem_statement_id)
    return response


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team_endpoint(
    team_id: str,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> None:
    """Delete a team (admin only). Submissions cascade-delete via FK."""
    team = get_team_by_id(db, team_id)
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found.",
        )
    delete_team(db, team)


@router.get("", response_model=list[TeamResponse])
def list_teams_endpoint(
    department: str | None = None,
    theme: str | None = None,
    status: str | None = None,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[TeamResponse]:
    """List all teams (admin only)."""
    teams = list_teams(db, department=department, theme=theme, status=status)
    responses = []
    for t in teams:
        r = TeamResponse.model_validate(t)
        r.problem_statement_title = resolve_ps_title(db, t.problem_statement_id)
        responses.append(r)
    return responses


@router.patch("/{team_id}/problem-statement")
def allocate_problem_statement(
    team_id: str,
    problem_statement_id: str,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Allocate problem statement to a team (admin only)."""
    team = get_team_by_id(db, team_id)
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found.",
        )
    
    updated = update_problem_statement(db, team, problem_statement_id)
    
    return {
        "message": "Problem statement allocated successfully",
        "team_id": team.team_id,
        "problem_statement_id": problem_statement_id,
    }
