import React, { useState } from 'react'
import { Layout } from '../components/Layout/Layout'
import { Card } from '../components/Common/Card'
import { Button } from '../components/Common/Button'

export const ReportBuilder: React.FC = () => {
  const [format, setFormat] = useState<'pdf' | 'json'>('pdf')
  const [generating, setGenerating] = useState(false)

  const handleExport = async () => {
    setGenerating(true)
    setTimeout(() => setGenerating(false), 1500)
  }

  return (
    <Layout showSidebar>
      <div className="p-6 max-w-2xl">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Generate Report</h1>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Report Format</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                value="pdf"
                checked={format === 'pdf'}
                onChange={e => setFormat(e.target.value as 'pdf')}
              />
              <span className="text-text-primary">PDF (audit-ready, formatted)</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                value="json"
                checked={format === 'json'}
                onChange={e => setFormat(e.target.value as 'json')}
              />
              <span className="text-text-primary">JSON (raw data export)</span>
            </label>
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Options</h2>
          <label className="flex items-center gap-3 mb-2">
            <input type="checkbox" defaultChecked />
            <span className="text-text-primary">Include execution graphs</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked />
            <span className="text-text-primary">Include fund flow diagram</span>
          </label>
        </Card>

        <Button variant="primary" onClick={handleExport} disabled={generating}>
          {generating ? 'Generating...' : 'Export Report'}
        </Button>
      </div>
    </Layout>
  )
}
