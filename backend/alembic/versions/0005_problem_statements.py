"""problem_statements — organizer-published challenges

Revision ID: 0005_problem_statements
Revises: 0004_submissions
Create Date: 2026-08-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0005_problem_statements"
down_revision: Union[str, Sequence[str], None] = "0004_submissions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_STATEMENTS = [
    {
        "id": "a1f0c9e2-1111-4a5b-9c8d-000000000001",
        "title": "Crop Yield Predictor",
        "summary": "Help small farmers forecast yields from weather and soil data.",
        "description": (
            "Build a tool that ingests local weather history, soil composition and "
            "crop choice to predict expected yield for the coming season. Stretch "
            "goals: regional price hints and irrigation suggestions. Judging "
            "focuses on model quality with sparse data and a usable farmer-facing UI."
        ),
        "track": "ai-ml",
        "difficulty": "easy",
        "sponsor": None,
        "published": True,
    },
    {
        "id": "a1f0c9e2-1111-4a5b-9c8d-000000000002",
        "title": "Medical Triage Assistant",
        "summary": "Prototype an intake assistant that prioritizes clinic queues safely.",
        "description": (
            "Create an assistant that reads symptom checklists (no diagnosis) and "
            "assigns a conservative priority score for clinic waiting rooms. The "
            "solution must fail safe: low confidence always escalates to a human. "
            "Explainability of every score is a hard requirement."
        ),
        "track": "ai-ml",
        "difficulty": "hard",
        "sponsor": "MediTech Labs",
        "published": True,
    },
    {
        "id": "a1f0c9e2-1111-4a5b-9c8d-000000000003",
        "title": "Campus Lost & Found PWA",
        "summary": "A progressive web app connecting found items with their owners.",
        "description": (
            "Design a mobile-first PWA where students post found items with photos "
            "and claim lost ones via match suggestions. Include verification "
            "questions before revealing owner contact details and moderate spam."
        ),
        "track": "web",
        "difficulty": "easy",
        "sponsor": None,
        "published": True,
    },
    {
        "id": "a1f0c9e2-1111-4a5b-9c8d-000000000004",
        "title": "Accessibility-First Event Hub",
        "summary": "An events platform where WCAG AA is a feature, not a checklist.",
        "description": (
            "Build a campus events hub that treats accessibility as the core "
            "feature: full keyboard navigation, screen-reader tested flows, high "
            "contrast themes and captions support. Ship an automated a11y test "
            "suite alongside the app."
        ),
        "track": "web",
        "difficulty": "medium",
        "sponsor": "InclusiveWeb",
        "published": True,
    },
    {
        "id": "a1f0c9e2-1111-4a5b-9c8d-000000000005",
        "title": "Offline Study Groups",
        "summary": "Sync-first mobile app for study groups with flaky campus Wi-Fi.",
        "description": (
            "Create an app where study groups share notes, tasks and schedules and "
            "everything works offline first, syncing when connectivity returns. "
            "Conflict resolution strategy is part of the judging criteria."
        ),
        "track": "mobile",
        "difficulty": "medium",
        "sponsor": None,
        "published": True,
    },
    {
        "id": "a1f0c9e2-1111-4a5b-9c8d-000000000006",
        "title": "Smart E-Waste Tracker",
        "summary": "Map, schedule and reward responsible e-waste disposal.",
        "description": (
            "Build a system that maps drop-off points, lets users schedule pickups "
            "of broken electronics and gamifies verified recycling. Partner APIs "
            "may be simulated; the recycling loop must be auditable end-to-end."
        ),
        "track": "sustainability",
        "difficulty": "medium",
        "sponsor": "GreenFuture Foundation",
        "published": True,
    },
]


def upgrade() -> None:
    """Create the problem statements table and seed published challenges."""
    op.create_table(
        "problem_statements",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("track", sa.String(length=64), nullable=False),
        sa.Column("difficulty", sa.String(length=20), nullable=False, server_default="medium"),
        sa.Column("sponsor", sa.String(length=120), nullable=True),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_problem_statements_track", "problem_statements", ["track"])

    statements = sa.table(
        "problem_statements",
        sa.column("id", sa.String),
        sa.column("title", sa.String),
        sa.column("summary", sa.String),
        sa.column("description", sa.String),
        sa.column("track", sa.String),
        sa.column("difficulty", sa.String),
        sa.column("sponsor", sa.String),
        sa.column("published", sa.Boolean),
    )
    op.bulk_insert(statements, SEED_STATEMENTS)


def downgrade() -> None:
    """Drop seeded content and the table."""
    op.drop_index("ix_problem_statements_track", table_name="problem_statements")
    op.drop_table("problem_statements")
