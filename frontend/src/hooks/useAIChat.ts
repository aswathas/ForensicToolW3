import { useState, useCallback } from 'react'
import type { ChatMessage } from '../types/api'
import api from '../utils/api'

export function useAIChat(runId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (
      content: string,
      context?: { selectedTx?: string; selectedEntity?: string }
    ) => {
      setLoading(true)
      setError(null)

      try {
        const response = await api.sendChatMessage(runId, content, context)
        setMessages(prev => [...prev, ...response.messages])
      } catch (err: any) {
        setError(err?.message || 'Failed to send message')
      } finally {
        setLoading(false)
      }
    },
    [runId]
  )

  return { messages, loading, error, sendMessage }
}
