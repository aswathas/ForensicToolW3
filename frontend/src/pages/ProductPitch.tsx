import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Shield, Zap, TrendingUp, Lock, CheckCircle2, XCircle,
  ArrowRight, Database, GitBranch, Search, BarChart3,
  Network, FileText, Brain, Activity, RefreshCw,
} from 'lucide-react'
import { GradientBackground } from '../components/ui/paper-design-shader-background'

// ── Animation helpers ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
}

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Comparison data ─────────────────────────────────────────────────────────

const FEATURES = [
  { label: 'Evidence-linked findings',     us: true,  chainalysis: true,  elliptic: false, trm: false, nansen: false },
  { label: 'Open-source / self-hosted',    us: true,  chainalysis: false, elliptic: false, trm: false, nansen: false },
  { label: '28 heuristic detection rules', us: true,  chainalysis: false, elliptic: false, trm: false, nansen: false },
  { label: 'Deterministic reproducible output', us: true, chainalysis: false, elliptic: false, trm: false, nansen: false },
  { label: 'Custom attack scenario testing', us: true, chainalysis: false, elliptic: false, trm: false, nansen: false },
  { label: 'AI narrative (local LLM)',     us: true,  chainalysis: false, elliptic: false, trm: false, nansen: false },
  { label: 'On-chain trace analysis',      us: true,  chainalysis: true,  elliptic: true,  trm: true,  nansen: false },
  { label: 'EVM smart-contract decoding',  us: true,  chainalysis: true,  elliptic: true,  trm: true,  nansen: false },
  { label: 'Fund flow tracing',            us: true,  chainalysis: true,  elliptic: true,  trm: true,  nansen: true },
  { label: 'ML risk scoring',              us: true,  chainalysis: true,  elliptic: true,  trm: true,  nansen: true },
  { label: 'PDF export',                   us: true,  chainalysis: true,  elliptic: true,  trm: false, nansen: false },
  { label: 'No vendor lock-in',            us: true,  chainalysis: false, elliptic: false, trm: false, nansen: false },
]

const TOOLS = [
  { key: 'us',         label: 'EVM Forensics', color: '#dc143c', highlight: true },
  { key: 'chainalysis',label: 'Chainalysis',   color: 'rgba(255,255,255,0.3)', highlight: false },
  { key: 'elliptic',   label: 'Elliptic',      color: 'rgba(255,255,255,0.3)', highlight: false },
  { key: 'trm',        label: 'TRM Labs',      color: 'rgba(255,255,255,0.3)', highlight: false },
  { key: 'nansen',     label: 'Nansen',        color: 'rgba(255,255,255,0.3)', highlight: false },
] as const

type ToolKey = (typeof TOOLS)[number]['key']

// ── Pipeline steps ──────────────────────────────────────────────────────────

const PIPELINE = [
  { n: '01', label: 'Raw Intake',       icon: Database,   desc: 'RPC or file import — blocks, txs, traces, state diffs' },
  { n: '02', label: 'ABI Binding',      icon: GitBranch,  desc: 'Index known ABIs, decode calls & events — never assume' },
  { n: '03', label: 'Derived Layer',    icon: Network,    desc: '36 deterministic enriched datasets from raw data' },
  { n: '04', label: '28 Signals',       icon: Search,     desc: 'Heuristic rules fire against derived data, evidence-linked' },
  { n: '05', label: 'ML Scoring',       icon: BarChart3,  desc: 'Feature vectors, entity risk, community detection' },
  { n: '06', label: 'Incident Cluster', icon: Activity,   desc: 'Correlated suspicious txs grouped into incidents' },
  { n: '07', label: 'Forensic Report',  icon: FileText,   desc: 'Evidence-linked findings — suspect entities, money trail' },
  { n: '08', label: 'AI Narrative',     icon: Brain,      desc: 'Grounded Ollama narrative — citations, hypotheses, next steps' },
  { n: '09', label: 'Graph Export',     icon: RefreshCw,  desc: 'Execution & fund-flow graphs (.dot format)' },
]

// ── Attack categories ───────────────────────────────────────────────────────

const CATEGORIES = [
  { icon: RefreshCw, label: 'Reentrancy',    count: 6, color: '#dc143c', desc: 'Contract called back before state updated' },
  { icon: Shield,    label: 'Approvals',     count: 4, color: '#d4af37', desc: 'Unlimited approvals, drain-on-approval patterns' },
  { icon: Zap,       label: 'Flash Loans',   count: 4, color: '#38bdf8', desc: 'Borrow-repay same tx, multi-pool manipulation' },
  { icon: TrendingUp,label: 'Oracle / Price',count: 4, color: '#f97316', desc: 'Spot price spikes, oracle deviation, sandwich' },
  { icon: Lock,      label: 'Admin / Upgrade',count:4, color: '#a78bfa', desc: 'Proxy swaps, privilege escalation, upgrade+outflow' },
  { icon: Network,   label: 'Fund Flow',     count: 6, color: '#22c55e', desc: 'Peel chains, consolidation, hop-to-risky destinations' },
]

// ── Pillars ─────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: Shield,
    title: 'Evidence-First',
    color: '#dc143c',
    desc: 'Every finding cites the upstream dataset and record ID that produced it. No fabrication — conclusions traceable to raw blockchain data.',
  },
  {
    icon: GitBranch,
    title: 'Deterministic Output',
    color: '#d4af37',
    desc: 'Same input always produces the same output. SHA256 manifests + referential integrity reports on every run. Legally defensible.',
  },
  {
    icon: Activity,
    title: 'Graceful Degradation',
    color: '#38bdf8',
    desc: 'Missing traces, state diffs, or ABIs? The engine documents limitations and continues — never silent failures, never hallucinated data.',
  },
]

// ── Main component ──────────────────────────────────────────────────────────

export const ProductPitch: React.FC = () => {
  return (
    <div style={{ background: '#020306', color: 'white', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* ── Minimal nav ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(2,3,6,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.2em', color: '#dc143c', textTransform: 'uppercase' }}>
          EVM Forensics Agent
        </span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {(['#comparison', '#architecture', '#signals', '#pillars'] as const).map((href, i) => (
            <a key={i} href={href} style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', letterSpacing: '0.05em' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
              {href.slice(1).charAt(0).toUpperCase() + href.slice(2)}
            </a>
          ))}
          <Link to="/dashboard" style={{ fontSize: 12, padding: '8px 20px', borderRadius: 20, background: '#dc143c', color: 'white', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.03em' }}>
            Open Dashboard →
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', isolation: 'isolate', overflow: 'hidden' }}>
        <GradientBackground
          colors={['hsl(0, 85%, 35%)', 'hsl(14, 100%, 42%)', 'hsl(350, 75%, 28%)']}
          colorBack="hsl(0, 0%, 1%)"
          intensity={0.42}
          speed={0.6}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(2,3,6,0.55) 0%, rgba(2,3,6,0.72) 100%)', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 820, padding: '120px 32px 80px' }}>
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 24 }}>
              Enterprise Blockchain Forensics
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(56px, 10vw, 120px)', lineHeight: 0.95, letterSpacing: '0.02em', margin: '0 0 24px', background: 'linear-gradient(135deg, #ffffff 30%, rgba(255,255,255,0.55))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Detect Attacks Before They Become Disasters
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.38 }}
            style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(255,255,255,0.5)', maxWidth: 560, margin: '0 auto 40px' }}
          >
            28 heuristic detection rules. Evidence-first forensics. Deterministic, reproducible output. Open-source and self-hosted.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.52 }}
            style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Link to="/dashboard" style={{ padding: '14px 32px', borderRadius: 28, background: '#dc143c', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8 }}>
              Open Dashboard <ArrowRight size={16} />
            </Link>
            <a href="#architecture" style={{ padding: '14px 32px', borderRadius: 28, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              See Architecture
            </a>
          </motion.div>

          {/* Stat strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            style={{ marginTop: 80, display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            {[['$3.8B', 'stolen from DeFi in 2023'], ['28', 'detection rules'], ['36', 'derived datasets'], ['100%', 'evidence-linked']].map(([val, lbl]) => (
              <div key={lbl} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 40, color: '#dc143c', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lbl}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            style={{ width: 1, height: 48, background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)', margin: '0 auto' }}
          />
        </motion.div>
      </div>

      {/* ── THE PROBLEM ── */}
      <section style={{ padding: '120px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <Section>
          <motion.div variants={fadeUp} custom={0} style={{ textAlign: 'center', marginBottom: 64 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#dc143c', display: 'block', marginBottom: 16 }}>The Problem</span>
            <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 1, letterSpacing: '0.04em', margin: 0 }}>Existing Tools Leave You in the Dark</h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { n: '01', title: 'Black Box Detections', desc: "Most tools emit a risk score with no explanation. You don't know why a wallet was flagged — making it impossible to defend the finding in court or to regulators.", color: '#dc143c' },
              { n: '02', title: '$3.8B Stolen in 2023', desc: 'Blockchain attacks are accelerating. Flash loans, reentrancy, oracle manipulation — attackers move in single transactions. Slow manual investigation cannot keep pace.', color: '#d4af37' },
              { n: '03', title: 'Vendor Lock-in Everywhere', desc: 'Chainalysis, Elliptic, and TRM Labs are powerful but proprietary. You can\'t inspect their models, audit their conclusions, or run forensics without an enterprise contract.', color: '#38bdf8' },
            ].map((card) => (
              <motion.div
                key={card.n}
                variants={fadeUp}
                custom={parseInt(card.n) * 0.15}
                style={{ padding: 32, borderRadius: 8, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 72, color: `${card.color}12`, position: 'absolute', top: -8, right: 16, lineHeight: 1 }}>{card.n}</div>
                <div style={{ width: 3, height: 32, background: card.color, borderRadius: 2, marginBottom: 20 }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'rgba(255,255,255,0.9)' }}>{card.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section id="comparison" style={{ padding: '80px 40px 120px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Section>
            <motion.div variants={fadeUp} custom={0} style={{ textAlign: 'center', marginBottom: 56 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#dc143c', display: 'block', marginBottom: 16 }}>Competitive Analysis</span>
              <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 1, letterSpacing: '0.04em', margin: 0 }}>How We Compare</h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginTop: 16 }}>Feature-by-feature comparison against leading blockchain forensics tools</p>
            </motion.div>

            <motion.div variants={fadeUp} custom={0.1} style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '14px 16px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      Feature
                    </th>
                    {TOOLS.map(tool => (
                      <th key={tool.key} style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', borderBottom: '1px solid rgba(255,255,255,0.08)', color: tool.highlight ? '#dc143c' : 'rgba(255,255,255,0.45)', background: tool.highlight ? 'rgba(220,20,60,0.05)' : 'transparent', whiteSpace: 'nowrap' }}>
                        {tool.highlight && <span style={{ display: 'block', fontSize: 9, marginBottom: 4, color: '#dc143c', letterSpacing: '0.1em' }}>★ US</span>}
                        {tool.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((feat, fi) => (
                    <tr key={fi} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '13px 16px', color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{feat.label}</td>
                      {TOOLS.map(tool => {
                        const val = feat[tool.key as ToolKey]
                        return (
                          <td key={tool.key} style={{ padding: '13px 16px', textAlign: 'center', background: tool.highlight ? 'rgba(220,20,60,0.04)' : 'transparent' }}>
                            {val
                              ? <CheckCircle2 size={16} style={{ color: tool.highlight ? '#dc143c' : '#22c55e', display: 'inline-block' }} />
                              : <XCircle size={16} style={{ color: 'rgba(255,255,255,0.12)', display: 'inline-block' }} />
                            }
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>

            <motion.p variants={fadeUp} custom={0.2} style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 20, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
              Based on publicly available feature documentation. Competitor capabilities may vary by tier.
            </motion.p>
          </Section>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section id="architecture" style={{ padding: '120px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <Section>
          <motion.div variants={fadeUp} custom={0} style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#dc143c', display: 'block', marginBottom: 16 }}>Under the Hood</span>
            <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 1, letterSpacing: '0.04em', margin: 0 }}>9-Step Forensic Pipeline</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginTop: 16, maxWidth: 540, margin: '16px auto 0' }}>
              Every step is deterministic, evidence-linked, and independently auditable. SHA256 manifests on every run.
            </p>
          </motion.div>

          {/* Pipeline diagram */}
          <div style={{ position: 'relative' }}>
            {/* Connecting line */}
            <div style={{ position: 'absolute', left: 31, top: 32, bottom: 32, width: 1, background: 'linear-gradient(to bottom, #dc143c, rgba(220,20,60,0.1))', zIndex: 0 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {PIPELINE.map((step, i) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.n}
                    variants={fadeUp}
                    custom={i * 0.08}
                    style={{ display: 'flex', gap: 24, alignItems: 'flex-start', padding: '20px 0', position: 'relative', zIndex: 1 }}
                  >
                    {/* Step node */}
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: i === 0 ? '#dc143c' : 'rgba(220,20,60,0.12)', border: `1px solid ${i === 0 ? '#dc143c' : 'rgba(220,20,60,0.3)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} style={{ color: i === 0 ? 'white' : '#dc143c' }} />
                    </div>

                    {/* Content */}
                    <div style={{ paddingTop: 10, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(220,20,60,0.6)', letterSpacing: '0.1em' }}>{step.n}</span>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0, letterSpacing: '0.02em' }}>{step.label}</h3>
                      </div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
                    </div>

                    {/* Layer badge */}
                    {i < 3 && (
                      <span style={{ flexShrink: 0, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: '4px 10px', borderRadius: 10, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)', color: '#d4af37', letterSpacing: '0.08em', marginTop: 12 }}>
                        {i === 0 ? 'LAYER 0' : i === 1 ? 'LAYER 0' : 'LAYER 1'}
                      </span>
                    )}
                    {(i === 3) && (
                      <span style={{ flexShrink: 0, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: '4px 10px', borderRadius: 10, background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.25)', color: '#dc143c', letterSpacing: '0.08em', marginTop: 12 }}>
                        LAYER 2
                      </span>
                    )}
                    {(i === 4) && (
                      <span style={{ flexShrink: 0, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: '4px 10px', borderRadius: 10, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8', letterSpacing: '0.08em', marginTop: 12 }}>
                        LAYER 3
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </Section>
      </section>

      {/* ── 28 SIGNALS ── */}
      <section id="signals" style={{ padding: '80px 40px 120px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Section>
            <motion.div variants={fadeUp} custom={0} style={{ textAlign: 'center', marginBottom: 64 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#dc143c', display: 'block', marginBottom: 16 }}>Detection Coverage</span>
              <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 1, letterSpacing: '0.04em', margin: 0 }}>28 Heuristic Rules</h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginTop: 16 }}>Across 6 attack categories — each with confidence scoring and false-positive notes</p>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              {CATEGORIES.map((cat, i) => {
                const Icon = cat.icon
                return (
                  <motion.div
                    key={cat.label}
                    variants={fadeUp}
                    custom={i * 0.1}
                    style={{ padding: 28, borderRadius: 8, background: 'rgba(255,255,255,0.025)', border: `1px solid ${cat.color}22`, position: 'relative', overflow: 'hidden' }}
                    whileHover={{ background: `${cat.color}08`, borderColor: `${cat.color}44`, transition: { duration: 0.2 } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: `${cat.color}15`, border: `1px solid ${cat.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} style={{ color: cat.color }} />
                      </div>
                      <span style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 32, color: `${cat.color}25`, lineHeight: 1 }}>{cat.count}</span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>{cat.label}</h3>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>{cat.desc}</p>
                    <div style={{ marginTop: 16, height: 2, background: `linear-gradient(to right, ${cat.color}50, transparent)`, borderRadius: 1 }} />
                  </motion.div>
                )
              })}
            </div>
          </Section>
        </div>
      </section>

      {/* ── THREE PILLARS ── */}
      <section id="pillars" style={{ padding: '120px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <Section>
          <motion.div variants={fadeUp} custom={0} style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#dc143c', display: 'block', marginBottom: 16 }}>Core Principles</span>
            <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 1, letterSpacing: '0.04em', margin: 0 }}>Built Different</h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            {PILLARS.map((p, i) => {
              const Icon = p.icon
              return (
                <motion.div
                  key={p.title}
                  variants={fadeUp}
                  custom={i * 0.15}
                  style={{ textAlign: 'center', padding: '48px 32px' }}
                >
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${p.color}12`, border: `1px solid ${p.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
                    <Icon size={28} style={{ color: p.color }} />
                  </div>
                  <h3 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 28, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.92)', marginBottom: 16 }}>{p.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{p.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </Section>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', isolation: 'isolate', overflow: 'hidden', padding: '120px 40px', textAlign: 'center' }}>
        <GradientBackground
          colors={['hsl(0, 85%, 30%)', 'hsl(355, 80%, 25%)', 'hsl(14, 90%, 35%)']}
          colorBack="hsl(0, 0%, 1%)"
          intensity={0.5}
          speed={0.5}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,3,6,0.68)', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Section>
            <motion.div variants={fadeUp} custom={0}>
              <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(40px, 8vw, 96px)', lineHeight: 0.95, letterSpacing: '0.04em', marginBottom: 24 }}>
                Ready to Investigate?
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: 48, maxWidth: 440, margin: '0 auto 48px' }}>
                Open the dashboard to run your first forensic analysis, or browse the 28-rule signals catalog.
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/dashboard" style={{ padding: '16px 40px', borderRadius: 32, background: '#dc143c', color: 'white', textDecoration: 'none', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  Open Dashboard <ArrowRight size={18} />
                </Link>
                <Link to="/signals" style={{ padding: '16px 40px', borderRadius: 32, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>
                  View Signals Catalog
                </Link>
                <Link to="/about" style={{ padding: '16px 40px', borderRadius: 32, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>
                  About This Project
                </Link>
              </div>
            </motion.div>
          </Section>
        </div>
      </section>

      {/* Footer */}
      <div style={{ padding: '32px 40px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          EVM Forensics Agent — Evidence-First Blockchain Forensics
        </span>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['/', 'Home'], ['/dashboard', 'Dashboard'], ['/signals', 'Signals'], ['/about', 'About']].map(([to, label]) => (
            <Link key={to} to={to} style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
