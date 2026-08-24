"""email_messages — transactional outbox for Gmail automation

Revision ID: 0007_email_messages
Revises: 0006_registration_status
Create Date: 2026-08-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0007_email_messages"
down_revision: Union[str, Sequence[str], None] = "0006_registration_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Every notification is rendered and persisted before delivery."""
    op.create_table(
        "email_messages",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("template", sa.String(length=60), nullable=False, comment="Template key, e.g. registration_confirmation"),
        sa.Column("to_email", sa.String(length=320), nullable=False),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="queued", comment="queued | sent | logged | failed"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("registration_id", sa.String(length=36), sa.ForeignKey("registrations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_email_messages_status", "email_messages", ["status"])
    op.create_index("ix_email_messages_registration", "email_messages", ["registration_id"])


def downgrade() -> None:
    """Remove the outbox table."""
    op.drop_index("ix_email_messages_registration", table_name="email_messages")
    op.drop_index("ix_email_messages_status", table_name="email_messages")
    op.drop_table("email_messages")
