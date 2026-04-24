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

export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}
