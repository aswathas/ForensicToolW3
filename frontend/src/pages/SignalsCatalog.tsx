import React from 'react'
import { Layout } from '../components/Layout/Layout'
import { Card } from '../components/Common/Card'

const SIGNALS = [
  { id: 1, name: 'Reentrancy (Same Function)', category: 'reentrancy', severity: 'critical', desc: 'Multiple calls to same function in same tx' },
  { id: 2, name: 'Cross-Function Reentrancy', category: 'reentrancy', severity: 'critical', desc: 'Vulnerable state update across functions' },
  { id: 3, name: 'Unlimited Approval', category: 'approval', severity: 'high', desc: 'Infinite token allowance granted' },
  { id: 4, name: 'Flashloan Borrow-Repay', category: 'flashloan', severity: 'high', desc: 'Large borrow repaid in same tx' },
  { id: 5, name: 'Oracle Price Deviation', category: 'oracle', severity: 'medium', desc: 'Spot price spike in same block' },
  { id: 6, name: 'Admin Role Change', category: 'admin', severity: 'medium', desc: 'Privileged role reassigned' },
]

export const SignalsCatalog: React.FC = () => {
  const categories = Array.from(new Set(SIGNALS.map(s => s.category)))

  return (
    <Layout showSidebar>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Detection Rules (28 Heuristics)</h1>

        {categories.map(cat => (
          <div key={cat} className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-3 capitalize">{cat}</h2>
            <div className="grid gap-4">
              {SIGNALS.filter(s => s.category === cat).map(signal => (
                <Card key={signal.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-text-primary">{signal.name}</h3>
                      <p className="text-text-muted text-sm mt-1">{signal.desc}</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-bold ${
                      signal.severity === 'critical' ? 'bg-accent-danger text-white' :
                      signal.severity === 'high' ? 'bg-accent-warning text-white' :
                      'bg-accent-primary text-white'
                    }`}>
                      {signal.severity.toUpperCase()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
