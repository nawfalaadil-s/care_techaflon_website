import { apiClient } from './client'

export type EmailStatus = 'queued' | 'sent' | 'logged' | 'failed'

export interface EmailMessage {
  id: string
  template: string
  to_email: string
  subject: string
  body?: string
  status: EmailStatus
  error: string | null
  registration_id: string | null
  created_at: string
  sent_at: string | null
}

export interface EmailListResponse {
  items: EmailMessage[]
  total: number
}

/** Admin email outbox (organizer/admin only). */
export const emailsApi = {
  async list(params: { limit?: number; status?: EmailStatus } = {}): Promise<EmailListResponse> {
    const { data } = await apiClient.get<EmailListResponse>('/emails', { params })
    return data
  },

  async get(id: string): Promise<EmailMessage> {
    const { data } = await apiClient.get<EmailMessage>(`/emails/${id}`)
    return data
  },

  /** Retry delivery of a failed/logged message. */
  async resend(id: string): Promise<EmailMessage> {
    const { data } = await apiClient.post<EmailMessage>(`/emails/${id}/resend`)
    return data
  },
}
