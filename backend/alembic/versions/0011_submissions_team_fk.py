"""submissions_team_fk — Re-point submissions FK from registrations to teams

The TechAFlon rewrite keys submissions by the new `teams` table UUID, but the
column still carried its legacy foreign key to `registrations(id)`, causing
ForeignKeyViolation on every submit.

Revision ID: 0011_submissions_team_fk
Revises: 0010_submissions_lock
Create Date: 2026-08-24

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0011_submissions_team_fk"
down_revision: Union[str, Sequence[str], None] = "0010_submissions_lock"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop legacy rows, then re-target the submissions FK at teams."""
    # Rows written under the old registrations flow can no longer be claimed.
    op.execute(
        """
        DELETE FROM submissions
        WHERE registration_id NOT IN (SELECT id FROM teams)
        """
    )
    op.drop_constraint(
        "submissions_registration_id_fkey", "submissions", type_="foreignkey"
    )
    op.create_foreign_key(
        "submissions_registration_id_fkey",
        "submissions",
        "teams",
        ["registration_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Restore the legacy registrations FK."""
    op.execute(
        """
        DELETE FROM submissions
        WHERE registration_id NOT IN (SELECT id FROM registrations)
        """
    )
    op.drop_constraint(
        "submissions_registration_id_fkey", "submissions", type_="foreignkey"
    )
    op.create_foreign_key(
        "submissions_registration_id_fkey",
        "submissions",
        "registrations",
        ["registration_id"],
        ["id"],
        ondelete="CASCADE",
    )
