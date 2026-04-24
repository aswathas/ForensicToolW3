import React from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import { Button } from '../components/Common/Button'

export const Landing: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-ferrari-600/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-3xl text-center relative z-10">
          <div className="mb-8 inline-block">
            <div className="text-6xl font-black bg-gradient-to-r from-ferrari-500 via-ferrari-400 to-gold-400 bg-clip-text text-transparent mb-4">
              EVM Forensics
            </div>
            <div className="h-1 w-32 bg-gradient-to-r from-ferrari-600 to-gold-400 mx-auto"></div>
          </div>

          <h2 className="text-3xl font-bold text-text-primary mb-6 leading-tight">
            Enterprise-Grade Blockchain Investigation
          </h2>

          <p className="text-xl text-text-secondary mb-12 max-w-xl mx-auto">
            Detect attacks, trace fund flows, and generate audit-ready reports with 28 advanced heuristic detection rules.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link to="/dashboard">
              <Button variant="primary" size="lg">
                ⚡ Start Investigation
              </Button>
            </Link>
            <Link to="/signals">
              <Button variant="secondary" size="lg">
                📋 View Detection Rules
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon="🔍"
              title="28 Detection Rules"
              desc="Advanced heuristics covering reentrancy, approvals, flashloans, oracle, admin, and fund flow attacks"
            />
            <FeatureCard
              icon="🔗"
              title="Evidence-Linked"
              desc="Every finding traceable back to raw blockchain data with deterministic derivations"
            />
            <FeatureCard
              icon="🤖"
              title="AI Analysis"
              desc="Ollama-powered copilot for deep investigation and attack hypothesis generation"
            />
          </div>
        </div>
      </div>
    </Layout>
  )
}

const FeatureCard: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="ferrari-card border border-ferrari-600/20 rounded-lg p-6 hover:border-ferrari-500/50 hover:shadow-ferrari/30 transition-all duration-300 group">
    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{icon}</div>
    <h3 className="text-lg font-bold text-gold-400 mb-2">{title}</h3>
    <p className="text-text-muted text-sm leading-relaxed">{desc}</p>
  </div>
)
