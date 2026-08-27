"""Mailjet transactional email transport (HTTPS API, stdlib only).

Used when ``MAILJET_API_KEY`` + ``MAILJET_SECRET_KEY`` are configured.
Talks to ``api.mailjet.com`` over plain HTTPS (port 443), so it keeps
working on hosts that block outbound SMTP ports — e.g. Render's free tier.

Dashboard: https://app.mailjet.com -> Account -> API Keys -> key pair
(API Key + Secret Key). HTTP Basic auth is used: username = API Key,
password = Secret Key. The sender in ``EMAIL_FROM`` must be a validated
Mailjet sender under *Account Senders & Domains*.
"""

from __future__ import annotations

import base64
import json
import re
import urllib.error
import urllib.request

from app.core.config import settings

API_URL = "https://api.mailjet.com/v3.1/send"

# Matches "Name <a@b.c>" or a bare address inside EMAIL_FROM.
_EMAIL_RE = re.compile(r"([^@\s]+@[^@\s]+\.[^\s@>,]+)")
# Extracts the display-name portion from "Name <a@b.c>".
_NAME_RE = re.compile(r"^\s*([^<]+?)\s*<")


def mailjet_configured() -> bool:
    """True when both API key and secret key are present."""
    return bool(settings.MAILJET_API_KEY and settings.MAILJET_SECRET_KEY)


def _extract_sender() -> dict[str, str]:
    """Parse EMAIL_FROM into ``{"Email": ..., "Name": ...}`` for Mailjet."""
    match = _EMAIL_RE.search(settings.EMAIL_FROM)
    if not match:
        raise RuntimeError(f"EMAIL_FROM '{settings.EMAIL_FROM}' has no usable address.")
    sender: dict[str, str] = {"Email": match.group(0)}
    name_match = _NAME_RE.match(settings.EMAIL_FROM)
    if name_match and name_match.group(1).strip():
        sender["Name"] = name_match.group(1).strip()
    return sender


def send_email(
    to_email: str,
    subject: str,
    body: str,
    attachment: tuple[str, str, bytes] | None = None,
    html: str | None = None,
) -> None:
    """Deliver one message via Mailjet's HTTPS API.

    ``attachment`` is ``(filename, content_type, data)`` when present and is
    base64-encoded into Mailjet's ``Attachments`` payload.
    ``html`` (when present) is sent as ``HTMLPart`` — clients that render
    HTML will prefer it over the plain-text fallback.
    Raises ``RuntimeError`` on any failure so the outbox can record it.
    """
    message: dict = {
        "From": _extract_sender(),
        "To": [{"Email": to_email}],
        "Subject": subject,
        "TextPart": body,
    }

    if html:
        message["HTMLPart"] = html

    if attachment is not None:
        filename, content_type, data = attachment
        message["Attachments"] = [
            {
                "ContentType": content_type,
                "Filename": filename,
                "Base64Content": base64.b64encode(data).decode("ascii"),
            }
        ]

    payload = json.dumps({"Messages": [message]}).encode()
    # Mailjet uses HTTP Basic auth (API Key : Secret Key).
    basic = base64.b64encode(
        f"{settings.MAILJET_API_KEY}:{settings.MAILJET_SECRET_KEY}".encode()
    ).decode("ascii")

    request = urllib.request.Request(
        API_URL,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            response.read()  # drain; message ids are informational here
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:300]
        raise RuntimeError(f"Mailjet API failed ({exc.code}): {detail}") from None
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Mailjet API unreachable: {exc.reason}") from None