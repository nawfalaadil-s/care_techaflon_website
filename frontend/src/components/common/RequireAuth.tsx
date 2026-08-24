import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'

/**
 * Route guard — renders children only for signed-in users,
 * otherwise redirects to /login preserving the intended destination.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  return <>{children}</>
}
