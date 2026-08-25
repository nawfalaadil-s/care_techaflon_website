"""Shared pytest configuration.

Must run before any ``app`` import so environment overrides land before
pydantic-settings reads them.

Safety: tests create and delete real rows, so they must never point at a
production database. ``TEST_DATABASE_URL`` is therefore REQUIRED and is
substituted for ``DATABASE_URL`` before the app settings are loaded:

    # local disposable database
    set TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/hackathon_test

Also sets:

* ``RATE_LIMIT_ENABLED=false`` — the whole suite shares one TestClient IP;
  per-bucket limits are exercised separately in ``test_security.py``.
"""

import os

if not os.environ.get("TEST_DATABASE_URL"):
    raise RuntimeError(
        "Refusing to run the test suite: TEST_DATABASE_URL is not set.\n"
        "Tests insert and delete rows, so they must target a disposable\n"
        "database, not the live one. Example:\n"
        "  set TEST_DATABASE_URL="
        "postgresql+psycopg://postgres:postgres@localhost:5432/hackathon_test"
    )

os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]

# Turn off SQLAlchemy statement echo inside the test run: the workload is a
# shared database and DEBUG=true would spam thousands of log lines per
# request, slowing the suite dramatically. Tests assert on behaviour, not SQL.
os.environ.setdefault("DEBUG", "false")
# The whole suite shares one TestClient IP; per-bucket limits are exercised
# separately in test_security.py.
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

# Force "log mode" for every email transport: the suite must never deliver
# real mail even when developer Gmail/SMTP/Brevo credentials exist in .env.
# Empty strings read as falsy by all three *_configured() helpers.
os.environ["EMAIL_ENABLED"] = "true"
os.environ["GMAIL_CLIENT_ID"] = ""
os.environ["GMAIL_CLIENT_SECRET"] = ""
os.environ["GMAIL_REFRESH_TOKEN"] = ""
os.environ["BREVO_API_KEY"] = ""
os.environ["SMTP_HOST"] = ""
os.environ["SMTP_USERNAME"] = ""
os.environ["SMTP_PASSWORD"] = ""
