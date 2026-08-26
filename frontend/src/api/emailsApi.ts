import { apiClient } from './client'

export type EmailStatus = 'queued' | 'sent' | 'logged' | 'failed'

/** Full email detail (single-message view). */
export interface EmailMessage {
  id: string
  template: string
  to_email: string
  subject: string
  body?: string
  body_html?: string
  status: EmailStatus
  error: string | null
  registration_id: string | null
  certificate_id: string | null
  created_at: string
  sent_at: string | null
}

/** Lightweight outbox entry — list views (no body payload). */
export interface EmailMessageSummary {
  id: string
  template: string
  to_email: string
  subject: string
  status: EmailStatus
  error: string | null
  certificate_id: string | null
  created_at: string
  sent_at: string | null
}

export interface EmailListResponse {
  items: EmailMessageSummary[]
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
