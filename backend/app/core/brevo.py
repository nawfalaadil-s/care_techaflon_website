"""Brevo transactional email transport (HTTPS API, stdlib only).

Used when ``BREVO_API_KEY`` is configured. Unlike SMTP, this talks to
``api.brevo.com`` over plain HTTPS (port 443), so it keeps working on
hosts that block outbound SMTP ports — e.g. Render's free tier.

Dashboard: https://app.brevo.com → SMTP & API → API keys → generate a
key (starts with ``xkeysib-``) and set it as ``BREVO_API_KEY``. The
sender address in ``EMAIL_FROM`` must match a sender verified in Brevo
under *Senders & IP*.
"""

from __future__ import annotations

import base64
import json
import re
import urllib.error
import urllib.request

from app.core.config import settings

API_URL = "https://api.brevo.com/v3/smtp/email"

# Matches "Name <a@b.c>" or a bare address inside EMAIL_FROM.
_EMAIL_RE = re.compile(r"([^@\s]+@[^@\s]+\.[^\s@>,]+)")
# Extracts the display-name portion from "Name <a@b.c>".
_NAME_RE = re.compile(r"^\s*([^<]+?)\s*<")


def brevo_configured() -> bool:
    """True when an API key is present."""
    return bool(settings.BREVO_API_KEY)


def _extract_sender() -> dict[str, str]:
    """Parse EMAIL_FROM into ``{"email": ..., "name": ...}`` for the Brevo API."""
    match = _EMAIL_RE.search(settings.EMAIL_FROM)
    if not match:
        raise RuntimeError(f"EMAIL_FROM '{settings.EMAIL_FROM}' has no usable address.")
    address = match.group(0)

    name_match = _NAME_RE.match(settings.EMAIL_FROM)
    name = name_match.group(1).strip() if name_match else ""
    sender: dict[str, str] = {"email": address}
    if name:
        sender["name"] = name
    return sender


def send_email(
    to_email: str,
    subject: str,
    body: str,
    attachment: tuple[str, str, bytes] | None = None,
    html: str | None = None,
) -> None:
    """Deliver one message via Brevo's HTTPS API.

    ``attachment`` is ``(filename, content_type, data)`` when present.
    ``html`` (when present) is sent as ``htmlContent`` — clients that
    render HTML will prefer it over the plain-text fallback.
    Raises ``RuntimeError`` on any failure so the outbox can record it.
    """
    payload: dict = {
        "sender": _extract_sender(),
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body,
    }

    if html:
        payload["htmlContent"] = html

    if attachment is not None:
        filename, _content_type, data = attachment
        payload["attachment"] = [
            {
                "name": filename,
                "content": base64.b64encode(data).decode("ascii"),
            }
        ]

    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode(),
        method="POST",
        headers={
            "api-key": settings.BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            response.read()  # drain; message-id in body is informational
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:300]
        raise RuntimeError(f"Brevo API failed ({exc.code}): {detail}") from None
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Brevo API unreachable: {exc.reason}") from None
