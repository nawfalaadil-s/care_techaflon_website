"""registrations.status — admin CRM triage workflow

Revision ID: 0006_registration_status
Revises: 0005_problem_statements
Create Date: 2026-08-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0006_registration_status"
down_revision: Union[str, Sequence[str], None] = "0005_problem_statements"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the review status column; existing rows become ``pending``."""
    op.add_column(
        "registrations",
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
    )
    op.create_index("ix_registrations_status", "registrations", ["status"])


def downgrade() -> None:
    """Remove the status column."""
    op.drop_index("ix_registrations_status", table_name="registrations")
    op.drop_column("registrations", "status")
