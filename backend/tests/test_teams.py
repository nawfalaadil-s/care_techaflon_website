"""Team portal endpoints: provisioning, ownership, and edits.

The current flow: teams are created publicly via ``POST /api/teams``; the
leader account is provisioned automatically (demo password) and the leader
signs in, then manages the team from ``/api/teams/mine``.
"""

import uuid

from fastapi.testclient import TestClient

from app.core.security import DEMO_PASSWORD
from app.main import app

client = TestClient(app)

PASSWORD = "supersecret1"


def _unique(local: str) -> str:
    return f"{local}.{uuid.uuid4().hex[:8]}@college.edu"


def _team_payload(email: str) -> dict:
    tag = uuid.uuid4().hex[:8].upper()
    return {
        "team_name": f"Portal Testers {tag}",
        "theme": "web",
        "leader_name": "Grace Hopper",
        "leader_email": email,
        "leader_phone": "+91 90000 00000",
        "leader_register_number": f"RG{tag}",
        "leader_department": "CSE",
        "leader_year": "3rd Year",
        "members": [
            {
                "name": "Member One",
                "email": _unique("m1"),
                "register_number": f"M1{tag}",
                "department": "CSE",
                "year": "3rd Year",
            },
            {
                "name": "Member Two",
                "email": _unique("m2"),
                "register_number": f"M2{tag}",
                "department": "AI & DS",
                "year": "2nd Year",
            },
        ],
    }


def _create_team(email: str) -> dict:
    response = client.post("/api/teams", json=_team_payload(email))
    assert response.status_code == 201, response.text
    return response.json()


def _login_leader(email: str) -> dict:
    """Leaders sign in with the auto-provisioned demo password."""
    response = client.post(
        "/api/auth/login", json={"email": email, "password": DEMO_PASSWORD}
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _create_plain_account(email: str) -> dict:
    response = client.post(
        "/api/auth/register",
        json={"email": email, "full_name": "Plain User", "password": PASSWORD},
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_registration_provisions_leader_login() -> None:
    email = _unique("grace")
    created = _create_team(email)
    headers = _login_leader(email)

    mine = client.get("/api/teams/mine", headers=headers)
    assert mine.status_code == 200, mine.text
    assert mine.json()["id"] == created["id"]
    assert mine.json()["leader_email"] == email


def test_mine_is_scoped_to_the_leader() -> None:
    _create_team(_unique("linus"))

    stranger = _create_plain_account(_unique("other"))
    mine = client.get("/api/teams/mine", headers=stranger)
    assert mine.status_code == 404


def test_update_owned_team_and_ownership_guard() -> None:
    email = _unique("margaret")
    created = _create_team(email)
    headers = _login_leader(email)

    other_team = _create_team(_unique("rivals"))

    updated = client.patch(
        f"/api/teams/{created['id']}",
        headers=headers,
        json={
            "team_name": f"Renamed Rockets {uuid.uuid4().hex[:6]}",
            "theme": "ai-ml",
            "venue_name": "Main Auditorium",
        },
    )
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["theme"] == "ai-ml"
    assert body["venue_name"] == "Main Auditorium"

    # Renaming onto an existing team's name is a conflict.
    clash = client.patch(
        f"/api/teams/{created['id']}",
        headers=headers,
        json={"team_name": other_team["team_name"]},
    )
    assert clash.status_code == 409

    # Invalid theme rejected.
    bad_theme = client.patch(
        f"/api/teams/{created['id']}", headers=headers, json={"theme": "quantum"}
    )
    assert bad_theme.status_code == 422

    # Another user cannot see or edit someone else's team.
    stranger = _create_plain_account(_unique("stranger"))
    stolen = client.patch(
        f"/api/teams/{created['id']}",
        headers=stranger,
        json={"team_name": f"Hacked {uuid.uuid4().hex[:6]}"},
    )
    assert stolen.status_code == 403
    foreign_get = client.get(f"/api/teams/{created['id']}", headers=stranger)
    assert foreign_get.status_code == 403


def test_teams_require_auth() -> None:
    assert client.get("/api/teams/mine").status_code == 401
    assert client.get(f"/api/teams/{uuid.uuid4()}").status_code == 401
