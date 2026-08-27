"""Gmail automation: outbox records on register/decide/submit + admin log RBAC."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import DEMO_PASSWORD
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


def _messages_to(to_email: str, template: str) -> list[EmailMessage]:
    """Outbox rows for one recipient (submission/team mails carry no
    legacy ``registration_id`` link, so match on the recipient)."""
    db = SessionLocal()
    try:
        return list(
            db.scalars(
                select(EmailMessage)
                .where(EmailMessage.to_email == to_email)
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


def _register_techaflon_team(name: str) -> dict:
    """Register through the real public POST /api/teams flow."""
    email = _unique("lead")
    payload = {
        "team_name": name,
        "theme": "web",
        "leader_name": "Status Leader",
        "leader_email": email,
        "leader_phone": "+91 90000 12345",
        "leader_register_number": f"REG{uuid.uuid4().hex[:8].upper()}",
        "leader_department": "CSE",
        "leader_year": "3rd Year",
        "members": [
            {
                "name": "Member One",
                "email": _unique("m1"),
                "register_number": f"RM{uuid.uuid4().hex[:8].upper()}",
                "department": "CSE",
                "year": "3rd Year",
            },
            {
                "name": "Member Two",
                "email": _unique("m2"),
                "register_number": f"RN{uuid.uuid4().hex[:8].upper()}",
                "department": "AI & DS",
                "year": "2nd Year",
            },
        ],
    }
    response = client.post("/api/teams", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _team_status_messages(to_email: str) -> list[EmailMessage]:
    db = SessionLocal()
    try:
        return list(
            db.scalars(
                select(EmailMessage)
                .where(EmailMessage.template == "team_status_update")
                .where(EmailMessage.to_email == to_email)
                .order_by(EmailMessage.created_at)
            )
        )
    finally:
        db.close()


def test_team_status_change_sends_exactly_one_email() -> None:
    """Regression: the injected BackgroundTasks must actually dispatch the
    notification, and re-applying the same status must not re-send it."""
    admin = _make_admin()
    team = _register_techaflon_team(f"Status Squad {uuid.uuid4().hex[:6]}")

    response = client.patch(
        f"/api/teams/{team['id']}/status",
        json={"status": "approved"},
        headers=admin,
    )
    assert response.status_code == 200

    messages = _team_status_messages(team["leader_email"])
    assert len(messages) == 1, "status-change email was never queued/dispatched"
    assert messages[0].status in ("logged", "sent")
    assert "APPROVED" in messages[0].body
    assert team["leader_name"] in messages[0].body
    assert team["team_id"] in messages[0].subject

    # Re-applying the SAME status must not queue a second email.
    again = client.patch(
        f"/api/teams/{team['id']}/status",
        json={"status": "approved"},
        headers=admin,
    )
    assert again.status_code == 200
    assert len(_team_status_messages(team["leader_email"])) == 1


def test_submission_received_once_not_on_updates():
    # Create the team through the public flow; the leader account is
    # provisioned automatically with the demo password.
    team = _register_techaflon_team(f"Submit Squad {uuid.uuid4().hex[:6]}")
    login = client.post(
        "/api/auth/login",
        json={"email": team["leader_email"], "password": DEMO_PASSWORD},
    )
    assert login.status_code == 200, login.text
    token = {"Authorization": f"Bearer {login.json()['access_token']}"}

    payload = {
        "project_name": "Mail Bot 3000",
        "description": "A project that definitely exists for testing.",
        "repo_url": "https://github.com/example/mail-bot",
    }
    first = client.put(f"/api/teams/{team['id']}/submission", json=payload, headers=token)
    assert first.status_code == 200

    messages = _messages_to(team["leader_email"], "submission_received")
    assert len(messages) == 1
    assert messages[0].status in ("logged", "sent")
    assert "Mail Bot 3000" in messages[0].subject

    # Submissions lock on submit: a refused re-edit must not queue mail.
    second = client.put(
        f"/api/teams/{team['id']}/submission",
        json={**payload, "project_name": "Mail Bot 3001"},
        headers=token,
    )
    assert second.status_code == 403
    assert len(_messages_to(team["leader_email"], "submission_received")) == 1


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
    # The suite shares one database, so the outbox may hold many rows; the
    # contract is that `limit` caps the page while `total` counts everything.
    assert len(body["items"]) <= 5
    assert body["total"] >= len(body["items"])
    assert all(m["template"] in (
        "registration_confirmation",
        "registration_decision",
        "submission_received",
        "team_registration_confirmation",
        "team_status_update",
        "certificate_award",
    ) for m in body["items"])

    detail = client.get(f"/api/emails/{messages[0].id}", headers=admin)
    assert detail.status_code == 200
    assert detail.json()["body"]

    resend = client.post(f"/api/emails/{messages[0].id}/resend", headers=admin)
    assert resend.status_code == 200
    assert resend.json()["status"] in ("logged", "sent")


# ---------------------------------------------------------------------------
# Themed HTML (Avengers: Doomsday) rendering
# ---------------------------------------------------------------------------

def _assert_doomsday_shell(html: str | None) -> None:
    assert html is not None, "body_html was never rendered"
    assert "TECHAFLON" in html
    assert "Doomsday Protocol" in html
    assert "Assemble" in html
    assert html.strip().startswith("<!doctype html>")


def test_team_registration_email_is_themed_html() -> None:
    team = _register_techaflon_team(f"Theme Squad {uuid.uuid4().hex[:6]}")

    db = SessionLocal()
    try:
        message = db.scalars(
            select(EmailMessage)
            .where(EmailMessage.template == "team_registration_confirmation")
            .where(EmailMessage.to_email == team["leader_email"])
        ).first()
    finally:
        db.close()

    assert message is not None
    _assert_doomsday_shell(message.body_html)
    assert team["team_id"] in message.body_html
    assert team["team_name"] in message.body_html
    # Plain-text fallback still present for clients that don't render HTML.
    assert team["team_id"] in message.body


def test_status_emails_are_themed_html_for_approve_and_reject() -> None:
    admin = _make_admin()
    team = _register_techaflon_team(f"Verdict Theme {uuid.uuid4().hex[:6]}")

    approved = client.patch(
        f"/api/teams/{team['id']}/status", json={"status": "approved"}, headers=admin
    )
    assert approved.status_code == 200

    messages = _team_status_messages(team["leader_email"])
    assert len(messages) == 1
    html = messages[0].body_html or ""
    _assert_doomsday_shell(html)
    assert "YOU'RE IN, HERO" in html.upper()
    assert "APPROVED" in html

    # Now reject the same team — a second themed email must go out.
    rejected = client.patch(
        f"/api/teams/{team['id']}/status", json={"status": "rejected"}, headers=admin
    )
    assert rejected.status_code == 200

    messages = _team_status_messages(team["leader_email"])
    assert len(messages) == 2
    reject_html = messages[1].body_html or ""
    _assert_doomsday_shell(reject_html)
    assert "REGISTRATION DECLINED" in reject_html
    assert "REJECTED" in reject_html


def test_submission_email_is_themed_html_with_links() -> None:
    team = _register_techaflon_team(f"Submit Theme {uuid.uuid4().hex[:6]}")
    login = client.post(
        "/api/auth/login",
        json={"email": team["leader_email"], "password": DEMO_PASSWORD},
    )
    token = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = client.put(
        f"/api/teams/{team['id']}/submission",
        json={
            "project_name": "Doom Renderer",
            "description": "Rendering the doomsday clock, one frame at a time.",
            "repo_url": "https://github.com/example/doom-renderer",
        },
        headers=token,
    )
    assert response.status_code == 200

    messages = _messages_to(team["leader_email"], "submission_received")
    assert len(messages) == 1
    html = messages[0].body_html or ""
    _assert_doomsday_shell(html)
    assert "Doom Renderer" in html
    assert "https://github.com/example/doom-renderer" in html
