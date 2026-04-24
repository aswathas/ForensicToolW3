import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import { AttackSummary } from '../components/Investigation/AttackSummary'
import { TransactionTimeline } from '../components/Investigation/TransactionTimeline'
import { FundFlowGraph } from '../components/Investigation/FundFlowGraph'
import { EvidencePanel } from '../components/Investigation/EvidencePanel'
import { AIChat } from '../components/Chat/AIChat'
import { useForensicData } from '../hooks/useForensicData'
import type { Transaction } from '../types/forensics'

export const Investigation: React.FC = () => {
  const { runId } = useParams<{ runId: string }>()
  const { data, loading, error } = useForensicData(runId || null)
  const [selectedTx, setSelectedTx] = useState<Transaction | undefined>()

  if (loading) return <Layout><div className="p-6">Loading...</div></Layout>
  if (error || !data) return <Layout><div className="p-6 text-accent-danger">{error || 'Failed to load data'}</div></Layout>

  const dummyRun = {
    runId: data.runId,
    timestamp: Date.now(),
    scenario: 'reentrancy',
    confidence: 0.92,
    status: 'CONFIRMED' as const,
    metadata: {
      totalTransactions: data.transactions.length,
      suspiciousTransactions: data.transactions.filter(t => t.isAnomaly).length,
      attackType: 'Reentrancy',
      attackVector: 'Unsafe ether transfer',
      stolenAmount: '10 ETH',
      stolenAsset: 'ETH',
      attacker: '0x1234567890123456789012345678901234567890',
      victim: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    },
  }

  const relatedSignals = data.signals.filter(s =>
    selectedTx ? s.affectedTransactions.includes(selectedTx.hash) : false
  )

  return (
    <Layout showSidebar>
      <div className="p-6">
        <AttackSummary run={dummyRun} />
        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-300px)]">
          <TransactionTimeline
            transactions={data.transactions}
            signals={data.signals}
            onSelectTransaction={setSelectedTx}
            selectedTx={selectedTx}
          />
          <FundFlowGraph flows={data.fundFlows} />
          <EvidencePanel transaction={selectedTx} signals={data.signals} relatedSignals={relatedSignals} />
        </div>
        <div className="mt-6 h-96">
          <AIChat runId={data.runId} selectedTx={selectedTx?.hash} selectedEntity="" />
        </div>
      </div>
    </Layout>
  )
}
