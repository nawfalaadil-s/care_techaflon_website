"""Team portal endpoints: ownership, claiming, and edits."""

import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

PASSWORD = "supersecret1"


def _unique(local: str, domain: str = "college.edu") -> str:
    return f"{local}.{uuid.uuid4().hex[:8]}@{domain}"


def _register_team(email: str) -> dict:
    response = client.post(
        "/api/registration",
        json={
            "team_name": "Portal Testers",
            "representative_name": "Grace Hopper",
            "representative_email": email,
            "representative_phone": "+91 90000 00000",
            "institution": "Example Institute of Technology",
            "year_of_study": "3rd year",
            "track": "web",
            "problem_statement": None,
            "members": [
                {"name": "Grace Hopper", "email": email, "phone": "+91 90000 00000"},
            ],
        },
    )
    assert response.status_code in (200, 201), response.text
    return response.json()


def _create_account(email: str) -> dict:
    """Create the account via the public API and return its token pair."""
    response = client.post(
        "/api/auth/register",
        json={"email": email, "full_name": "Grace Hopper", "password": PASSWORD},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_account_creation_auto_links_registration() -> None:
    email = _unique("grace")
    created = _register_team(email)
    account = _create_account(email)

    mine = client.get("/api/teams/mine", headers=_auth(account["access_token"]))
    assert mine.status_code == 200, mine.text
    ids = [team["id"] for team in mine.json()]
    assert created["id"] in ids


def test_claim_attaches_unclaimed_team() -> None:
    email = _unique("linus")
    created = _register_team(email)
    # Account with a *different* email sees nothing...
    other_email = _unique("other")
    account = _create_account(other_email)

    mine = client.get("/api/teams/mine", headers=_auth(account["access_token"]))
    assert mine.status_code == 200
    assert mine.json() == []

    # ...and cannot claim a team whose contact email isn't theirs.
    claimed = client.post("/api/teams/claim", headers=_auth(account["access_token"]))
    assert claimed.status_code == 200
    assert claimed.json() == []

    # The real owner creates an account and claims it.
    owner = _create_account(email)
    claimed = client.post("/api/teams/claim", headers=_auth(owner["access_token"]))
    assert claimed.status_code == 200, claimed.text
    assert created["id"] in [team["id"] for team in claimed.json()]

    # Claim is idempotent — already-owned teams stay put.
    again = client.post("/api/teams/claim", headers=_auth(owner["access_token"]))
    assert created["id"] in [team["id"] for team in again.json()]

    # A second claim attempt by another account must not steal the team.
    thief = client.post("/api/teams/claim", headers=_auth(account["access_token"]))
    assert thief.status_code == 200
    assert created["id"] not in [team["id"] for team in thief.json()]


def test_update_owned_team_and_ownership_guard() -> None:
    email = _unique("margaret")
    created = _register_team(email)
    owner = _create_account(email)

    updated = client.patch(
        f"/api/teams/{created['id']}",
        headers=_auth(owner["access_token"]),
        json={
            "team_name": "Renamed Rockets",
            "problem_statement": "Offline-first PWA for clinics",
            "members": [
                {"name": "Margaret H", "email": email, "phone": "+91 90000 00001"},
                {"name": "New Mate", "email": _unique("mate"), "phone": "+91 90000 00002"},
            ],
        },
    )
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["team_name"] == "Renamed Rockets"
    assert body["problem_statement"] == "Offline-first PWA for clinics"
    assert len(body["members"]) == 2

    # Clearing an optional statement works.
    cleared = client.patch(
        f"/api/teams/{created['id']}",
        headers=_auth(owner["access_token"]),
        json={"problem_statement": None},
    )
    assert cleared.status_code == 200
    assert cleared.json()["problem_statement"] is None

    # Another user cannot see or edit someone else's team (404, no leak).
    stranger_email = _unique("stranger")
    stranger = _create_account(stranger_email)
    stolen = client.patch(
        f"/api/teams/{created['id']}",
        headers=_auth(stranger["access_token"]),
        json={"team_name": "Hacked"},
    )
    assert stolen.status_code == 404
    foreign_get = client.get(
        f"/api/teams/{created['id']}", headers=_auth(stranger["access_token"])
    )
    # GET by id isn't exposed at all.
    assert foreign_get.status_code == 405 or foreign_get.status_code == 404

    # Invalid track rejected.
    bad_track = client.patch(
        f"/api/teams/{created['id']}",
        headers=_auth(owner["access_token"]),
        json={"track": "quantum"},
    )
    assert bad_track.status_code == 422


def test_teams_require_auth() -> None:
    assert client.get("/api/teams/mine").status_code == 401
    assert client.post("/api/teams/claim").status_code == 401
