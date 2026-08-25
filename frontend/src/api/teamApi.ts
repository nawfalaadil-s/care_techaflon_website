import { apiClient } from './client'

/** Valid TechAFlon themes (mirrors backend schemas/team.py). */
export const TEAM_THEMES = ['ai-ml', 'web', 'app'] as const

/** Partial team edit — only provided fields are changed by the backend.
 *  Leaders may change team_name/theme; admins may also set the venue. */
export interface TeamUpdatePayload {
  team_name?: string
  theme?: string
  venue_name?: string
  venue_location?: string
}

/** One additional team member (leader is separate, sent on create). */
export interface TeamMemberInput {
  name: string
  email: string
  register_number: string
  department: string
  year: string
  section?: string
}

/** Alias kept for the portal/member types below. */
export type TeamMember = TeamMemberInput

/** Payload for POST /teams — public TechAFlon registration. */
export interface TeamCreatePayload {
  team_name: string
  theme: string
  leader_name: string
  leader_email: string
  leader_phone?: string
  leader_register_number: string
  leader_department: string
  leader_year: string
  leader_section?: string
  members: TeamMember[]
}

/** A registered team as returned by the /teams endpoints. */
export interface TeamRecord {
  id: string
  team_id: string
  team_name: string
  theme: string
  status: 'pending' | 'approved' | 'rejected' | 'disqualified'
  registered_at: string
  approved_at: string | null
  leader_name: string
  leader_email: string
  leader_phone: string
  leader_register_number: string
  leader_department: string
  leader_year: string
  leader_section: string
  members: TeamMember[]
  problem_statement_id: string | null
  /** Resolved by the backend — statements are private, leaders only see
   *  the title of the one allocated to their team. */
  problem_statement_title?: string | null
  ps_allocated_at: string | null
  venue_name: string
  venue_location: string
  created_at: string
  updated_at: string
}

/**
 * Team portal API — TechAFlon teams.
 * All routes require a signed-in account (Bearer token is attached
 * automatically by the shared client).
 */
export const teamApi = {
  /** Public team registration (TechAFlon flow) — returns the new team. */
  async create(payload: TeamCreatePayload): Promise<TeamRecord> {
    const { data } = await apiClient.post<TeamRecord>('/teams', payload)
    return data
  },

  /** The signed-in leader's team, or null when no team exists (404). */
  async getMine(): Promise<TeamRecord | null> {
    try {
      const { data } = await apiClient.get<TeamRecord>('/teams/mine')
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

  /** All registered teams (organizer/admin only). */
  async adminList(): Promise<TeamRecord[]> {
    const { data } = await apiClient.get<TeamRecord[]>('/teams')
    return data
  },

  /** Apply a review decision (organizer/admin only). */
  async adminSetStatus(id: string, status: string): Promise<TeamRecord> {
    const { data } = await apiClient.patch<TeamRecord>(`/teams/${id}/status`, {
      status,
    })
    return data
  },

  /** Edit any team on a leader's behalf (organizer/admin only). */
  async adminUpdate(id: string, payload: TeamUpdatePayload): Promise<TeamRecord> {
    const { data } = await apiClient.patch<TeamRecord>(`/teams/${id}`, payload)
    return data
  },

  /** Allocate a problem statement to a team (organizer/admin only).
   *  Pass null to clear the allocation. */
  async allocateProblemStatement(
    id: string,
    problemStatementId: string | null,
  ): Promise<void> {
    const query = problemStatementId
      ? `?problem_statement_id=${encodeURIComponent(problemStatementId)}`
      : ''
    await apiClient.patch(`/teams/${id}/problem-statement${query}`)
  },

  async update(id: string, payload: TeamUpdatePayload): Promise<TeamRecord> {
    const { data } = await apiClient.patch<TeamRecord>(`/teams/${id}`, payload)
    return data
  },

  /** Bulk update status for multiple teams (admin only). */
  async adminBulkSetStatus(
    teamIds: string[],
    status: string,
  ): Promise<{ updated: number; errors: string[] }> {
    const { data } = await apiClient.patch<{
      updated: number
      errors: string[]
    }>('/teams/bulk-status', { team_ids: teamIds, status })
    return data
  },

  /** Delete a single team (admin only). */
  async adminDelete(id: string): Promise<void> {
    await apiClient.delete(`/teams/${id}`)
  },

  /** Bulk delete multiple teams (admin only). */
  async adminBulkDelete(
    teamIds: string[],
  ): Promise<{ deleted: number; errors: string[] }> {
    const { data } = await apiClient.post<{
      deleted: number
      errors: string[]
    }>('/teams/bulk-delete', { team_ids: teamIds })
    return data
  },
}
