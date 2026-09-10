"""On-the-spot problem statement allocation.

Admin flips the switch → every team without an allocation receives exactly
ONE statement. A statement is never shared: once a team holds it, it is
skipped for everyone else. New teams registered while the switch is on are
allocated immediately.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import select

from app.models.problem_statement import ProblemStatement
from app.models.team import Team

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session


def is_enabled(db: "Session") -> bool:
    from app.services.site_settings import get_settings

    return bool(get_settings(db).auto_allocate_enabled)


def set_enabled(db: "Session", enabled: bool) -> None:
    from app.services.site_settings import update_settings
    from app.schemas.site_settings import SiteSettingsUpdate

    update_settings(db, SiteSettingsUpdate(auto_allocate_enabled=enabled))


def allocate_pending(db: "Session") -> dict:
    """Allocate one unique statement per unallocated team.

    A statement is never shared: once a team holds it, it is skipped for
    everyone else.

    Returns counts: ``allocated``, ``teams_waiting`` (no free statement left),
    ``statements_free``.
    """
    statements = list(db.scalars(select(ProblemStatement)))
    held = {
        t.problem_statement_id
        for t in db.scalars(select(Team))
        if t.problem_statement_id
    }

    # Statements nobody holds yet.
    free_statements = [s.id for s in statements if s.id not in held]

    teams = list(
        db.scalars(select(Team).where(Team.problem_statement_id.is_(None)))
    )

    allocated = 0
    for team in teams:
        if not free_statements:
            break
        statement_id = free_statements.pop(0)
        team.problem_statement_id = statement_id
        team.ps_allocated_at = datetime.utcnow()
        allocated += 1

    db.commit()

    return {
        "allocated": allocated,
        "teams_waiting": len(teams) - allocated,
        "statements_free": len(free_statements),
    }


def run_if_enabled(db: "Session") -> dict | None:
    """Hook used after team registration; allocates only when switch is on."""
    if is_enabled(db):
        return allocate_pending(db)
    return None
