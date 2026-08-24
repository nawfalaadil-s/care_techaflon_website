"""registrations.owner_id — link teams to accounts

Revision ID: 0003_teams_owner
Revises: 0002_users
Create Date: 2026-08-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_teams_owner"
down_revision: Union[str, Sequence[str], None] = "0002_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add nullable owner_id FK so a team leader can own their registration."""
    op.add_column(
        "registrations",
        sa.Column("owner_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_registrations_owner_id_users",
        "registrations",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_registrations_owner_id", "registrations", ["owner_id"]
    )


def downgrade() -> None:
    """Remove the owner link."""
    op.drop_index("ix_registrations_owner_id", table_name="registrations")
    op.drop_constraint(
        "fk_registrations_owner_id_users",
        "registrations",
        type_="foreignkey",
    )
    op.drop_column("registrations", "owner_id")
