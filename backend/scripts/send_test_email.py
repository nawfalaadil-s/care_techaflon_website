"""Send a test email through the full outbox chain (queue -> transport).

Usage:
    python scripts/send_test_email.py [--to you@example.com]

Defaults to the SMTP username from .env when --to is omitted.
Prints the final delivery status recorded in email_messages:
  sent    - the SMTP server accepted the message (check inbox/spam)
  failed  - exact reason, e.g. bad App Password
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

os.environ.setdefault("DEBUG", "false")

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text  # noqa: E402

from app.core import smtp  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.services import email  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--to", default=settings.SMTP_USERNAME or None)
    args = parser.parse_args()
    if not args.to:
        print("No recipient: pass --to you@example.com")
        return 2

    if not settings.EMAIL_ENABLED:
        print("EMAIL_ENABLED is false in .env - nothing will be delivered.")
        return 2
    if not smtp.smtp_configured():
        print("SMTP not fully configured: need SMTP_HOST, SMTP_USERNAME and "
              "SMTP_PASSWORD in .env")
        return 2

    print(f"Transport : smtp://{settings.SMTP_HOST}:{settings.SMTP_PORT}"
          f" (TLS={settings.SMTP_USE_TLS})")
    print(f"From      : {settings.EMAIL_FROM}")
    print(f"To        : {args.to}")

    email.send_notification(
        template="submission_received",
        to_email=args.to,
        context={
            "team_id": "TEST-000",
            "team_name": "SMTP Test",
            "leader_name": "Event Organizer",
            "theme": "web",
            "member_count": 4,
            "project_name": "TechAFlon SMTP Test",
            "repo_url": "https://github.com/example/smoke-test",
            "demo_url": None,
        },
    )

    # The chain is synchronous, but give the commit a beat before reading.
    time.sleep(0.5)

    from app.database.base import SessionLocal

    db = SessionLocal()
    try:
        row = db.execute(
            text(
                "SELECT status, error FROM email_messages "
                "WHERE to_email = :to AND template = 'submission_received' "
                "ORDER BY created_at DESC LIMIT 1"
            ),
            {"to": args.to},
        ).fetchone()
    finally:
        db.close()

    if row is None:
        print("RESULT: no outbox row found (unexpected)")
        return 1
    status, error = row
    print(f"RESULT: {status}" + (f" - {error}" if error else ""))
    if status == "sent":
        print("Check the inbox (and spam folder) for the test mail.")
    return 0 if status == "sent" else 1


if __name__ == "__main__":
    sys.exit(main())
