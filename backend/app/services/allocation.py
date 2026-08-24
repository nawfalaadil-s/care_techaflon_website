"""On-the-spot problem statement allocation.

Admin flips the switch → every team without an allocation receives exactly
ONE statement, matched by theme first. A statement is never shared: once a
team holds it, it is skipped for everyone else. New teams registered while
the switch is on are allocated immediately.
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
    """Allocate one unique statement per unallocated team (theme match first).

    Returns counts: ``allocated``, ``teams_waiting`` (no free statement left
    for their theme), ``statements_free``.
    """
    statements = list(db.scalars(select(ProblemStatement)))
    held = {
        t.problem_statement_id
        for t in db.scalars(select(Team))
        if t.problem_statement_id
    }

    # Statements nobody holds yet, grouped by theme (track).
    free_by_theme: dict[str, list[str]] = {}
    for s in statements:
        if s.id not in held:
            free_by_theme.setdefault(s.track, []).append(s.id)

    teams = list(
        db.scalars(select(Team).where(Team.problem_statement_id.is_(None)))
    )

    allocated = 0
    for team in teams:
        pool = free_by_theme.get(team.theme, [])
        if not pool:
            continue  # no unique idea left for this theme — stays waiting
        statement_id = pool.pop(0)
        team.problem_statement_id = statement_id
        team.ps_allocated_at = datetime.utcnow()
        allocated += 1

    db.commit()

    return {
        "allocated": allocated,
        "teams_waiting": len(teams) - allocated,
        "statements_free": sum(len(v) for v in free_by_theme.values()),
    }


def run_if_enabled(db: "Session") -> dict | None:
    """Hook used after team registration; allocates only when switch is on."""
    if is_enabled(db):
        return allocate_pending(db)
    return None
