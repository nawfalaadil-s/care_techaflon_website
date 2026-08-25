"""Team service: create, update, approve teams with validation."""

from typing import TYPE_CHECKING

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.registration import Registration
from app.models.team import Team
from app.models.user import User
from app.schemas.team import (
    MAX_TEAM_SIZE,
    MIN_TEAM_SIZE,
    TeamCreate,
    TeamUpdate,
    TeamStatusUpdate,
)
from app.services.site_settings import is_registration_open

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def generate_team_id(db: "Session") -> str:
    """Generate a unique TechAFlon team ID in the format TFLN-2026-XXX.

    Continues from the highest existing sequence (gap-safe) and probes
    candidates until one is free, so concurrent registrations and deleted
    rows never produce collisions. The DB unique constraint remains the
    final authority; ``create_team`` retries on that race.
    """
    import uuid as _uuid

    last = db.scalar(
        select(Team.team_id)
        .where(Team.team_id.like("TFLN-2026-%"))
        .order_by(Team.team_id.desc())
        .limit(1)
    )
    next_num = 1
    if last is not None:
        suffix = last.rsplit("-", 1)[-1]
        if suffix.isdigit():
            next_num = int(suffix) + 1

    while next_num <= 999:
        candidate = f"TFLN-2026-{next_num:03d}"
        if db.scalar(select(Team.id).where(Team.team_id == candidate)) is None:
            return candidate
        next_num += 1

    # Sequence exhausted — fall back to a unique tag.
    return f"TFLN-2026-{_uuid.uuid4().hex[:4].upper()}"


def _team_student_keys(team: Team) -> tuple[set[str], set[str]]:
    """All register numbers + emails used by a team (leader + members)."""
    reg_numbers = {team.leader_register_number.strip().lower()}
    emails = {team.leader_email.strip().lower()}
    for member in team.members or []:
        if isinstance(member, dict):
            if member.get("register_number"):
                reg_numbers.add(str(member["register_number"]).strip().lower())
            if member.get("email"):
                emails.add(str(member["email"]).strip().lower())
    return reg_numbers, emails


def _existing_student_index(db: "Session") -> tuple[dict[str, str], dict[str, str]]:
    """Map every registered student's reg-number/email to their team ID."""
    reg_map: dict[str, str] = {}
    email_map: dict[str, str] = {}
    for team in db.scalars(select(Team)).all():
        regs, mails = _team_student_keys(team)
        for reg in regs:
            reg_map.setdefault(reg, team.team_name)
        for mail in mails:
            email_map.setdefault(mail, team.team_name)
    return reg_map, email_map


def _check_students_not_registered(db: "Session", payload: TeamCreate) -> None:
    """Ensure no student of this team is already registered elsewhere."""
    reg_map, email_map = _existing_student_index(db)

    students: list[tuple[str, str, str]] = [
        (payload.leader_name, payload.leader_register_number, payload.leader_email)
    ]
    students.extend(
        (m.name, m.register_number, m.email) for m in payload.members
    )

    seen_regs: set[str] = set()
    seen_emails: set[str] = set()
    for name, reg, mail in students:
        reg_key = reg.strip().lower()
        email_key = mail.strip().lower()
        if reg_key in seen_regs or email_key in seen_emails:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{name} appears more than once in this team.",
            )
        seen_regs.add(reg_key)
        seen_emails.add(email_key)

        other = reg_map.get(reg_key) or email_map.get(email_key)
        if other is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This student is already registered with another team.",
            )


def check_duplicate_register_number(db: Session, register_number: str, exclude_team_id: str | None = None) -> None:
    """Check if register number already exists in another team."""
    query = select(Team).where(Team.leader_register_number == register_number)
    if exclude_team_id:
        query = query.where(Team.id != exclude_team_id)
    
    existing = db.scalar(query)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Register number {register_number} is already registered in another team.",
        )


def check_duplicate_leader_email(db: Session, email: str, exclude_team_id: str | None = None) -> None:
    """Check if leader email already exists in another team."""
    query = select(Team).where(Team.leader_email == email)
    if exclude_team_id:
        query = query.where(Team.id != exclude_team_id)
    
    existing = db.scalar(query)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Team leader email {email} is already registered.",
        )


def check_duplicate_team_name(db: Session, team_name: str, exclude_team_id: str | None = None) -> None:
    """Check if team name already exists."""
    query = select(Team).where(Team.team_name == team_name)
    if exclude_team_id:
        query = query.where(Team.id != exclude_team_id)
    
    existing = db.scalar(query)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Team name '{team_name}' is already taken.",
        )


def check_duplicate_member(db: Session, members: list, exclude_team_id: str | None = None) -> None:
    """Check if any member already exists in another team."""
    for member in members:
        # Check by register number
        query = select(Team).where(Team.leader_register_number == member.register_number)
        if exclude_team_id:
            query = query.where(Team.id != exclude_team_id)
        
        existing = db.scalar(query)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Team member {member.name} (Register: {member.register_number}) is already in another team.",
            )


def create_team(db: Session, payload: TeamCreate) -> Team:
    """Create a new team with full validation (schema + cross-team checks)."""
    if not is_registration_open(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is currently closed. Contact the organizers for help.",
        )

    # Unique team name / leader email / leader register number.
    check_duplicate_team_name(db, payload.team_name)
    check_duplicate_leader_email(db, payload.leader_email)
    check_duplicate_register_number(db, payload.leader_register_number)

    # No student may belong to two teams (leaders AND members, both keys).
    _check_students_not_registered(db, payload)

    # Defensive size check (schema already enforces 2..3 members => 3..4 total).
    total_members = len(payload.members) + 1  # +1 for leader
    if total_members < MIN_TEAM_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team must have at least {MIN_TEAM_SIZE} members (including leader).",
        )
    if total_members > MAX_TEAM_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team can have at most {MAX_TEAM_SIZE} members (including leader).",
        )

    # Insert with bounded retry: under concurrent registrations two requests
    # may race past the pre-checks; the DB unique constraints are the final
    # authority, so regenerate the ID and retry before surfacing a conflict.
    team: Team | None = None
    for _attempt in range(3):
        candidate = Team(
            team_id=generate_team_id(db),
            team_name=payload.team_name.strip(),
            theme=payload.theme.strip().lower(),
            status="pending",
            leader_name=payload.leader_name.strip(),
            leader_email=payload.leader_email.strip().lower(),
            leader_phone=payload.leader_phone.strip(),
            leader_register_number=payload.leader_register_number.strip(),
            leader_department=payload.leader_department.strip(),
            leader_year=payload.leader_year.strip(),
            leader_section=payload.leader_section.strip(),
            members=[m.model_dump() for m in payload.members],
        )
        db.add(candidate)
        try:
            db.commit()
            team = candidate
            break
        except IntegrityError:
            db.rollback()

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Registration conflict: a team with this name, email or "
                "register number may already exist."
            ),
        )

    db.refresh(team)

    # On-the-spot problem statement allocation when the switch is on.
    from app.services.allocation import run_if_enabled

    run_if_enabled(db)

    return team


def get_team_by_id(db: Session, team_id: str) -> Team | None:
    """Get team by ID."""
    return db.get(Team, team_id)


def get_team_by_leader_email(db: Session, email: str) -> Team | None:
    """Get team by leader email."""
    return db.scalar(select(Team).where(Team.leader_email == email))


def update_team(db: Session, team: Team, payload: TeamUpdate) -> Team:
    """Update team information."""
    changes = payload.model_dump(exclude_unset=True)
    
    for field, value in changes.items():
        if value is not None:
            setattr(team, field, value.strip() if isinstance(value, str) else value)
    
    db.commit()
    db.refresh(team)
    return team


def update_team_status(db: Session, team: Team, status_update: TeamStatusUpdate) -> Team:
    """Update team approval status."""
    team.status = status_update.status
    
    if status_update.status == "approved" and team.approved_at is None:
        from datetime import datetime
        team.approved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(team)
    return team


def list_teams(
    db: Session, 
    department: str | None = None,
    theme: str | None = None,
    status: str | None = None,
) -> list[Team]:
    """List teams with optional filters."""
    query = select(Team)
    
    if department:
        query = query.where(Team.leader_department == department)
    if theme:
        query = query.where(Team.theme == theme)
    if status:
        query = query.where(Team.status == status)
    
    return list(db.scalars(query.order_by(Team.created_at.desc())))


def get_team_for_leader(db: Session, user: User) -> Team | None:
    """Get team owned by the user (leader)."""
    return db.scalar(select(Team).where(Team.leader_email == user.email))


def update_problem_statement(db: Session, team: Team, problem_statement_id: str) -> Team:
    """Allocate problem statement to a team."""
    team.problem_statement_id = problem_statement_id
    from datetime import datetime
    team.ps_allocated_at = datetime.utcnow()
    db.commit()
    db.refresh(team)
    return team
