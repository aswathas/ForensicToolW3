import React, { useState } from 'react'
import type { Transaction, Signal } from '../../types/forensics'

interface TransactionTimelineProps {
  transactions: Transaction[]
  signals: Signal[]
  onSelectTransaction: (tx: Transaction) => void
  selectedTx?: Transaction
}

export const TransactionTimeline: React.FC<TransactionTimelineProps> = ({
  transactions,
  signals: _signals,
  onSelectTransaction,
  selectedTx,
}) => {
  const [filter, setFilter] = useState<'all' | 'suspicious'>('suspicious')

  const filtered = filter === 'suspicious' ? transactions.filter(tx => tx.isAnomaly) : transactions

  return (
    <div className="flex flex-col h-full bg-bg-secondary rounded-lg border border-bg-tertiary overflow-hidden">
      <div className="p-4 border-b border-bg-tertiary">
        <h2 className="text-lg font-bold text-text-primary mb-3">Transactions</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded transition ${filter === 'all' ? 'bg-accent-primary text-white' : 'bg-bg-tertiary text-text-secondary'}`}
          >
            All ({transactions.length})
          </button>
          <button
            onClick={() => setFilter('suspicious')}
            className={`px-3 py-1 text-sm rounded transition ${filter === 'suspicious' ? 'bg-accent-danger text-white' : 'bg-bg-tertiary text-text-secondary'}`}
          >
            Suspicious ({transactions.filter(tx => tx.isAnomaly).length})
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(tx => (
          <div
            key={tx.hash}
            onClick={() => onSelectTransaction(tx)}
            className={`p-4 border-b border-bg-tertiary cursor-pointer transition hover:bg-bg-tertiary ${
              selectedTx?.hash === tx.hash ? 'bg-bg-tertiary ring-2 ring-accent-primary' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <code className="text-xs text-text-muted">{tx.hash.slice(0, 12)}...</code>
              {tx.isAnomaly && <div className="w-2 h-2 rounded-full bg-accent-danger" />}
            </div>
            <div className="text-sm">
              <p className="text-text-secondary">{tx.from.slice(0, 10)}... → {tx.to.slice(0, 10)}...</p>
              <p className="text-text-muted text-xs mt-1">Block {tx.blockNumber} • {new Date(tx.timestamp * 1000).toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
