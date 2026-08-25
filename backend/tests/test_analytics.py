"""Analytics endpoint: shape, trends math, and admin-only access."""

import uuid

from fastapi.testclient import TestClient

from app.database.base import SessionLocal
from app.main import app

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


def _seed_team(name: str, theme: str, status: str | None = None):
    """Insert a TechAFlon team row directly with a unique identity."""
    from datetime import datetime, timezone

    from app.models.team import Team

    tag = uuid.uuid4().hex[:8].upper()
    db = SessionLocal()
    try:
        team = Team(
            team_id=f"TFLN-2026-{tag}",
            team_name=f"{name} {tag}",
            theme=theme,
            status=status or "pending",
            leader_name=f"{name} Leader",
            leader_email=_unique(name.lower().replace(" ", "")[:10]),
            leader_phone="+91 90000 00000",
            leader_register_number=f"AN{tag}",
            leader_department="CSE",
            leader_year="2nd Year",
            leader_section="A",
            members=[
                {
                    "name": "Member One",
                    "email": _unique("am"),
                    "register_number": f"AM{tag}",
                    "department": "CSE",
                    "year": "2nd Year",
                }
            ],
        )
        if status == "approved":
            team.approved_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.add(team)
        db.commit()
        db.refresh(team)
        return team
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

    # Seed a deterministic pair of teams (one approved, one pending).
    _seed_team("Analytics Alphas", "web", status="approved")
    _seed_team("Analytics Betas", "ai-ml")

    response = client.get("/api/stats/analytics?days=14", headers=admin)
    assert response.status_code == 200
    body = response.json()

    assert body["window_days"] == 14
    assert len(body["teams_over_time"]) == 14

    # Zero-filled days + at least the two seeded teams somewhere in-window.
    counts = [entry["count"] for entry in body["teams_over_time"]]
    assert sum(counts) >= 2

    funnel = body["funnel"]
    assert funnel["registered"] >= 2
    assert funnel["approved"] >= 1
    assert 0.0 <= funnel["approval_rate"] <= 1.0

    # Department leaderboard aggregates by name.
    departments = {row["name"]: row["teams"] for row in body["departments"]}
    assert departments.get("CSE", 0) >= 2

    # Themes carry team/submission/approved counters.
    themes = {row["theme"]: row for row in body["themes"]}
    assert themes["web"]["teams"] >= 1
    assert themes["web"]["submissions"] >= 0
    assert themes["web"]["approved"] >= 1

    # Email delivery summary exists.
    assert set(body["emails"]["by_status"]).issubset({"queued", "sent", "logged", "failed"})
    assert "problem_adoption" in body


def test_analytics_days_bounds() -> None:
    admin = _make_admin()
    assert client.get("/api/stats/analytics?days=3", headers=admin).status_code == 422
    assert client.get("/api/stats/analytics?days=400", headers=admin).status_code == 422


def test_seeded_team_visible_in_analytics() -> None:
    """Sanity: seeded TechAFlon teams are counted by the aggregates."""
    team = _seed_team("Analytics Gammas", "web")
    admin = _make_admin()
    response = client.get("/api/stats/analytics?days=7", headers=admin)
    assert response.status_code == 200
    body = response.json()
    themes = {row["theme"]: row for row in body["themes"]}
    assert themes["web"]["teams"] >= 1
    assert team.theme == "web"
