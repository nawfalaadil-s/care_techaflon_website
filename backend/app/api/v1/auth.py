from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_admin, get_current_user
from app.core.ratelimit import rate_limit
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.database.base import get_db
from app.models.user import User
from app.schemas.user import (
    ChangePasswordRequest,
    RefreshRequest,
    Token,
    UserCreate,
    UserLogin,
    UserRead,
)
from app.services.user import authenticate, create_user, change_password as change_user_password
from app.core.security import DEMO_PASSWORD, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

# Brute-force protection: generous for real users, hostile to scripts.
limit_register = rate_limit("auth-register", limit=20, window_seconds=60)
limit_login = rate_limit("auth-login", limit=20, window_seconds=60)
limit_refresh = rate_limit("auth-refresh", limit=60, window_seconds=60)


def _token_response(user: User) -> Token:
    access = create_access_token(subject=user.id, role=user.role)
    refresh = create_refresh_token(subject=user.id, role=user.role)
    return Token(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserRead.model_validate(user),
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: None = Depends(limit_register),
) -> Token:
    """Create a new leader account and return an access + refresh token pair."""
    user = create_user(db, payload)
    return _token_response(user)


@router.post("/login", response_model=Token)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
    _: None = Depends(limit_login),
) -> Token:
    """Authenticate by email/password and issue a token pair."""
    user = authenticate(db, payload)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    return _token_response(user)


@router.post("/refresh", response_model=Token)
def refresh(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
    _: None = Depends(limit_refresh),
) -> Token:
    """Issue a fresh token pair from a valid refresh token."""
    decoded = decode_token(payload.refresh_token)  # raises 401 if invalid/expired
    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )
    user = db.get(User, decoded.get("sub"))
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer available.",
        )
    return _token_response(user)


@router.get("/me", response_model=UserRead)
def read_current_user(current: User = Depends(get_current_user)) -> UserRead:
    """Return the authenticated user (protected)."""
    return current


@router.get("/admin/me", response_model=UserRead)
def read_admin(current: User = Depends(get_current_admin)) -> UserRead:
    """RBAC demonstration endpoint (requires organizer/admin)."""
    return current


@router.post("/change-password", response_model=Token)
def change_own_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Token:
    """Replace the provisioned demo password with a permanent one.

    Returns a fresh token pair so the client's session immediately reflects
    the cleared ``must_change_password`` flag.
    """
    if not verify_password(payload.current_password, current.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )
    if payload.new_password == DEMO_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Choose a password different from the temporary one.",
        )
    if verify_password(payload.new_password, current.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current one.",
        )

    updated = change_user_password(db, current, payload.new_password)
    return _token_response(updated)


@router.post("/team-leader", response_model=Token, status_code=status.HTTP_201_CREATED)
def create_team_leader(
    email: str,
    full_name: str,
    team_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> Token:
    """Provision a leader account for an existing team (admin only).

    The account starts with the shared demo password and must be changed
    by the leader via ``POST /api/auth/change-password``.
    """
    from app.services.user import create_team_leader as create_leader

    user = create_leader(db, email, full_name, team_id)
    return _token_response(user)
