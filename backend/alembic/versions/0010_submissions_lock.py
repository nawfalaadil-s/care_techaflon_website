"""submissions_lock — Add submission lock mechanism for TechAFlon

Revision ID: 0010_submissions_lock
Revises: 0009_teams
Create Date: 2026-08-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0010_submissions_lock"
down_revision: Union[str, Sequence[str], None] = "0009_teams"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add locked column to submissions table."""
    op.add_column(
        "submissions",
        sa.Column("locked", sa.Boolean(), nullable=False, server_default="false")
    )


def downgrade() -> None:
    """Remove locked column from submissions table."""
    op.drop_column("submissions", "locked")
