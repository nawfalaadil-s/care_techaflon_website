import { apiClient } from './client'

export interface OverviewStats {
  teams: {
    total: number
    by_status: Record<string, number>
    by_theme: Record<string, number>
  }
  members_total: number
  submissions: number
  problem_statements: { total: number; published: number }
  allocated_statements: number
  users: { total: number; organizers: number }
}

export interface AnalyticsStats {
  window_days: number
  teams_over_time: Array<{ date: string; count: number }>
  funnel: {
    registered: number
    approved: number
    rejected: number
    disqualified: number
    submitted: number
    approval_rate: number
    submission_rate: number
  }
  departments: Array<{ name: string; teams: number }>
  themes: Array<{
    theme: string
    teams: number
    submissions: number
    approved: number
  }>
  problem_adoption: {
    adopted_total: number
    statements: Array<{ title: string; track: string; teams: number }>
    unallocated_teams: number
  }
  emails: {
    total: number
    by_status: Record<string, number>
  }
}

/** One row of the admin submissions feed (`GET /teams/all/submissions`). */
export interface AdminSubmissionRow {
  team_uuid: string
  team_id: string
  team_name: string
  theme: string
  status: string
  leader_email: string
  project_name: string
  repo_url: string
  demo_url: string | null
  locked: boolean
  updated_at: string
}

/** Admin stats (organizer/admin only). */
export const statsApi = {
  async overview(): Promise<OverviewStats> {
    const { data } = await apiClient.get<OverviewStats>('/stats/overview')
    return data
  },

  async analytics(days = 30): Promise<AnalyticsStats> {
    const { data } = await apiClient.get<AnalyticsStats>('/stats/analytics', {
      params: { days },
    })
    return data
  },

  /** Every submission with team context (organizer/admin only). */
  async adminSubmissions(): Promise<AdminSubmissionRow[]> {
    const { data } = await apiClient.get<AdminSubmissionRow[]>(
      '/teams/all/submissions',
    )
    return data
  },
}
