from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin
from app.database.base import get_db
from app.models.user import User
from app.models.venue import TeamSeat
from app.schemas.venue import (
    TeamBulkSeatAssign,
    TeamBulkUnassign,
    TeamSeatCreate,
    TeamSeatResponse,
    TeamSeatUpdate,
    VenueCreate,
    VenueResponse,
    VenueUpdate,
    VenueWithSeats,
)
from app.services.venue import (
    assign_team_to_seat,
    bulk_assign_teams_to_venue,
    bulk_unassign_teams,
    create_venue,
    delete_venue,
    get_available_seats,
    get_seat_by_team,
    get_seats_by_venue,
    get_venue_by_id,
    get_venue_by_name,
    get_venue_stats,
    list_venues,
    list_venues_with_seats,
    unassign_team_from_seat,
    update_venue,
)

router = APIRouter(prefix="/venues", tags=["venues"])


@router.post("", response_model=VenueResponse, status_code=status.HTTP_201_CREATED)
def create_venue_endpoint(
    payload: VenueCreate,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> VenueResponse:
    """Create a new venue (admin only)."""
    if get_venue_by_name(db, payload.name):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A venue with this name already exists.",
        )
    venue = create_venue(db, payload.name, payload.location, payload.capacity, payload.description)
    return VenueResponse.model_validate(venue)


@router.get("", response_model=list[VenueResponse])
def list_venues_endpoint(
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[VenueResponse]:
    """List all venues (admin only)."""
    venues = list_venues(db)
    return [VenueResponse.model_validate(v) for v in venues]


@router.get("/with-seats", response_model=list[VenueWithSeats])
def list_venues_with_seats_endpoint(
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[VenueWithSeats]:
    """List all venues with seat assignments (admin only)."""
    venues = list_venues_with_seats(db)
    result = []
    for v in venues:
        seats = [TeamSeatResponse.model_validate(s) for s in v.seats]
        occupied = len(seats)
        available = v.capacity - occupied
        result.append(
            VenueWithSeats(
                **VenueResponse.model_validate(v).model_dump(),
                seats=seats,
                available_seats=available,
            )
        )
    return result


@router.get("/{venue_id}", response_model=VenueResponse)
def get_venue_endpoint(
    venue_id: str,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> VenueResponse:
    """Get a venue by ID (admin only)."""
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue not found.",
        )
    return VenueResponse.model_validate(venue)


@router.get("/{venue_id}/with-seats", response_model=VenueWithSeats)
def get_venue_with_seats_endpoint(
    venue_id: str,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> VenueWithSeats:
    """Get a venue with seat assignments (admin only)."""
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue not found.",
        )
    seats = get_seats_by_venue(db, venue_id)
    seat_responses = [TeamSeatResponse.model_validate(s) for s in seats]
    occupied = len(seats)
    available = venue.capacity - occupied
    return VenueWithSeats(
        **VenueResponse.model_validate(venue).model_dump(),
        seats=seat_responses,
        available_seats=available,
    )


@router.get("/{venue_id}/available-seats", response_model=list[int])
def get_available_seats_endpoint(
    venue_id: str,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[int]:
    """Get available seat numbers for a venue (admin only)."""
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue not found.",
        )
    return get_available_seats(db, venue_id)


@router.get("/{venue_id}/stats")
def get_venue_stats_endpoint(
    venue_id: str,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Get venue statistics (admin only)."""
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue not found.",
        )
    return get_venue_stats(db, venue_id)


@router.patch("/{venue_id}", response_model=VenueResponse)
def update_venue_endpoint(
    venue_id: str,
    payload: VenueUpdate,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> VenueResponse:
    """Update a venue (admin only)."""
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue not found.",
        )

    if payload.name and payload.name != venue.name:
        if get_venue_by_name(db, payload.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A venue with this name already exists.",
            )

    updated = update_venue(
        db,
        venue,
        name=payload.name,
        location=payload.location,
        capacity=payload.capacity,
        description=payload.description,
    )
    return VenueResponse.model_validate(updated)


@router.delete("/{venue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_venue_endpoint(
    venue_id: str,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> None:
    """Delete a venue (admin only)."""
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue not found.",
        )
    delete_venue(db, venue)


# Seat assignment endpoints
@router.post("/{venue_id}/seats", response_model=TeamSeatResponse, status_code=status.HTTP_201_CREATED)
def assign_team_to_seat_endpoint(
    venue_id: str,
    payload: TeamSeatCreate,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> TeamSeatResponse:
    """Assign a team to a seat in a venue (admin only)."""
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue not found.",
        )

    try:
        seat = assign_team_to_seat(db, venue_id, payload.team_id, payload.seat_number)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return TeamSeatResponse.model_validate(seat)


@router.get("/{venue_id}/seats", response_model=list[TeamSeatResponse])
def list_seats_endpoint(
    venue_id: str,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[TeamSeatResponse]:
    """List all seat assignments for a venue (admin only)."""
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue not found.",
        )
    seats = get_seats_by_venue(db, venue_id)
    return [TeamSeatResponse.model_validate(s) for s in seats]


@router.get("/seats/team/{team_id}", response_model=TeamSeatResponse | None)
def get_team_seat_endpoint(
    team_id: str,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> TeamSeatResponse | None:
    """Get a team's seat assignment (admin only)."""
    seat = get_seat_by_team(db, team_id)
    if seat is None:
        return None
    return TeamSeatResponse.model_validate(seat)


@router.patch("/seats/team/{team_id}", response_model=TeamSeatResponse)
def update_team_seat_endpoint(
    team_id: str,
    payload: TeamSeatUpdate,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> TeamSeatResponse:
    """Update a team's seat number (admin only)."""
    seat = get_seat_by_team(db, team_id)
    if seat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team has no seat assignment.",
        )

    if payload.seat_number is not None:
        # Check if new seat is available
        venue = get_venue_by_id(db, seat.venue_id)
        if venue is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Venue not found.",
            )

        if payload.seat_number < 1 or payload.seat_number > venue.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Seat number must be between 1 and {venue.capacity}",
            )

        existing = db.scalar(
            select(TeamSeat).where(
                TeamSeat.venue_id == seat.venue_id,
                TeamSeat.seat_number == payload.seat_number,
                TeamSeat.team_id != team_id,
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Seat {payload.seat_number} is already occupied",
            )

        seat.seat_number = payload.seat_number
        db.flush()
        db.commit()

    return TeamSeatResponse.model_validate(seat)


@router.delete("/seats/team/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_team_seat_endpoint(
    team_id: str,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> None:
    """Remove a team's seat assignment (admin only)."""
    seat = get_seat_by_team(db, team_id)
    if seat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team has no seat assignment.",
        )
    unassign_team_from_seat(db, team_id)


@router.post(
    "/{venue_id}/seats/bulk",
    response_model=list[TeamSeatResponse],
    status_code=status.HTTP_201_CREATED,
)
def bulk_assign_teams_endpoint(
    venue_id: str,
    payload: TeamBulkSeatAssign,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[TeamSeatResponse]:
    """Bulk assign many teams to a venue (admin only).

    Teams are auto-allocated up to the venue's team capacity.
    """
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue not found.",
        )

    try:
        seats = bulk_assign_teams_to_venue(db, venue_id, payload.team_ids)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return [TeamSeatResponse.model_validate(s) for s in seats]


@router.post("/seats/bulk-unassign")
def bulk_unassign_teams_endpoint(
    payload: TeamBulkUnassign,
    current: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Bulk remove many teams from their venue assignments (admin only)."""
    removed = bulk_unassign_teams(db, payload.team_ids)
    return {"removed": removed}