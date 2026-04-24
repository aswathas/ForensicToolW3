import React, { useState } from 'react'
import { Message } from './Message'
import { useAIChat } from '../../hooks/useAIChat'
import { Button } from '../Common/Button'

interface AIChatProps {
  runId: string
  selectedTx?: string
  selectedEntity?: string
}

export const AIChat: React.FC<AIChatProps> = ({
  runId,
  selectedTx,
  selectedEntity,
}) => {
  const { messages, loading, error, sendMessage } = useAIChat(runId)
  const [input, setInput] = useState('')

  const handleSend = async () => {
    if (!input.trim()) return
    const content = input
    setInput('')
    await sendMessage(content, { selectedTx, selectedEntity })
  }

  return (
    <div className="h-full bg-bg-secondary rounded-lg border border-bg-tertiary overflow-hidden flex flex-col">
      <div className="p-4 border-b border-bg-tertiary">
        <h2 className="text-lg font-bold text-text-primary">Ask the Copilot</h2>
        <p className="text-text-muted text-sm">Ask questions about this attack</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-text-muted text-center">
              Ask a question about the attack to get started
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => <Message key={idx} message={msg} />)
        )}
        {loading && <p className="text-text-muted text-sm">Thinking...</p>}
        {error && <p className="text-accent-danger text-sm">{error}</p>}
      </div>

      <div className="border-t border-bg-tertiary p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask about this attack..."
            disabled={loading}
            className="flex-1 bg-bg-tertiary text-text-primary px-4 py-2 rounded border border-bg-tertiary focus:border-accent-primary outline-none"
          />
          <Button variant="primary" onClick={handleSend} disabled={loading}>
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
