import React from 'react'
import type { Transaction, Signal } from '../../types/forensics'

interface EvidencePanelProps {
  transaction?: Transaction
  signals: Signal[]
  relatedSignals: Signal[]
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ transaction, signals, relatedSignals }) => {
  if (!transaction) {
    return (
      <div className="h-full bg-bg-secondary rounded-lg border border-bg-tertiary p-6 flex items-center justify-center">
        <p className="text-text-muted">Select a transaction to view evidence</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-secondary rounded-lg border border-bg-tertiary overflow-hidden flex flex-col">
      <div className="p-4 border-b border-bg-tertiary">
        <h2 className="text-lg font-bold text-text-primary">Evidence</h2>
        <code className="text-xs text-text-muted">{transaction.hash}</code>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-text-muted text-sm">From</p>
          <code className="text-xs text-accent-primary">{transaction.from}</code>
        </div>
        <div>
          <p className="text-text-muted text-sm">To</p>
          <code className="text-xs text-accent-primary">{transaction.to}</code>
        </div>
        <div>
          <p className="text-text-muted text-sm">Value</p>
          <p className="text-sm text-text-primary">{transaction.value} wei</p>
        </div>
        <div>
          <p className="text-text-muted text-sm mb-2">Firing Signals</p>
          <div className="space-y-2">
            {relatedSignals.slice(0, 3).map(signal => (
              <div key={signal.id} className="bg-bg-tertiary p-2 rounded text-xs">
                <p className="font-semibold text-accent-warning">{signal.name}</p>
                <p className="text-text-muted">{signal.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
