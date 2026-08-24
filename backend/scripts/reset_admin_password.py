"""Reset the bootstrap admin password; writes creds to _creds.json."""

import json
import secrets
import string
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text

from app.core.security import hash_password
from app.database.base import SessionLocal


def main() -> None:
    email = sys.argv[1]
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = "".join(secrets.choice(alphabet) for _ in range(20))

    db = SessionLocal()
    try:
        db.execute(
            text("UPDATE users SET hashed_password = :pw WHERE email = :email"),
            {"pw": hash_password(password), "email": email},
        )
        db.commit()
    finally:
        db.close()

    Path("_creds.json").write_text(
        json.dumps({"email": email, "password": password})
    )
    print("password updated; creds written to _creds.json")


if __name__ == "__main__":
    main()
