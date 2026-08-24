"""Gmail automation: outbox records on register/decide/submit + admin log RBAC."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database.base import SessionLocal
from app.main import app
from app.models.email_message import EmailMessage
from app.services.email import dispatch_message

client = TestClient(app)

PASSWORD = "supersecret1"


def _unique(local: str) -> str:
    return f"{local}.{uuid.uuid4().hex[:8]}@college.edu"


def _make_admin() -> dict:
    from app.schemas.user import UserCreate
    from app.services.user import create_user

    email_addr = _unique("admin")
    db = SessionLocal()
    try:
        create_user(
            db,
            UserCreate(email=email_addr, full_name="Mail Admin", password=PASSWORD),
            role="admin",
        )
    finally:
        db.close()
    login = client.post("/api/auth/login", json={"email": email_addr, "password": PASSWORD})
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _register_team(name: str = "Mail Squad") -> dict:
    email = _unique("mail")
    team = client.post(
        "/api/registration",
        json={
            "team_name": name,
            "representative_name": "Mail Tester",
            "representative_email": email,
            "representative_phone": "+91 91111 11111",
            "institution": "Example Institute of Technology",
            "year_of_study": "1st year",
            "track": "web",
            "problem_statement": None,
            "members": [
                {"name": "Mail Tester", "email": email, "phone": "+91 91111 11111"},
            ],
        },
    )
    assert team.status_code in (200, 201), team.text
    return team.json()


def _messages_for(registration_id: str, template: str) -> list[EmailMessage]:
    db = SessionLocal()
    try:
        return list(
            db.scalars(
                select(EmailMessage)
                .where(EmailMessage.registration_id == registration_id)
                .where(EmailMessage.template == template)
                .order_by(EmailMessage.created_at)
            )
        )
    finally:
        db.close()


def test_registration_confirmation_email_recorded() -> None:
    team = _register_team("Inbox Squad")

    messages = _messages_for(team["id"], "registration_confirmation")
    assert len(messages) == 1
    message = messages[0]
    # No Gmail credentials in the test environment → log mode.
    assert message.status == "logged"
    assert message.sent_at is not None
    assert team["representative_email"] in message.to_email
    assert "Inbox Squad" in message.subject
    assert "registered" in message.body


def test_status_decision_email_and_no_duplicate_on_same_status() -> None:
    admin = _make_admin()
    team = _register_team("Verdict Squad")

    response = client.patch(
        f"/api/registration/{team['id']}/status",
        json={"status": "approved"},
        headers=admin,
    )
    assert response.status_code == 200

    messages = _messages_for(team["id"], "registration_decision")
    assert len(messages) == 1
    assert messages[0].status in ("logged", "sent")
    assert "APPROVED" in messages[0].body

    # Re-applying the same status must not send a second decision email.
    again = client.patch(
        f"/api/registration/{team['id']}/status",
        json={"status": "approved"},
        headers=admin,
    )
    assert again.status_code == 200
    assert len(_messages_for(team["id"], "registration_decision")) == 1


def test_submission_received_once_not_on_updates() -> None:
    # Register the team first, then create the account with the SAME email —
    # account creation auto-claims the matching registration (Phase 7).
    shared_email = _unique("subleader")
    team_response = client.post(
        "/api/registration",
        json={
            "team_name": "Submit Squad",
            "representative_name": "Sub Leader",
            "representative_email": shared_email,
            "representative_phone": "+91 92222 22222",
            "institution": "Example Institute of Technology",
            "year_of_study": "3rd year",
            "track": "web",
            "problem_statement": None,
            "members": [
                {"name": "Sub Leader", "email": shared_email, "phone": "+91 92222 22222"},
            ],
        },
    )
    assert team_response.status_code in (200, 201)
    team = team_response.json()

    leader = client.post(
        "/api/auth/register",
        json={
            "email": shared_email,
            "full_name": "Sub Leader",
            "password": PASSWORD,
        },
    )
    assert leader.status_code == 201
    token = {"Authorization": f"Bearer {leader.json()['access_token']}"}

    payload = {
        "project_name": "Mail Bot 3000",
        "description": "A project that definitely exists for testing.",
        "repo_url": "https://github.com/example/mail-bot",
    }
    first = client.put(f"/api/teams/{team['id']}/submission", json=payload, headers=token)
    assert first.status_code == 200

    messages = _messages_for(team["id"], "submission_received")
    assert len(messages) == 1
    assert messages[0].status in ("logged", "sent")
    assert "Mail Bot 3000" in messages[0].subject

    # An edit (update path) must not queue another confirmation.
    second = client.put(
        f"/api/teams/{team['id']}/submission",
        json={**payload, "project_name": "Mail Bot 3001"},
        headers=token,
    )
    assert second.status_code == 200
    assert len(_messages_for(team["id"], "submission_received")) == 1


def test_dispatch_failure_is_recorded_not_raised(monkeypatch) -> None:
    from app.core.config import settings
    from app.services import email as email_service

    team = _register_team("Failover Squad")
    messages = _messages_for(team["id"], "registration_confirmation")
    assert messages and messages[0].status == "logged"

    monkeypatch.setattr(email_service.settings, "EMAIL_ENABLED", False)
    result = email_service.dispatch_message(messages[0].id)
    assert result is not None and result.status == "failed"
    assert "EMAIL_ENABLED" in (result.error or "")

    # Restore real config values for other tests.
    monkeypatch.undo()
    assert settings.EMAIL_ENABLED is True


def test_admin_log_rbac_and_resend() -> None:
    admin = _make_admin()
    team = _register_team("Resend Squad")
    messages = _messages_for(team["id"], "registration_confirmation")
    assert messages

    # Anonymous + plain user are rejected.
    assert client.get("/api/emails").status_code == 401
    leader = client.post(
        "/api/auth/register",
        json={"email": _unique("rl"), "full_name": "Rb Leader", "password": PASSWORD},
    )
    leader_headers = {"Authorization": f"Bearer {leader.json()['access_token']}"}
    assert client.get("/api/emails", headers=leader_headers).status_code == 403

    listing = client.get("/api/emails?limit=5", headers=admin)
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] <= 5
    assert all(m["template"] in (
        "registration_confirmation",
        "registration_decision",
        "submission_received",
    ) for m in body["items"])

    detail = client.get(f"/api/emails/{messages[0].id}", headers=admin)
    assert detail.status_code == 200
    assert detail.json()["body"]

    resend = client.post(f"/api/emails/{messages[0].id}/resend", headers=admin)
    assert resend.status_code == 200
    assert resend.json()["status"] in ("logged", "sent")
