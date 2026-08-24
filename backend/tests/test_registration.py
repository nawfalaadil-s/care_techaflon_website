from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "team_name": "Null Pointers",
    "representative_name": "Ada Lovelace",
    "representative_email": "ada@college.edu",
    "representative_phone": "+91 90000 00000",
    "institution": "Example Institute of Technology",
    "year_of_study": "3rd year",
    "track": "ai-ml",
    "problem_statement": "Build an ML model for crop yield.",
    "members": [
        {
            "name": "Ada Lovelace",
            "email": "ada@college.edu",
            "phone": "+91 90000 00000",
        },
        {
            "name": "Alan Turing",
            "email": "alan@college.edu",
            "phone": "+91 90000 00001",
        },
    ],
}


def _unique_email(local: str) -> str:
    """Build a unique email so create tests are idempotent across re-runs."""
    import uuid

    return f"{local}.{uuid.uuid4().hex[:8]}@college.edu"


def test_registration_meta() -> None:
    response = client.get("/api/registration/meta")
    assert response.status_code == 200
    payload = response.json()
    assert payload["max_members"] == 4
    assert "ai-ml" in payload["tracks"]


def test_register_team_creates() -> None:
    unique = _unique_email("ada")
    payload = {
        **VALID_PAYLOAD,
        "team_name": "Test Pointers",
        "representative_email": unique,
        "members": [
            {"name": "Ada Lovelace", "email": unique, "phone": "+91 90000 00000"},
            {"name": "Alan Turing", "email": "alan@college.edu", "phone": "+91 90000 00001"},
        ],
    }
    created = client.post("/api/registration", json=payload)
    assert created.status_code in (200, 201), created.text
    body = created.json()
    assert body["team_name"] == "Test Pointers"
    assert body["id"]
    assert len(body["members"]) == 2


def test_listing_requires_admin() -> None:
    # Anonymous -> 401, plain leader -> 403, admin -> 200.
    anon = client.get("/api/registration")
    assert anon.status_code == 401

    import uuid as _uuid

    from app.database.base import SessionLocal
    from app.schemas.user import UserCreate
    from app.services.user import create_user

    admin_email = f"admin.{_uuid.uuid4().hex[:8]}@college.edu"
    db = SessionLocal()
    try:
        create_user(
            db,
            UserCreate(email=admin_email, full_name="Site Admin", password="supersecret1"),
            role="admin",
        )
    finally:
        db.close()

    leader_login = client.post(
        "/api/auth/login",
        json={"email": "leader.example@college.edu", "password": "irrelevant"},
    )
    if leader_login.status_code == 200:  # only if such a leader exists
        leader_headers = {"Authorization": f"Bearer {leader_login.json()['access_token']}"}
        forbidden = client.get("/api/registration", headers=leader_headers)
        assert forbidden.status_code == 403

    login = client.post(
        "/api/auth/login",
        json={"email": admin_email, "password": "supersecret1"},
    )
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    listing = client.get("/api/registration", headers=headers)
    assert listing.status_code == 200
    assert isinstance(listing.json()["items"], list)


def test_register_rejects_invalid_track() -> None:
    bad = {**VALID_PAYLOAD, "track": "nope"}
    response = client.post("/api/registration", json=bad)
    assert response.status_code == 422