import { Outlet } from 'react-router-dom'

import { DoomsdayCharacter } from '@/components/doomsday/DoomsdayCharacter'
import { AnnouncementBanner } from '@/components/layout/AnnouncementBanner'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicHeader } from '@/components/layout/PublicHeader'

/**
 * Shared shell for all public pages: sticky header, optional live
 * announcement banner, routed content, and footer with flex column so the
 * footer anchors to the bottom even on short pages.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden overflow-y-auto">
      <PublicHeader />
      <DoomsdayCharacter />
      <AnnouncementBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}