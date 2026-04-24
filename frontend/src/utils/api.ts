import axios, { AxiosInstance } from 'axios'
import type { ForensicBundle } from '../types/forensics'
import type {
  ApiResponse,
  ChatResponse,
  ExportRequest,
  ExportResponse,
} from '../types/api'

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:3001'

class ForensicsAPI {
  private client: AxiosInstance

  constructor(baseURL: string = API_BASE) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
    })
  }

  async getForensicRun(runId: string): Promise<ForensicBundle> {
    const response = await this.client.get<ApiResponse<ForensicBundle>>(
      `/api/forensics/${runId}`
    )
    return response.data.data
  }

  async listRuns(): Promise<string[]> {
    const response = await this.client.get<ApiResponse<string[]>>(
      '/api/forensics/runs'
    )
    return response.data.data
  }

  async sendChatMessage(
    runId: string,
    message: string,
    context?: { selectedTx?: string; selectedEntity?: string }
  ): Promise<ChatResponse> {
    const response = await this.client.post<ApiResponse<ChatResponse>>(
      '/api/chat',
      { runId, message, context }
    )
    return response.data.data
  }

  async exportReport(req: ExportRequest): Promise<ExportResponse> {
    const response = await this.client.post<ApiResponse<ExportResponse>>(
      '/api/reports/export',
      req
    )
    return response.data.data
  }
}

export default new ForensicsAPI()
