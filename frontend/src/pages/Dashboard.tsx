import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import { Card } from '../components/Common/Card'
import { Button } from '../components/Common/Button'
import api from '../utils/api'

export const Dashboard: React.FC = () => {
  const [runs, setRuns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await api.listRuns()
        setRuns(result)
      } catch (err) {
        console.error('Failed to load runs')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return (
    <Layout showSidebar>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-ferrari-400 to-gold-400 bg-clip-text text-transparent mb-2">
            Forensic Runs
          </h1>
          <p className="text-text-secondary">Investigate blockchain attacks and suspicious activity</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-ferrari-600/30 border-t-ferrari-600 rounded-full"></div>
          </div>
        ) : runs.length === 0 ? (
          <Card className="border-ferrari-600/30 bg-bg-secondary/50">
            <div className="text-center py-12">
              <p className="text-text-muted mb-4 text-lg">No forensic runs found yet</p>
              <p className="text-text-muted mb-6">Run a simulation to generate blockchain attack data:</p>
              <code className="text-sm text-gold-400 bg-bg-primary px-4 py-2 rounded inline-block font-mono">
                npm run sim:quick
              </code>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {runs.map((runId, idx) => (
              <div
                key={runId}
                className="group relative cursor-pointer"
                onClick={() => navigate(`/investigation/${runId}`)}
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-ferrari-600/20 to-gold-400/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <Card className="relative ferrari-card border border-ferrari-600/20 group-hover:border-ferrari-500/50 cursor-pointer transition-all duration-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">⚡</span>
                        <h3 className="font-bold text-text-primary text-lg font-mono">{runId}</h3>
                      </div>
                      <p className="text-text-muted text-sm">
                        Run #{idx + 1} • Click to investigate attacks
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/investigation/${runId}`)
                      }}
                    >
                      → Investigate
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
