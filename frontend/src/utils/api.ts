import axios from 'axios'
import type { ApiEnvelope, ChatResponse } from '../types/api'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 30000,
})

const api = {
  async listRuns(): Promise<string[]> {
    const res = await client.get('/api/runs')
    return res.data?.runs ?? []
  },
  async getRun(runId: string): Promise<any> {
    const res = await client.get(`/api/runs/${runId}`)
    return res.data
  },
  async sendChatMessage(
    runId: string,
    message: string,
    context?: { selectedTx?: string; selectedEntity?: string }
  ): Promise<ChatResponse> {
    const res = await client.post<ApiEnvelope<ChatResponse>>('/api/chat', {
      runId,
      message,
      context,
    })
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Chat request failed')
    }
    return res.data.data
  },
}

export default api
