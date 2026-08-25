"""certificates — organizer-uploaded award file + outbox attachment link.

Revision ID: 0014_certificates
Revises: 0013_statement_fk_setnull
"""

from alembic import op
import sqlalchemy as sa

revision = "0014_certificates"
down_revision = "0013_statement_fk_setnull"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "certificates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(120), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("uploaded_by", sa.String(320), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_certificates_active", "certificates", ["active"])

    op.add_column(
        "email_messages", sa.Column("certificate_id", sa.String(36), nullable=True)
    )
    op.create_index(
        "ix_email_messages_certificate_id",
        "email_messages",
        ["certificate_id"],
    )
    op.create_foreign_key(
        "fk_email_messages_certificate_id",
        "email_messages",
        "certificates",
        ["certificate_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_email_messages_certificate_id", "email_messages", type_="foreignkey"
    )
    op.drop_index("ix_email_messages_certificate_id", table_name="email_messages")
    op.drop_column("email_messages", "certificate_id")
    op.drop_index("ix_certificates_active", table_name="certificates")
    op.drop_table("certificates")
