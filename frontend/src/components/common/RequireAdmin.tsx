import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'
import { isOrganizer } from './useIsOrganizer'

/**
 * Route guard for admin CRM pages — requires a signed-in organizer/admin.
 * Signed-out users go to /login; signed-in non-organizers get bounced home.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isOrganizer(user)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

