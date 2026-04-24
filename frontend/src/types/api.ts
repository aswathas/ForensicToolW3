export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  timestamp: number
}

export type ApiEnvelope<T> = ApiResponse<T>

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ChatContext {
  runId: string
  selectedEntity?: string
  selectedTransaction?: string
}

export interface ChatResponse {
  messages: ChatMessage[]
  context: ChatContext
}

export interface ExportRequest {
  runId: string
  format: 'pdf' | 'json' | 'html'
  includeGraphs: boolean
  includeRawData: boolean
}

export interface ExportResponse {
  url: string
  filename: string
  size: number
}
