"""Problem statements: public browsing + admin lifecycle."""

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
    "track": "sustainability",
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


def test_public_browse_lists_only_published() -> None:
    response = client.get("/api/problems")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 6  # seeded content
    assert all(item["published"] for item in items)
    assert {"id", "title", "summary", "track", "difficulty"} <= set(items[0])


def test_public_track_filter_and_detail() -> None:
    filtered = client.get("/api/problems", params={"track": "ai-ml"})
    assert filtered.status_code == 200
    items = filtered.json()
    assert len(items) >= 2
    assert all(item["track"] == "ai-ml" for item in items)

    target = items[0]
    detail = client.get(f"/api/problems/{target['id']}")
    assert detail.status_code == 200
    assert detail.json()["description"] == target["description"]

    missing = client.get(f"/api/problems/{uuid.uuid4()}")
    assert missing.status_code == 404


def test_admin_lifecycle_create_patch_delete() -> None:
    headers = _make_admin()

    created = client.post("/api/problems", headers=headers, json=VALID_STATEMENT)
    assert created.status_code == 201, created.text
    statement_id = created.json()["id"]
    assert created.json()["published"] is True

    # Visible publicly right away.
    listed = client.get("/api/problems", params={"track": "sustainability"})
    assert any(item["id"] == statement_id for item in listed.json())

    # Unpublish hides it from public browse and detail.
    patched = client.patch(
        f"/api/problems/{statement_id}", headers=headers, json={"published": False}
    )
    assert patched.status_code == 200
    assert patched.json()["published"] is False

    hidden_list = client.get("/api/problems")
    assert all(item["id"] != statement_id for item in hidden_list.json())
    assert client.get(f"/api/problems/{statement_id}").status_code == 404

    deleted = client.delete(f"/api/problems/{statement_id}", headers=headers)
    assert deleted.status_code == 204
    assert client.get(f"/api/problems/{statement_id}").status_code == 404


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

    # Anonymous and non-admin writes are rejected.
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
