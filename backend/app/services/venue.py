from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.team import Team
from app.models.venue import TeamSeat, Venue


def create_venue(db: Session, name: str, location: str, capacity: int, description: str | None = None) -> Venue:
    """Create a new venue."""
    venue = Venue(
        name=name.strip(),
        location=location.strip(),
        capacity=capacity,
        description=description.strip() if description else None,
    )
    db.add(venue)
    db.flush()
    return venue


def get_venue_by_id(db: Session, venue_id: str) -> Optional[Venue]:
    """Get a venue by ID."""
    return db.get(Venue, venue_id)


def get_venue_by_name(db: Session, name: str) -> Optional[Venue]:
    """Get a venue by name."""
    return db.scalar(select(Venue).where(Venue.name == name))


def list_venues(db: Session) -> list[Venue]:
    """List all venues."""
    return db.scalars(select(Venue).order_by(Venue.name)).all()


def list_venues_with_seats(db: Session) -> list[Venue]:
    """List all venues with their seat assignments loaded."""
    return db.scalars(
        select(Venue).options(joinedload(Venue.seats).joinedload(TeamSeat.team)).order_by(Venue.name)
    ).unique().all()


def update_venue(
    db: Session,
    venue: Venue,
    name: str | None = None,
    location: str | None = None,
    capacity: int | None = None,
    description: str | None = None,
) -> Venue:
    """Update a venue."""
    if name is not None:
        venue.name = name.strip()
    if location is not None:
        venue.location = location.strip()
    if capacity is not None:
        venue.capacity = capacity
    if description is not None:
        venue.description = description.strip() if description else None
    db.flush()
    return venue


def delete_venue(db: Session, venue: Venue) -> None:
    """Delete a venue. Cascades to team_seats via FK."""
    db.delete(venue)
    db.flush()


def assign_team_to_seat(
    db: Session, venue_id: str, team_id: str, seat_number: int
) -> TeamSeat:
    """Assign a team to a specific seat in a venue."""
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        raise ValueError("Venue not found")

    team = db.get(Team, team_id)
    if team is None:
        raise ValueError("Team not found")

    if seat_number < 1 or seat_number > venue.capacity:
        raise ValueError(f"Seat number must be between 1 and {venue.capacity}")

    # Check if seat is already taken
    existing_seat = db.scalar(
        select(TeamSeat).where(
            TeamSeat.venue_id == venue_id,
            TeamSeat.seat_number == seat_number,
        )
    )
    if existing_seat:
        raise ValueError(f"Seat {seat_number} is already occupied in this venue")

    # Check if team already has a seat in this venue
    existing_team_seat = db.scalar(
        select(TeamSeat).where(
            TeamSeat.venue_id == venue_id,
            TeamSeat.team_id == team_id,
        )
    )
    if existing_team_seat:
        raise ValueError("Team already has a seat in this venue")

    # Check if team has a seat in any venue
    any_seat = db.scalar(select(TeamSeat).where(TeamSeat.team_id == team_id))
    if any_seat:
        raise ValueError("Team already has a seat assigned in another venue")

    seat = TeamSeat(
        venue_id=venue_id,
        team_id=team_id,
        seat_number=seat_number,
    )
    db.add(seat)
    db.flush()
    return seat


def unassign_team_from_seat(db: Session, team_id: str) -> bool:
    """Remove a team's seat assignment."""
    seat = db.scalar(select(TeamSeat).where(TeamSeat.team_id == team_id))
    if seat:
        db.delete(seat)
        db.flush()
        return True
    return False


def bulk_assign_teams_to_venue(
    db: Session, venue_id: str, team_ids: list[str]
) -> list[TeamSeat]:
    """Bulk assign a list of teams to a venue.

    Each team is auto-assigned the next free seat number (so the unique
    ``(venue_id, seat_number)`` constraint holds) up to the venue's capacity.
    Teams already assigned elsewhere are rejected.
    """
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        raise ValueError("Venue not found")

    if not team_ids:
        raise ValueError("No teams provided")

    team_assignments = db.scalars(
        select(TeamSeat).where(TeamSeat.team_id.in_(team_ids))
    ).all()
    already_assigned = {s.team_id for s in team_assignments}

    # Find the seat numbers already taken in this venue
    taken_seats = set(
        db.scalars(
            select(TeamSeat.seat_number).where(TeamSeat.venue_id == venue_id)
        ).all()
    )

    available_slots = [
        i for i in range(1, venue.capacity + 1) if i not in taken_seats
    ]

    # Limit to how many teams the venue can still hold
    eligible = [t for t in team_ids if t not in already_assigned]
    if len(eligible) > len(available_slots):
        raise ValueError(
            f"Venue only has {len(available_slots)} free team slot(s), "
            f"but {len(eligible)} team(s) were requested."
        )

    created: list[TeamSeat] = []
    for idx, team_id in enumerate(eligible):
        seat = TeamSeat(
            venue_id=venue_id,
            team_id=team_id,
            seat_number=available_slots[idx],
        )
        db.add(seat)
        created.append(seat)

    db.flush()
    return created


def bulk_unassign_teams(db: Session, team_ids: list[str]) -> int:
    """Remove seat assignments for multiple teams. Returns count removed."""
    if not team_ids:
        return 0
    seats = db.scalars(
        select(TeamSeat).where(TeamSeat.team_id.in_(team_ids))
    ).all()
    for s in seats:
        db.delete(s)
    db.flush()
    return len(seats)


def get_seat_by_team(db: Session, team_id: str) -> Optional[TeamSeat]:
    """Get a team's seat assignment."""
    return db.scalar(
        select(TeamSeat).options(joinedload(TeamSeat.venue)).where(TeamSeat.team_id == team_id)
    )


def get_seats_by_venue(db: Session, venue_id: str) -> list[TeamSeat]:
    """Get all seat assignments for a venue."""
    return db.scalars(
        select(TeamSeat)
        .options(joinedload(TeamSeat.team))
        .where(TeamSeat.venue_id == venue_id)
        .order_by(TeamSeat.seat_number)
    ).all()


def get_available_seats(db: Session, venue_id: str) -> list[int]:
    """Get list of available seat numbers for a venue."""
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        return []

    taken_seats = db.scalars(
        select(TeamSeat.seat_number).where(TeamSeat.venue_id == venue_id)
    ).all()
    taken = set(taken_seats)
    return [i for i in range(1, venue.capacity + 1) if i not in taken]


def get_venue_stats(db: Session, venue_id: str) -> dict:
    """Get venue statistics."""
    venue = get_venue_by_id(db, venue_id)
    if venue is None:
        return {}

    seats = get_seats_by_venue(db, venue_id)
    return {
        "venue_id": venue.id,
        "venue_name": venue.name,
        "capacity": venue.capacity,
        "occupied": len(seats),
        "available": venue.capacity - len(seats),
        "occupancy_rate": len(seats) / venue.capacity * 100 if venue.capacity > 0 else 0,
    }