import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'

import { config } from '@/config/env'
import { useAuthStore } from '@/store/authStore'
import type { AuthToken } from '@/types/auth'

/**
 * Centralized Axios instance.
 * All API modules must use this client — never create ad-hoc instances.
 */
export const apiClient = axios.create({
  baseURL: `${config.apiBaseUrl}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface ApiError {
  status: number | null
  message: string
  isNetworkError: boolean
}

/**
 * Normalize any thrown error into a predictable shape for UI consumption.
 */
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    if (error.response) {
      const data = error.response.data as { detail?: unknown } | undefined
      return {
        status: error.response.status,
        message: data?.detail ? formatDetail(data.detail) : (error.message ?? 'An unexpected server error occurred.'),
        isNetworkError: false,
      }
    }
    return {
      status: null,
      message: 'Cannot reach the server. Check your connection and try again.',
      isNetworkError: true,
    }
  }
  return {
    status: null,
    message: error instanceof Error ? error.message : 'Unknown error.',
    isNetworkError: false,
  }
}

/** FastAPI validation errors arrive as arrays of field objects — flatten them. */
function formatDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (item && typeof item === 'object' && 'msg' in item) {
        const loc = Array.isArray((item as { loc?: unknown[] }).loc)
          ? (item as { loc: unknown[] }).loc.slice(1).join('.')
          : ''
        const msg = String((item as { msg?: string }).msg ?? '').replace(/^Value error,\s*/i, '')
        return loc ? `${loc}: ${msg}` : msg
      }
      return String(item)
    })
    return parts.join(' · ')
  }
  return 'An unexpected server error occurred.'
}

// ---------------------------------------------------------------------------
// Auth wiring: attach Bearer token + transparent refresh on 401.
// ---------------------------------------------------------------------------

/** Endpoints whose own 401s must never trigger a refresh attempt. */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh']

/** Single-flight refresh so concurrent 401s share one network call. */
let refreshInFlight: Promise<string | null> | null = null

function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    const { refreshToken, setSession, clearSession } = useAuthStore.getState()
    if (!refreshToken) return null
    try {
      // Bare axios: skips our interceptors to avoid recursion.
      const { data } = await axios.post<AuthToken>(
        `${config.apiBaseUrl}/api/auth/refresh`,
        { refresh_token: refreshToken },
        { timeout: 15000 },
      )
      setSession(data)
      return data.access_token
    } catch {
      clearSession()
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

apiClient.interceptors.request.use((request) => {
  const token = useAuthStore.getState().accessToken
  if (token) request.headers.set('Authorization', `Bearer ${token}`)
  return request
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      NO_REFRESH_PATHS.some((path) => original.url?.includes(path))
    ) {
      return Promise.reject(error)
    }

    original._retry = true
    const token = await refreshAccessToken()
    if (!token) return Promise.reject(error)

    original.headers.set('Authorization', `Bearer ${token}`)
    return apiClient(original)
  },
)
