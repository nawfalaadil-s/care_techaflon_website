"""statement_fk_setnull — Deleting a statement unallocates it (SET NULL)

Previously deleting an allocated statement raised ForeignKeyViolation.
With ON DELETE SET NULL the teams simply lose their allocation.

Revision ID: 0013_statement_fk_setnull
Revises: 0012_statement_ids
Create Date: 2026-08-24

"""
from typing import Sequence, Union

from sqlalchemy import text

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0013_statement_fk_setnull"
down_revision: Union[str, Sequence[str], None] = "0012_statement_ids"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FK_NAME = "teams_problem_statement_id_fkey"


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(text(f"ALTER TABLE teams DROP CONSTRAINT IF EXISTS {FK_NAME}"))
    conn.execute(
        text(
            f"ALTER TABLE teams ADD CONSTRAINT {FK_NAME} "
            "FOREIGN KEY (problem_statement_id) "
            "REFERENCES problem_statements (id) ON DELETE SET NULL"
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text(f"ALTER TABLE teams DROP CONSTRAINT IF EXISTS {FK_NAME}"))
    conn.execute(
        text(
            f"ALTER TABLE teams ADD CONSTRAINT {FK_NAME} "
            "FOREIGN KEY (problem_statement_id) "
            "REFERENCES problem_statements (id)"
        )
    )
