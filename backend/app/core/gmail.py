"""Gmail API client — Google OAuth 2.0, zero third-party dependencies.

Follows the project's stdlib-first convention (see ``app.core.security``):

* The OAuth 2.0 refresh-token exchange and the
  ``gmail.users.messages.send`` REST call are plain ``urllib.request``
  HTTP calls against Google's public endpoints.
* Messages are built as RFC 2822 MIME with :mod:`email.message` and
  uploaded base64url-encoded, exactly as the Gmail API expects.

Configuration lives in settings (``GMAIL_CLIENT_ID``, ``GMAIL_CLIENT_SECRET``,
``GMAIL_REFRESH_TOKEN``). When unset the caller falls back to log mode.
"""

from __future__ import annotations

import base64
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from email.message import EmailMessage as MimeMessage

from app.core.config import settings

TOKEN_URL = "https://oauth2.googleapis.com/token"
SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

# Module-level token cache: (access_token, expires_at_epoch)
_token_cache: tuple[str, float] | None = None
# Google refresh tokens are valid for hours; we re-use for 50 minutes.
_TOKEN_TTL_SECONDS = 50 * 60


def gmail_configured() -> bool:
    """True when OAuth credentials allow real delivery via Gmail."""
    return all(
        [
            settings.EMAIL_ENABLED,
            settings.GMAIL_CLIENT_ID,
            settings.GMAIL_CLIENT_SECRET,
            settings.GMAIL_REFRESH_TOKEN,
        ]
    )


def _access_token() -> str:
    """Exchange the long-lived refresh token for a short-lived access token.

    Tokens are cached at module level for ``_TOKEN_TTL_SECONDS`` to avoid
    a round-trip to Google on every single email send.
    """
    global _token_cache  # noqa: PLW0603
    now = time.monotonic()

    if _token_cache is not None:
        token, expires_at = _token_cache
        if now < expires_at:
            return token

    data = urllib.parse.urlencode(
        {
            "client_id": settings.GMAIL_CLIENT_ID,
            "client_secret": settings.GMAIL_CLIENT_SECRET,
            "refresh_token": settings.GMAIL_REFRESH_TOKEN,
            "grant_type": "refresh_token",
        }
    ).encode()
    request = urllib.request.Request(
        TOKEN_URL, data=data, method="POST", headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:  # bad client/refresh token etc.
        raise RuntimeError(f"Gmail token refresh failed ({exc.code}).") from None
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Gmail token endpoint unreachable: {exc.reason}") from None

    if "access_token" not in payload:
        raise RuntimeError("Gmail token refresh returned no access_token.")

    token = str(payload["access_token"])
    _token_cache = (token, now + _TOKEN_TTL_SECONDS)
    return token


def send_email(
    to_email: str,
    subject: str,
    body: str,
    attachment: tuple[str, str, bytes] | None = None,
    html: str | None = None,
) -> str:
    """Deliver an email through Gmail. Returns the Gmail message id.

    ``attachment`` is ``(filename, content_type, data)`` when present.
    ``html`` (when present) is added as the preferred alternative part.
    """
    mime = MimeMessage()
    mime["From"] = settings.EMAIL_FROM
    mime["To"] = to_email
    mime["Subject"] = subject
    mime.set_content(body)
    if html:
        mime.add_alternative(html, subtype="html")
    if attachment is not None:
        filename, content_type, data = attachment
        maintype, _, subtype = (content_type or "application/octet-stream").partition("/")
        mime.add_attachment(
            data,
            maintype=maintype or "application",
            subtype=subtype or "octet-stream",
            filename=filename,
        )

    encoded = base64.urlsafe_b64encode(mime.as_bytes()).decode("ascii")
    request = urllib.request.Request(
        SEND_URL,
        data=json.dumps({"raw": encoded}).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {_access_token()}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:200]
        raise RuntimeError(f"Gmail send failed ({exc.code}): {detail}") from None
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Gmail API unreachable: {exc.reason}") from None

    return str(payload.get("id", ""))
