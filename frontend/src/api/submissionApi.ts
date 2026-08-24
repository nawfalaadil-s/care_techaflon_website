import { apiClient } from './client'

export interface Submission {
  id: string
  registration_id: string
  project_name: string
  description: string
  repo_url: string
  demo_url: string | null
  locked: boolean
  created_at: string
  updated_at: string
}

export interface SubmissionPayload {
  project_name: string
  description: string
  repo_url: string
  demo_url?: string | null
}

/**
 * Project submission API — one submission per team, nested under /teams.
 * All routes require a signed-in team leader.
 */
export const submissionApi = {
  /** Returns null until the team submits for the first time. */
  async get(teamId: string): Promise<Submission | null> {
    const { data } = await apiClient.get<{ submission: Submission | null }>(
      `/teams/${teamId}/submission`,
    )
    return data.submission
  },

  /** Idempotent upsert — creates on first save, updates afterwards. */
  async save(teamId: string, payload: SubmissionPayload): Promise<Submission> {
    const { data } = await apiClient.put<Submission>(
      `/teams/${teamId}/submission`,
      payload,
    )
    return data
  },

  async withdraw(teamId: string): Promise<void> {
    await apiClient.delete(`/teams/${teamId}/submission`)
  },

  /** Admin only — unlock a team's submission for corrections (or re-lock). */
  async adminSetLock(teamId: string, locked: boolean): Promise<Submission> {
    const { data } = await apiClient.patch<Submission>(
      `/teams/${teamId}/submission/lock`,
      { locked },
    )
    return data
  },
}
