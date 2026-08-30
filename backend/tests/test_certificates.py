"""Certificate automation: upload, portal availability (no auto-email), manual send-all, RBAC."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import DEMO_PASSWORD
from app.database.base import SessionLocal
from app.main import app
from app.models.certificate import Certificate
from app.models.email_message import EmailMessage

client = TestClient(app)

PASSWORD = "supersecret1"

PDF_BYTES = b"%PDF-1.4\n%fake-certificate-for-tests\n"


def _unique(local: str) -> str:
    return f"{local}.{uuid.uuid4().hex[:8]}@college.edu"


def _make_admin() -> dict:
    from app.schemas.user import UserCreate
    from app.services.user import create_user

    email_addr = _unique("cert-admin")
    db = SessionLocal()
    try:
        create_user(
            db,
            UserCreate(email=email_addr, full_name="Cert Admin", password=PASSWORD),
            role="admin",
        )
    finally:
        db.close()
    login = client.post("/api/auth/login", json={"email": email_addr, "password": PASSWORD})
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _upload_certificate(admin: dict) -> dict:
    response = client.post(
        "/api/certificates/upload",
        params={"filename": "award.pdf"},
        content=PDF_BYTES,
        headers={**admin, "Content-Type": "application/pdf"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _create_team(prefix: str) -> dict:
    tag = uuid.uuid4().hex[:8].upper()
    payload = {
        "team_name": f"{prefix} {tag}",
        "theme": "web",
        "leader_name": "Cert Leader",
        "leader_email": _unique(f"{prefix.lower()}-lead"),
        "leader_phone": "+91 90000 00000",
        "leader_register_number": f"CT{tag}",
        "leader_department": "CSE",
        "leader_year": "3rd Year",
        "members": [
            {
                "name": "Member One",
                "email": _unique("c1"),
                "register_number": f"C1{tag}",
                "department": "CSE",
                "year": "3rd Year",
            },
            {
                "name": "Member Two",
                "email": _unique("c2"),
                "register_number": f"C2{tag}",
                "department": "AI & DS",
                "year": "2nd Year",
            },
        ],
    }
    response = client.post("/api/teams", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _approve(admin: dict, team_id: str) -> None:
    response = client.patch(
        f"/api/teams/{team_id}/status", json={"status": "approved"}, headers=admin
    )
    assert response.status_code == 200, response.text


def _award_mails(to_email: str) -> list[EmailMessage]:
    db = SessionLocal()
    try:
        return list(
            db.scalars(
                select(EmailMessage)
                .where(EmailMessage.template == "certificate_award")
                .where(EmailMessage.to_email == to_email)
                .order_by(EmailMessage.created_at)
            )
        )
    finally:
        db.close()


def test_certificate_endpoints_require_admin() -> None:
    anonymous = client.post(
        "/api/certificates/upload?filename=x.pdf",
        content=PDF_BYTES,
        headers={"Content-Type": "application/pdf"},
    )
    assert anonymous.status_code == 401

    leader = client.post(
        "/api/auth/register",
        json={"email": _unique("cert-leader"), "full_name": "Cert Leader", "password": PASSWORD},
    )
    assert leader.status_code == 201, leader.text
    leader_headers = {"Authorization": f"Bearer {leader.json()['access_token']}"}
    assert (
        client.post(
            "/api/certificates/upload?filename=x.pdf",
            content=PDF_BYTES,
            headers={**leader_headers, "Content-Type": "application/pdf"},
        ).status_code
        == 403
    )
    assert client.get("/api/certificates/current").status_code == 401


def test_upload_validation_and_roundtrip() -> None:
    admin = _make_admin()

    # Unsupported media type.
    bad_type = client.post(
        "/api/certificates/upload?filename=x.txt",
        content=b"plain text",
        headers={**admin, "Content-Type": "text/plain"},
    )
    assert bad_type.status_code == 415

    # Empty body.
    empty = client.post(
        "/api/certificates/upload?filename=x.pdf",
        content=b"",
        headers={**admin, "Content-Type": "application/pdf"},
    )
    assert empty.status_code == 400

    meta = _upload_certificate(admin)
    assert meta["filename"] == "award.pdf"
    assert meta["content_type"] == "application/pdf"
    assert meta["size_bytes"] == len(PDF_BYTES)

    current = client.get("/api/certificates/current", headers=admin)
    assert current.status_code == 200
    assert current.json()["id"] == meta["id"]

    download = client.get(f"/api/certificates/{meta['id']}/download", headers=admin)
    assert download.status_code == 200
    assert download.content == PDF_BYTES
    assert "attachment" in download.headers["Content-Disposition"]


def test_upload_replaces_active_certificate() -> None:
    admin = _make_admin()
    first = _upload_certificate(admin)
    second = _upload_certificate(admin)

    current = client.get("/api/certificates/current", headers=admin).json()
    assert current["id"] == second["id"]

    db = SessionLocal()
    try:
        old = db.get(Certificate, first["id"])
        new = db.get(Certificate, second["id"])
        assert old is not None and old.active is False
        assert new is not None and new.active is True
    finally:
        db.close()


def test_approval_makes_certificate_available_but_does_not_email() -> None:
    """Approval unlocks portal availability but never queues a certificate email."""
    admin = _make_admin()
    cert = _upload_certificate(admin)
    team = _create_team("CertSquad")

    recipients = [team["leader_email"]] + [m["email"] for m in team["members"]]
    assert all(len(_award_mails(addr)) == 0 for addr in recipients)

    _approve(admin, team["id"])

    # Approval unlocks the certificate in the leader's portal…
    leader = _leader_headers(team["leader_email"])
    mine = client.get("/api/certificates/mine", headers=leader)
    assert mine.status_code == 200, mine.text
    payload = mine.json()
    assert payload["available"] is True
    assert payload["reason"] is None
    assert payload["certificate"]["id"] == cert["id"]

    download = client.get("/api/certificates/mine/download", headers=leader)
    assert download.status_code == 200
    assert download.content == PDF_BYTES

    # …but queues NO certificate email (email is admin-triggered only).
    for address in recipients:
        assert len(_award_mails(address)) == 0, f"{address} got an email on approval"

    # Re-approving (status unchanged) still sends nothing.
    _approve(admin, team["id"])
    for address in recipients:
        assert len(_award_mails(address)) == 0


def test_approval_sends_no_certificate_email() -> None:
    admin = _make_admin()

    # Approval never triggers a certificate email, regardless of whether
    # a certificate design is currently active.
    assert client.delete("/api/certificates/current", headers=admin).status_code == 204

    team = _create_team("NoCertSquad")
    _approve(admin, team["id"])

    recipients = [team["leader_email"]] + [m["email"] for m in team["members"]]
    assert all(len(_award_mails(addr)) == 0 for addr in recipients)


def test_bulk_approval_does_not_email_certificate() -> None:
    """Bulk approval mirrors single approval: portal unlock, no emails."""
    admin = _make_admin()
    _upload_certificate(admin)
    early = _create_team("BulkNoMailA")
    late = _create_team("BulkNoMailB")

    resp = client.patch(
        "/api/teams/bulk-status",
        json={"team_ids": [early["id"], late["id"]], "status": "approved"},
        headers=admin,
    )
    assert resp.status_code == 200, resp.text

    for team in (early, late):
        for address in [team["leader_email"], *[m["email"] for m in team["members"]]]:
            assert len(_award_mails(address)) == 0, f"{address} emailed on bulk approval"
        # Portal availability is unlocked even though no email was sent.
        leader = _leader_headers(team["leader_email"])
        mine = client.get("/api/certificates/mine", headers=leader)
        assert mine.status_code == 200, mine.text
        assert mine.json()["available"] is True


def test_send_all_covers_approved_teams_without_duplicates() -> None:
    admin = _make_admin()

    # Approve two teams BEFORE any certificate exists.
    early = _create_team("EarlyBirds")
    late = _create_team("LateBirds")
    _approve(admin, early["id"])
    _approve(admin, late["id"])

    cert = _upload_certificate(admin)

    # Bulk send reaches both teams' participants exactly once.
    sent = client.post("/api/certificates/send-all", headers=admin)
    assert sent.status_code == 200, sent.text
    body = sent.json()
    assert body["certificate_id"] == cert["id"]
    assert body["teams_processed"] >= 2
    assert body["recipients_planned"] >= 6  # 2 teams x (leader + 2 members)
    assert body["already_sent"] == 0
    assert body["emails_queued"] >= 6
    assert body["failed"] == 0

    for team in (early, late):
        for address in [team["leader_email"], *[m["email"] for m in team["members"]]]:
            mails = _award_mails(address)
            assert len(mails) == 1
            assert mails[0].certificate_id == cert["id"]

    # Calling it again is a no-op — everyone already has their mail.
    again = client.post("/api/certificates/send-all", headers=admin)
    assert again.status_code == 200
    assert again.json()["already_sent"] >= 6
    assert again.json()["emails_queued"] == 0
    for team in (early, late):
        for address in [team["leader_email"], *[m["email"] for m in team["members"]]]:
            assert len(_award_mails(address)) == 1


def test_send_all_requires_admin() -> None:
    assert client.post("/api/certificates/send-all").status_code == 401


def test_resend_failed_certificates_retries_once() -> None:
    """Failed award mails stay failed until the admin retries them."""
    admin = _make_admin()
    cert = _upload_certificate(admin)
    team = _create_team("RetrySquad")
    _approve(admin, team["id"])

    # Deliver the certificate mail (log mode), then flip one row to "failed"
    # to simulate a real transport failure.
    client.post("/api/certificates/send-all", headers=admin)

    db = SessionLocal()
    try:
        mails = list(
            db.scalars(
                select(EmailMessage)
                .where(EmailMessage.template == "certificate_award")
                .where(EmailMessage.certificate_id == cert["id"])
            )
        )
        assert mails, "send-all should have queued award mails"
        target = mails[0]
        target.status = "failed"
        target.error = "simulated transport failure"
        db.commit()
    finally:
        db.close()

    retried = client.post("/api/certificates/resend-failed", headers=admin)
    assert retried.status_code == 200, retried.text
    body = retried.json()
    assert body["certificate_id"] == cert["id"]
    assert body["retried"] == 1
    assert body["still_failed"] == []
    assert body["now_delivered"] == 1

    # A second retry has nothing left to do.
    again = client.post("/api/certificates/resend-failed", headers=admin)
    assert again.status_code == 200
    assert again.json()["retried"] == 0


def test_leader_can_login_with_provisioned_password() -> None:
    """Sanity: the flow leaders actually experience end-to-end."""
    team = _create_team("LoginCheck")
    login = client.post(
        "/api/auth/login",
        json={"email": team["leader_email"], "password": DEMO_PASSWORD},
    )
    assert login.status_code == 200


# ---------------------------------------------------------------------------
# Leader-facing certificate access (/certificates/mine)
# ---------------------------------------------------------------------------


def _leader_headers(team_email: str) -> dict:
    login = client.post(
        "/api/auth/login", json={"email": team_email, "password": DEMO_PASSWORD}
    )
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_my_certificate_requires_authentication() -> None:
    assert client.get("/api/certificates/mine").status_code == 401
    assert client.get("/api/certificates/mine/download").status_code == 401


def test_my_certificate_returns_404_without_team() -> None:
    """An authenticated account that owns no team gets a clear 404."""
    admin = _make_admin()
    response = client.get("/api/certificates/mine", headers=admin)
    assert response.status_code == 404
    assert "No team found" in response.json()["detail"]


def test_leader_can_download_certificate_after_approval() -> None:
    admin = _make_admin()
    cert = _upload_certificate(admin)
    team = _create_team("CertLeaders")
    leader = _leader_headers(team["leader_email"])

    # Pending team: visible but not downloadable yet.
    mine = client.get("/api/certificates/mine", headers=leader)
    assert mine.status_code == 200, mine.text
    payload = mine.json()
    assert payload["team"]["team_id"] == team["team_id"]
    assert payload["available"] is False
    assert payload["reason"] == "team_not_approved"
    assert payload["certificate"]["id"] == cert["id"]
    assert payload["preview_html"] is None

    blocked = client.get("/api/certificates/mine/download", headers=leader)
    assert blocked.status_code == 403
    assert "not been approved" in blocked.json()["detail"]

    # After approval: entitlement unlocks with personalized view + file bytes.
    _approve(admin, team["id"])

    mine = client.get("/api/certificates/mine", headers=leader)
    assert mine.status_code == 200
    payload = mine.json()
    assert payload["available"] is True
    assert payload["reason"] is None
    assert payload["download_filename"].startswith(f"{team['team_id']}-certificate")
    assert team["team_id"] in payload["preview_html"]
    assert team["leader_name"] in payload["preview_html"]

    download = client.get("/api/certificates/mine/download", headers=leader)
    assert download.status_code == 200
    assert download.content == PDF_BYTES
    assert download.headers["content-type"] == "application/pdf"
    assert f"{team['team_id']}-certificate.pdf" in download.headers[
        "content-disposition"
    ]


def test_leader_download_404_when_no_active_certificate() -> None:
    admin = _make_admin()
    team = _create_team("LateCert")
    _approve(admin, team["id"])
    assert client.delete("/api/certificates/current", headers=admin).status_code == 204

    leader = _leader_headers(team["leader_email"])
    mine = client.get("/api/certificates/mine", headers=leader)
    assert mine.status_code == 200
    payload = mine.json()
    assert payload["available"] is False
    assert payload["reason"] == "no_active_certificate"

    download = client.get("/api/certificates/mine/download", headers=leader)
    assert download.status_code == 404
    assert "No certificate is available" in download.json()["detail"]


# ---------------------------------------------------------------------------
# Reporting endpoints (regression: _metrics aggregation must never be None —
# a truncated merge once left these three endpoints returning HTTP 500).
# ---------------------------------------------------------------------------


def test_reporting_endpoints_require_admin() -> None:
    assert client.get("/api/certificates/delivery-summary").status_code == 401
    assert client.get("/api/certificates/history").status_code == 401
    assert client.get("/api/certificates/teams").status_code == 401
    assert client.get("/api/certificates/email-status").status_code == 401


def test_delivery_summary_tracks_coverage() -> None:
    admin = _make_admin()
    cert = _upload_certificate(admin)
    team = _create_team("CertCoverage")
    _approve(admin, team["id"])

    # Delivery metrics reflect EMAIL dispatch, not portal availability -
    # so push send-all first, then assert the coverage report picks it up.
    client.post("/api/certificates/send-all", headers=admin)

    response = client.get("/api/certificates/delivery-summary", headers=admin)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["certificate_id"] == cert["id"]
    # The suite shares a database, so other approved teams add recipients.
    assert payload["planned_recipients"] >= 3
    assert payload["delivered_recipients"] >= 3
    assert payload["delivered_percent"] > 0
    assert payload["logged"] >= 3
    assert payload["failed"] == 0


def test_certificate_history_reports_metrics() -> None:
    admin = _make_admin()
    cert = _upload_certificate(admin)
    team = _create_team("CertHistory")
    _approve(admin, team["id"])

    # History mail counters track EMAIL outbox state, so dispatch once first.
    client.post("/api/certificates/send-all", headers=admin)

    response = client.get("/api/certificates/history", headers=admin)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] >= 1
    match = [item for item in body["items"] if item["id"] == cert["id"]]
    assert match, "uploaded certificate missing from history"
    item = match[0]
    assert item["active"] is True
    # Leader + 2 members, exactly one "logged" mail each for this certificate.
    assert item["mail_logged"] >= 3
    assert item["mail_sent"] == 0
    assert item["recipients_sent"] >= 3
    assert item["recipients_failed"] == 0


def test_teams_endpoint_reports_per_recipient_status() -> None:
    admin = _make_admin()
    _upload_certificate(admin)
    team = _create_team("CertTeamsStatus")
    _approve(admin, team["id"])

    # Per-recipient status reflects EMAIL dispatch, not just approval.
    client.post("/api/certificates/send-all", headers=admin)

    response = client.get("/api/certificates/teams", headers=admin)
    assert response.status_code == 200, response.text
    payload = response.json()
    match = [t for t in payload["teams"] if t["team_id"] == team["team_id"]]
    assert match, "approved team missing from /certificates/teams"
    entry = match[0]
    assert entry["recipient_total"] == 3
    assert entry["delivered"] == 3
    assert all(r["status"] in ("sent", "logged") for r in entry["recipients"])


def test_email_status_reflects_log_mode_and_active_cert() -> None:
    admin = _make_admin()

    # The suite forces every transport off -> log mode.
    assert client.delete("/api/certificates/current", headers=admin).status_code == 204
    status = client.get("/api/certificates/email-status", headers=admin).json()
    assert status["email"]["mode"] == "log"
    assert status["email"]["transport"] is None
    assert status["certificate_active"] is False

    _upload_certificate(admin)
    status = client.get("/api/certificates/email-status", headers=admin).json()
    assert status["certificate_active"] is True
