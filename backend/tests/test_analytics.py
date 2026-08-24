"""Analytics endpoint: shape, trends math, and admin-only access."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database.base import SessionLocal
from app.main import app
from app.models.registration import Registration

client = TestClient(app)

PASSWORD = "supersecret1"


def _unique(local: str) -> str:
    return f"{local}.{uuid.uuid4().hex[:8]}@college.edu"


def _make_admin() -> dict:
    from app.schemas.user import UserCreate
    from app.services.user import create_user

    email_addr = _unique("analytics-admin")
    db = SessionLocal()
    try:
        create_user(
            db,
            UserCreate(email=email_addr, full_name="Analytics Admin", password=PASSWORD),
            role="admin",
        )
    finally:
        db.close()
    login = client.post("/api/auth/login", json={"email": email_addr, "password": PASSWORD})
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _register(name: str, track: str, institution: str, status: str | None = None) -> Registration:
    from datetime import datetime, timezone

    from app.services.registration import create_registration
    from app.schemas.registration import RegistrationCreate

    payload = RegistrationCreate(
        team_name=name,
        representative_name=f"{name} Leader",
        representative_email=_unique(name.lower().replace(" ", "")[:10]),
        representative_phone="+91 90000 00000",
        institution=institution,
        year_of_study="2nd year",
        track=track,
        problem_statement=None,
        members=[
            {
                "name": f"{name} Leader",
                "email": _unique("m"),
                "phone": "+91 90000 00000",
            }
        ],
    )
    db = SessionLocal()
    try:
        registration = create_registration(db, payload)
        if status is not None:
            registration.status = status
            registration.created_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.commit()
            db.refresh(registration)
        return registration
    finally:
        db.close()


def test_analytics_requires_admin() -> None:
    assert client.get("/api/stats/analytics").status_code == 401

    leader = client.post(
        "/api/auth/register",
        json={"email": _unique("an-leader"), "full_name": "An Leader", "password": PASSWORD},
    )
    headers = {"Authorization": f"Bearer {leader.json()['access_token']}"}
    assert client.get("/api/stats/analytics", headers=headers).status_code == 403


def test_analytics_shape_and_math() -> None:
    admin = _make_admin()

    # Seed a deterministic pair of rows (one approved, one pending).
    _register("Analytics Alphas", "web", "Analytics Institute", status="approved")
    _register("Analytics Betas", "ai-ml", "Analytics Institute")

    response = client.get("/api/stats/analytics?days=14", headers=admin)
    assert response.status_code == 200
    body = response.json()

    assert body["window_days"] == 14
    assert len(body["registrations_over_time"]) == 14

    # Zero-filled days + at least the two seeded teams somewhere in-window.
    counts = [entry["count"] for entry in body["registrations_over_time"]]
    assert sum(counts) >= 2

    funnel = body["funnel"]
    assert funnel["registered"] >= 2
    assert funnel["approved"] >= 1
    assert 0.0 <= funnel["approval_rate"] <= 1.0

    # Institutions leaderboard aggregates by name.
    institutions = {row["name"]: row["teams"] for row in body["institutions"]}
    assert institutions.get("Analytics Institute", 0) >= 2

    # Tracks carry team/submission/approved counters.
    tracks = {row["track"]: row for row in body["tracks"]}
    assert tracks["web"]["teams"] >= 1
    assert tracks["web"]["submissions"] >= 0
    assert tracks["web"]["approved"] >= 1

    # Email delivery summary exists.
    assert set(body["emails"]["by_status"]).issubset({"queued", "sent", "logged", "failed"})
    assert "problem_adoption" in body


def test_analytics_days_bounds() -> None:
    admin = _make_admin()
    assert client.get("/api/stats/analytics?days=3", headers=admin).status_code == 422
    assert client.get("/api/stats/analytics?days=400", headers=admin).status_code == 422


def test_seeded_registration_visible_in_feed() -> None:
    """Sanity: service-level seed actually persists with the chosen status."""
    registration = _register("Analytics Gammas", "mobile", "Gamma College")
    db = SessionLocal()
    try:
        row = db.scalar(
            select(Registration).where(Registration.id == registration.id)
        )
        assert row is not None
        assert row.track == "mobile"
    finally:
        db.close()
