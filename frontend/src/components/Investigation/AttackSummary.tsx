import React from 'react'
import type { ForensicRun } from '../../types/forensics'

interface AttackSummaryProps {
  run: ForensicRun
}

export const AttackSummary: React.FC<AttackSummaryProps> = ({ run }) => {
  return (
    <div className="bg-bg-secondary border border-bg-tertiary rounded-lg p-6 mb-6">
      <div className="grid grid-cols-4 gap-4">
        <SummaryItem label="Verdict" value={run.status} color={run.status === 'CONFIRMED' ? 'text-accent-success' : 'text-accent-warning'} />
        <SummaryItem label="Attacker" value={run.metadata.attacker.slice(0, 10) + '...'} color="text-accent-primary" />
        <SummaryItem label="Stolen" value={run.metadata.stolenAmount} color="text-accent-danger" />
        <SummaryItem label="Confidence" value={`${Math.round(run.confidence * 100)}%`} color="text-accent-success" />
      </div>
    </div>
  )
}

interface SummaryItemProps {
  label: string
  value: string
  color: string
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value, color }) => (
  <div>
    <p className="text-text-muted text-sm">{label}</p>
    <p className={`text-lg font-semibold ${color}`}>{value}</p>
  </div>
)
