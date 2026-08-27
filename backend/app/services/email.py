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

import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from fastapi import HTTPException, status
from sqlalchemy import func, select

from app.core import brevo, gmail, mailjet, smtp
from app.core.config import settings
from app.database.base import SessionLocal
from app.models.certificate import Certificate
from app.models.email_message import EmailMessage

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Templates (plain text; keys are stable identifiers stored on each row)
# ---------------------------------------------------------------------------

EVENT_NAME = "TechAFlon"

_THEME_DISPLAY = {"ai-ml": "AI / ML", "web": "Web Development"}


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
# HTML rendering — "Avengers: Doomsday" dark theme (inline styles only so
# Gmail/Outlook/Brevo render them without stripping embedded CSS).
# ---------------------------------------------------------------------------

_BG_PAGE = "#05070d"      # near-black with a blue undertone
_BG_CARD = "#0c1220"      # panel
_BORDER = "rgba(245,197,24,#35)"
_GOLD = "#f5c518"
_MUTED = "#8b93a7"
_TEXT = "#e6e9f2"


def _pill(label: str, color: str) -> str:
    return (
        f'<span style="display:inline-block;padding:6px 18px;border-radius:999px;'
        f'background:{color}22;border:1px solid {color};color:{color};'
        f'font-size:12px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">'
        f"{label}</span>"
    )


def _kv_row(label: str, value: str) -> str:
    value = value or "—"
    return (
        '<tr>'
        f'<td style="padding:9px 14px;color:{_MUTED};font-size:13px;'
        f'white-space:nowrap;border-bottom:1px solid rgba(139,147,167,0.15);">{label}</td>'
        f'<td style="padding:9px 14px;color:{_TEXT};font-size:13px;font-weight:600;'
        f'text-align:right;border-bottom:1px solid rgba(139,147,167,0.15);word-break:break-word;">{value}</td>'
        '</tr>'
    )


def _button(url: str, label: str) -> str:
    return (
        f'<a href="{url}" style="display:inline-block;padding:11px 22px;margin:4px 6px 0 0;'
        f'border-radius:10px;background:{_GOLD};color:#10131c;font-weight:700;'
        f'font-size:13px;text-decoration:none;letter-spacing:0.3px;">{label} &nbsp;↗</a>'
    )


def _html_shell(
    headline: str,
    accent: str,
    pill_html: str,
    content_html: str,
    preheader: str = "",
) -> str:
    """Wrap template content in the shared Doomsday card layout."""
    preheader_div = (
        f'<div style="display:none;max-height:0;overflow:hidden;">{preheader}</div>'
        if preheader
        else ""
    )
    return (
        f'<!doctype html><html><head><meta charset="utf-8">'
        f'<meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        f'<body style="margin:0;padding:0;background:{_BG_PAGE};">'
        f'{preheader_div}'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="background:{_BG_PAGE};">'
        '<tr><td align="center" style="padding:36px 16px;'
        'font-family:\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">'
        f'<table role="presentation" width="600" cellpadding="0" cellspacing="0" '
        f'style="width:600px;max-width:100%;background:{_BG_CARD};'
        f'border:1px solid {_BORDER};border-radius:16px;overflow:hidden;">'

        # Header band
        '<tr><td style="padding:26px 32px 20px;text-align:center;'
        f'border-bottom:1px solid rgba(245,197,24,0.18);">'
        f'<div style="font-size:13px;font-weight:800;letter-spacing:6px;color:{_GOLD};">'
        'TECHAFLON&nbsp;&#9889;</div>'
        f'<div style="margin-top:5px;font-size:10px;letter-spacing:3px;color:{_MUTED};'
        'text-transform:uppercase;">Doomsday Protocol &#183; CSSA</div>'
        '</td></tr>'

        # Hero
        '<tr><td style="padding:30px 32px 6px;text-align:center;">'
        f'<div style="font-size:26px;line-height:1.25;font-weight:900;color:{accent};'
        'letter-spacing:0.5px;">'
        f'{headline}</div>'
        + (f'<div style="margin-top:14px;">{pill_html}</div>' if pill_html else "")
        + "</td></tr>"

        # Content
        f'<tr><td style="padding:22px 32px 30px;font-size:14px;line-height:1.65;'
        f'color:{_TEXT};">{content_html}</td></tr>'

        # Footer
        '<tr><td style="padding:18px 32px 26px;border-top:1px solid rgba(139,147,167,0.18);'
        f'color:{_MUTED};font-size:11.5px;line-height:1.7;text-align:center;">'
        f'The TechAFlon Organizing Committee (CSSA)<br>'
        'This is an automated event notification — replies are not monitored.<br>'
        f'<span style="color:#5b6172;">&#9889; Assemble. Build. Prevail.</span>'
        '</td></tr>'

        "</table></td></tr></table></body></html>"
    )


def _p(text: str) -> str:
    return f'<p style="margin:0 0 14px;color:{_TEXT};">{text}</p>'


_STATUS_ACCENT = {
    "approved": ("#34d399", "APPROVED", "#34d399"),
    "rejected": ("#f87171", "REJECTED", "#f87171"),
    "disqualified": ("#ef4444", "DISQUALIFIED", "#ef4444"),
    "pending": ("#fbbf24", "PENDING REVIEW", "#fbbf24"),
}


def _status_detail(status_value: str) -> str:
    details = {
        "approved": (
            "Your team has been approved. Pack your laptop and charger — "
            "see you at the venue. Check-in opens <b>30 minutes before kickoff</b>."
        ),
        "rejected": (
            "Unfortunately we couldn't offer your team a spot this time "
            "(capacity or eligibility). We'd love to see you next semester!"
        ),
        "disqualified": (
            "Your team has been disqualified from the event. Contact the "
            "organizers if you believe this is a mistake."
        ),
        "pending": "Your team is back under review.",
    }
    return details.get(status_value, "Your team's status changed.")


def _html_team_registration_confirmation(context: dict[str, Any]) -> str:
    members_html = "".join(
        "<tr>"
        f'<td style="padding:7px 10px;color:{_TEXT};font-size:13px;'
        'border-bottom:1px solid rgba(139,147,167,0.12);">'
        f"{i}. {(m.get('name') or '')}</td>"
        f'<td style="padding:7px 10px;color:{_MUTED};font-size:12.5px;text-align:right;'
        'border-bottom:1px solid rgba(139,147,167,0.12);">'
        f"{m.get('register_number', '')} &#183; {m.get('department', '')}</td>"
        "</tr>"
        for i, m in enumerate(context.get("members") or [], start=2)
    )
    theme = _THEME_DISPLAY.get(str(context.get("theme", "")), context.get("theme", ""))
    content = (
        _p(f"Greetings, <b>{context['leader_name']}</b>. Your squad is officially "
           "on the roster for TechAFlon.")
        + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
          'style="border:1px solid rgba(139,147,167,0.2);border-radius:10px;'
          'margin:6px 0 18px;background:rgba(245,197,24,0.05);">'
        + _kv_row("TEAM ID", f"<b style=\"color:{_GOLD};\">{context.get('team_id', '—')}</b>")
        + _kv_row("Team name", context["team_name"])
        + _kv_row("Leader", context["leader_name"])
        + _kv_row("Theme", theme)
        + _kv_row("Squad size", f"{len(context.get('members') or []) + 1} members")
        + "</table>"
        + _p("<b>Registered members</b>")
        + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
          'style="border:1px solid rgba(139,147,167,0.2);border-radius:10px;'
          'margin-bottom:16px;">'
        + f'<tr><td style="padding:7px 10px;color:{_GOLD};font-size:13px;font-weight:700;'
          'border-bottom:1px solid rgba(139,147,167,0.12);">1. '
        + f"{context['leader_name']} &#9733; LEADER</td>"
        + f'<td style="padding:7px 10px;color:{_MUTED};font-size:12.5px;text-align:right;'
          'border-bottom:1px solid rgba(139,147,167,0.12);">'
        + "Captain of this operation</td></tr>"
        + members_html
        + "</table>"
        + _p("Our organizers review every registration by hand — keep your "
             "<b>TEAM ID</b> handy, you'll need it at check-in.")
    )
    return _html_shell(
        "REGISTRATION LOCKED IN",
        _GOLD,
        _pill("Team registered", _GOLD),
        content,
        preheader=f"Team {context['team_name']} ({context.get('team_id', '')}) is registered.",
    )


def _html_team_status_update(context: dict[str, Any]) -> str:
    status_value = str(context.get("status", ""))
    accent, pill_label, pill_color = _STATUS_ACCENT.get(
        status_value, (_GOLD, status_value.upper() or "UPDATE", _GOLD)
    )
    headlines = {
        "approved": "YOU'RE IN, HERO",
        "rejected": "REGISTRATION DECLINED",
        "disqualified": "DISQUALIFIED",
        "pending": "BACK UNDER REVIEW",
    }
    headline = headlines.get(status_value, f"STATUS UPDATE: {status_value.upper()}")
    content = (
        _p(f"Update for team <b>{context['team_name']}</b> "
           f"<span style=\"color:{_MUTED};\">({context.get('team_id', '—')})</span>:")
        + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
          'style="border-left:3px solid ' + accent + ';background:rgba(255,255,255,0.03);'
          'border-radius:0 10px 10px 0;padding:14px 18px;margin:4px 0 16px;">'
        + f'<tr><td style="font-size:13.5px;line-height:1.7;color:{_TEXT};">'
        + _status_detail(status_value)
        + "</td></tr></table>"
    )
    if status_value == "approved":
        content += _p(
            f'See you at the frontlines, {context["leader_name"]}. '
            "&#9876;&#65039;"
        )
    return _html_shell(
        headline,
        accent,
        _pill(pill_label, pill_color),
        content,
        preheader=f"Team {context['team_name']} status: {status_value}",
    )


def _html_submission_received(context: dict[str, Any]) -> str:
    buttons = _button(context.get("repo_url", "#"), "Repository")
    if context.get("demo_url"):
        buttons += _button(context["demo_url"], "Live demo")
    content = (
        _p(f"Project locked and loaded, <b>{context['leader_name']}</b>. "
           f"We've received <b>{context['project_name']}</b> from team "
           f"<b>{context['team_name']}</b> ({context.get('team_id', '—')}).")
        + f'<div style="margin:14px 0 18px;">{buttons}</div>'
        + _p(
            "You can keep refining it from your portal until submissions close. "
            "<b>Good luck out there.</b>"
        )
    )
    return _html_shell(
        "SUBMISSION RECEIVED",
        "#60a5fa",
        _pill("Project submitted", "#60a5fa"),
        content,
        preheader=f"{context['project_name']} was submitted successfully.",
    )


def _html_certificate_award(context: dict[str, Any]) -> str:
    content = (
        _p(
            f"Congratulations, <b>{context['name']}</b>! Your team "
            f"<b>{context['team_name']}</b> "
            f"<span style=\"color:{_MUTED};\">({context.get('team_id', '—')})</span> "
            f"has completed {EVENT_NAME}."
        )
        + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
          'style="border:1px dashed rgba(245,197,24,0.45);border-radius:10px;'
          f'background:rgba(245,197,24,0.06);padding:14px 18px;margin:6px 0 16px;" '
          'cellpadding="0" cellspacing="0"><tr><td style="font-size:13.5px;'
          f'color:{_TEXT};">🎓 Your participation certificate is attached to this '
        f'email as <b style="color:{_GOLD};">{context.get("filename", "certificate")}</b>.</td></tr></table>'
        + _p("Thank you for building with us — see you at the next edition.")
    )
    return _html_shell(
        "CERTIFICATE UNLOCKED",
        _GOLD,
        _pill("Award earned", _GOLD),
        content,
        preheader="Your TechAFlon participation certificate is attached.",
    )


def _html_registration_confirmation(context: dict[str, Any]) -> str:
    content = (
        _p(f"Hi <b>{context['leader_name']}</b>, your team "
           f"<b>{context['team_name']}</b> is registered for {EVENT_NAME}.")
        + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
          'style="border:1px solid rgba(139,147,167,0.2);border-radius:10px;'
          'margin:6px 0 16px;">'
        + _kv_row("Track", context.get("track"))
        + _kv_row("Members", str(context.get("member_count", "")))
        + "</table>"
        + _p("Organizers review every registration by hand — you'll get another "
             "email as soon as a decision is made.")
    )
    return _html_shell("REGISTRATION RECEIVED", _GOLD, _pill("Registered", _GOLD), content)


def _html_registration_decision(context: dict[str, Any]) -> str:
    status_value = str(context.get("status", ""))
    accent, pill_label, pill_color = _STATUS_ACCENT.get(
        status_value, (_GOLD, status_value.upper(), _GOLD)
    )
    headlines = {
        "approved": "YOU'RE IN!",
        "waitlisted": "ON THE WAITLIST",
        "rejected": "REGISTRATION DECLINED",
        "pending": "REVIEW PENDING",
    }
    detail = {
        "approved": "Your registration has been approved — see you at the venue!",
        "waitlisted": "The event is full right now; you'll be emailed automatically "
                      "if a slot opens up.",
        "rejected": "We couldn't offer your team a spot this time. See you next "
                    "semester!",
        "pending": "Your registration is back under review.",
    }.get(status_value, "Your registration status changed.")
    content = _p(
        f"Update for team <b>{context['team_name']}</b>: {detail}"
    )
    return _html_shell(headlines.get(status_value, "STATUS UPDATE"), accent,
                       _pill(pill_label, pill_color), content)


HTML_TEMPLATES = {
    "registration_confirmation": _html_registration_confirmation,
    "registration_decision": _html_registration_decision,
    "submission_received": _html_submission_received,
    "team_registration_confirmation": _html_team_registration_confirmation,
    "team_status_update": _html_team_status_update,
    "certificate_award": _html_certificate_award,
}

# ---------------------------------------------------------------------------
# Delivery transports
# ---------------------------------------------------------------------------


def _deliver(
    to_email: str,
    subject: str,
    body: str,
    attachment: tuple[str, str, bytes] | None = None,
    html: str | None = None,
) -> str:
    """Send one message via the first configured transport.

    ``attachment`` is ``(filename, content_type, data)`` when present.
    ``html`` (when present) is delivered as the preferred alternative part.
    Returns the resulting outbox status (``sent`` or ``logged``).
    Raises ``RuntimeError`` on delivery failure.
    """
    if gmail.gmail_configured():
        gmail.send_email(to_email, subject, body, attachment=attachment, html=html)
        return "sent"
    if brevo.brevo_configured():
        brevo.send_email(to_email, subject, body, attachment=attachment, html=html)
        return "sent"
    if mailjet.mailjet_configured():
        mailjet.send_email(to_email, subject, body, attachment=attachment, html=html)
        return "sent"
    if smtp.smtp_configured():
        smtp.send_email(to_email, subject, body, attachment=attachment, html=html)
        return "sent"
    # Log mode: no transport configured (dev/test).
    log.warning(
        "No email transport configured (Gmail/Brevo/SMTP). "
        "Message to %s queued as 'logged' — set EMAIL_ENABLED and transport "
        "credentials to enable real delivery.",
        to_email,
    )
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
    html_renderer = HTML_TEMPLATES.get(template)
    body_html = html_renderer(context) if html_renderer else None

    message = EmailMessage(
        template=template,
        to_email=to_email,
        subject=subject[:500],
        body=body,
        body_html=body_html,
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
                    message.to_email,
                    message.subject,
                    message.body,
                    attachment,
                    html=message.body_html,
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
                message.to_email,
                message.subject,
                message.body,
                attachment,
                html=message.body_html,
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


def count_messages(db: "Session", status_filter: str | None = None) -> int:
    """Return the total number of outbox messages matching the filter."""
    query = select(func.count(EmailMessage.id))
    if status_filter:
        query = query.where(EmailMessage.status == status_filter)
    return db.scalar(query) or 0


def get_message(db: "Session", message_id: str) -> EmailMessage:
    message = db.get(EmailMessage, message_id)
    if message is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Email not found.")
    return message


# ---------------------------------------------------------------------------
# Certificate / transport introspection
# ---------------------------------------------------------------------------


def _configured_transport() -> str | None:
    """Return the first configured provider name, else ``None`` (log mode)."""
    probes = (
        ("gmail", gmail.gmail_configured),
        ("brevo", brevo.brevo_configured),
        ("mailjet", mailjet.mailjet_configured),
        ("smtp", smtp.smtp_configured),
    )
    for name, probe in probes:
        if probe():
            return name
    return None


def email_transport_status() -> dict[str, object]:
    """Admin-facing report of how outbound mail will behave right now.

    ``mode`` is either ``"delivering"`` (a provider is configured) or
    ``"log"`` (no credentials — messages persist as ``logged`` but never
    leave the server). ``enabled`` mirrors ``EMAIL_ENABLED``.
    """
    if not settings.EMAIL_ENABLED:
        return {"enabled": False, "transport": None, "mode": "log"}
    transport = _configured_transport()
    if transport is None:
        return {"enabled": True, "transport": None, "mode": "log"}
    return {"enabled": True, "transport": transport, "mode": "delivering"}


def render_certificate_preview(
    name: str, team_name: str, team_id: str, filename: str
) -> str:
    """Render the personalized award HTML for an admin preview.

    Mirrors exactly what a participant receives (the ``certificate_award``
    template) so organisers can confirm the design before broadcasting.
    """
    return _html_certificate_award(
        {
            "name": name,
            "team_name": team_name,
            "team_id": team_id,
            "filename": filename,
        }
    )
