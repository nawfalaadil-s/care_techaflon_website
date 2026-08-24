import { apiClient } from './client'
import type {
  AuthToken,
  LoginPayload,
  RegisterPayload,
  UserRead,
} from '@/types/auth'

/**
 * Auth API — account creation, login, token refresh and profile.
 * All endpoints return the full token pair (see backend /api/auth).
 */
export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthToken> {
    const { data } = await apiClient.post<AuthToken>('/auth/register', payload)
    return data
  },

  async login(payload: LoginPayload): Promise<AuthToken> {
    const { data } = await apiClient.post<AuthToken>('/auth/login', payload)
    return data
  },

  /** Exchange a refresh token for a fresh pair. Uses raw axios (no interceptors). */
  async refresh(refreshToken: string): Promise<AuthToken> {
    const { data } = await apiClient.post<AuthToken>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return data
  },

  async me(): Promise<UserRead> {
    const { data } = await apiClient.get<UserRead>('/auth/me')
    return data
  },

  /** Replace the provisioned demo password (returns a fresh token pair). */
  async changePassword(payload: {
    current_password: string
    new_password: string
  }): Promise<AuthToken> {
    const { data } = await apiClient.post<AuthToken>(
      '/auth/change-password',
      payload,
    )
    return data
  },
}
