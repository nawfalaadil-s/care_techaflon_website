"""teams — TechAFlon team registrations with approval workflow

Revision ID: 0009_teams
Revises: 0008_site_settings
Create Date: 2026-08-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0009_teams"
down_revision: Union[str, Sequence[str], None] = "0008_site_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create teams table for TechAFlon internal hackathon."""
    op.create_table(
        "teams",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("team_id", sa.String(length=20), nullable=False, unique=True, index=True),
        sa.Column("team_name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("theme", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, default="pending", index=True),
        sa.Column("registered_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("leader_name", sa.String(length=120), nullable=False),
        sa.Column("leader_email", sa.String(length=320), nullable=False, unique=True),
        sa.Column("leader_phone", sa.String(length=32), nullable=False),
        sa.Column("leader_register_number", sa.String(length=50), nullable=False, unique=True),
        sa.Column("leader_department", sa.String(length=50), nullable=False),
        sa.Column("leader_year", sa.String(length=20), nullable=False),
        sa.Column("leader_section", sa.String(length=10), nullable=False),
        sa.Column("members", sa.Text(), nullable=False, default="[]"),
        sa.Column("problem_statement_id", sa.String(length=36), sa.ForeignKey("problem_statements.id"), nullable=True),
        sa.Column("ps_allocated_at", sa.DateTime(), nullable=True),
        sa.Column("venue_name", sa.String(length=120), nullable=False, default="TBD"),
        sa.Column("venue_location", sa.String(length=500), nullable=False, default="To be announced"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    """Remove the teams table."""
    op.drop_table("teams")
