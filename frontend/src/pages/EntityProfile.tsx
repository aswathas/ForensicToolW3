import React, { useState } from 'react'
import { Layout } from '../components/Layout/Layout'
import { Card } from '../components/Common/Card'

export const EntityProfile: React.FC = () => {
  const [entity] = useState({
    address: '0x1234567890123456789012345678901234567890',
    type: 'contract' as const,
    role: 'attacker' as const,
    riskScore: 0.95,
    transactionCount: 42,
    firstSeen: Date.now() - 86400000,
    lastSeen: Date.now(),
  })

  return (
    <Layout showSidebar>
      <div className="p-6 max-w-4xl">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Entity Profile</h1>

        <Card className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-text-muted text-sm">Address</p>
              <code className="text-accent-primary">{entity.address}</code>
            </div>
            <div>
              <p className="text-text-muted text-sm">Type</p>
              <p className="text-text-primary capitalize">{entity.type}</p>
            </div>
            <div>
              <p className="text-text-muted text-sm">Role</p>
              <p className="text-accent-danger capitalize font-semibold">{entity.role}</p>
            </div>
            <div>
              <p className="text-text-muted text-sm">Risk Score</p>
              <p className="text-lg font-bold text-accent-danger">{(entity.riskScore * 100).toFixed(0)}%</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-text-primary mb-4">Activity</h2>
          <p className="text-text-muted">Transaction Count: {entity.transactionCount}</p>
          <p className="text-text-muted">First Seen: {new Date(entity.firstSeen).toLocaleString()}</p>
          <p className="text-text-muted">Last Seen: {new Date(entity.lastSeen).toLocaleString()}</p>
        </Card>
      </div>
    </Layout>
  )
}
