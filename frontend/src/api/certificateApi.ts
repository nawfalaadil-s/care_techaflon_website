import { apiClient } from './client'

export interface CertificateInfo {
  id: string
  filename: string
  content_type: string
  size_bytes: number
  uploaded_by: string | null
  created_at: string
}

export interface CertificateHistoryItem extends CertificateInfo {
  active: boolean
  recipients_sent: number
  recipients_failed: number
  mail_sent: number
  mail_logged: number
  mail_queued: number
  mail_failed: number
}

export interface SendAllResult {
  certificate_id: string
  approved_teams: number
  teams_queued: number
  recipients_planned: number
  recipients_skipped: number
  recipients_to_send: number
}

export interface DeliverySummary {
  certificate_id: string | null
  approved_teams: number
  planned_recipients: number
  delivered_recipients: number
  delivered_percent: number
  sent: number
  logged: number
  queued: number
  failed: number
  delivered_recipients_list: string[]
  failed_recipients_list: string[]
}

export interface EmailStatus {
  enabled: boolean
  transport: string | null
  mode: 'delivering' | 'log'
}

export interface CertificateEmailStatus {
  email: EmailStatus
  certificate_active: boolean
}

export interface SendTeamResult {
  certificate_id: string
  team_id: string
  team_name: string
  queued: boolean
}

export interface ResendFailedResult {
  certificate_id: string
  retried: number
  still_failed: Array<{ id: string; to_email: string; error: string | null }>
  now_delivered: number
}

export interface PreviewHtml {
  certificate_id: string
  recipient_name: string
  team_name: string
  team_id: string
  html: string
}

export type RecipientStatus = 'unsent' | 'sent' | 'failed'

export interface TeamRecipient {
  email: string
  name: string
  status: RecipientStatus
  delivered: boolean
}

export interface ApprovedTeam {
  team_id: string
  team_name: string
  theme: string
  status: string
  recipient_total: number
  delivered: number
  recipients: TeamRecipient[]
}

export interface ApprovedTeamsStatus {
  certificate_id: string | null
  delivered: number
  failed: number
  sent: number
  logged: number
  queued: number
  failed_mail_count: number
  teams: ApprovedTeam[]
}

export interface MyCertificateTeam {
  id: string
  team_id: string
  team_name: string
  status: string
}

export type MyCertificateReason =
  | 'team_not_approved'
  | 'no_active_certificate'
  | null

export interface MyCertificate {
  team: MyCertificateTeam
  available: boolean
  reason: MyCertificateReason
  certificate: CertificateInfo | null
  download_filename: string | null
  preview_html: string | null
}

export interface ParticipantCertificate {
  email: string
  name: string
  is_leader: boolean
  personalized_html: string
  personalized_png_available: boolean
  image_url: string | null
}

export interface MineParticipants {
  team: { team_id: string; team_name: string; status: string }
  available: boolean
  reason: MyCertificateReason
  template_filename?: string
  template_content_type?: string
  image_composition_enabled: boolean
  participants: ParticipantCertificate[]
}

/** Admin certificate automation (organizer/admin only). */
export const certificatesApi = {
  async current(): Promise<CertificateInfo> {
    const { data } = await apiClient.get<CertificateInfo>('/certificates/current')
    return data
  },

  async history(): Promise<{ items: CertificateHistoryItem[]; total: number }> {
    const { data } = await apiClient.get<{ items: CertificateHistoryItem[]; total: number }>(
      '/certificates/history',
    )
    return data
  },

  /** Upload (or replace) the active certificate file. */
  async upload(file: File): Promise<CertificateInfo> {
    const { data } = await apiClient.post<CertificateInfo>(
      '/certificates/upload',
      file,
      {
        params: { filename: file.name },
        headers: { 'Content-Type': file.type || 'application/pdf' },
        transformRequest: [(payload) => payload],
      },
    )
    return data
  },

  async deactivate(): Promise<void> {
    await apiClient.delete('/certificates/current')
  },

  async activate(certificateId: string): Promise<CertificateInfo> {
    const { data } = await apiClient.post<CertificateInfo>(
      `/certificates/${certificateId}/activate`,
    )
    return data
  },

  /** Email the active certificate to every approved team's participants. */
  async sendAll(): Promise<SendAllResult> {
    const { data } = await apiClient.post<SendAllResult>('/certificates/send-all')
    return data
  },

  async sendTeam(certificateId: string, teamId: string): Promise<SendTeamResult> {
    const { data } = await apiClient.post<SendTeamResult>(
      `/certificates/${certificateId}/send-team/${teamId}`,
    )
    return data
  },

  async resendFailed(): Promise<ResendFailedResult> {
    const { data } = await apiClient.post<ResendFailedResult>('/certificates/resend-failed')
    return data
  },

  async deliverySummary(): Promise<DeliverySummary> {
    const { data } = await apiClient.get<DeliverySummary>('/certificates/delivery-summary')
    return data
  },

  async approvedTeams(): Promise<ApprovedTeamsStatus> {
    const { data } = await apiClient.get<ApprovedTeamsStatus>('/certificates/teams')
    return data
  },

  async emailStatus(): Promise<CertificateEmailStatus> {
    const { data } = await apiClient.get<CertificateEmailStatus>('/certificates/email-status')
    return data
  },

  async previewHtml(certificateId: string): Promise<PreviewHtml> {
    const { data } = await apiClient.get<PreviewHtml>(
      `/certificates/${certificateId}/preview-html`,
    )
    return data
  },

  /** Download the stored file through the authenticated client. */
  async download(info: CertificateInfo): Promise<void> {
    const blob = await this.fetchBlob(info.id)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = info.filename || 'certificate'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  },

  /** Fetch the raw certificate bytes (used by the inline image preview). */
  async fetchBlob(certificateId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/certificates/${certificateId}/download`,
      { responseType: 'blob' },
    )
    return response.data
  },

  // -------------------------------------------------------------------------
  // Leader portal: own team's certificate
  // -------------------------------------------------------------------------

  /** Availability + personalized view of this leader's team certificate. */
  async my(): Promise<MyCertificate> {
    const { data } = await apiClient.get<MyCertificate>('/certificates/mine')
    return data
  },

  /**
   * Download the leader's team certificate. The backend sets a friendly
   * Content-Disposition name (TFLN-2026-XXX-certificate.pdf); if parsing
   * fails we fall back to the advertised download_filename.
   */
  async downloadMine(fallbackName?: string): Promise<void> {
    const response = await apiClient.get<Blob>('/certificates/mine/download', {
      responseType: 'blob',
    })
    const disposition =
      (response.headers?.['content-disposition'] as string | undefined) ?? ''
    const match = /filename="?([^";]+)"?/i.exec(disposition)
    const filename = match?.[1] ?? fallbackName ?? 'certificate'
    saveBlob(response.data, filename)
  },
}

/** Trigger a browser file-save for a blob without leaking the object URL. */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
