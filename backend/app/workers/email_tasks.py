"""Background email tasks.

Thin, side-effect-free wrappers around :mod:`app.services.email` designed to
run via FastAPI ``BackgroundTasks`` (after the response is sent). Each task
opens its own DB session and never raises — a mail outage must not fail an
API call that already succeeded.

Swapping in Celery later only requires re-registering these functions as
Celery tasks; their bodies are broker-agnostic by design.
"""

from __future__ import annotations

from typing import Any

from app.database.base import SessionLocal
from app.services import email


def _registration_context(registration) -> dict[str, Any]:
    return {
        "team_name": registration.team_name,
        "leader_name": registration.representative_name,
        "track": registration.track,
        "member_count": len(registration.members or []),
    }


def task_send_registration_confirmation(registration_id: str) -> None:
    """Welcome email right after a team registers."""
    from app.models.registration import Registration

    db = SessionLocal()
    try:
        registration = db.get(Registration, registration_id)
        if registration is None:
            return
        email.send_notification(
            template="registration_confirmation",
            to_email=registration.representative_email,
            context=_registration_context(registration),
            registration_id=registration.id,
        )
    except Exception:  # pragma: no cover - background tasks must not raise
        pass
    finally:
        db.close()


def task_send_registration_decision(registration_id: str, new_status: str) -> None:
    """Notify the leader when an admin applies a review decision."""
    from app.models.registration import Registration

    db = SessionLocal()
    try:
        registration = db.get(Registration, registration_id)
        if registration is None:
            return
        context = _registration_context(registration)
        context["status"] = new_status
        email.send_notification(
            template="registration_decision",
            to_email=registration.representative_email,
            context=context,
            registration_id=registration.id,
        )
    except Exception:  # pragma: no cover - background tasks must not raise
        pass
    finally:
        db.close()


def task_send_submission_received(registration_id: str, project_name: str, repo_url: str, demo_url: str | None) -> None:
    """Confirm the first submission of a project.

    ``registration_id`` carries the TechAFlon team UUID (submissions are
    keyed 1:1 with the teams table since the rewrite).
    """
    from app.models.team import Team

    db = SessionLocal()
    try:
        team = db.get(Team, registration_id)
        if team is None:
            return
        context = {
            "team_id": team.team_id,
            "team_name": team.team_name,
            "leader_name": team.leader_name,
            "theme": team.theme,
            "member_count": len(team.members or []) + 1,
            "project_name": project_name,
            "repo_url": repo_url,
            "demo_url": demo_url,
        }
        email.send_notification(
            template="submission_received",
            to_email=team.leader_email,
            context=context,
        )
    except Exception:  # pragma: no cover
        pass
    finally:
        db.close()


def task_send_team_confirmation(team_id: str) -> None:
    """Welcome email after a team registers for TechAFlon."""
    from app.models.team import Team

    db = SessionLocal()
    try:
        team = db.get(Team, team_id)
        if team is None:
            return
        context = {
            "team_id": team.team_id,
            "team_name": team.team_name,
            "leader_name": team.leader_name,
            "department": team.leader_department,
            "year": team.leader_year,
            "theme": team.theme,
            "members": team.members or [],
            "member_count": len(team.members or []) + 1,
        }
        # NOTE: no registration_id here — the row references the legacy
        # `registrations` table; team context lives in subject/body.
        email.send_notification(
            template="team_registration_confirmation",
            to_email=team.leader_email,
            context=context,
        )
    except Exception:  # pragma: no cover - background tasks must not raise
        pass
    finally:
        db.close()


def task_send_team_status_update(team_id: str, new_status: str) -> None:
    """Notify the leader when an admin updates team status."""
    from app.models.team import Team

    db = SessionLocal()
    try:
        team = db.get(Team, team_id)
        if team is None:
            return
        context = {
            "team_id": team.team_id,
            "team_name": team.team_name,
            "leader_name": team.leader_name,
            "status": new_status,
        }
        email.send_notification(
            template="team_status_update",
            to_email=team.leader_email,
            context=context,
        )
    except Exception:  # pragma: no cover - background tasks must not raise
        pass
    finally:
        db.close()


def task_send_team_certificates(team_id: str, certificate_id: str) -> None:
    """Email the participation certificate to every member of a team.

    Fired automatically when an admin approves a team (with an active
    certificate uploaded) and by the admin bulk-send endpoint. Each
    recipient is checked against the outbox first so nobody is mailed
    twice for the same certificate.
    """
    from app.models.certificate import Certificate
    from app.models.team import Team

    db = SessionLocal()
    try:
        team = db.get(Team, team_id)
        certificate = db.get(Certificate, certificate_id)
        if team is None or certificate is None:
            return

        recipients: list[tuple[str, str]] = [(team.leader_email, team.leader_name)]
        seen = {team.leader_email.strip().lower()}
        for member in team.members or []:
            if not isinstance(member, dict):
                continue
            address = str(member.get("email", "")).strip().lower()
            if address and address not in seen:
                seen.add(address)
                recipients.append((str(member.get("email")), str(member.get("name", ""))))

        for to_email, name in recipients:
            try:
                if email.certificate_already_sent(db, certificate_id, to_email):
                    continue
                email.send_notification(
                    template="certificate_award",
                    to_email=to_email,
                    context={
                        "name": name or "Participant",
                        "team_name": team.team_name,
                        "team_id": team.team_id,
                        "filename": certificate.filename,
                    },
                    certificate_id=certificate_id,
                )
            except Exception:  # pragma: no cover - one bad row must not stop the rest
                continue
    except Exception:  # pragma: no cover - background tasks must not raise
        pass
    finally:
        db.close()
