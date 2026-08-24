"""End-to-end smoke check run IN-PROCESS via FastAPI TestClient.

Exercises the full request stack (routing, validation, auth, DB):
creates two fresh teams through the public flow, signs into the leader
portal, submits a project, verifies responses — then removes every row it
created so the database returns to its clean state.
"""

from __future__ import annotations

import os
import sys

os.environ["DEBUG"] = "false"
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.database.base import SessionLocal  # noqa: E402
from sqlalchemy import text  # noqa: E402

client = TestClient(app)

results: list[tuple[str, bool]] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    results.append((label, ok))
    print(f"{'PASS' if ok else 'FAIL'}  {label}{(' — ' + detail) if detail else ''}")


def member(name: str, email: str, reg: str) -> dict:
    return {
        "name": name,
        "email": email,
        "register_number": reg,
        "department": "CSE",
        "year": "3rd Year",
    }


def team_payload(name: str, email: str, reg: str, theme: str) -> dict:
    suffix = name.split()[-1].upper()
    return {
        "team_name": name,
        "theme": theme,
        "leader_name": f"E2E Leader {suffix}",
        "leader_email": email,
        "leader_register_number": reg,
        "leader_department": "CSE",
        "leader_year": "3rd Year",
        "members": [
            member(f"E2E Member {suffix} One", f"e2e-{suffix.lower()}-m1@test.local", f"E2E{suffix}M1"),
            member(f"E2E Member {suffix} Two", f"e2e-{suffix.lower()}-m2@test.local", f"E2E{suffix}M2"),
        ],
    }


def main() -> int:
    # 0. Registration gate — open it for the check if closed.
    original_open = client.get("/api/settings/public").json()["registration_open"]
    admin_token = None
    if not original_open:
        r = client.post("/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, f"admin login failed: {r.text}"
        admin_token = r.json()["access_token"]
        client.patch("/api/settings", json={"registration_open": True},
                     headers={"Authorization": f"Bearer {admin_token}"})
        check("registration gate opened for check", True)
    else:
        check("registration gate already open", True)

    try:
        # 1-2. Fresh teams through the public flow.
        ra = client.post("/api/teams", json=team_payload(
            "E2E Check Alpha", "e2e-alpha@test.local", "E2EALPHA01", "ai-ml"))
        check("create fresh team A", ra.status_code == 201,
              ra.json().get("team_id", "") if ra.status_code == 201 else ra.text[:100])
        team_a_id = ra.json()["id"] if ra.status_code == 201 else None

        rb = client.post("/api/teams", json=team_payload(
            "E2E Check Beta", "e2e-beta@test.local", "E2EBETA001", "web"))
        check("create fresh team B", rb.status_code == 201,
              rb.json().get("team_id", "") if rb.status_code == 201 else rb.text[:100])

        # 3. Provisioned leader portal sign-in.
        rl = client.post("/api/auth/login",
                         json={"email": "e2e-alpha@test.local", "password": "Demo@1234"})
        check("provisioned leader can sign in", rl.status_code == 200)
        leader = {"Authorization": f"Bearer {rl.json()['access_token']}"} if rl.status_code == 200 else {}

        # 4. Portal returns exactly its own team.
        rm = client.get("/api/teams/mine", headers=leader)
        check("GET /teams/mine returns team A",
              rm.status_code == 200 and rm.json().get("team_id") == ra.json().get("team_id"),
              str(rm.json())[:80])

        # 5. Duplicate registration rejected.
        rd = client.post("/api/teams", json=team_payload(
            "E2E Check Alpha", "e2e-alpha@test.local", "E2EALPHA01", "ai-ml"))
        check("duplicate team rejected (409)", rd.status_code == 409, f"HTTP {rd.status_code}")

        # 6. Project submission upsert + read-back.
        rs = client.put(f"/api/teams/{team_a_id}/submission", headers=leader, json={
            "project_name": "E2E Smoke Project",
            "description": "Automated end-to-end verification submission.",
            "repo_url": "https://github.com/example/e2e-smoke",
            "demo_url": "",
        })
        check("submission saved", rs.status_code == 200, f"HTTP {rs.status_code}")

        rg = client.get(f"/api/teams/{team_a_id}/submission", headers=leader)
        check("submission readable", rg.status_code == 200
              and (rg.json().get("submission") or {}).get("project_name") == "E2E Smoke Project")

        # 7. RBAC sanity: anonymous access to admin feeds denied.
        check("admin feed blocked anonymously (401)",
              client.get("/api/registration").status_code == 401)
        check("stats blocked anonymously (401)",
              client.get("/api/stats/overview").status_code == 401)
    finally:
        # Surgical cleanup of everything this check created.
        db = SessionLocal()
        try:
            counts = {}
            counts["submissions"] = db.execute(text(
                "DELETE FROM submissions WHERE registration_id IN "
                "(SELECT id FROM teams WHERE team_name LIKE 'E2E Check%')"
            )).rowcount
            counts["email_messages"] = db.execute(text(
                "DELETE FROM email_messages WHERE to_email LIKE 'e2e-%@test.local'"
            )).rowcount
            counts["teams"] = db.execute(text(
                "DELETE FROM teams WHERE team_name LIKE 'E2E Check%'"
            )).rowcount
            counts["users"] = db.execute(text(
                "DELETE FROM users WHERE email LIKE '%@test.local'"
            )).rowcount
            db.commit()
            print("\nCleanup:", ", ".join(f"{v} {k}" for k, v in counts.items()))

            if not original_open and admin_token:
                client.patch("/api/settings", json={"registration_open": False},
                             headers={"Authorization": f"Bearer {admin_token}"})
                print("Registration gate restored to closed.")
        finally:
            db.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    ADMIN_EMAIL = sys.argv[1]
    ADMIN_PASSWORD = sys.argv[2]
    sys.exit(main())
