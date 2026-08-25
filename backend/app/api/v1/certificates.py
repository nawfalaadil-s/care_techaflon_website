"""Certificate automation: upload one award file, auto-email it to
participants of approved teams through the transactional outbox."""

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin
from app.database.base import get_db
from app.models.certificate import Certificate
from app.models.team import Team
from app.models.user import User
from app.services.email import certificate_already_sent
from app.workers.email_tasks import task_send_team_certificates

router = APIRouter(prefix="/certificates", tags=["certificates"])

ALLOWED_CONTENT_TYPES = {"application/pdf", "image/png", "image/jpeg"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB is plenty for a certificate design


def _active_certificate(db: Session) -> Certificate | None:
    return db.scalar(select(Certificate).where(Certificate.active.is_(True)))


def _meta(certificate: Certificate) -> dict:
    return {
        "id": certificate.id,
        "filename": certificate.filename,
        "content_type": certificate.content_type,
        "size_bytes": certificate.size_bytes,
        "uploaded_by": certificate.uploaded_by,
        "created_at": certificate.created_at.isoformat(),
    }


@router.post("/upload", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_certificate(
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Upload (or replace) the active certificate file (admin only).

    The raw file bytes form the request body; ``filename`` travels as a
    query parameter and the media type in the Content-Type header. Any
    previously active certificate is deactivated (kept for audit).
    """
    data = await request.body()
    if not data:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must contain the certificate file bytes.",
        )
    if len(data) > MAX_BYTES:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Certificate exceeds the {MAX_BYTES // (1024 * 1024)} MB limit.",
        )
    content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"content-type must be one of: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}.",
        )

    filename = (request.query_params.get("filename") or "certificate").strip()[:255]

    for existing in db.scalars(select(Certificate).where(Certificate.active.is_(True))):
        existing.active = False

    certificate = Certificate(
        filename=filename,
        content_type=content_type,
        size_bytes=len(data),
        data=data,
        active=True,
        uploaded_by=current.email,
    )
    db.add(certificate)
    db.commit()
    db.refresh(certificate)
    return _meta(certificate)


@router.get("/current", response_model=dict)
def current_certificate(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Metadata for the active certificate (admin only)."""
    certificate = _active_certificate(db)
    if certificate is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No certificate has been uploaded yet.",
        )
    return _meta(certificate)


@router.get("/{certificate_id}/download")
def download_certificate(
    certificate_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> Response:
    """Download a stored certificate file (admin only)."""
    certificate = db.get(Certificate, certificate_id)
    if certificate is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found.",
        )
    return Response(
        content=certificate.data,
        media_type=certificate.content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{certificate.filename}"'
        },
    )


@router.delete("/current", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_certificate(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> Response:
    """Deactivate the active certificate — approvals stop mailing files."""
    for existing in db.scalars(select(Certificate).where(Certificate.active.is_(True))):
        existing.active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/send-all", response_model=dict)
def send_all_approved(
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Mail the active certificate to every approved team (admin only).

    Recipients already emailed for this certificate are skipped, so the
    endpoint is safe to call more than once.
    """
    _ = current
    certificate = _active_certificate(db)
    if certificate is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload a certificate first.",
        )

    approved_teams = list(
        db.scalars(select(Team).where(Team.status == "approved"))
    )
    queued = 0
    for team in approved_teams:
        recipients = [team.leader_email]
        seen = {team.leader_email.strip().lower()}
        for member in team.members or []:
            if isinstance(member, dict):
                address = str(member.get("email", "")).strip().lower()
                if address and address not in seen:
                    seen.add(address)
                    recipients.append(str(member.get("email")))
        if any(
            not certificate_already_sent(db, certificate.id, address)
            for address in recipients
        ):
            background.add_task(task_send_team_certificates, team.id, certificate.id)
            queued += 1

    return {
        "certificate_id": certificate.id,
        "approved_teams": len(approved_teams),
        "teams_queued": queued,
    }
