"""Project submission endpoints: upsert, ownership guard, withdraw."""

import uuid

from fastapi.testclient import TestClient

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
    """Register a team + matching account (auto-linked). Returns (id, token)."""
    email = _unique("sub")
    team = client.post(
        "/api/registration",
        json={
            "team_name": "Submitters",
            "representative_name": "Ada Lovelace",
            "representative_email": email,
            "representative_phone": "+91 90000 00000",
            "institution": "Example Institute of Technology",
            "year_of_study": "3rd year",
            "track": "ai-ml",
            "problem_statement": None,
            "members": [
                {"name": "Ada Lovelace", "email": email, "phone": "+91 90000 00000"},
            ],
        },
    )
    assert team.status_code in (200, 201), team.text
    account = client.post(
        "/api/auth/register",
        json={"email": email, "full_name": "Ada Lovelace", "password": PASSWORD},
    )
    assert account.status_code == 201, account.text
    return team.json()["id"], {"Authorization": f"Bearer {account.json()['access_token']}"}


def test_submission_upsert_get_and_withdraw() -> None:
    team_id, headers = _team_with_account()

    # Initially none.
    empty = client.get(f"/api/teams/{team_id}/submission", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["submission"] is None

    # Create.
    created = client.put(
        f"/api/teams/{team_id}/submission", headers=headers, json=PAYLOAD
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["registration_id"] == team_id
    assert body["demo_url"] == PAYLOAD["demo_url"]

    # Update keeps the same row.
    updated = client.put(
        f"/api/teams/{team_id}/submission",
        headers=headers,
        json={**PAYLOAD, "project_name": "Campus Navigator v2", "demo_url": None},
    )
    assert updated.status_code == 200
    assert updated.json()["id"] == body["id"]
    assert updated.json()["project_name"] == "Campus Navigator v2"
    assert updated.json()["demo_url"] is None

    # Withdraw clears it again.
    withdrawn = client.delete(f"/api/teams/{team_id}/submission", headers=headers)
    assert withdrawn.status_code == 204
    after = client.get(f"/api/teams/{team_id}/submission", headers=headers)
    assert after.json()["submission"] is None


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
