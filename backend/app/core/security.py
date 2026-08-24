"""Security primitives: password hashing and JWT tokens.

Implemented dependency-free using the Python standard library so the backend
has no extra runtime dependencies beyond FastAPI/SQLAlchemy:

* Passwords are hashed with PBKDF2-HMAC-SHA256 (600k iterations, 32-byte salt)
  and constant-time verification via :func:`hmac.compare_digest`.
* Tokens are HS256 JWTs signed with ``settings.SECRET_KEY``.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
ALGORITHM = "HS256"
PBKDF2_ITERATIONS = 600_000
SALT_BYTES = 32
HASH_BYTES = 32
PASSWORD_SCHEME = "pbkdf2_sha256"

# Default password provisioned for newly registered team leaders.
# Leaders are forced to replace it on first login (see /auth/change-password).
DEMO_PASSWORD = "Demo@1234"


def _unauthorized(detail: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


# ---------------------------------------------------------------------------
# Password hashing (PBKDF2-HMAC-SHA256)
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Return a self-describing password hash: ``pbkdf2_sha256$iters$salt$hash``."""
    salt = secrets.token_bytes(SALT_BYTES)
    derived = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS, HASH_BYTES
    )
    return f"{PASSWORD_SCHEME}${PBKDF2_ITERATIONS}${salt.hex()}${derived.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Constant-time verification of a password against a stored hash."""
    try:
        scheme, iterations_s, salt_hex, hash_hex = hashed.split("$")
    except (ValueError, AttributeError):
        return False
    if scheme != PASSWORD_SCHEME:
        return False
    try:
        iterations = int(iterations_s)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
    except ValueError:
        return False
    derived = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations, len(expected)
    )
    return hmac.compare_digest(derived, expected)


# ---------------------------------------------------------------------------
# JSON Web Tokens (HS256, stdlib only)
# ---------------------------------------------------------------------------
def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    raw = data.encode("ascii")
    pad = b"=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + pad)


def _sign(signing_input: bytes) -> str:
    key = settings.SECRET_KEY.encode("utf-8")
    return _b64url_encode(hmac.new(key, signing_input, hashlib.sha256).digest())


def _build_token(claims: dict[str, Any], expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = dict(claims)
    payload.update(
        {
            "iat": int(now.timestamp()),
            "exp": int((now + expires_delta).timestamp()),
            "jti": secrets.token_hex(16),
        }
    )
    header = {"alg": ALGORITHM, "typ": "JWT"}
    seg_header = _b64url_encode(
        json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    seg_payload = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signing_input = f"{seg_header}.{seg_payload}".encode("ascii")
    signature = _sign(signing_input)
    return f"{seg_header}.{seg_payload}.{signature}"


def create_access_token(subject: str, *, role: str = "leader") -> str:
    """Short-lived access token (``exp`` = ``ACCESS_TOKEN_EXPIRE_MINUTES``)."""
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _build_token(
        {"sub": subject, "role": role, "type": "access"}, expires
    )


def create_refresh_token(subject: str, *, role: str = "leader") -> str:
    """Long-lived refresh token (``exp`` = ``REFRESH_TOKEN_EXPIRE_DAYS``)."""
    expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _build_token(
        {"sub": subject, "role": role, "type": "refresh"}, expires
    )


def decode_token(token: str) -> dict[str, Any]:
    """Verify a JWT and return its payload, or raise ``HTTPException(401)``."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("malformed token")
        seg_header, seg_payload, signature = parts
        signing_input = f"{seg_header}.{seg_payload}".encode("ascii")
        expected_sig = _sign(signing_input)
        if not hmac.compare_digest(expected_sig, signature):
            raise ValueError("invalid signature")
        payload = json.loads(_b64url_decode(seg_payload))
        exp = payload.get("exp")
        if exp is None or datetime.now(timezone.utc).timestamp() > int(exp):
            raise ValueError("token expired")
        return payload
    except (ValueError, json.JSONDecodeError, KeyError, TypeError):
        raise _unauthorized("Invalid or expired token.")
