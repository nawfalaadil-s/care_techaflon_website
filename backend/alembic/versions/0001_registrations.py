"""create registrations table

Revision ID: 0001_registrations
Revises:
Create Date: 2026-08-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001_registrations"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the registrations table."""
    op.create_table(
        "registrations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("team_name", sa.String(length=120), nullable=False),
        sa.Column("representative_name", sa.String(length=120), nullable=False),
        sa.Column("representative_email", sa.String(length=320), nullable=False),
        sa.Column("representative_phone", sa.String(length=32), nullable=False),
        sa.Column("institution", sa.String(length=160), nullable=False),
        sa.Column("year_of_study", sa.String(length=40), nullable=False),
        sa.Column("track", sa.String(length=64), nullable=False),
        sa.Column("problem_statement", sa.String(length=120), nullable=True),
        sa.Column("members", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint(
            "representative_email", name="uq_registrations_email"
        ),
    )


def downgrade() -> None:
    """Drop the registrations table."""
    op.drop_table("registrations")
