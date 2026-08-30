import { apiClient } from './client'

export interface SiteSettings {
  event_name: string
  tagline: string
  registration_open: boolean
  registration_deadline: string | null
  contact_email: string
  announcement: string
  /** Master portal switch — certificates show to leaders only when true. */
  certificates_visible: boolean
}

export type SiteSettingsUpdate = Partial<SiteSettings>

/** Public event facts — anonymous access. */
export const settingsApi = {
  async publicSettings(): Promise<SiteSettings> {
    const { data } = await apiClient.get<SiteSettings>('/settings/public')
    return data
  },
}

/** Settings editor — organizer/admin only. */
export const adminSettingsApi = {
  async get(): Promise<SiteSettings> {
    const { data } = await apiClient.get<SiteSettings>('/settings')
    return data
  },

  async patch(payload: SiteSettingsUpdate): Promise<SiteSettings> {
    const { data } = await apiClient.patch<SiteSettings>('/settings', payload)
    return data
  },
}
