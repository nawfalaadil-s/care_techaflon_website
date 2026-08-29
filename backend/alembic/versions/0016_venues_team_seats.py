"""venues and team_seats — physical venues with seat assignments for teams.

Revision ID: 0016_venues_team_seats
Revises: 0015_body_html
"""

from alembic import op
import sqlalchemy as sa

revision = "0016_venues_team_seats"
down_revision = "0015_body_html"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "venues",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("location", sa.String(500), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()
        ),
    )
    op.create_index("ix_venues_name", "venues", ["name"])

    op.create_table(
        "team_seats",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "venue_id",
            sa.String(36),
            sa.ForeignKey("venues.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "team_id",
            sa.String(36),
            sa.ForeignKey("teams.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("seat_number", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()
        ),
    )
    op.create_index("ix_team_seats_venue_id", "team_seats", ["venue_id"])
    op.create_index("ix_team_seats_team_id", "team_seats", ["team_id"])
    op.create_unique_constraint("uq_venue_seat", "team_seats", ["venue_id", "seat_number"])
    op.create_unique_constraint("uq_team_seat", "team_seats", ["team_id"])


def downgrade() -> None:
    op.drop_constraint("uq_team_seat", "team_seats", type_="unique")
    op.drop_constraint("uq_venue_seat", "team_seats", type_="unique")
    op.drop_index("ix_team_seats_team_id", table_name="team_seats")
    op.drop_index("ix_team_seats_venue_id", table_name="team_seats")
    op.drop_table("team_seats")
    op.drop_index("ix_venues_name", table_name="venues")
    op.drop_table("venues")