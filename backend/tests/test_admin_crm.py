"""Admin CRM: overview stats, registration detail/status, drafts listing."""

import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

PASSWORD = "supersecret1"


def _unique(local: str) -> str:
    return f"{local}.{uuid.uuid4().hex[:8]}@college.edu"


def _make_admin() -> dict:
    from app.database.base import SessionLocal
    from app.schemas.user import UserCreate
    from app.services.user import create_user

    email = _unique("admin")
    db = SessionLocal()
    try:
        create_user(
            db,
            UserCreate(email=email, full_name="Site Admin", password=PASSWORD),
            role="admin",
        )
    finally:
        db.close()
    login = client.post(
        "/api/auth/login", json={"email": email, "password": PASSWORD}
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _make_leader() -> dict:
    email = _unique("leader")
    reg = client.post(
        "/api/auth/register",
        json={"email": email, "full_name": "Plain Leader", "password": PASSWORD},
    )
    assert reg.status_code == 201
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


def _register_team() -> str:
    email = _unique("crm")
    team = client.post(
        "/api/registration",
        json={
            "team_name": "CRM Squad",
            "representative_name": "Crm Tester",
            "representative_email": email,
            "representative_phone": "+91 90000 00000",
            "institution": "Example Institute of Technology",
            "year_of_study": "2nd year",
            "track": "web",
            "problem_statement": None,
            "members": [
                {"name": "Crm Tester", "email": email, "phone": "+91 90000 00000"},
            ],
        },
    )
    assert team.status_code in (200, 201), team.text
    return team.json()["id"]


def test_overview_rbac_and_shape() -> None:
    assert client.get("/api/stats/overview").status_code == 401

    leader_headers = _make_leader()
    assert client.get("/api/stats/overview", headers=leader_headers).status_code == 403

    admin_headers = _make_admin()
    response = client.get("/api/stats/overview", headers=admin_headers)
    assert response.status_code == 200, response.text
    stats = response.json()
    assert stats["registrations"]["total"] >= 1
    assert isinstance(stats["registrations"]["by_status"], dict)
    assert isinstance(stats["registrations"]["by_track"], dict)
    assert stats["problem_statements"]["published"] >= 6  # seeded content
    assert stats["users"]["total"] >= 1


def test_registration_detail_defaults_pending_and_status_flow() -> None:
    admin_headers = _make_admin()
    team_id = _register_team()

    detail = client.get(f"/api/registration/{team_id}", headers=admin_headers)
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert body["id"] == team_id
    assert body["status"] == "pending"

    approved = client.patch(
        f"/api/registration/{team_id}/status",
        headers=admin_headers,
        json={"status": "approved"},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    waitlisted = client.patch(
        f"/api/registration/{team_id}/status",
        headers=admin_headers,
        json={"status": "waitlisted"},
    )
    assert waitlisted.json()["status"] == "waitlisted"

    bad = client.patch(
        f"/api/registration/{team_id}/status",
        headers=admin_headers,
        json={"status": "maybe"},
    )
    assert bad.status_code == 422

    missing = client.get(f"/api/registration/{uuid.uuid4()}", headers=admin_headers)
    assert missing.status_code == 404


def test_status_endpoints_require_admin() -> None:
    team_id = _register_team()
    leader_headers = _make_leader()

    assert (
        client.get(f"/api/registration/{team_id}", headers=leader_headers).status_code
        == 403
    )
    assert (
        client.patch(
            f"/api/registration/{team_id}/status",
            headers=leader_headers,
            json={"status": "approved"},
        ).status_code
        == 403
    )


def test_problems_all_lists_drafts_for_admin_only() -> None:
    admin_headers = _make_admin()

    draft = client.post(
        "/api/problems",
        headers=admin_headers,
        json={
            "title": "Secret Draft Challenge",
            "summary": "A draft nobody should see publicly.",
            "description": "Full brief for the unpublished draft challenge goes here.",
            "track": "mobile",
            "difficulty": "hard",
            "sponsor": None,
            "published": False,
        },
    )
    assert draft.status_code == 201, draft.text
    draft_id = draft.json()["id"]

    public = client.get("/api/problems")
    assert all(item["id"] != draft_id for item in public.json())

    everything = client.get("/api/problems/all", headers=admin_headers)
    assert everything.status_code == 200
    ids = [item["id"] for item in everything.json()]
    assert draft_id in ids

    # RBAC: anonymous and plain leaders are rejected.
    assert client.get("/api/problems/all").status_code == 401
    assert (
        client.get("/api/problems/all", headers=_make_leader()).status_code == 403
    )

    # Cleanup so repeat runs stay tidy.
    assert (
        client.delete(f"/api/problems/{draft_id}", headers=admin_headers).status_code
        == 204
    )
