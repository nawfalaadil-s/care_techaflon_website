"""Certificate automation: upload one award file, auto-email it to
participants of approved teams through the transactional outbox.

Also exposes an admin-focused operational surface: a delivery summary,
per-team/per-recipient audit, certificate history (rollback to an older
design), targeted re-sends, HTML preview and email-transport status.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from urllib.parse import quote

from app.core.dependencies import get_current_admin, get_current_user
from app.database.base import get_db
from app.models.certificate import Certificate
from app.models.email_message import EmailMessage
from app.models.team import Team
from app.models.user import User
from app.services import certificate_art, email
from app.services.email import certificate_already_sent, resend_message
from app.services.team import get_team_for_leader
from app.workers.email_tasks import task_send_team_certificates

router = APIRouter(prefix="/certificates", tags=["certificates"])

ALLOWED_CONTENT_TYPES = {"application/pdf", "image/png", "image/jpeg"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB is plenty for a certificate design

_DELIVERED_STATUSES = ("sent", "logged")


def _active_certificate(db: Session) -> Certificate | None:
    return db.scalar(select(Certificate).where(Certificate.active.is_(True)))


def _get_certificate(db: Session, certificate_id: str) -> Certificate:
    certificate = db.get(Certificate, certificate_id)
    if certificate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found.",
        )
    return certificate


def _meta(certificate: Certificate) -> dict:
    return {
        "id": certificate.id,
        "filename": certificate.filename,
        "content_type": certificate.content_type,
        "size_bytes": certificate.size_bytes,
        "uploaded_by": certificate.uploaded_by,
        "created_at": certificate.created_at.isoformat(),
    }


def _team_recipients(team: Team) -> list[tuple[str, str]]:
    """[(email, name), ...] for a team, deduplicated case-insensitively."""
    recipients: list[tuple[str, str]] = [(team.leader_email, team.leader_name)]
    seen = {team.leader_email.strip().lower()}
    for member in team.members or []:
        if not isinstance(member, dict):
            continue
        address = str(member.get("email", "")).strip().lower()
        if address and address not in seen:
            seen.add(address)
            recipients.append((str(member.get("email")), str(member.get("name", ""))))
    return recipients


def _approved_teams(db: Session) -> list[Team]:
    return list(db.scalars(select(Team).where(Team.status == "approved")))


def _award_rows(db: Session, certificate_id: str) -> list[EmailMessage]:
    """Outbox rows for this certificate's award mail, insertion order."""
    return list(
        db.scalars(
            select(EmailMessage)
            .where(EmailMessage.template == "certificate_award")
            .where(EmailMessage.certificate_id == certificate_id)
            .order_by(EmailMessage.created_at)
        )
    )


def _metrics(db: Session, certificate: Certificate) -> dict:
    """Aggregate delivery counts for one certificate.

    ``delivered_emails`` / ``failed_emails`` track the latest status per
    recipient so audits reflect the most recent attempt (a retry moves a
    recipient from failed to delivered).
    """
    latest: dict[str, str] = {}
    counts = {"sent": 0, "logged": 0, "queued": 0, "failed": 0}
    for row in _award_rows(db, certificate.id):
        key = row.to_email.strip().lower()
        latest[key] = row.status
        counts[row.status] = counts.get(row.status, 0) + 1
    delivered = {k for k, v in latest.items() if v in _DELIVERED_STATUSES}
    failed = {k for k, v in latest.items() if v == "failed"}
    return {**counts, "delivered_emails": delivered, "failed_emails": failed}


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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must contain the certificate file bytes.",
        )
    if len(data) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Certificate exceeds the {MAX_BYTES // (1024 * 1024)} MB limit.",
        )
    content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No certificate has been uploaded yet.",
        )
    return _meta(certificate)


def _filename_for(team_id: str, content_type: str) -> str:
    """Build a friendly download name like ``TFLN-2026-007-certificate.pdf``."""
    extension = {
        "application/pdf": ".pdf",
        "image/png": ".png",
        "image/jpeg": ".jpg",
    }.get(content_type, "")
    return f"{team_id}-certificate{extension}"


@router.get("/mine", response_model=dict)
def my_certificate(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    """Leader-facing certificate status for their own team.

    Returns whether a participation certificate is downloadable right now,
    plus the personalized award view (same HTML every participant receives
    by email) once the team is approved and an active file exists.
    """
    team = get_team_for_leader(db, current)
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No team found for your account.",
        )

    team_block = {
        "id": team.id,
        "team_id": team.team_id,
        "team_name": team.team_name,
        "status": team.status,
    }

    certificate = _active_certificate(db)
    available = team.status == "approved" and certificate is not None
    reason: str | None = None
    if team.status != "approved":
        reason = "team_not_approved"
    elif certificate is None:
        reason = "no_active_certificate"

    preview_html: str | None = None
    if available and certificate is not None:
        preview_html = email.render_certificate_preview(
            team.leader_name,
            team.team_name,
            team.team_id,
            certificate.filename,
        )

    return {
        "team": team_block,
        "available": available,
        "reason": reason,
        "certificate": _meta(certificate) if certificate else None,
        "download_filename": (
            _filename_for(team.team_id, certificate.content_type)
            if certificate
            else None
        ),
        "preview_html": preview_html,
    }


@router.get("/mine/download")
def download_my_certificate(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Response:
    """Download the team certificate file (approved leaders only).

    Entitlement follows the same rules as the email automation: the leader's
    team must be approved and an active certificate must exist. Any admin can
    still use ``/{certificate_id}/download`` for audit purposes.
    """
    team = get_team_for_leader(db, current)
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No team found for your account.",
        )
    if team.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your team has not been approved yet.",
        )
    certificate = _active_certificate(db)
    if certificate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No certificate is available right now.",
        )
    return Response(
        content=certificate.data,
        media_type=certificate.content_type,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{_filename_for(team.team_id, certificate.content_type)}"'
            )
        },
    )


def _is_image_template(content_type: str) -> bool:
    return content_type in ("image/png", "image/jpeg")


@router.get("/mine/participants", response_model=dict)
def my_team_participants(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    """Every participant of the leader's team with THEIR OWN certificate.

    Each entry carries a personalized HTML view (browser Save-as-PDF /
    print) and — when the active template is a PNG/JPEG and Pillow is
    installed — an ``image_url`` pointing at their name-composited PNG.
    """
    team = get_team_for_leader(db, current)
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No team found for your account.",
        )

    certificate = _active_certificate(db)
    approved = team.status == "approved"
    available = approved and certificate is not None

    if not available or certificate is None:
        return {
            "team": {"team_id": team.team_id, "team_name": team.team_name, "status": team.status},
            "available": False,
            "reason": "team_not_approved" if not approved else "no_active_certificate",
            "image_composition_enabled": False,
            "participants": [],
        }

    composable = certificate_art.PILLOW_AVAILABLE and _is_image_template(certificate.content_type)

    participants: list[dict] = []
    for address, name in _team_recipients(team):
        display = name or "Participant"
        participants.append(
            {
                "email": address,
                "name": display,
                "is_leader": address == team.leader_email.strip().lower(),
                # Personalized HTML variant (mirrors the emailed award mail).
                "personalized_html": email.render_certificate_preview(
                    display, team.team_name, team.team_id, certificate.filename
                ),
                "personalized_png_available": composable,
                "image_url": (
                    "/certificates/mine/participant-image?email=" + quote(address)
                    if composable
                    else None
                ),
            }
        )

    return {
        "team": {"team_id": team.team_id, "team_name": team.team_name, "status": team.status},
        "available": True,
        "reason": None,
        "template_filename": certificate.filename,
        "template_content_type": certificate.content_type,
        "image_composition_enabled": composable,
        "participants": participants,
    }


@router.get("/mine/participant-image")
def download_participant_image(
    email_query: str = Query(alias="email"),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Response:
    """Download one participant's personalized PNG certificate.

    Only the owning leader (or an admin) may fetch it, and only for emails
    that actually belong to their approved team.
    """
    team = get_team_for_leader(db, current)
    if team is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No team found for your account.")
    if team.status != "approved":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, detail="Your team has not been approved yet."
        )

    requested = email_query.strip().lower()
    allowed = {address.strip().lower() for address, _ in _team_recipients(team)}
    if requested not in allowed:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="That participant does not belong to your team.",
        )

    certificate = _active_certificate(db)
    if certificate is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No certificate is available right now.")

    if not certificate_art.PILLOW_AVAILABLE:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            detail="Personalized image rendering requires Pillow on the server; "
            "use the per-participant HTML certificate instead.",
        )
    if not _is_image_template(certificate.content_type):
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="The active template is not an image; personalized PNGs "
            "cannot be composed from PDF templates. Use the HTML certificate.",
        )

    participants = {a.lower(): n for a, n in _team_recipients(team)}
    display_name = participants.get(requested) or "Participant"

    try:
        png_bytes, media_type = certificate_art.compose_certificate_image(
            certificate.data,
            certificate.content_type,
            name=display_name,
            team_id=team.team_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    filename = f"{team.team_id}-{certificate_art.slugify_filename(display_name)}-certificate.png"
    return Response(
        content=png_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/email-status", response_model=dict)
def email_status(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Whether outbound mail will actually be delivered right now."""
    _ = current
    certificate = _active_certificate(db)
    return {
        "email": email.email_transport_status(),
        "certificate_active": certificate is not None,
    }


@router.get("/delivery-summary", response_model=dict)
def delivery_summary(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Coverage report for the active certificate: how many of the planned
    recipients have actually received (or been logged for) it."""
    _ = current
    certificate = _active_certificate(db)

    approved_teams = _approved_teams(db)
    planned: set[str] = set()
    for team in approved_teams:
        for address, _name in _team_recipients(team):
            planned.add(address.strip().lower())

    if certificate is None:
        return {
            "certificate_id": None,
            "approved_teams": len(approved_teams),
            "planned_recipients": len(planned),
            "delivered_recipients": 0,
            "delivered_percent": 0.0,
            "sent": 0,
            "logged": 0,
            "queued": 0,
            "failed": 0,
            "delivered_recipients_list": [],
            "failed_recipients_list": [],
        }

    metrics = _metrics(db, certificate)
    delivered = metrics["delivered_emails"] & planned
    percent = (len(delivered) / len(planned) * 100.0) if planned else 0.0
    return {
        "certificate_id": certificate.id,
        "approved_teams": len(approved_teams),
        "planned_recipients": len(planned),
        "delivered_recipients": len(delivered),
        "delivered_percent": round(percent, 1),
        "sent": metrics["sent"],
        "logged": metrics["logged"],
        "queued": metrics["queued"],
        "failed": metrics["failed"],
        "delivered_recipients_list": sorted(delivered),
        "failed_recipients_list": sorted(metrics["failed_emails"]),
    }


@router.get("/history", response_model=dict)
def certificate_history(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Every certificate ever uploaded, newest first, with send metrics."""
    _ = current
    certificates = db.scalars(
        select(Certificate).order_by(Certificate.created_at.desc())
    )
    items = []
    for c in certificates:
        metrics = _metrics(db, c)
        items.append(
            {
                "active": c.active,
                "id": c.id,
                "filename": c.filename,
                "content_type": c.content_type,
                "size_bytes": c.size_bytes,
                "uploaded_by": c.uploaded_by,
                "created_at": c.created_at.isoformat(),
                "recipients_sent": len(metrics["delivered_emails"]),
                "recipients_failed": len(metrics["failed_emails"]),
                "mail_sent": metrics["sent"],
                "mail_logged": metrics["logged"],
                "mail_queued": metrics["queued"],
                "mail_failed": metrics["failed"],
            }
        )
    return {"items": items, "total": len(items)}


@router.get("/{certificate_id}/download")
def download_certificate(
    certificate_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> Response:
    """Download a stored certificate file (admin only)."""
    certificate = _get_certificate(db, certificate_id)
    return Response(
        content=certificate.data,
        media_type=certificate.content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{certificate.filename}"'
        },
    )


@router.get("/{certificate_id}/preview-html", response_model=dict)
def preview_html(
    certificate_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Render the personalized award mail for a real approved team (or a
    sample recipient) so organisers can eyeball the design before sending."""
    _ = current
    certificate = _get_certificate(db, certificate_id)

    sample_team = db.scalars(
        select(Team).where(Team.status == "approved").limit(1)
    ).first()
    if sample_team is not None:
        name = sample_team.leader_name
        team_name = sample_team.team_name
        team_id = sample_team.team_id
    else:
        name = "Sample Participant"
        team_name = "Sample Squad"
        team_id = "TFLN-2026-SAMPLE"

    return {
        "certificate_id": certificate.id,
        "recipient_name": name,
        "team_name": team_name,
        "team_id": team_id,
        "html": email.render_certificate_preview(
            name, team_name, team_id, certificate.filename
        ),
    }


@router.delete("/current", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_certificate(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> Response:
    """Deactivate the active certificate — approvals stop mailing files (audit
    history and this file remain retrievable)."""
    for existing in db.scalars(select(Certificate).where(Certificate.active.is_(True))):
        existing.active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{certificate_id}/activate", response_model=dict)
def activate_certificate(
    certificate_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Re-activate an older certificate: future approvals + re-sends use it."""
    _ = current
    certificate = _get_certificate(db, certificate_id)

    for existing in db.scalars(select(Certificate).where(Certificate.active.is_(True))):
        existing.active = False
    certificate.active = True
    db.commit()
    db.refresh(certificate)
    return _meta(certificate)


@router.get("/teams", response_model=dict)
def approved_teams_status(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Per-team delivery status for the active certificate (admin only)."""
    _ = current
    certificate = _active_certificate(db)
    certificate_id = certificate.id if certificate else None

    if certificate is None:
        metrics: dict = {
            "delivered_emails": set(), "failed_emails": set(), "sent": 0,
            "logged": 0, "queued": 0, "failed": 0,
        }
    else:
        metrics = _metrics(db, certificate)

    teams = []
    for team in _approved_teams(db):
        delivered = 0
        recipients: list[dict] = []
        for address, name in _team_recipients(team):
            key = address.strip().lower()
            if key in metrics["delivered_emails"]:
                status_key = "sent"
                delivered += 1
            elif key in metrics["failed_emails"]:
                status_key = "failed"
            else:
                status_key = "unsent"
            recipients.append(
                {
                    "email": address,
                    "name": name,
                    "status": status_key,
                    "delivered": status_key in _DELIVERED_STATUSES,
                }
            )
        teams.append(
            {
                "team_id": team.team_id,
                "team_name": team.team_name,
                "theme": team.theme,
                "status": team.status,
                "recipient_total": len(recipients),
                "delivered": delivered,
                "recipients": recipients,
            }
        )

    return {
        "certificate_id": certificate_id,
        "delivered": len(metrics["delivered_emails"]),
        "failed": len(metrics["failed_emails"]),
        "sent": metrics["sent"],
        "logged": metrics["logged"],
        "queued": metrics["queued"],
        "failed_mail_count": metrics["failed"],
        "teams": teams,
    }


@router.post("/{certificate_id}/send-team/{team_id}", response_model=dict)
def send_team_certificate(
    certificate_id: str,
    team_id: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Send a specific certificate to one team's participants (admin only).

    Works for historical certificates too; the outbox idempotency check
    still prevents duplicates for anyone who already received *this* file.
    """
    _ = current
    _get_certificate(db, certificate_id)
    team = db.get(Team, team_id)
    if team is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Team not found.")

    background.add_task(task_send_team_certificates, team.id, certificate_id)
    return {
        "certificate_id": certificate_id,
        "team_id": team_id,
        "team_name": team.team_name,
        "queued": True,
    }


@router.post("/resend-failed", response_model=dict)
def resend_failed_certificates(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Immediately retry every *failed* award mail for the active certificate
    (admin only). Delivered ones are untouched; re-failures are returned."""
    _ = current
    certificate = _active_certificate(db)
    if certificate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload a certificate first.",
        )

    failed = [
        row
        for row in _award_rows(db, certificate.id)
        if row.status == "failed" and row.certificate_id == certificate.id
    ]
    retried = 0
    still_failed: list[dict] = []
    for row in failed:
        refreshed = resend_message(db, row.id)
        retried += 1
        if refreshed.status == "failed":
            still_failed.append(
                {
                    "id": refreshed.id,
                    "to_email": refreshed.to_email,
                    "error": refreshed.error,
                }
            )

    return {
        "certificate_id": certificate.id,
        "retried": retried,
        "still_failed": still_failed,
        "now_delivered": retried - len(still_failed),
    }


@router.post("/send-all", response_model=dict)
def send_all_approved(
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_admin),
) -> dict:
    """Send the active certificate to every approved team (admin only).

    Recipients already emailed for this certificate are skipped, so the
    endpoint is safe to call more than once. Returns precise coverage counts.
    """
    _ = current
    certificate = _active_certificate(db)
    if certificate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload a certificate first.",
        )

    approved_teams = _approved_teams(db)
    queued = 0
    recipients_planned = 0
    recipients_skipped = 0

    for team in approved_teams:
        team_recipients = _team_recipients(team)
        recipients_planned += len(team_recipients)
        if all(
            certificate_already_sent(db, certificate.id, address)
            for address, _name in team_recipients
        ):
            recipients_skipped += len(team_recipients)
            continue
        background.add_task(task_send_team_certificates, team.id, certificate.id)
        queued += 1

    return {
        "certificate_id": certificate.id,
        "approved_teams": len(approved_teams),
        "teams_queued": queued,
        "recipients_planned": recipients_planned,
        "recipients_skipped": recipients_skipped,
        "recipients_to_send": recipients_planned - recipients_skipped,
    }