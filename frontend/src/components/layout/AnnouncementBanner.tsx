import { usePublicSettings } from '@/hooks/usePublicSettings'
import { Container } from '@/components/ui/container'

/**
 * Live announcement bar (Phase 14 wiring).
 *
 * Renders the admin-managed `announcement` setting on every public page.
 * Hidden while the settings payload is still loading and when no
 * announcement is set, and it collapses away entirely otherwise.
 */
export function AnnouncementBanner() {
  const { settings, loaded } = usePublicSettings()

  if (!loaded || !settings.announcement) return null

  return (
    <div
      role="status"
      aria-label="Announcement"
      className="border-b border-info/30 bg-info/10 px-4 py-2.5 text-center text-sm font-medium text-info-foreground"
    >
      <Container>{settings.announcement}</Container>
    </div>
  )
}