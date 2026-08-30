import { useEffect, useState } from 'react'

import { settingsApi, type SiteSettings } from '@/api/settingsApi'
import { homeContent } from '@/data/home'

/**
 * Shared public event settings (`/api/settings/public`).
 *
 * The value is fetched once per page load and shared across the layout via a
 * module-level promise, so the header, footer and announcement banner all see
 * the same response without fan-out requests. When the API is unreachable the
 * hook falls back to the staged marketing content so the public site is never
 * blocked by a network hiccup.
 */

const fallbackSettings: SiteSettings = {
  event_name: 'Hackathon',
  tagline: homeContent.event.tagline,
  registration_open: true,
  registration_deadline: null,
  contact_email: '',
  announcement: '',
  certificates_visible: false,
}

let sharedFetch: Promise<SiteSettings> | null = null

function fetchPublicSettings(): Promise<SiteSettings> {
  sharedFetch ??= settingsApi.publicSettings().catch(() => fallbackSettings)
  return sharedFetch
}

export interface PublicSettingsState {
  settings: SiteSettings
  /** True once the live payload (or the fallback) has been resolved. */
  loaded: boolean
}

export function usePublicSettings(): PublicSettingsState {
  const [state, setState] = useState<PublicSettingsState>({
    settings: fallbackSettings,
    loaded: false,
  })

  useEffect(() => {
    let active = true
    void fetchPublicSettings().then((settings) => {
      if (active) setState({ settings, loaded: true })
    })
    return () => {
      active = false
    }
  }, [])

  return state
}