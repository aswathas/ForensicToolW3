import React from 'react'
import type { ChatMessage } from '../../types/api'

interface MessageComponentProps {
  message: ChatMessage
}

export const Message: React.FC<MessageComponentProps> = ({ message }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser ? 'bg-accent-primary text-white' : 'bg-bg-tertiary text-text-primary'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-text-muted'}`}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}
