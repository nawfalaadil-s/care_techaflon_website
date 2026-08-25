"""One-time helper: generate a Gmail API refresh token for the outbox.

Walks through Google's OAuth consent flow in your browser and prints the
three environment variables to paste into Render (or .env):

    GMAIL_CLIENT_ID=...
    GMAIL_CLIENT_SECRET=...
    GMAIL_REFRESH_TOKEN=...

Prerequisites (Google Cloud Console):
  1. Create/select a project -> enable the "Gmail API".
  2. OAuth consent screen -> External -> add techaflon@gmail.com as a
     Test user (publishing is NOT required while testing).
  3. Credentials -> Create credentials -> OAuth client ID ->
     Application type: Desktop app -> copy the client ID + secret into
     .env as GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET before running this.

Usage:
    python scripts/gen_gmail_refresh_token.py

The local callback server listens on http://localhost:8765 — nothing is
sent anywhere except to Google.
"""

from __future__ import annotations

import http.server
import sys
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings  # noqa: E402

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPE = "https://mail.google.com/"  # full scope: send incl. attachments
REDIRECT_PORT = 8765


class _CallbackHandler(http.server.BaseHTTPRequestHandler):
    """Catches Google's redirect and grabs ?code=..."""

    code: str | None = None

    def do_GET(self) -> None:  # noqa: N802
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        self.code = params.get("code", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        ok = "<h2>Token received - you can close this tab.</h2>"
        bad = "<h2>No authorization code found - check the console.</h2>"
        self.wfile.write((ok if self.code else bad).encode())

    def log_message(self, *args) -> None:  # silence request logging
        pass


def main() -> int:
    if not settings.GMAIL_CLIENT_ID or not settings.GMAIL_CLIENT_SECRET:
        print("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in backend/.env "
              "first (see docstring).")
        return 2

    redirect_uri = f"http://localhost:{REDIRECT_PORT}"
    auth_params = urllib.parse.urlencode({
        "client_id": settings.GMAIL_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",   # ask for a refresh token
        "prompt": "consent",        # force refresh token even on re-run
    })
    authorize_url = f"{AUTH_URL}?{auth_params}"

    server = http.server.HTTPServer(("localhost", REDIRECT_PORT),
                                    _CallbackHandler)
    print("Opening your browser for Google sign-in...")
    print(f"(If it does not open, visit:\n{authorize_url}\n)")
    webbrowser.open(authorize_url)

    print(f"Waiting for the callback on {redirect_uri} ...")
    try:
        while _CallbackHandler.code is None:
            server.handle_request()
    finally:
        server.server_close()

    if not _CallbackHandler.code:
        print("No authorization code received.")
        return 1

    exchange = urllib.parse.urlencode({
        "code": _CallbackHandler.code,
        "client_id": settings.GMAIL_CLIENT_ID,
        "client_secret": settings.GMAIL_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }).encode()
    req = urllib.request.Request(
        TOKEN_URL,
        data=exchange,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        payload = dict(urllib.parse.parse_qsl(resp.read().decode()))

    refresh_token = payload.get("refresh_token")
    if not refresh_token:
        print("Google did not return a refresh token. Re-run with "
              "'prompt=consent' (already forced) or remove the app's "
              "access at myaccount.google.com/permissions and retry.")
        return 1

    print("\nSuccess! Paste these three lines into Render env vars "
          "(and backend/.env):\n")
    print(f"GMAIL_CLIENT_ID={settings.GMAIL_CLIENT_ID}")
    print(f"GMAIL_CLIENT_SECRET={settings.GMAIL_CLIENT_SECRET}")
    print(f"GMAIL_REFRESH_TOKEN={refresh_token}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
