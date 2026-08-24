"""Organizer statistics for the admin CRM: overview + analytics.

Both aggregates are computed from the TechAFlon ``teams`` flow (the legacy
``registrations`` table is dead and no longer consulted).
"""

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from sqlalchemy import func, select

from app.models.email_message import EmailMessage
from app.models.problem_statement import ProblemStatement
from app.models.submission import Submission
from app.models.team import Team
from app.models.user import User

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session


def overview(db: "Session") -> dict:
    """Aggregate CRM numbers in one payload (small-scale friendly)."""
    rows = db.execute(
        select(Team.status, Team.theme, Team.members)
    ).all()

    by_status = Counter(row[0] or "pending" for row in rows)
    by_theme = Counter(row[1] for row in rows)
    # Members = leader + additional members.
    members_total = sum(1 + len(row[2] or []) for row in rows)

    submissions_total = db.scalar(select(func.count()).select_from(Submission)) or 0
    problems_total = (
        db.scalar(select(func.count()).select_from(ProblemStatement)) or 0
    )
    problems_published = (
        db.scalar(
            select(func.count())
            .select_from(ProblemStatement)
            .where(ProblemStatement.published.is_(True))
        )
        or 0
    )
    allocated_statements = (
        db.scalar(
            select(func.count())
            .select_from(Team)
            .where(Team.problem_statement_id.is_not(None))
        )
        or 0
    )
    users_total = db.scalar(select(func.count()).select_from(User)) or 0
    organizers_total = (
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.is_admin.is_(True) | User.role.in_(("organizer", "admin")))
        )
        or 0
    )

    return {
        "teams": {
            "total": len(rows),
            "by_status": dict(by_status),
            "by_theme": dict(by_theme),
        },
        "members_total": members_total,
        "submissions": submissions_total,
        "problem_statements": {
            "total": problems_total,
            "published": problems_published,
        },
        "allocated_statements": allocated_statements,
        "users": {"total": users_total, "organizers": organizers_total},
    }


def analytics(db: "Session", *, days: int = 30) -> dict:
    """Deeper trends for the analytics page (organizer/admin only).

    Everything is computed from a handful of small queries — the event
    scale (hundreds of teams) makes Python-side aggregation cheaper and
    clearer than window-function SQL.
    """
    teams = list(db.scalars(select(Team)))
    submissions = list(db.scalars(select(Submission)))
    emails = list(db.scalars(select(EmailMessage)))

    # --- Registrations over time (last ``days`` days, zero-filled) ---
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    per_day: dict[str, int] = {
        (start + timedelta(days=i)).isoformat(): 0 for i in range(days)
    }
    for team in teams:
        day = team.created_at.date().isoformat() if team.created_at else None
        if day in per_day:
            per_day[day] += 1

    # --- Review funnel: status counts + submission conversion ---
    by_status = Counter(t.status or "pending" for t in teams)
    submitted_team_ids = {s.registration_id for s in submissions}
    approved_ids = {t.id for t in teams if t.status == "approved"}
    total = len(teams)

    # --- Department leaderboard (TechAFlon is intra-college) ---
    departments: Counter = Counter(
        t.leader_department.strip() for t in teams if t.leader_department
    )

    # --- Theme performance: teams vs submissions vs approval rate ---
    theme_teams: Counter = Counter(t.theme for t in teams)
    theme_submissions: Counter = Counter()
    theme_approved: Counter = Counter()
    for t in teams:
        if t.id in submitted_team_ids:
            theme_submissions[t.theme] += 1
        if t.status == "approved":
            theme_approved[t.theme] += 1

    # --- Problem statement adoption (via allocated ids) ---
    published = list(
        db.scalars(select(ProblemStatement).where(ProblemStatement.published.is_(True)))
    )
    title_by_id = {p.id: p.title for p in published}
    statement_usage: Counter = Counter(
        title_by_id.get(t.problem_statement_id, t.problem_statement_id)
        for t in teams
        if t.problem_statement_id
    )

    # --- Email delivery health ---
    email_status = Counter(m.status for m in emails)

    return {
        "window_days": days,
        "teams_over_time": [
            {"date": day, "count": count} for day, count in per_day.items()
        ],
        "funnel": {
            "registered": total,
            "approved": by_status.get("approved", 0),
            "rejected": by_status.get("rejected", 0),
            "disqualified": by_status.get("disqualified", 0),
            "submitted": len(submitted_team_ids),
            "approval_rate": round(by_status.get("approved", 0) / total, 4) if total else 0.0,
            "submission_rate": (
                round(len(submitted_team_ids & approved_ids) / max(len(approved_ids), 1), 4)
                if total
                else 0.0
            ),
        },
        "departments": [
            {"name": name, "teams": count}
            for name, count in departments.most_common(10)
        ],
        "themes": [
            {
                "theme": theme,
                "teams": count,
                "submissions": theme_submissions.get(theme, 0),
                "approved": theme_approved.get(theme, 0),
            }
            for theme, count in theme_teams.most_common()
        ],
        "problem_adoption": {
            "adopted_total": sum(statement_usage.values()),
            "statements": [
                {
                    "title": p.title,
                    "track": p.track,
                    "teams": statement_usage.get(p.title, 0),
                }
                for p in published
            ],
            "unallocated_teams": sum(
                1 for t in teams if not t.problem_statement_id
            ),
        },
        "emails": {
            "total": len(emails),
            "by_status": dict(email_status),
        },
    }
