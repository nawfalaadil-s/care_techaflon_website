from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin, get_current_user
from app.database.base import get_db
from app.models.user import User
from app.schemas.team import (
    TeamCreate,
    TeamResponse,
    TeamUpdate,
    TeamStatusUpdate,
    resolve_ps_title,
)
from app.services.team import (
    create_team,
    get_team_by_id,
    get_team_for_leader,
    update_team,
    update_team_status,
    list_teams,
    update_problem_statement,
)
from app.services.user import ensure_leader_account
from app.workers.email_tasks import task_send_team_confirmation

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
    if team.leader_email != current.email and not current.is_admin:
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
        if theme not in {"ai-ml", "web", "app"}:
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
    
    updated = update_team_status(db, team, payload)
    
    # Send email notification if status changed
    from app.schemas.team import TeamStatusUpdate as SchemaStatusUpdate
    if payload.status != team.status:
        from app.workers.email_tasks import task_send_team_status_update
        background = BackgroundTasks()
        background.add_task(task_send_team_status_update, team.id, payload.status)
    
    response = TeamResponse.model_validate(updated)
    response.problem_statement_title = resolve_ps_title(db, updated.problem_statement_id)
    return response


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
