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
      <div className="p-6">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Forensic Runs</h1>

        {loading ? (
          <p className="text-text-muted">Loading runs...</p>
        ) : runs.length === 0 ? (
          <Card>
            <p className="text-text-muted mb-4">No forensic runs found. Run a simulation first:</p>
            <code className="text-sm text-accent-primary">npm run sim:quick</code>
          </Card>
        ) : (
          <div className="grid gap-4">
            {runs.map(runId => (
              <Card key={runId} className="cursor-pointer hover:ring-2 hover:ring-accent-primary transition">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-text-primary">{runId}</h3>
                    <p className="text-text-muted text-sm">Click to investigate</p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/investigation/${runId}`)}
                  >
                    Investigate
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
