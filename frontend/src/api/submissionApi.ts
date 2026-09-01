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

  /** Export every submission as a CSV file (admin only). Triggers a browser
   *  download. Optional filters mirror the admin submissions page. */
  async exportAdminCsv(filters?: {
    theme?: string
    status?: string
    lock?: 'all' | 'locked' | 'unlocked' | string
    q?: string
  }): Promise<void> {
    const params = new URLSearchParams()
    if (filters?.theme && filters.theme !== 'all') params.set('theme', filters.theme)
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status)
    if (filters?.lock && filters.lock !== 'all') params.set('lock', filters.lock)
    if (filters?.q?.trim()) params.set('q', filters.q.trim())
    const query = params.toString() ? `?${params.toString()}` : ''

    const response = await apiClient.get(
      `/teams/all/submissions/export/csv${query}`,
      { responseType: 'blob' },
    )
    const blob = new Blob([response.data as BlobPart], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const disposition = response.headers['content-disposition'] as string | undefined
    const match = disposition?.match(/filename="?([^"]+)"?/)
    link.download =
      match?.[1] ?? `submissions_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}
