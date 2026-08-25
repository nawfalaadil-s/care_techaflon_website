"""Problem statements: admin-only catalogue + lifecycle.

Statements are private to the event: there is no anonymous browsing.
Participants only ever see the single statement allocated to their team.
"""

import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

PASSWORD = "supersecret1"

VALID_STATEMENT = {
    "title": "Flood Alert Network",
    "summary": "Community flood reporting with live alert maps.",
    "description": (
        "Build a crowdsourced flood reporting tool where verified citizen "
        "reports appear on a live map and trigger area alerts. Include a "
        "moderation queue to keep data trustworthy."
    ),
    "track": "web",
    "difficulty": "medium",
    "sponsor": None,
    "published": True,
}


def _unique(local: str) -> str:
    return f"{local}.{uuid.uuid4().hex[:8]}@college.edu"


def _make_admin() -> dict:
    """Create an admin account directly and return auth headers."""
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
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_anonymous_browsing_is_disabled() -> None:
    assert client.get("/api/problems").status_code == 401
    assert client.get(f"/api/problems/{uuid.uuid4()}").status_code == 401


def test_admin_browse_lists_all_with_theme_filter() -> None:
    headers = _make_admin()

    listed = client.get("/api/problems", headers=headers)
    assert listed.status_code == 200, listed.text
    items = listed.json()
    assert len(items) >= 6  # seeded content
    assert {"id", "title", "summary", "track", "difficulty"} <= set(items[0])

    filtered = client.get("/api/problems", params={"track": "ai-ml"}, headers=headers)
    assert filtered.status_code == 200
    for item in filtered.json():
        assert item["track"] == "ai-ml"

    detail = client.get(f"/api/problems/{items[0]['id']}", headers=headers)
    assert detail.status_code == 200

    missing = client.get(f"/api/problems/{uuid.uuid4()}", headers=headers)
    assert missing.status_code == 404


def test_admin_lifecycle_create_patch_delete() -> None:
    headers = _make_admin()

    # New statements start life as drafts by default.
    draft_payload = {**VALID_STATEMENT, "published": False}
    created = client.post("/api/problems", headers=headers, json=draft_payload)
    assert created.status_code == 201, created.text
    statement_id = created.json()["id"]
    assert created.json()["published"] is False

    # Drafts still appear in the admin listing...
    listed = client.get("/api/problems", headers=headers)
    assert any(item["id"] == statement_id for item in listed.json())

    # ...and can be published with a patch.
    patched = client.patch(
        f"/api/problems/{statement_id}", headers=headers, json={"published": True}
    )
    assert patched.status_code == 200
    assert patched.json()["published"] is True

    published = client.get(
        "/api/problems", params={"track": "web"}, headers=headers
    )
    assert any(item["id"] == statement_id for item in published.json())

    deleted = client.delete(f"/api/problems/{statement_id}", headers=headers)
    assert deleted.status_code == 204
    assert client.get(f"/api/problems/{statement_id}", headers=headers).status_code == 404


def test_problem_validation_and_guards() -> None:
    headers = _make_admin()

    bad_track = client.post(
        "/api/problems", headers=headers, json={**VALID_STATEMENT, "track": "quantum"}
    )
    assert bad_track.status_code == 422

    bad_difficulty = client.post(
        "/api/problems",
        headers=headers,
        json={**VALID_STATEMENT, "difficulty": "impossible"},
    )
    assert bad_difficulty.status_code == 422

    # Anonymous writes are rejected.
    assert client.post("/api/problems", json=VALID_STATEMENT).status_code == 401

    leader_email = _unique("leader")
    leader = client.post(
        "/api/auth/register",
        json={
            "email": leader_email,
            "full_name": "Plain Leader",
            "password": PASSWORD,
        },
    )
    assert leader.status_code == 201
    leader_headers = {
        "Authorization": f"Bearer {leader.json()['access_token']}"
    }
    forbidden = client.post("/api/problems", headers=leader_headers, json=VALID_STATEMENT)
    assert forbidden.status_code == 403
