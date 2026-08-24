import { apiClient } from './client'

export interface ProblemStatement {
  id: string
  title: string
  summary: string
  description: string
  track: string
  difficulty: 'easy' | 'medium' | 'hard'
  sponsor: string | null
  published: boolean
  created_at: string
  updated_at: string
}

export interface ProblemStatementInput {
  title: string
  summary: string
  description: string
  track: string
  difficulty: ProblemStatement['difficulty']
  sponsor?: string | null
  published?: boolean
}

export interface CsvUploadReport {
  created: number
  skipped: string[]
}

export interface AutoAllocateState {
  enabled: boolean
  teams_waiting: number
  last_result?: {
    allocated: number
    teams_waiting: number
    statements_free: number
  } | null
}

/**
 * Problem statements API — PRIVATE content.
 * Nothing is publicly browsable; participants only see the title of the
 * statement allocated to their team (delivered on the team payload).
 */
export const problemApi = {
  /** Every statement including drafts (organizer/admin only). */
  async listAll(): Promise<ProblemStatement[]> {
    const { data } = await apiClient.get<ProblemStatement[]>('/problems/all')
    return data
  },

  async get(id: string): Promise<ProblemStatement> {
    const { data } = await apiClient.get<ProblemStatement>(`/problems/${id}`)
    return data
  },

  async create(input: ProblemStatementInput): Promise<ProblemStatement> {
    const { data } = await apiClient.post<ProblemStatement>('/problems', input)
    return data
  },

  async update(
    id: string,
    input: Partial<ProblemStatementInput>,
  ): Promise<ProblemStatement> {
    const { data } = await apiClient.patch<ProblemStatement>(
      `/problems/${id}`,
      input,
    )
    return data
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/problems/${id}`)
  },

  /** Bulk-import statements from CSV text (organizer/admin only).
   *  Header: title,summary,description,theme[,difficulty,sponsor] */
  async uploadCsv(csv: string): Promise<CsvUploadReport> {
    const { data } = await apiClient.post<CsvUploadReport>('/problems/upload', {
      csv,
    })
    return data
  },

  /** Current auto-allocation state (organizer/admin only). */
  async autoAllocateStatus(): Promise<AutoAllocateState> {
    const { data } = await apiClient.get<AutoAllocateState>(
      '/problems/auto-allocate',
    )
    return data
  },

  /** Turn on-the-spot allocation on/off; enabling allocates immediately. */
  async setAutoAllocate(enabled: boolean): Promise<AutoAllocateState> {
    const { data } = await apiClient.patch<AutoAllocateState>(
      '/problems/auto-allocate',
      { enabled },
    )
    return data
  },
}
