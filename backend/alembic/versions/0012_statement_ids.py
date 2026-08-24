"""statement_ids — Replace UUID statement IDs with readable PS-<THEME>-<###>

The teams.problem_statement_id foreign key blocks in-place re-keying, so it
is dropped, both sides are remapped, and the constraint is restored.

Revision ID: 0012_statement_ids
Revises: 0011_submissions_team_fk
Create Date: 2026-08-24

"""
from typing import Sequence, Union

from sqlalchemy import text

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0012_statement_ids"
down_revision: Union[str, Sequence[str], None] = "0011_submissions_team_fk"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_THEME_TAGS = {"ai-ml": "AIML", "web": "WEB", "app": "APP"}

FK_NAME = "teams_problem_statement_id_fkey"


def upgrade() -> None:
    conn = op.get_bind()

    conn.execute(text(f"ALTER TABLE teams DROP CONSTRAINT IF EXISTS {FK_NAME}"))

    rows = conn.execute(
        text(
            "SELECT id, COALESCE(track, 'GEN') FROM problem_statements "
            "ORDER BY created_at ASC, id ASC"
        )
    ).fetchall()

    for index, (old_id, track) in enumerate(rows, start=1):
        new_id = f"PS-{_THEME_TAGS.get(track, 'GEN')}-{index:03d}"
        if new_id == old_id:
            continue
        conn.execute(
            text("UPDATE teams SET problem_statement_id = :new "
                 "WHERE problem_statement_id = :old"),
            {"new": new_id, "old": old_id},
        )
        conn.execute(
            text("UPDATE problem_statements SET id = :new WHERE id = :old"),
            {"new": new_id, "old": old_id},
        )

    # Restore the relationship exactly as declared on the Team model.
    conn.execute(
        text(
            f"ALTER TABLE teams ADD CONSTRAINT {FK_NAME} "
            "FOREIGN KEY (problem_statement_id) "
            "REFERENCES problem_statements (id)"
        )
    )
    print(f"re-keyed {len(rows)} problem statements")


def downgrade() -> None:
    # Non-reversible by design: original UUIDs cannot be restored.
    pass
