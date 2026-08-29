export interface Venue {
  id: string
  name: string
  location: string
  capacity: number
  description: string | null
  created_at: string
  updated_at: string
}

export interface TeamSeat {
  id: string
  venue_id: string
  team_id: string
  seat_number: number
  created_at: string
  updated_at: string
}

export interface VenueWithSeats extends Venue {
  seats: TeamSeat[]
  available_seats: number
}

export interface VenueCreatePayload {
  name: string
  location: string
  capacity: number
  description?: string
}

export interface VenueUpdatePayload {
  name?: string
  location?: string
  capacity?: number
  description?: string
}

export interface TeamSeatCreatePayload {
  team_id: string
  seat_number: number
}

export interface TeamSeatUpdatePayload {
  seat_number?: number
}