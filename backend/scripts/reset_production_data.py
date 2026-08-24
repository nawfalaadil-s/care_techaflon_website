"""Reset the database to a clean production state.

Deletes, in FK-safe order:
  1. submissions            (FK -> teams, CASCADE anyway)
  2. certificates           (if the table exists)
  3. email_messages         (outbox log)
  4. teams                  (all TechAFlon team registrations)
  5. registrations          (legacy CRM rows)
  6. users                  (every account — test debris on this database)

Then bootstraps a single production admin account.

KEPT: problem_statements (starter content) and site_settings (event config).

Usage:
    python scripts/reset_production_data.py [--admin-email you@example.com]

The generated admin password is printed ONCE — store it immediately and
change it after first sign-in.
"""

from __future__ import annotations

import argparse
import os
import secrets
import string
import sys

os.environ.setdefault("DEBUG", "false")

from sqlalchemy import inspect, text  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.database.base import SessionLocal  # noqa: E402

DELETE_ORDER = [
    "submissions",
    "certificates",
    "email_messages",
    "teams",
    "registrations",
    "users",
]


def generate_password(length: int = 20) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--admin-email",
        default="admin@techaflon.com",
        help="Email for the bootstrap admin account",
    )
    parser.add_argument(
        "--admin-name",
        default="Event Admin",
        help="Display name for the bootstrap admin account",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        existing = set(inspect(db.bind).get_table_names())
        print("Deleting data:")
        counts = {}
        for table in DELETE_ORDER:
            if table not in existing:
                continue
            counts[table] = db.execute(text(f"DELETE FROM {table}")).rowcount
            print(f"  {table:>16}: deleted {counts[table]}")

        password = generate_password()
        db.execute(
            text(
                "INSERT INTO users (id, email, full_name, hashed_password,"
                " is_active, is_admin, role)"
                " VALUES (:id, :email, :name, :pw, true, true, 'admin')"
            ),
            {
                "id": os.urandom(16).hex(),
                "email": args.admin_email.lower(),
                "name": args.admin_name,
                "pw": hash_password(password),
            },
        )
        db.commit()

        kept = [t for t in ("problem_statements", "site_settings") if t in existing]
        print(f"\nKept starter content: {', '.join(kept)}")
        print("\n=== BOOTSTRAP ADMIN (change this password after first login) ===")
        print(f"  email:    {args.admin_email.lower()}")
        print(f"  password: {password}")
        print("=================================================================")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
