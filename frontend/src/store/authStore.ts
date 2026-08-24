import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { AuthToken, UserRead } from '@/types/auth'

interface AuthState {
  user: UserRead | null
  accessToken: string | null
  refreshToken: string | null
  /** Store a fresh token pair + user (login, register, refresh). */
  setSession: (token: AuthToken) => void
  /** Wipe the session (logout or failed refresh). */
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ access_token, refresh_token, user }) =>
        set({ accessToken: access_token, refreshToken: refresh_token, user }),
      clearSession: () =>
        set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'hackathon-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)
