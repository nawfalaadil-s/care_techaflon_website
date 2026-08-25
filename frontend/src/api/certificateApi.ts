import { apiClient } from './client'

export interface CertificateInfo {
  id: string
  filename: string
  content_type: string
  size_bytes: number
  uploaded_by: string | null
  created_at: string
}

export interface SendAllResult {
  certificate_id: string
  approved_teams: number
  teams_queued: number
}

/** Admin certificate automation (organizer/admin only). */
export const certificatesApi = {
  async current(): Promise<CertificateInfo> {
    const { data } = await apiClient.get<CertificateInfo>('/certificates/current')
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

  /** Email the active certificate to every approved team's participants. */
  async sendAll(): Promise<SendAllResult> {
    const { data } = await apiClient.post<SendAllResult>('/certificates/send-all')
    return data
  },

  /** Download the stored file through the authenticated client. */
  async download(info: CertificateInfo): Promise<void> {
    const response = await apiClient.get<Blob>(
      `/certificates/${info.id}/download`,
      { responseType: 'blob' },
    )
    const url = URL.createObjectURL(response.data)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = info.filename || 'certificate'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  },
}
