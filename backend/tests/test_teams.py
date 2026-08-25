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


# ---------------------------------------------------------------------------
# Admin helpers
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Delete team
# ---------------------------------------------------------------------------


def test_admin_delete_team() -> None:
    admin = _make_admin()
    team = _create_team(_unique("del"))

    resp = client.delete(f"/api/teams/{team['id']}", headers=admin)
    assert resp.status_code == 204

    gone = client.get(f"/api/teams/{team['id']}", headers=admin)
    assert gone.status_code == 404


def test_delete_requires_admin() -> None:
    team = _create_team(_unique("nodelete"))
    resp = client.delete(f"/api/teams/{team['id']}")
    assert resp.status_code == 401

    leader = _login_leader(team["leader_email"])
    resp = client.delete(f"/api/teams/{team['id']}", headers=leader)
    assert resp.status_code == 403


def test_delete_nonexistent_team() -> None:
    admin = _make_admin()
    resp = client.delete(f"/api/teams/{uuid.uuid4()}", headers=admin)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Bulk status update
# ---------------------------------------------------------------------------


def test_bulk_status_approve() -> None:
    admin = _make_admin()
    t1 = _create_team(_unique("bulk1"))
    t2 = _create_team(_unique("bulk2"))

    resp = client.patch(
        "/api/teams/bulk-status",
        json={"team_ids": [t1["id"], t2["id"]], "status": "approved"},
        headers=admin,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["updated"] == 2
    assert body["errors"] == []

    r1 = client.get(f"/api/teams/{t1['id']}", headers=admin).json()
    r2 = client.get(f"/api/teams/{t2['id']}", headers=admin).json()
    assert r1["status"] == "approved"
    assert r2["status"] == "approved"


def test_bulk_status_partial_errors() -> None:
    admin = _make_admin()
    t1 = _create_team(_unique("bperr"))

    resp = client.patch(
        "/api/teams/bulk-status",
        json={"team_ids": [t1["id"], str(uuid.uuid4())], "status": "rejected"},
        headers=admin,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["updated"] == 1
    assert len(body["errors"]) == 1
    assert "not found" in body["errors"][0].lower()


def test_bulk_status_requires_admin() -> None:
    t1 = _create_team(_unique("bnoadm"))
    resp = client.patch(
        "/api/teams/bulk-status",
        json={"team_ids": [t1["id"]], "status": "approved"},
    )
    assert resp.status_code == 401


def test_bulk_status_validates_payload() -> None:
    admin = _make_admin()
    resp = client.patch(
        "/api/teams/bulk-status",
        json={"team_ids": [], "status": "approved"},
        headers=admin,
    )
    assert resp.status_code == 422

    resp = client.patch(
        "/api/teams/bulk-status",
        json={"team_ids": [str(uuid.uuid4())], "status": "bogus"},
        headers=admin,
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Bulk delete
# ---------------------------------------------------------------------------


def test_bulk_delete() -> None:
    admin = _make_admin()
    t1 = _create_team(_unique("bdel1"))
    t2 = _create_team(_unique("bdel2"))

    resp = client.post(
        "/api/teams/bulk-delete",
        json={"team_ids": [t1["id"], t2["id"]]},
        headers=admin,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["deleted"] == 2
    assert body["errors"] == []

    assert client.get(f"/api/teams/{t1['id']}", headers=admin).status_code == 404
    assert client.get(f"/api/teams/{t2['id']}", headers=admin).status_code == 404


def test_bulk_delete_requires_admin() -> None:
    t1 = _create_team(_unique("bdnadm"))
    resp = client.post(
        "/api/teams/bulk-delete",
        json={"team_ids": [t1["id"]]},
    )
    assert resp.status_code == 401


def test_bulk_delete_partial_errors() -> None:
    admin = _make_admin()
    t1 = _create_team(_unique("bdperr"))

    resp = client.post(
        "/api/teams/bulk-delete",
        json={"team_ids": [t1["id"], str(uuid.uuid4())]},
        headers=admin,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["deleted"] == 1
    assert len(body["errors"]) == 1
