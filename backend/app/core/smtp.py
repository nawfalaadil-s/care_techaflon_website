"""SMTP transport for the email outbox (standard library only).

Used when ``SMTP_HOST`` is configured and the Gmail API credentials are not.
For Gmail specifically: enable 2-Step Verification on the account, create an
App Password at https://myaccount.google.com/apppasswords and use it as
``SMTP_PASSWORD`` (regular account passwords are rejected by Google).
"""

from __future__ import annotations

import re
import smtplib
from email.message import EmailMessage as MimeMessage

from app.core.config import settings

# Matches the bare address inside formats like "Display Name <a@b.com>".
_EMAIL_RE = re.compile(r"([^@\s]+@[^@\s]+\.[^\s@>,]+)")


def _attach(mime: MimeMessage, attachment: tuple[str, str, bytes] | None) -> None:
    """Add ``filename``/``content_type``/``data`` to the MIME message."""
    if attachment is None:
        return
    filename, content_type, data = attachment
    maintype, _, subtype = (content_type or "application/octet-stream").partition("/")
    mime.add_attachment(
        data,
        maintype=maintype or "application",
        subtype=subtype or "octet-stream",
        filename=filename,
    )


def smtp_configured() -> bool:
    """True when a full usable credential set is available.

    Requires host + username + password so a half-filled .env quietly
    falls back to log mode instead of failing every delivery.
    """
    return bool(
        settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD
    )


def send_email(
    to_email: str,
    subject: str,
    body: str,
    attachment: tuple[str, str, bytes] | None = None,
) -> None:
    """Deliver one message over SMTP.

    ``attachment`` is ``(filename, content_type, data)`` when present.
    Raises ``RuntimeError`` on any failure so the outbox can record it.
    """
    match = _EMAIL_RE.search(settings.EMAIL_FROM)
    if not match:
        raise RuntimeError(f"EMAIL_FROM '{settings.EMAIL_FROM}' has no usable address.")
    from_addr = match.group(0)

    mime = MimeMessage()
    mime["From"] = settings.EMAIL_FROM
    mime["To"] = to_email
    mime["Subject"] = subject
    mime.set_content(body)
    _attach(mime, attachment)

    try:
        if settings.SMTP_USE_TLS:
            server = smtplib.SMTP(
                settings.SMTP_HOST, settings.SMTP_PORT, timeout=20
            )
            server.ehlo()
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(
                settings.SMTP_HOST, settings.SMTP_PORT, timeout=20
            )

        with server:
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(from_addr, [to_email], mime.as_string())
    except smtplib.SMTPAuthenticationError as exc:
        raise RuntimeError(
            "SMTP authentication failed — for Gmail use an App Password "
            "(myaccount.google.com/apppasswords), not your login password."
        ) from exc
    except Exception as exc:  # noqa: BLE001 - surfaced into the outbox row
        raise RuntimeError(f"SMTP delivery failed: {exc}") from exc
