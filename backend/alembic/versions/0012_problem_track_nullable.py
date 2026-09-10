"""problem_track_nullable — Finals dropped themes

Problem statements can now be published without a theme: the legacy
``track`` column becomes nullable. ``teams.theme`` stays NOT NULL but new
teams simply store an empty string, so no change is needed there.

Revision ID: 0012_problem_track_nullable
Revises: 0016_venues_team_seats
Create Date: 2026-09-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0012_problem_track_nullable"
down_revision: Union[str, Sequence[str], None] = "0016_venues_team_seats"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Make problem_statements.track nullable (publish without a theme)."""
    op.alter_column(
        "problem_statements",
        "track",
        existing_type=sa.String(length=64),
        nullable=True,
    )


def downgrade() -> None:
    """Restore the NOT NULL constraint (fails if NULL tracks exist)."""
    op.alter_column(
        "problem_statements",
        "track",
        existing_type=sa.String(length=64),
        nullable=False,
    )
