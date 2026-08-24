import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'

function isOrganizer(
  user: { is_admin: boolean; role: string } | null,
): boolean {
  return Boolean(user && (user.is_admin || ['organizer', 'admin'].includes(user.role)))
}

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

/** True when the current session belongs to an organizer/admin. */
export function useIsOrganizer(): boolean {
  return isOrganizer(useAuthStore((s) => s.user))
}
