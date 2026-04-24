import React from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import { Button } from '../components/Common/Button'

export const Landing: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl font-bold text-text-primary mb-4 font-display">
            EVM Forensics
          </h1>
          <p className="text-xl text-text-secondary mb-8">
            Enterprise-grade blockchain investigation. Detect attacks, trace fund flows, and generate audit-ready reports.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/dashboard">
              <Button variant="primary" size="lg">
                Start Investigation
              </Button>
            </Link>
            <Link to="/signals">
              <Button variant="secondary" size="lg">
                View Detection Rules
              </Button>
            </Link>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-8">
            <Feature title="28 Heuristics" desc="Detection rules covering 6 attack categories" />
            <Feature title="Evidence-First" desc="Every finding linked to upstream data" />
            <Feature title="AI Copilot" desc="Ask questions about attacks with Ollama" />
          </div>
        </div>
      </div>
    </Layout>
  )
}

const Feature: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div>
    <h3 className="text-lg font-semibold text-accent-primary mb-2">{title}</h3>
    <p className="text-text-muted">{desc}</p>
  </div>
)
