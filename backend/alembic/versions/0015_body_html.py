"""Add body_html column to email_messages for themed HTML delivery.

Revision ID: 0015_body_html
Revises: 0014_certificates
"""

from alembic import op
import sqlalchemy as sa

revision = "0015_body_html"
down_revision = "0014_certificates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "email_messages",
        sa.Column("body_html", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("email_messages", "body_html")
