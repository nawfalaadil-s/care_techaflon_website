"""site_settings — organizer-editable site configuration

Revision ID: 0008_site_settings
Revises: 0007_email_messages
Create Date: 2026-08-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0008_site_settings"
down_revision: Union[str, Sequence[str], None] = "0007_email_messages"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Key/value store so organizers can edit event facts from the CRM."""
    op.create_table(
        "site_settings",
        sa.Column("key", sa.String(length=60), primary_key=True),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Remove the settings table (defaults take over again)."""
    op.drop_table("site_settings")
