from typing import TYPE_CHECKING

from fastapi import HTTPException, status
from sqlalchemy import select

from app.core.security import DEMO_PASSWORD, hash_password, verify_password
from app.models.registration import Registration
from app.models.user import User
from app.schemas.user import ROLE_LEADER, UserCreate, UserLogin

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session


def create_user(db: "Session", payload: UserCreate, *, role: str = ROLE_LEADER) -> User:
    """Create a new account, enforcing a unique email."""
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Auto-link any unclaimed team registrations submitted with this email.
    link_registrations_to_user(db, user)
    return user


def create_team_leader(
    db: "Session", 
    email: str, 
    full_name: str,
    team_id: str
) -> User:
    """Create a team leader account with the provisioned demo password."""
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    from app.models.team import Team

    team = db.get(Team, team_id)
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found.",
        )

    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(DEMO_PASSWORD),
        role=ROLE_LEADER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    team.owner_id = user.id
    db.commit()

    return user


def ensure_leader_account(db: "Session", email: str, full_name: str) -> None:
    """Provision a leader login for a freshly registered team.

    The account uses the shared demo password (``Demo@1234``) and is flagged
    for a mandatory change on first login. Silently does nothing if an
    account with that email already exists.
    """
    email = email.strip().lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        return
    user = User(
        email=email,
        full_name=(full_name or "Team Leader").strip()[:120],
        hashed_password=hash_password(DEMO_PASSWORD),
        role=ROLE_LEADER,
    )
    db.add(user)
    db.commit()


def change_password(db: "Session", user: User, new_password: str) -> User:
    """Replace the user's password with a freshly hashed value."""
    user.hashed_password = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user


def link_registrations_to_user(db: "Session", user: User) -> int:
    """Claim unclaimed registrations whose contact email matches the account.

    Returns the number of linked teams.
    """
    unclaimed = list(
        db.scalars(
            select(Registration).where(
                Registration.representative_email == user.email,
                Registration.owner_id.is_(None),
            )
        )
    )
    for registration in unclaimed:
        registration.owner_id = user.id
    if unclaimed:
        db.commit()
    return len(unclaimed)


def authenticate(db: "Session", payload: UserLogin) -> User | None:
    """Verify credentials and return the active user, or ``None``."""
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not user.is_active:
        return None
    if not verify_password(payload.password, user.hashed_password):
        return None
    return user