import { apiClient } from './client'

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

export const venueApi = {
  /** Create a new venue (admin only). */
  async create(payload: VenueCreatePayload): Promise<Venue> {
    const { data } = await apiClient.post<Venue>('/venues', payload)
    return data
  },

  /** List all venues (admin only). */
  async list(): Promise<Venue[]> {
    const { data } = await apiClient.get<Venue[]>('/venues')
    return data
  },

  /** List all venues with seat assignments (admin only). */
  async listWithSeats(): Promise<VenueWithSeats[]> {
    const { data } = await apiClient.get<VenueWithSeats[]>('/venues/with-seats')
    return data
  },

  /** Get a venue by ID (admin only). */
  async get(venueId: string): Promise<Venue> {
    const { data } = await apiClient.get<Venue>(`/venues/${venueId}`)
    return data
  },

  /** Get a venue with seat assignments (admin only). */
  async getWithSeats(venueId: string): Promise<VenueWithSeats> {
    const { data } = await apiClient.get<VenueWithSeats>(`/venues/${venueId}/with-seats`)
    return data
  },

  /** Get available seat numbers for a venue (admin only). */
  async getAvailableSeats(venueId: string): Promise<number[]> {
    const { data } = await apiClient.get<number[]>(`/venues/${venueId}/available-seats`)
    return data
  },

  /** Get venue statistics (admin only). */
  async getStats(venueId: string): Promise<{
    venue_id: string
    venue_name: string
    capacity: number
    occupied: number
    available: number
    occupancy_rate: number
  }> {
    const { data } = await apiClient.get(`/venues/${venueId}/stats`)
    return data
  },

  /** Update a venue (admin only). */
  async update(venueId: string, payload: VenueUpdatePayload): Promise<Venue> {
    const { data } = await apiClient.patch<Venue>(`/venues/${venueId}`, payload)
    return data
  },

  /** Delete a venue (admin only). */
  async delete(venueId: string): Promise<void> {
    await apiClient.delete(`/venues/${venueId}`)
  },

  /** Assign a team to a seat in a venue (admin only). */
  async assignTeamToSeat(venueId: string, payload: TeamSeatCreatePayload): Promise<TeamSeat> {
    const { data } = await apiClient.post<TeamSeat>(`/venues/${venueId}/seats`, payload)
    return data
  },

  /** List all seat assignments for a venue (admin only). */
  async listSeats(venueId: string): Promise<TeamSeat[]> {
    const { data } = await apiClient.get<TeamSeat[]>(`/venues/${venueId}/seats`)
    return data
  },

  /** Get a team's seat assignment (admin only). */
  async getTeamSeat(teamId: string): Promise<TeamSeat | null> {
    try {
      const { data } = await apiClient.get<TeamSeat | null>(`/venues/seats/team/${teamId}`)
      return data
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 404
      ) {
        return null
      }
      throw error
    }
  },

  /** Update a team's seat number (admin only). */
  async updateTeamSeat(teamId: string, payload: TeamSeatUpdatePayload): Promise<TeamSeat> {
    const { data } = await apiClient.patch<TeamSeat>(`/venues/seats/team/${teamId}`, payload)
    return data
  },

  /** Remove a team's seat assignment (admin only). */
  async unassignTeamSeat(teamId: string): Promise<void> {
    await apiClient.delete(`/venues/seats/team/${teamId}`)
  },
}