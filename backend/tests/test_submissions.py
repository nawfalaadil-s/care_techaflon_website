"""Project submission endpoints: upsert, ownership guard, withdraw."""

import uuid

from fastapi.testclient import TestClient

from app.core.security import DEMO_PASSWORD
from app.main import app

client = TestClient(app)

PASSWORD = "supersecret1"

PAYLOAD = {
    "project_name": "Campus Navigator",
    "description": "An AR wayfinding app for new students on large campuses.",
    "repo_url": "https://github.com/team/campus-navigator",
    "demo_url": "https://campus-navigator.demo.app",
}


def _unique(local: str) -> str:
    return f"{local}.{uuid.uuid4().hex[:8]}@college.edu"


def _team_with_account() -> tuple[str, dict]:
    """Create a team via the public flow and sign in its leader."""
    tag = uuid.uuid4().hex[:8].upper()
    email = _unique("sub")
    team = client.post(
        "/api/teams",
        json={
            "team_name": f"Submitters {tag}",
            "theme": "ai-ml",
            "leader_name": "Ada Lovelace",
            "leader_email": email,
            "leader_phone": "+91 90000 00000",
            "leader_register_number": f"SB{tag}",
            "leader_department": "CSE",
            "leader_year": "3rd Year",
            "members": [
                {
                    "name": "Member One",
                    "email": _unique("s1"),
                    "register_number": f"S1{tag}",
                    "department": "CSE",
                    "year": "3rd Year",
                },
                {
                    "name": "Member Two",
                    "email": _unique("s2"),
                    "register_number": f"S2{tag}",
                    "department": "AI & DS",
                    "year": "2nd Year",
                },
            ],
        },
    )
    assert team.status_code == 201, team.text
    login = client.post(
        "/api/auth/login", json={"email": email, "password": DEMO_PASSWORD}
    )
    assert login.status_code == 200, login.text
    return (
        team.json()["id"],
        {"Authorization": f"Bearer {login.json()['access_token']}"},
    )


def test_submission_upsert_get_and_withdraw() -> None:
    team_id, headers = _team_with_account()

    # Initially none.
    empty = client.get(f"/api/teams/{team_id}/submission", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["submission"] is None

    # Create — submissions are final immediately (locked).
    created = client.put(
        f"/api/teams/{team_id}/submission", headers=headers, json=PAYLOAD
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["registration_id"] == team_id
    assert body["demo_url"] == PAYLOAD["demo_url"]
    assert body["locked"] is True

    # Edits and withdrawals are refused while locked.
    edit_locked = client.put(
        f"/api/teams/{team_id}/submission",
        headers=headers,
        json={**PAYLOAD, "project_name": "Campus Navigator v2"},
    )
    assert edit_locked.status_code == 403
    withdraw_locked = client.delete(
        f"/api/teams/{team_id}/submission", headers=headers
    )
    assert withdraw_locked.status_code == 403

    # An admin unlocks for corrections...
    admin = _make_admin()
    unlocked = client.patch(
        f"/api/teams/{team_id}/submission/lock",
        headers=admin,
        json={"locked": False},
    )
    assert unlocked.status_code == 200
    assert unlocked.json()["locked"] is False

    # ...and now the team can edit (same row) and withdraw.
    updated = client.put(
        f"/api/teams/{team_id}/submission",
        headers=headers,
        json={**PAYLOAD, "project_name": "Campus Navigator v2", "demo_url": None},
    )
    assert updated.status_code == 200
    assert updated.json()["id"] == body["id"]
    assert updated.json()["project_name"] == "Campus Navigator v2"

    withdrawn = client.delete(f"/api/teams/{team_id}/submission", headers=headers)
    assert withdrawn.status_code == 204
    after = client.get(f"/api/teams/{team_id}/submission", headers=headers)
    assert after.json()["submission"] is None


def _make_admin() -> dict:
    from app.database.base import SessionLocal
    from app.schemas.user import UserCreate
    from app.services.user import create_user

    email = _unique("sub-admin")
    db = SessionLocal()
    try:
        create_user(
            db,
            UserCreate(email=email, full_name="Sub Admin", password=PASSWORD),
            role="admin",
        )
    finally:
        db.close()
    login = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_submission_validation() -> None:
    team_id, headers = _team_with_account()

    bad_repo = client.put(
        f"/api/teams/{team_id}/submission",
        headers=headers,
        json={**PAYLOAD, "repo_url": "not-a-url"},
    )
    assert bad_repo.status_code == 422

    short_description = client.put(
        f"/api/teams/{team_id}/submission",
        headers=headers,
        json={**PAYLOAD, "description": "too short"},
    )
    assert short_description.status_code == 422


def test_submission_ownership_guard() -> None:
    team_id, _ = _team_with_account()
    stranger_email = _unique("stranger")
    stranger = client.post(
        "/api/auth/register",
        json={"email": stranger_email, "full_name": "Stranger", "password": PASSWORD},
    )
    assert stranger.status_code == 201
    stranger_headers = {
        "Authorization": f"Bearer {stranger.json()['access_token']}"
    }

    assert (
        client.get(f"/api/teams/{team_id}/submission", headers=stranger_headers).status_code
        == 404
    )
    assert (
        client.put(
            f"/api/teams/{team_id}/submission", headers=stranger_headers, json=PAYLOAD
        ).status_code
        == 404
    )


def test_submissions_require_auth() -> None:
    assert client.get("/api/teams/some-id/submission").status_code == 401
    assert (
        client.put("/api/teams/some-id/submission", json=PAYLOAD).status_code == 401
    )


def test_admin_can_bulk_export_submissions_csv() -> None:
    team_id, _ = _team_with_account()
    created = client.put(f"/api/teams/{team_id}/submission", json=PAYLOAD)
    assert created.status_code == 200, created.text
    admin = _make_admin()

    response = client.get("/api/teams/all/submissions/export/csv", headers=admin)
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    assert "submissions_" in response.headers["content-disposition"]

    text = response.content.decode("utf-8-sig")  # BOM stripped.
    lines = text.splitlines()
    assert lines[0] == (
        "Team ID,Team Name,Problem Statement,Project Name,"
        "Project Description,GitHub URL"
    )
    assert any(PAYLOAD["project_name"] in line for line in lines[1:])
    assert any(PAYLOAD["repo_url"] in line for line in lines[1:])
    assert any(PAYLOAD["description"] in line for line in lines[1:])


def test_admin_submissions_export_requires_admin() -> None:
    team_id, _ = _team_with_account()
    client.put(f"/api/teams/{team_id}/submission", json=PAYLOAD)

    # Unauthenticated callers are rejected.
    anon = client.get("/api/teams/all/submissions/export/csv")
    assert anon.status_code == 401

    # Signed-in non-admin (a team leader) is forbidden.
    _, leader_headers = _team_with_account()
    forbidden = client.get(
        "/api/teams/all/submissions/export/csv", headers=leader_headers
    )
    assert forbidden.status_code == 403
