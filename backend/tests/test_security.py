"""Phase 15 security audit: headers, rate limiting, production secret guard."""

import uuid

from fastapi.testclient import TestClient

from app.core.ratelimit import RateLimiter, _enabled
from app.main import app

client = TestClient(app)

PASSWORD = "supersecret1"


def _unique(local: str) -> str:
    return f"{local}.{uuid.uuid4().hex[:8]}@college.edu"


def test_security_headers_on_every_response() -> None:
    for path in ("/", "/api/health", "/api/settings/public"):
        response = client.get(path)
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "camera=()" in (response.headers.get("Permissions-Policy") or "")
        assert response.headers.get("Cache-Control") == "no-store"
        assert (
            response.headers.get("Cross-Origin-Opener-Policy") == "same-origin"
        )
        # HSTS is production-only: the dev server speaks plain HTTP.
        assert response.headers.get("Strict-Transport-Security") is None


def test_rate_limiter_unit_behavior() -> None:
    limiter = RateLimiter(limit=3, window_seconds=60)
    limiter.check("unit:ip1")
    limiter.check("unit:ip1")
    limiter.check("unit:ip1")

    from fastapi import HTTPException

    try:
        limiter.check("unit:ip1")
        raised = None
    except HTTPException as exc:
        raised = exc
    assert raised is not None and raised.status_code == 429
    assert int(raised.headers["Retry-After"]) >= 1

    # Independent buckets per key.
    limiter.check("unit:ip2")


def test_login_rate_limit_integration(monkeypatch) -> None:
    """End-to-end 429 once one IP exceeds the login budget."""
    from app.api.v1.auth import limit_login

    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    assert _enabled() is True
    limit_login.reset()  # type: ignore[attr-defined]

    payload = {"email": _unique("ratelimit"), "password": "wrong-password"}
    codes = [client.post("/api/auth/login", json=payload).status_code for _ in range(25)]
    assert 429 in codes, f"expected a 429 within 25 attempts, got {codes}"
    assert all(code in (401, 403, 429) for code in codes)

    monkeypatch.undo()
    assert _enabled() is False


def test_team_leader_provisioning_requires_admin() -> None:
    """Regression: /auth/team-leader once minted accounts anonymously."""
    target = _unique("victim")

    anonymous = client.post(
        "/api/auth/team-leader",
        params={"email": target, "full_name": "Sneaky User", "team_id": "whatever"},
    )
    assert anonymous.status_code == 401

    leader = client.post(
        "/api/auth/register",
        json={"email": _unique("plain"), "full_name": "Plain Leader", "password": PASSWORD},
    )
    assert leader.status_code == 201
    leader_headers = {"Authorization": f"Bearer {leader.json()['access_token']}"}
    forbidden = client.post(
        "/api/auth/team-leader",
        params={"email": target, "full_name": "Sneaky User", "team_id": "whatever"},
        headers=leader_headers,
    )
    assert forbidden.status_code == 403

    # The victim account must never have been created.
    login_attempt = client.post("/api/auth/login", json={"email": target, "password": "Demo@1234"})
    assert login_attempt.status_code == 401


def test_login_does_not_provision_demo_accounts() -> None:
    """Regression: logging in with a registered leader's email used to
    auto-create the account with the shared demo password (takeover vector).
    Unknown credentials must simply fail."""
    response = client.post(
        "/api/auth/login",
        json={"email": _unique("neverprovisioned"), "password": "Demo@1234"},
    )
    assert response.status_code == 401


def test_production_requires_strong_secret(monkeypatch) -> None:
    from app.core.config import settings

    original_env = settings.ENVIRONMENT
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "SECRET_KEY", "change-me-in-production")

    from app.main import create_app

    try:
        create_app()
        raised = None
    except RuntimeError as exc:
        raised = exc
    assert raised is not None and "SECRET_KEY" in str(raised)

    # A real secret boots fine even in production mode.
    monkeypatch.setattr(settings, "SECRET_KEY", "x" * 32)
    create_app()
    monkeypatch.undo()


def test_production_enforces_hsts(monkeypatch) -> None:
    """When ENVIRONMENT=production every response carries HSTS."""
    from app.core.config import settings
    from app.main import create_app

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "SECRET_KEY", "x" * 32)

    prod_app = create_app()
    response = TestClient(prod_app).get("/api/health")
    assert (
        response.headers.get("Strict-Transport-Security")
        == "max-age=31536000; includeSubDomains"
    )

    monkeypatch.undo()
    assert settings.ENVIRONMENT == "development"
