"""Problem statement service — public reads, admin writes."""

from typing import TYPE_CHECKING

from fastapi import HTTPException, status
from sqlalchemy import select

from app.models.problem_statement import ProblemStatement
from app.schemas.problem_statement import (
    ProblemStatementCreate,
    ProblemStatementUpdate,
)

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session


def list_published(db: "Session") -> list[ProblemStatement]:
    """Published statements (newest first)."""
    query = (
        select(ProblemStatement)
        .where(ProblemStatement.published.is_(True))
        .order_by(ProblemStatement.created_at.desc())
    )
    return list(db.scalars(query))


def list_all(db: "Session") -> list[ProblemStatement]:
    """Every statement including drafts — admin CRM view."""
    return list(
        db.scalars(
            select(ProblemStatement).order_by(ProblemStatement.created_at.desc())
        )
    )


def get_published(db: "Session", statement_id: str) -> ProblemStatement:
    """Fetch a single published statement; drafts 404 like missing ones."""
    statement = db.get(ProblemStatement, statement_id)
    if statement is None or not statement.published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem statement not found.",
        )
    return statement


def generate_statement_id(db: "Session", track: str | None) -> str:
    """Next readable ID for a statement: PS-GEN-<###>.

    Uses 'GEN' prefix to avoid conflicts with old theme-based IDs.
    The number is a global sequence (count + 1) so IDs stay unique;
    collisions under concurrency fall back to a random tag.
    """
    import uuid as _uuid

    from sqlalchemy import func

    count = db.scalar(select(func.count()).select_from(ProblemStatement)) or 0
    
    # Try to find a free ID starting from count + 1
    # Use GEN- prefix to avoid conflicts with old theme-based IDs
    max_attempts = 100
    for attempt in range(max_attempts):
        number = int(count) + 1 + attempt
        candidate = f"PS-GEN-{number:03d}"
        if db.get(ProblemStatement, candidate) is None:
            return candidate
    
    # If all sequential IDs are taken, use a random one
    return f"PS-GEN-{_uuid.uuid4().hex[:4].upper()}"


def create(
    db: "Session", payload: ProblemStatementCreate
) -> ProblemStatement:
    statement = ProblemStatement(
        **payload.model_dump(),
        id=generate_statement_id(db, payload.track),
    )
    db.add(statement)
    db.commit()
    db.refresh(statement)
    return statement


def update(
    db: "Session", statement_id: str, payload: ProblemStatementUpdate
) -> ProblemStatement:
    statement = db.get(ProblemStatement, statement_id)
    if statement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem statement not found.",
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(statement, field, value)
    db.commit()
    db.refresh(statement)
    return statement


def delete(db: "Session", statement_id: str) -> None:
    statement = db.get(ProblemStatement, statement_id)
    if statement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem statement not found.",
        )
    db.delete(statement)
    db.commit()
