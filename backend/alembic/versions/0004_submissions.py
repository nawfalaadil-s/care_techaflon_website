"""submissions — one project submission per team

Revision ID: 0004_submissions
Revises: 0003_teams_owner
Create Date: 2026-08-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0004_submissions"
down_revision: Union[str, Sequence[str], None] = "0003_teams_owner"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the submissions table (1:1 with registrations)."""
    op.create_table(
        "submissions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "registration_id",
            sa.String(length=36),
            sa.ForeignKey("registrations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("project_name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("repo_url", sa.String(length=500), nullable=False),
        sa.Column("demo_url", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("registration_id", name="uq_submissions_registration"),
    )
    op.create_index(
        "ix_submissions_registration_id", "submissions", ["registration_id"]
    )


def downgrade() -> None:
    """Drop the submissions table."""
    op.drop_index("ix_submissions_registration_id", table_name="submissions")
    op.drop_table("submissions")
