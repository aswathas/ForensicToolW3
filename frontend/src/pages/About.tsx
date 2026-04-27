import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Database, Layers, Code2,
  GitBranch, Zap, TrendingUp, Network, FileText, Bot,
  Shield, CheckCircle2, Settings, ArrowRight,
  Scale, GitCommit, X, LayoutGrid,
} from 'lucide-react'
import { GradientBackground } from '../components/ui/paper-design-shader-background'

// ── Slide data ─────────────────────────────────────────────────────────────

interface SlideData {
  id: string
  colors: string[]
  colorBack: string
  content: React.ReactNode
}

// ── Slide 3 sub-components ──────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { icon: Database,   label: 'Raw Intake',       num: '01' },
  { icon: Layers,     label: 'Block Collection', num: '02' },
  { icon: Code2,      label: 'ABI Decoding',     num: '03' },
  { icon: GitBranch,  label: '36 Derived Sets',  num: '04' },
  { icon: Zap,        label: '28 Signal Rules',  num: '05' },
  { icon: TrendingUp, label: 'ML Scoring',       num: '06' },
  { icon: Network,    label: 'Incidents',         num: '07' },
  { icon: FileText,   label: 'Reports',           num: '08' },
  { icon: Bot,        label: 'AI Narrative',      num: '09' },
]

const CATEGORIES = [
  { icon: Shield,       color: '#dc143c', name: 'Reentrancy',      desc: 'Contract tricked into paying repeatedly before recording the first payment', count: 6 },
  { icon: CheckCircle2, color: '#d4af37', name: 'Token Approvals', desc: 'Unlimited permissions granted to malicious contracts drain wallets silently', count: 4 },
  { icon: Zap,          color: '#38bdf8', name: 'Flash Loans',     desc: 'Millions borrowed, prices manipulated, repaid in one transaction', count: 4 },
  { icon: TrendingUp,   color: '#f97316', name: 'Oracle/Price',    desc: 'Market price data corrupted to enable unfair arbitrage attacks', count: 4 },
  { icon: Settings,     color: '#a78bfa', name: 'Admin Takeover',  desc: 'Contract ownership or core logic silently replaced by attacker', count: 4 },
  { icon: ArrowRight,   color: '#14b8a6', name: 'Fund Flow',       desc: 'Stolen funds traced through chains of wallets and bridges', count: 6 },
]

const PILLARS = [
  {
    icon: Scale,
    color: '#d4af37',
    title: 'Evidence-First',
    desc: 'Every finding cites the exact upstream dataset and record that proves it. No fabrication. No assumptions. Court-ready.',
  },
  {
    icon: GitCommit,
    color: '#38bdf8',
    title: 'Deterministic Output',
    desc: 'Same input always produces the same output. Every run generates a SHA256 manifest — reproducible in legal proceedings.',
  },
  {
    icon: Shield,
    color: '#22c55e',
    title: 'Graceful Degradation',
    desc: 'Missing traces or state diffs? We document the gap, not crash. Always produces a complete report with documented limitations.',
  },
]

const BUYERS = ['Crypto Exchanges', 'DeFi Protocols', 'Law Enforcement', 'Regulatory Bodies', 'Litigation Teams', 'Protocol Auditors']

// ── Particle component ──────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: `${10 + i * 11}%`,
  size: 2 + (i % 3),
  delay: i * 0.4,
  duration: 3 + (i % 3),
}))

function FloatingParticles() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {PARTICLES.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x,
            bottom: '20%',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
          }}
          animate={{ y: [0, -80, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ── Slide variants ──────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

// ── About page ──────────────────────────────────────────────────────────────

export const About: React.FC = () => {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0)
  const navigate = useNavigate()

  const go = (idx: number) => {
    if (idx === current) return
    setDirection(idx > current ? 1 : -1)
    setCurrent(idx)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(Math.min(current + 1, 6))
      if (e.key === 'ArrowLeft') go(Math.max(current - 1, 0))
      if (e.key === 'Escape') navigate('/home')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  // slide content
  const slides: SlideData[] = [
    // Slide 1 — Hero
    {
      id: 'hero',
      colors: ['hsl(0, 85%, 40%)', 'hsl(14, 100%, 50%)', 'hsl(350, 90%, 30%)'],
      colorBack: 'hsl(0, 0%, 2%)',
      content: (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 40px', textAlign: 'center' }}>
          <FloatingParticles />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 20 }}>
              ENTERPRISE BLOCKCHAIN FORENSICS
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(64px, 10vw, 120px)', letterSpacing: '0.05em', color: '#ffffff', lineHeight: 1, margin: '0 0 8px' }}
          >
            EVM Forensics
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(28px, 4vw, 52px)', letterSpacing: '0.15em', color: '#dc143c', margin: '0 0 32px' }}
          >
            Agent
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', maxWidth: 560, lineHeight: 1.7, margin: '0 0 48px' }}
          >
            Enterprise-grade platform for detecting and analyzing suspicious activity on EVM chains. Built for forensic analysts, trusted by clients.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
            onClick={() => go(1)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', borderRadius: 8, background: '#dc143c', color: '#fff', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', border: 'none', cursor: 'pointer', boxShadow: '0 0 40px rgba(220,20,60,0.4)' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            How It Works <ChevronRight size={16} />
          </motion.button>
        </div>
      ),
    },
    // Slide 2 — The Problem
    {
      id: 'problem',
      colors: ['hsl(25, 100%, 45%)', 'hsl(15, 100%, 35%)', 'hsl(40, 90%, 45%)'],
      colorBack: 'hsl(10, 20%, 3%)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '0 10%', maxWidth: 900, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 16 }}>THE PROBLEM</span>
            <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(64px, 10vw, 120px)', color: '#f97316', lineHeight: 1, margin: '0 0 8px' }}>$3.8 Billion</div>
            <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.55)', marginBottom: 48 }}>Stolen from DeFi protocols in 2023 alone</div>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
            {[
              'Existing tools are black boxes — no evidence trail, no reproducibility',
              'Results cannot be verified or presented in legal proceedings',
              'Missing traces and incomplete data cause silent failures and false negatives',
            ].map((text, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px', borderRadius: 8, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}
              >
                <X size={16} style={{ color: '#f97316', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{text}</span>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}
          >
            2,400+ DeFi exploits &nbsp;·&nbsp; 180+ protocols hacked &nbsp;·&nbsp; $0 recovered in most cases
          </motion.div>
        </div>
      ),
    },
    // Slide 3 — How It Works
    {
      id: 'pipeline',
      colors: ['hsl(180, 60%, 30%)', 'hsl(200, 80%, 25%)', 'hsl(160, 50%, 20%)'],
      colorBack: 'hsl(195, 30%, 5%)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 12 }}>HOW IT WORKS</span>
            <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(36px, 5vw, 64px)', color: '#fff', letterSpacing: '0.08em', margin: '0 0 48px' }}>9-Step Forensic Pipeline</h2>
          </motion.div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 960 }}>
            {PIPELINE_STEPS.map((step, i) => (
              <React.Fragment key={step.num}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.06 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 90 }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(20,184,166,0.7)', letterSpacing: '0.1em' }}>{step.num}</span>
                  <step.icon size={20} style={{ color: '#14b8a6' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 1.3 }}>{step.label}</span>
                </motion.div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      ),
    },
    // Slide 4 — 28 Detection Rules
    {
      id: 'rules',
      colors: ['hsl(270, 80%, 30%)', 'hsl(290, 70%, 25%)', 'hsl(250, 60%, 35%)'],
      colorBack: 'hsl(265, 30%, 4%)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 12 }}>28 DETECTION RULES</span>
            <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(32px, 4vw, 56px)', color: '#fff', letterSpacing: '0.08em', margin: '0 0 40px' }}>Every Attack Pattern. Covered.</h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 880 }}>
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.07 }}
                style={{ padding: '20px', borderRadius: 12, background: `${cat.color}10`, border: `1px solid ${cat.color}35`, textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <cat.icon size={18} style={{ color: cat.color }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: cat.color }}>{cat.name}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 3 }}>{cat.count}</span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: 0 }}>{cat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ),
    },
    // Slide 5 — What Makes It Novel
    {
      id: 'novel',
      colors: ['hsl(45, 100%, 45%)', 'hsl(35, 90%, 40%)', 'hsl(55, 80%, 35%)'],
      colorBack: 'hsl(40, 20%, 4%)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 12 }}>OUR INNOVATION</span>
            <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(32px, 4vw, 56px)', color: '#fff', letterSpacing: '0.08em', margin: '0 0 48px' }}>Built for Courts. Not Just Dashboards.</h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 960 }}>
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.12 }}
                style={{ padding: '32px 24px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: `1px solid ${p.color}35`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
              >
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${p.color}18`, border: `1px solid ${p.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p.icon size={22} style={{ color: p.color }} />
                </div>
                <span style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 22, letterSpacing: '0.08em', color: '#fff' }}>{p.title}</span>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: 0 }}>{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ),
    },
    // Slide 6 — Market Opportunity
    {
      id: 'market',
      colors: ['hsl(210, 80%, 30%)', 'hsl(225, 70%, 25%)', 'hsl(195, 60%, 35%)'],
      colorBack: 'hsl(215, 30%, 4%)',
      content: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 10%', gap: 80 }}>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} style={{ flex: 1 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 16 }}>MARKET OPPORTUNITY</span>
            <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(48px, 7vw, 88px)', color: '#38bdf8', lineHeight: 1, margin: '0 0 8px' }}>$28 Billion</div>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', marginBottom: 40 }}>Blockchain security market by 2030 — 28.3% CAGR</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {BUYERS.map(buyer => (
                <span key={buyer} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '6px 14px', borderRadius: 20, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#7dd3fc' }}>
                  {buyer}
                </span>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} style={{ flex: '0 0 auto', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 72, color: '#38bdf8', lineHeight: 1 }}>400M+</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>EVM transactions daily</div>
          </motion.div>
        </div>
      ),
    },
    // Slide 7 — CTA
    {
      id: 'cta',
      colors: ['hsl(0, 85%, 40%)', 'hsl(340, 80%, 35%)', 'hsl(20, 90%, 45%)'],
      colorBack: 'hsl(350, 30%, 3%)',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <LayoutGrid size={48} style={{ color: '#dc143c', marginBottom: 24, filter: 'drop-shadow(0 0 20px rgba(220,20,60,0.5))' }} />
            <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(48px, 8vw, 96px)', color: '#fff', letterSpacing: '0.05em', margin: '0 0 12px' }}>Start Investigating</h2>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: '0 auto 48px' }}>Your forensic evidence is one pipeline run away.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <motion.button
              onClick={() => navigate('/dashboard')}
              style={{ padding: '16px 36px', borderRadius: 8, background: '#dc143c', color: '#fff', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', border: 'none', cursor: 'pointer', boxShadow: '0 0 40px rgba(220,20,60,0.35)' }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            >
              Open Dashboard
            </motion.button>
            <motion.button
              onClick={() => navigate('/signals')}
              style={{ padding: '16px 36px', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.65)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
              whileHover={{ scale: 1.05, borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }} whileTap={{ scale: 0.95 }}
            >
              View Detection Rules
            </motion.button>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ marginTop: 40, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
            Built with evidence-first principles. Every finding is traceable.
          </motion.p>
        </div>
      ),
    },
  ]

  const slide = slides[current]

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#020208', color: '#f1f5f9' }}>

      {/* ── Animated background ── */}
      <AnimatePresence>
        <motion.div
          key={`bg-${current}`}
          style={{ position: 'absolute', inset: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
        >
          <GradientBackground colors={slide.colors} colorBack={slide.colorBack} intensity={0.4} softness={0.8} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
        </motion.div>
      </AnimatePresence>

      {/* ── Slide content ── */}
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={`content-${current}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ position: 'absolute', inset: 0 }}
        >
          {slide.content}
        </motion.div>
      </AnimatePresence>

      {/* ── Back link (top-left) ── */}
      <div style={{ position: 'absolute', top: 24, left: 32, zIndex: 100 }}>
        <motion.button
          onClick={() => navigate('/home')}
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          whileHover={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <ChevronLeft size={12} /> Back
        </motion.button>
      </div>

      {/* ── Slide counter (top-right) ── */}
      <div style={{ position: 'absolute', top: 24, right: 32, zIndex: 100 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em' }}>
          {String(current + 1).padStart(2, '0')} / 07
        </span>
      </div>

      {/* ── Left arrow ── */}
      {current > 0 && (
        <motion.button
          onClick={() => go(current - 1)}
          style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 100, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}
          whileHover={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft size={20} />
        </motion.button>
      )}

      {/* ── Right arrow ── */}
      {current < 6 && (
        <motion.button
          onClick={() => go(current + 1)}
          style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 100, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}
          whileHover={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronRight size={20} />
        </motion.button>
      )}

      {/* ── Dot indicators (bottom center) ── */}
      <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 100 }}>
        {slides.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => go(i)}
            style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 4, background: i === current ? '#fff' : 'rgba(255,255,255,0.25)', border: 'none', cursor: 'pointer', padding: 0 }}
            animate={{ width: i === current ? 24 : 8 }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>
    </div>
  )
}
