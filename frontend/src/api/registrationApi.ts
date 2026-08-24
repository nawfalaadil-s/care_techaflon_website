import { apiClient } from './client'
import type { RegistrationStatus } from '@/data/status'

export interface MemberInput {
  name: string
  email: string
  phone: string
}

export interface RegistrationPayload {
  team_name: string
  representative_name: string
  representative_email: string
  representative_phone: string
  institution: string
  year_of_study: string
  track: string
  problem_statement: string | null
  members: MemberInput[]
}

export interface Registration {
  id: string
  team_name: string
  representative_name: string
  representative_email: string
  representative_phone: string
  institution: string
  year_of_study: string
  track: string
  problem_statement: string | null
  members: MemberInput[]
  owner_id: string | null
  status: RegistrationStatus
  created_at: string
}

export interface RegistrationMeta {
  max_members: number
  tracks: string[]
}

/**
 * Registration API — public submission plus admin CRM reads/decisions.
 */
export const registrationApi = {
  async getMeta(): Promise<RegistrationMeta> {
    const { data } = await apiClient.get<RegistrationMeta>(
      '/registration/meta',
    )
    return data
  },

  async submit(payload: RegistrationPayload): Promise<Registration> {
    const { data } = await apiClient.post<Registration>(
      '/registration',
      payload,
    )
    return data
  },

  /** All registrations (organizer/admin only). */
  async adminList(): Promise<Registration[]> {
    const { data } = await apiClient.get<{ items: Registration[]; total: number }>(
      '/registration',
    )
    return data.items
  },

  async adminGet(id: string): Promise<Registration> {
    const { data } = await apiClient.get<Registration>(`/registration/${id}`)
    return data
  },

  /** Apply a review decision (organizer/admin only). */
  async adminSetStatus(id: string, status: RegistrationStatus): Promise<Registration> {
    const { data } = await apiClient.patch<Registration>(
      `/registration/${id}/status`,
      { status },
    )
    return data
  },
}
