"""CSV import for problem statements (admin).

Expected header row (case-insensitive, order-free):

    title,summary,description,theme,difficulty,sponsor

* ``theme`` accepts ``ai-ml`` / ``web`` / ``app`` (alias ``track`` also works).
* ``difficulty`` is optional — one of easy/medium/hard (default: medium).
* ``sponsor`` is optional.
* Rows are imported as DRAFTS: nothing becomes public automatically, and
  statements stay invisible to participants until allocated by the
  auto-allocation switch or manually from the CRM.
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from fastapi import HTTPException, status

from app.models.problem_statement import ProblemStatement
from app.schemas.team import TEAM_THEMES


def _next_id(db, track: str) -> str:
    from app.services.problem_statement import generate_statement_id

    return generate_statement_id(db, track)

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session

DIFFICULTIES = {"easy", "medium", "hard"}

# Header aliases → canonical column names.
COLUMN_ALIASES = {
    "title": "title",
    "name": "title",
    "summary": "summary",
    "short_description": "summary",
    "description": "description",
    "details": "description",
    "theme": "theme",
    "track": "theme",
    "category": "theme",
    "difficulty": "difficulty",
    "level": "difficulty",
    "sponsor": "sponsor",
}

REQUIRED = ("title", "summary", "description", "theme")


@dataclass
class ImportReport:
    created: int = 0
    skipped: list[str] = field(default_factory=list)


def parse_and_import(db: "Session", csv_content: str) -> ImportReport:
    """Parse CSV text and insert draft statements. Returns a report."""
    reader = csv.DictReader(io.StringIO(csv_content))
    if not reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The CSV file appears to be empty.",
        )

    # Normalise headers through the alias map.
    canonical: dict[str, str | None] = {}
    for raw in reader.fieldnames:
        key = raw.strip().lower().replace(" ", "_")
        canonical[raw] = COLUMN_ALIASES.get(key)

    missing = [c for c in REQUIRED if c not in {v for v in canonical.values() if v}]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Missing required column(s): "
                + ", ".join(missing)
                + ". Expected header: title,summary,description,theme"
                " (difficulty and sponsor optional)."
            ),
        )

    report = ImportReport()

    for line_no, raw_row in enumerate(reader, start=2):  # header is line 1
        row = {
            canonical[raw]: (value or "").strip()
            for raw, value in raw_row.items()
            if canonical.get(raw)
        }
        if not any(row.values()):
            continue  # blank line

        problems: list[str] = []
        for col in REQUIRED:
            if len(row.get(col, "")) < 3:
                problems.append(f"{col} is required")

        theme = row.get("theme", "").strip().lower()
        if theme not in TEAM_THEMES:
            problems.append(
                f"theme must be one of: {', '.join(sorted(TEAM_THEMES))}"
            )

        difficulty = row.get("difficulty", "medium").strip().lower()
        if difficulty not in DIFFICULTIES:
            difficulty = "medium"

        if problems:
            label = row.get("title", "") or f"line {line_no}"
            report.skipped.append(f"{label}: " + "; ".join(problems))
            continue

        db.add(
            ProblemStatement(
                id=_next_id(db, theme),
                title=row["title"][:120],
                summary=row["summary"],
                description=row["description"],
                track=theme,
                difficulty=difficulty,
                sponsor=(row.get("sponsor") or None) or None,
                published=False,
            )
        )
        # Flush so the next generated ID accounts for this row.
        db.flush()
        report.created += 1

    db.commit()
    return report
