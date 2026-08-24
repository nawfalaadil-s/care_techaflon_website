"""Authentication dependencies (JWT + RBAC)."""

from typing import TYPE_CHECKING

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token
from app.database.base import get_db
from app.models.user import User

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: "Session" = Depends(get_db),
) -> User:
    """Resolve and return the authenticated user from the Bearer token."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()
    try:
        payload = decode_token(credentials.credentials)
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001
        raise _unauthorized()
    if payload.get("type") != "access":
        raise _unauthorized()
    user = db.get(User, payload.get("sub"))
    if user is None or not user.is_active:
        raise _unauthorized()
    return user


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """RBAC guard: requires an organizer/admin account."""
    if not (user.is_admin or user.role in {"organizer", "admin"}):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required.",
        )
    return user