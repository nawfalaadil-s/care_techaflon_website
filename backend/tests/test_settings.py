"""Site settings: defaults, admin CRUD, validation, registration gating."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database.base import SessionLocal
from app.main import app
from app.models.site_setting import SiteSetting

client = TestClient(app)

PASSWORD = "supersecret1"


def _unique(local: str) -> str:
    return f"{local}.{uuid.uuid4().hex[:8]}@college.edu"


def _make_admin() -> dict:
    from app.schemas.user import UserCreate
    from app.services.user import create_user

    email_addr = _unique("settings-admin")
    db = SessionLocal()
    try:
        create_user(
            db,
            UserCreate(email=email_addr, full_name="Settings Admin", password=PASSWORD),
            role="admin",
        )
    finally:
        db.close()
    login = client.post("/api/auth/login", json={"email": email_addr, "password": PASSWORD})
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _cleanup(keys: tuple[str, ...] = ("announcement", "registration_open", "registration_deadline")) -> None:
    """Remove overrides so other tests start from pristine defaults."""
    db = SessionLocal()
    try:
        for row in db.scalars(select(SiteSetting).where(SiteSetting.key.in_(keys))):
            db.delete(row)
        db.commit()
    finally:
        db.close()


def test_public_settings_defaults_no_auth() -> None:
    _cleanup()
    response = client.get("/api/settings/public")
    assert response.status_code == 200
    body = response.json()
    assert body["registration_open"] is True
    assert body["event_name"]
    assert body["contact_email"]
    # Admin-only read requires auth.
    assert client.get("/api/settings").status_code == 401


def test_admin_patch_and_public_visibility() -> None:
    _cleanup()
    admin = _make_admin()

    patched = client.patch(
        "/api/settings",
        json={
            "event_name": "TechaFlon",
            "registration_open": False,
            "registration_deadline": "2026-09-01",
            "announcement": "Submissions close soon!",
        },
        headers=admin,
    )
    assert patched.status_code == 200
    body = patched.json()
    assert body["event_name"] == "TechaFlon"
    assert body["registration_open"] is False
    assert body["registration_deadline"] == "2026-09-01"

    public = client.get("/api/settings/public").json()
    assert public["event_name"] == "TechaFlon"
    assert public["registration_open"] is False


def test_patch_validation_rejects_bad_input() -> None:
    admin = _make_admin()

    bad_date = client.patch(
        "/api/settings",
        json={"registration_deadline": "September first"},
        headers=admin,
    )
    assert bad_date.status_code == 422

    bad_email = client.patch(
        "/api/settings", json={"contact_email": "not-an-email"}, headers=admin
    )
    assert bad_email.status_code == 422

    empty_name = client.patch("/api/settings", json={"event_name": ""}, headers=admin)
    assert empty_name.status_code == 422


def test_delete_reset_restores_default() -> None:
    _cleanup(("announcement",))
    admin = _make_admin()

    client.patch("/api/settings", json={"announcement": "temporary banner"}, headers=admin)
    reset = client.delete("/api/settings/announcement", headers=admin)
    assert reset.status_code == 200
    assert reset.json()["announcement"] == ""

    unknown = client.delete("/api/settings/nonexistent_key", headers=admin)
    assert unknown.status_code == 404


def test_registration_gated_when_closed() -> None:
    _cleanup(("registration_open",))
    admin = _make_admin()
    closed = client.patch(
        "/api/settings", json={"registration_open": False}, headers=admin
    )
    assert closed.status_code == 200

    payload = {
        "team_name": "Closed Gate Squad",
        "representative_name": "Gate Leader",
        "representative_email": _unique("gate"),
        "representative_phone": "+91 93333 33333",
        "institution": "Example Institute of Technology",
        "year_of_study": "1st year",
        "track": "web",
        "problem_statement": None,
        "members": [
            {"name": "Gate Leader", "email": _unique("g"), "phone": "+91 93333 33333"}
        ],
    }
    blocked = client.post("/api/registration", json=payload)
    assert blocked.status_code == 403
    assert "closed" in blocked.json()["detail"].lower()

    # Meta exposes the flag so the UI can react without submitting.
    meta = client.get("/api/registration/meta").json()
    assert meta["registration_open"] is False

    reopened = client.patch("/api/settings", json={"registration_open": True}, headers=admin)
    assert reopened.status_code == 200
    accepted = client.post("/api/registration", json=payload)
    assert accepted.status_code in (200, 201)

    _cleanup()
