"""Transactional email outbox — render, persist, then deliver.

Every notification follows the same safe path:

1. :func:`queue_email` renders a template and inserts an ``email_messages``
   row (status ``queued``) in the *request's* session, so content is durable
   even if delivery later fails.
2. :func:`dispatch_message` (usually inside a background task) attempts
   Gmail delivery with its *own* session and records the outcome —
   ``sent``, ``logged`` (no credentials), or ``failed`` + reason.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from fastapi import HTTPException, status
from sqlalchemy import select

from app.core import gmail, smtp
from app.core.config import settings
from app.database.base import SessionLocal
from app.models.certificate import Certificate
from app.models.email_message import EmailMessage

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session

# ---------------------------------------------------------------------------
# Templates (plain text; keys are stable identifiers stored on each row)
# ---------------------------------------------------------------------------

EVENT_NAME = "TechAFlon"

_THEME_DISPLAY = {"ai-ml": "AI / ML", "web": "Web Development", "app": "App Development"}


def _render_registration_confirmation(context: dict[str, Any]) -> tuple[str, str]:
    team = context["team_name"]
    subject = f"[{EVENT_NAME}] Registration received — {team}"
    body = (
        f"Hi {context['leader_name']},\n\n"
        f"Your team \"{team}\" is registered for {EVENT_NAME}.\n\n"
        f"Track: {context['track']}\n"
        f"Members: {context['member_count']}\n\n"
        "What happens next?\n"
        "1. Our organizers review every registration by hand.\n"
        "2. You'll receive one more email as soon as a decision is made.\n"
        "3. Meanwhile, pick a problem statement and start sketching ideas!\n\n"
        f"— The {EVENT_NAME} Organizing Committee\n"
    )
    return subject, body


def _render_registration_decision(context: dict[str, Any]) -> tuple[str, str]:
    verdict = context["status"].capitalize()
    headlines = {
        "approved": (
            "You're in! 🎉",
            "Your registration has been approved. Pack your laptop and charger — "
            "see you at the venue. Check-in opens 30 minutes before kickoff.",
        ),
        "waitlisted": (
            "You're on the waitlist",
            "The event is full right now. If a slot opens up you'll get another "
            "email from us automatically — keep an eye on your inbox!",
        ),
        "rejected": (
            "Registration declined",
            "Unfortunately we couldn't offer your team a spot this time "
            "(capacity or eligibility). We'd love to see you next semester!",
        ),
        "pending": ("Review pending", "Your registration is back under review."),
    }
    headline, detail = headlines.get(
        context["status"], (f"Status update: {verdict}", "Your registration status changed.")
    )
    subject = f"[{EVENT_NAME}] {headline} — {context['team_name']}"
    body = (
        f"Hi {context['leader_name']},\n\n"
        f"Update for team \"{context['team_name']}\":\n\n"
        f"  Status: {verdict.upper()}\n\n"
        f"{detail}\n\n"
        f"— The {EVENT_NAME} Organizing Committee\n"
    )
    return subject, body


def _render_submission_received(context: dict[str, Any]) -> tuple[str, str]:
    subject = f"[{EVENT_NAME}] Submission received — {context['project_name']}"
    body = (
        f"Hi {context['leader_name']},\n\n"
        f"We've locked in your project \"{context['project_name']}\" "
        f"for team \"{context['team_name']}\".\n\n"
        f"Repo: {context['repo_url']}\n"
        + (f"Demo: {context['demo_url']}\n" if context.get("demo_url") else "")
        + "\nYou can still refine it from the portal until submissions close.\n\n"
        f"Good luck!\n— The {EVENT_NAME} Organizing Committee\n"
    )
    return subject, body


def _render_team_registration_confirmation(context: dict[str, Any]) -> tuple[str, str]:
    """Full TechAFlon team registration receipt (sent to the leader)."""
    members = context.get("members") or []
    member_lines = "\n".join(
        f"  {i}. {m.get('name', '')} — {m.get('register_number', '')} — {m.get('email', '')}"
        f" ({m.get('department', '')}, {m.get('year', '')})"
        for i, m in enumerate(members, start=2)  # leader is member 1
    )
    theme = _THEME_DISPLAY.get(str(context.get("theme", "")), context.get("theme", ""))
    subject = f"[{EVENT_NAME}] Team registered — {context['team_name']} ({context.get('team_id', '')})"
    body = (
        f"Hi {context['leader_name']},\n\n"
        f"Your TechAFlon team has been successfully registered.\n\n"
        f"TEAM ID: {context.get('team_id', '—')}\n"
        f"Team Name: {context['team_name']}\n"
        f"Team Leader: {context['leader_name']}\n"
        f"Department: {context.get('department', '—')}\n"
        f"Year: {context.get('year', '—')}\n"
        f"Theme: {theme}\n\n"
        "Registered Members:\n"
        f"  1. {context['leader_name']} (TEAM LEADER)\n"
        + (member_lines + "\n" if member_lines else "")
        + "\nWhat happens next?\n"
        "1. Our organizers review every registration by hand.\n"
        "2. Keep this TEAM ID handy — you'll need it at check-in.\n\n"
        f"— The {EVENT_NAME} Organizing Committee (CSSA)\n"
    )
    return subject, body


def _render_team_status_update(context: dict[str, Any]) -> tuple[str, str]:
    status_value = str(context.get("status", ""))
    verdict = status_value.capitalize()
    headlines = {
        "approved": (
            "You're in! 🎉",
            "Your team has been approved. Pack your laptop and charger — "
            "see you at the venue. Check-in opens 30 minutes before kickoff.",
        ),
        "rejected": (
            "Registration declined",
            "Unfortunately we couldn't offer your team a spot this time "
            "(capacity or eligibility). We'd love to see you next semester!",
        ),
        "disqualified": (
            "Team disqualified",
            "Your team has been disqualified from the event. Contact the "
            "organizers if you believe this is a mistake.",
        ),
        "pending": ("Review pending", "Your team is back under review."),
    }
    headline, detail = headlines.get(
        status_value,
        (f"Status update: {verdict}", "Your team's status changed."),
    )
    subject = f"[{EVENT_NAME}] {headline} — {context['team_name']} ({context.get('team_id', '')})"
    body = (
        f"Hi {context['leader_name']},\n\n"
        f"Update for team \"{context['team_name']}\" (TEAM ID: "
        f"{context.get('team_id', '—')}):\n\n"
        f"  Status: {verdict.upper()}\n\n"
        f"{detail}\n\n"
        f"— The {EVENT_NAME} Organizing Committee (CSSA)\n"
    )
    return subject, body


TEMPLATES = {
    "registration_confirmation": _render_registration_confirmation,
    "registration_decision": _render_registration_decision,
    "submission_received": _render_submission_received,
    "team_registration_confirmation": _render_team_registration_confirmation,
    "team_status_update": _render_team_status_update,
}


def _render_certificate_award(context: dict[str, Any]) -> tuple[str, str]:
    """Congratulations note carrying the participation certificate."""
    subject = f"[{EVENT_NAME}] Your certificate is here! 🎓 — {context['team_name']}"
    body = (
        f"Hi {context['name']},\n\n"
        f"Congratulations! Your team \"{context['team_name']}\" "
        f"(TEAM ID: {context.get('team_id', '—')}) completed {EVENT_NAME}.\n\n"
        "Your participation certificate is attached to this email as "
        f"\"{context.get('filename', 'certificate')}\".\n\n"
        "Thank you for building with us — see you at the next edition!\n\n"
        f"— The {EVENT_NAME} Organizing Committee (CSSA)\n"
    )
    return subject, body


TEMPLATES["certificate_award"] = _render_certificate_award

# ---------------------------------------------------------------------------
# Delivery transports
# ---------------------------------------------------------------------------


def _deliver(
    to_email: str,
    subject: str,
    body: str,
    attachment: tuple[str, str, bytes] | None = None,
) -> str:
    """Send one message via the first configured transport.

    ``attachment`` is ``(filename, content_type, data)`` when present.
    Returns the resulting outbox status (``sent`` or ``logged``).
    Raises ``RuntimeError`` on delivery failure.
    """
    if gmail.gmail_configured():
        gmail.send_email(to_email, subject, body, attachment=attachment)
        return "sent"
    if smtp.smtp_configured():
        smtp.send_email(to_email, subject, body, attachment=attachment)
        return "sent"
    # Log mode: no transport configured (dev/test).
    return "logged"


# ---------------------------------------------------------------------------
# Outbox operations
# ---------------------------------------------------------------------------


def _attachment_for(db: "Session", message: EmailMessage) -> tuple[str, str, bytes] | None:
    """Resolve the certificate binary referenced by an outbox row."""
    if not message.certificate_id:
        return None
    certificate = db.get(Certificate, message.certificate_id)
    if certificate is None:
        raise RuntimeError("Certificate file is no longer available.")
    return (certificate.filename, certificate.content_type, certificate.data)


def queue_email(
    db: "Session",
    *,
    template: str,
    to_email: str,
    context: dict[str, Any],
    registration_id: str | None = None,
    certificate_id: str | None = None,
) -> EmailMessage:
    """Render ``template`` and persist it as a queued outbox row."""
    renderer = TEMPLATES.get(template)
    if renderer is None:
        raise ValueError(f"Unknown email template '{template}'.")
    subject, body = renderer(context)

    message = EmailMessage(
        template=template,
        to_email=to_email,
        subject=subject[:500],
        body=body,
        registration_id=registration_id,
        certificate_id=certificate_id,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def dispatch_message(message_id: str) -> EmailMessage | None:
    """Attempt delivery of one queued message using its own DB session.

    Safe to call from background tasks: never raises, all failures are
    recorded on the row.
    """
    db = SessionLocal()
    try:
        message = db.get(EmailMessage, message_id)
        if message is None:
            return None

        if not settings.EMAIL_ENABLED:
            message.status, message.error = "failed", "EMAIL_ENABLED is false."
        else:
            try:
                attachment = _attachment_for(db, message)
                message.status = _deliver(
                    message.to_email, message.subject, message.body, attachment
                )
                message.error = None
            except RuntimeError as exc:
                message.status, message.error = "failed", str(exc)

        if message.status != "queued":
            message.sent_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        db.refresh(message)
        return message
    finally:
        db.close()


def send_notification(
    *,
    template: str,
    to_email: str,
    context: dict[str, Any],
    registration_id: str | None = None,
    certificate_id: str | None = None,
) -> None:
    """Queue + dispatch in one step (for background workers).

    Opens its own session so it never touches the request lifecycle.
    Never raises — delivery problems are persisted, not propagated.
    """
    db = SessionLocal()
    try:
        message = queue_email(
            db,
            template=template,
            to_email=to_email,
            context=context,
            registration_id=registration_id,
            certificate_id=certificate_id,
        )
    except Exception:  # pragma: no cover - defensive: bad context etc.
        db.close()
        raise
    message_id = message.id
    db.close()
    dispatch_message(message_id)


def certificate_already_sent(db: "Session", certificate_id: str, to_email: str) -> bool:
    """True when this recipient already has a delivered/logged award mail.

    Keeps bulk sends and re-approvals idempotent — nobody receives the same
    certificate twice.
    """
    existing = db.scalar(
        select(EmailMessage.id).where(
            EmailMessage.template == "certificate_award",
            EmailMessage.certificate_id == certificate_id,
            EmailMessage.to_email == to_email,
            EmailMessage.status.in_(("sent", "logged")),
        )
    )
    return existing is not None


def resend_message(db: "Session", message_id: str) -> EmailMessage:
    """Admin retry: re-deliver any message immediately (inline, request session)."""
    message = get_message(db, message_id)

    try:
        if not settings.EMAIL_ENABLED:
            message.status, message.error = "failed", "EMAIL_ENABLED is false."
        else:
            attachment = _attachment_for(db, message)
            message.status = _deliver(
                message.to_email, message.subject, message.body, attachment
            )
            message.error = None
    except RuntimeError as exc:
        message.status, message.error = "failed", str(exc)

    message.sent_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(message)
    return message


def list_messages(
    db: "Session", *, limit: int = 50, status_filter: str | None = None
) -> list[EmailMessage]:
    """Newest-first outbox log, optionally filtered by status."""
    query = select(EmailMessage).order_by(EmailMessage.created_at.desc())
    if status_filter:
        query = query.where(EmailMessage.status == status_filter)
    return list(db.scalars(query.limit(limit)))


def get_message(db: "Session", message_id: str) -> EmailMessage:
    message = db.get(EmailMessage, message_id)
    if message is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Email not found.")
    return message
