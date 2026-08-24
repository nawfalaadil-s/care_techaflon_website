/**
 * Centralized environment configuration.
 * All Vite env access happens here — never import.meta.env directly in components.
 */

const env = import.meta.env

export const config = {
  apiBaseUrl: env.VITE_API_BASE_URL ?? '',
  appName: 'Hackathon Platform',
  appMode: env.MODE,
  isDev: env.DEV,
} as const
