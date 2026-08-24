import { apiClient } from './client'

export interface HealthResponse {
  status: string
  app: string
  version: string
  environment: string
  database: {
    connected: boolean
    detail: string | null
  }
  timestamp: string
}

/**
 * Health/system API.
 */
export const healthApi = {
  async getHealth(): Promise<HealthResponse> {
    const { data } = await apiClient.get<HealthResponse>('/health')
    return data
  },
}
