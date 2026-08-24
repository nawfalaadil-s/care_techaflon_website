from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin
from app.database.base import get_db
from app.models.user import User
from app.schemas.problem_statement import (
    ProblemStatementCreate,
    ProblemStatementResponse,
    ProblemStatementUpdate,
)
from app.services.problem_statement import (
    create,
    delete,
    list_all,
    update,
)
from app.services.problem_csv_import import parse_and_import
from app.services import allocation

router = APIRouter(prefix="/problems", tags=["problems"])


# ---------------------------------------------------------------------------
# Admin: CSV bulk upload + auto-allocation switch
# ---------------------------------------------------------------------------


class CsvUploadRequest(BaseModel):
    """Raw CSV text with header: title,summary,description,theme[,difficulty,sponsor]"""

    csv: str


class AutoAllocateRequest(BaseModel):
    enabled: bool


@router.post("/upload", response_model=dict, status_code=status.HTTP_201_CREATED)
def upload_problems_csv(
    payload: CsvUploadRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Bulk-import problem statements from CSV (organizer/admin only).

    Rows are stored as drafts — statements are never public; they become a
    team's private assignment via auto-allocate or manual allocation.
    """
    _ = current
    report = parse_and_import(db, payload.csv)
    return {
        "created": report.created,
        "skipped": report.skipped,
    }


@router.get("/auto-allocate", response_model=dict)
def auto_allocate_status(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Current auto-allocation state (organizer/admin only)."""
    from sqlalchemy import func, select

    from app.models.team import Team

    unallocated = (
        db.scalar(
            select(func.count())
            .select_from(Team)
            .where(Team.problem_statement_id.is_(None))
        )
        or 0
    )
    return {
        "enabled": allocation.is_enabled(db),
        "teams_waiting": unallocated,
        "last_result": None,
    }


@router.patch("/auto-allocate", response_model=dict)
def toggle_auto_allocate(
    payload: AutoAllocateRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Turn on-the-spot allocation on/off (organizer/admin only).

    Turning it ON allocates immediately: every waiting team gets one unique
    statement matched by its theme. Teams registered while ON are allocated
    at registration time.
    """
    _ = current
    allocation.set_enabled(db, payload.enabled)
    result = allocation.allocate_pending(db) if payload.enabled else None
    return {
        "enabled": allocation.is_enabled(db),
        "result": result,
    }


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------


@router.get("/all", response_model=list[ProblemStatementResponse])
def admin_list_problems(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> list[ProblemStatementResponse]:
    """Every statement including drafts (organizer/admin only)."""
    _ = current
    return [
        ProblemStatementResponse.model_validate(s) for s in list_all(db)
    ]


@router.get("", response_model=list[ProblemStatementResponse])
def browse_problems(
    track: str | None = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> list[ProblemStatementResponse]:
    """Admin listing with optional theme filter.

    Statements are private to the event: there is no anonymous browsing.
    Participants only ever see the single statement allocated to them.
    """
    _ = current
    items = [
        ProblemStatementResponse.model_validate(s) for s in list_all(db)
    ]
    if track:
        items = [i for i in items if i.track == track]
    return items


@router.get("/{statement_id}", response_model=ProblemStatementResponse)
def read_problem(
    statement_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> ProblemStatementResponse:
    """Single statement by ID (organizer/admin only)."""
    _ = current
    statement = list_all_lookup(db, statement_id)
    return ProblemStatementResponse.model_validate(statement)


def list_all_lookup(db: Session, statement_id: str):
    from app.models.problem_statement import ProblemStatement

    statement = db.get(ProblemStatement, statement_id)
    if statement is None:
        from fastapi import HTTPException

        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Problem statement not found.")
    return statement


@router.post(
    "",
    response_model=ProblemStatementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_problem(
    payload: ProblemStatementCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> ProblemStatementResponse:
    """Create a new statement draft (organizer/admin only)."""
    _ = current
    return ProblemStatementResponse.model_validate(create(db, payload))


@router.patch("/{statement_id}", response_model=ProblemStatementResponse)
def update_problem(
    statement_id: str,
    payload: ProblemStatementUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> ProblemStatementResponse:
    """Edit any field of a statement (organizer/admin only)."""
    _ = current
    return ProblemStatementResponse.model_validate(update(db, statement_id, payload))


@router.delete(
    "/{statement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_problem(
    statement_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> Response:
    """Remove a statement (organizer/admin only)."""
    _ = current
    delete(db, statement_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
