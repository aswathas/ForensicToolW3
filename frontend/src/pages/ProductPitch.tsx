import React, { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  motion, useInView, useScroll, useTransform,
  useMotionValue, animate,
} from 'framer-motion'
import { Player } from '@remotion/player'
import {
  Shield, Zap, TrendingUp, Lock, CheckCircle2, XCircle,
  ArrowRight, Database, GitBranch, Search, BarChart3,
  Network, FileText, Brain, Activity, RefreshCw,
} from 'lucide-react'
import { ShaderCanvas } from '../components/ui/animated-shader-hero'
import { EtherealShadow } from '../components/ui/etheral-shadow'
import { CyberGlobe } from '../components/animations/CyberGlobe'

// ── Count-up component ──────────────────────────────────────────────────────

function CountUp({ to, prefix = '', suffix = '', duration = 2.2 }: {
  to: number; prefix?: string; suffix?: string; duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const count = useMotionValue(0)
  const [display, setDisplay] = React.useState('0')

  useEffect(() => {
    if (!inView) return
    const controls = animate(count, to, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(String(Math.round(v))),
    })
    return controls.stop
  }, [inView, to, duration, count])

  return <span ref={ref}>{prefix}{display}{suffix}</span>
}

// ── Comparison data ─────────────────────────────────────────────────────────

const FEATURES = [
  { label: 'Evidence-linked findings',          us: true,  chainalysis: true,  elliptic: false, trm: false, nansen: false },
  { label: 'Open-source / self-hosted',         us: true,  chainalysis: false, elliptic: false, trm: false, nansen: false },
  { label: '28 heuristic detection rules',      us: true,  chainalysis: false, elliptic: false, trm: false, nansen: false },
  { label: 'Deterministic reproducible output', us: true,  chainalysis: false, elliptic: false, trm: false, nansen: false },
  { label: 'Custom attack scenario testing',    us: true,  chainalysis: false, elliptic: false, trm: false, nansen: false },
  { label: 'AI narrative (local LLM)',          us: true,  chainalysis: false, elliptic: false, trm: false, nansen: false },
  { label: 'On-chain trace analysis',           us: true,  chainalysis: true,  elliptic: true,  trm: true,  nansen: false },
  { label: 'EVM smart-contract decoding',       us: true,  chainalysis: true,  elliptic: true,  trm: true,  nansen: false },
  { label: 'Fund flow tracing',                 us: true,  chainalysis: true,  elliptic: true,  trm: true,  nansen: true  },
  { label: 'ML risk scoring',                   us: true,  chainalysis: true,  elliptic: true,  trm: true,  nansen: true  },
  { label: 'PDF export',                        us: true,  chainalysis: true,  elliptic: true,  trm: false, nansen: false },
  { label: 'No vendor lock-in',                 us: true,  chainalysis: false, elliptic: false, trm: false, nansen: false },
]

const TOOLS = [
  { key: 'us',          label: 'EVM Forensics', color: '#dc143c', highlight: true  },
  { key: 'chainalysis', label: 'Chainalysis',   color: 'rgba(255,255,255,0.25)', highlight: false },
  { key: 'elliptic',    label: 'Elliptic',      color: 'rgba(255,255,255,0.25)', highlight: false },
  { key: 'trm',         label: 'TRM Labs',      color: 'rgba(255,255,255,0.25)', highlight: false },
  { key: 'nansen',      label: 'Nansen',        color: 'rgba(255,255,255,0.25)', highlight: false },
] as const

type ToolKey = (typeof TOOLS)[number]['key']

// ── Pipeline ────────────────────────────────────────────────────────────────

const PIPELINE = [
  { n: '01', label: 'Raw Intake',       icon: Database,   layer: 'LAYER 0', color: '#38bdf8', desc: 'RPC or file import — blocks, txs, traces, state diffs' },
  { n: '02', label: 'ABI Binding',      icon: GitBranch,  layer: 'LAYER 0', color: '#38bdf8', desc: 'Index known ABIs, decode calls & events — never assume' },
  { n: '03', label: 'Derived Layer',    icon: Network,    layer: 'LAYER 1', color: '#a78bfa', desc: '36 deterministic enriched datasets from raw data' },
  { n: '04', label: '28 Signals',       icon: Search,     layer: 'LAYER 2', color: '#dc143c', desc: 'Heuristic rules fire against derived data, evidence-linked' },
  { n: '05', label: 'ML Scoring',       icon: BarChart3,  layer: 'LAYER 3', color: '#d4af37', desc: 'Feature vectors, entity risk, community detection' },
  { n: '06', label: 'Incident Cluster', icon: Activity,   layer: 'LAYER 3', color: '#d4af37', desc: 'Correlated suspicious txs grouped into incidents' },
  { n: '07', label: 'Forensic Report',  icon: FileText,   layer: 'OUTPUT',  color: '#22c55e', desc: 'Evidence-linked findings — suspect entities, money trail' },
  { n: '08', label: 'AI Narrative',     icon: Brain,      layer: 'OUTPUT',  color: '#22c55e', desc: 'Grounded Ollama narrative — citations, hypotheses, next steps' },
  { n: '09', label: 'Graph Export',     icon: RefreshCw,  layer: 'OUTPUT',  color: '#22c55e', desc: 'Execution & fund-flow graphs (.dot format)' },
]

// ── Attack categories ───────────────────────────────────────────────────────

const CATEGORIES = [
  { icon: RefreshCw,   label: 'Reentrancy',      count: 6, color: '#dc143c', desc: 'Contract called back before state updated — repeatedly drains balance' },
  { icon: Shield,      label: 'Approvals',        count: 4, color: '#d4af37', desc: 'Unlimited approvals and drain-on-approval burst patterns' },
  { icon: Zap,         label: 'Flash Loans',      count: 4, color: '#38bdf8', desc: 'Borrow millions, manipulate prices, repay — all in one transaction' },
  { icon: TrendingUp,  label: 'Oracle / Price',   count: 4, color: '#f97316', desc: 'Spot price spikes, oracle deviation, sandwich manipulation' },
  { icon: Lock,        label: 'Admin / Upgrade',  count: 4, color: '#a78bfa', desc: 'Proxy swaps, privilege escalation, upgrade followed by outflow' },
  { icon: Network,     label: 'Fund Flow',        count: 6, color: '#22c55e', desc: 'Peel chains, consolidation, hop-to-risky destinations' },
]

// ── Pillars ─────────────────────────────────────────────────────────────────

const PILLARS = [
  { icon: Shield,    title: 'Evidence-First',       color: '#dc143c', desc: 'Every finding cites the upstream dataset and record ID. No fabrication — conclusions are traceable to raw blockchain data.' },
  { icon: GitBranch, title: 'Deterministic Output', color: '#d4af37', desc: 'Same input always produces the same output. SHA256 manifests + referential integrity reports on every run. Legally defensible.' },
  { icon: Activity,  title: 'Graceful Degradation', color: '#38bdf8', desc: 'Missing traces, state diffs, or ABIs? The engine documents limitations and continues — never silent failures, never hallucinated data.' },
]

// ── Market buyers ───────────────────────────────────────────────────────────

const BUYERS = [
  { label: 'Crypto Exchanges',   desc: 'AML compliance, suspicious withdrawal detection' },
  { label: 'DeFi Protocols',     desc: 'Pre-launch security audits, exploit detection' },
  { label: 'DAOs & Treasuries',  desc: 'Governance attack forensics, rug-pull investigation' },
  { label: 'Regulators',         desc: 'Evidence-grade reports for enforcement actions' },
  { label: 'Law Enforcement',    desc: 'Court-ready fund tracing and wallet attribution' },
  { label: 'Security Firms',     desc: 'White-label forensics engine for client engagements' },
]

// ── Main component ──────────────────────────────────────────────────────────

export const ProductPitch: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null)
  const pipelineRef = useRef<HTMLDivElement>(null)

  // Hero parallax
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroY       = useTransform(heroScroll, [0, 1], [0, -90])
  const heroOpacity = useTransform(heroScroll, [0, 0.75], [1, 0])

  // Pipeline line draw
  const { scrollYProgress: pipelineScroll } = useScroll({
    target: pipelineRef,
    offset: ['start 80%', 'end 20%'],
  })
  const lineHeight = useTransform(pipelineScroll, [0, 1], ['0%', '100%'])

  return (
    <div style={{ background: '#020208', color: 'white', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* ── Minimal standalone nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '14px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(2,2,8,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.25em', color: '#dc143c', textTransform: 'uppercase' }}>
          EVM<span style={{ color: 'rgba(255,255,255,0.4)' }}>.</span>Forensics
        </span>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {[['#comparison', 'Comparison'], ['#architecture', 'Architecture'], ['#signals', 'Signals'], ['#pillars', 'Pillars']].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
              {label}
            </a>
          ))}
          <Link to="/dashboard" style={{ fontSize: 12, padding: '8px 22px', borderRadius: 22, background: '#dc143c', color: 'white', textDecoration: 'none', fontWeight: 700, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
            Live Demo <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════
          HERO — ShaderCanvas + CyberGlobe video layer + parallax
      ══════════════════════════════════════════════════════════════ */}
      <div
        ref={heroRef}
        style={{ position: 'relative', height: '100vh', overflow: 'hidden', isolation: 'isolate' }}
      >
        {/* Layer 0: WebGL nebula shader */}
        <ShaderCanvas
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 0 }}
        />

        {/* Layer 1: CyberGlobe Remotion — cinematic "AI video" */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.28, pointerEvents: 'none' }}>
          <Player
            component={CyberGlobe}
            durationInFrames={600}
            fps={30}
            compositionWidth={1920}
            compositionHeight={1080}
            style={{ width: '100%', height: '100%' }}
            loop
            autoPlay
            controls={false}
            showPosterWhenUnplayed={false}
            initiallyShowControls={false}
            clickToPlay={false}
            doubleClickToFullscreen={false}
            spaceKeyToPlayOrPause={false}
            moveToBeginningWhenEnded={false}
          />
        </div>

        {/* Layer 2: Gradient overlays for text legibility */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(2,2,8,0.5) 0%, rgba(2,2,8,0.2) 40%, rgba(2,2,8,0.8) 80%, rgba(2,2,8,1) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(2,2,8,0.6) 100%)' }} />

        {/* Layer 3: Hero content with parallax */}
        <motion.div
          style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px', y: heroY, opacity: heroOpacity }}
        >
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            style={{ marginBottom: 28 }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(220,20,60,0.7)', display: 'inline-block', border: '1px solid rgba(220,20,60,0.2)', padding: '5px 16px', borderRadius: 20 }}>
              Enterprise Blockchain Forensics
            </span>
          </motion.div>

          {/* Split-word headline stagger */}
          <motion.h1
            style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(54px, 9vw, 116px)', lineHeight: 0.93, letterSpacing: '0.02em', margin: '0 0 28px', maxWidth: 900 }}
          >
            {'Detect Attacks'.split(' ').map((word, i) => (
              <motion.span
                key={word + i}
                initial={{ opacity: 0, y: 30, rotateX: -30 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.7, delay: 0.25 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'inline-block', marginRight: '0.2em', background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                {word}
              </motion.span>
            ))}
            <br />
            {'Before Disasters'.split(' ').map((word, i) => (
              <motion.span
                key={word + i}
                initial={{ opacity: 0, y: 30, rotateX: -30 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.7, delay: 0.45 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'inline-block', marginRight: '0.2em', color: i === 1 ? '#dc143c' : 'rgba(255,255,255,0.9)', WebkitTextFillColor: i === 1 ? '#dc143c' : undefined }}
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            style={{ fontSize: 17, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', maxWidth: 540, margin: '0 auto 44px' }}
          >
            28 heuristic rules. Evidence-first forensics. Deterministic, reproducible output. Open-source and self-hosted.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.82 }}
            style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link to="/dashboard" style={{ padding: '14px 34px', borderRadius: 30, background: '#dc143c', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 700, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 40px rgba(220,20,60,0.35)' }}>
                Open Dashboard <ArrowRight size={15} />
              </Link>
            </motion.div>
            <motion.a whileHover={{ scale: 1.03 }} href="#architecture" style={{ padding: '14px 34px', borderRadius: 30, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              See Architecture
            </motion.a>
          </motion.div>

          {/* Animated stat strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            style={{ marginTop: 80, display: 'flex', gap: 56, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            {[
              { val: 3.8, prefix: '$', suffix: 'B', label: 'stolen from DeFi 2023' },
              { val: 28,  prefix: '',  suffix: '',   label: 'detection rules' },
              { val: 36,  prefix: '',  suffix: '',   label: 'derived datasets' },
              { val: 100, prefix: '',  suffix: '%',  label: 'evidence-linked' },
            ].map(({ val, prefix, suffix, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 42, color: '#dc143c', lineHeight: 1, filter: 'drop-shadow(0 0 12px rgba(220,20,60,0.5))' }}>
                  <CountUp to={val} prefix={prefix} suffix={suffix} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 32, background: 'linear-gradient(to bottom, rgba(220,20,60,0.6), transparent)' }}
          />
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PROBLEM BAR — 3 big stats slide up
      ══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 40px', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(220,20,60,0.03)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[
            { stat: '$3.8B', label: 'stolen from DeFi protocols in 2023 alone', color: '#dc143c' },
            { stat: '14 days', label: 'average time to detect an exploit post-incident', color: '#d4af37' },
            { stat: '0 tools', label: 'provide evidence-linked, self-hosted forensics', color: '#38bdf8' },
          ].map(({ stat, label, color }, i) => (
            <motion.div
              key={stat}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              style={{ padding: '40px 36px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
            >
              <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 56, color, lineHeight: 1, marginBottom: 12, filter: `drop-shadow(0 0 16px ${color}60)` }}>{stat}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6, maxWidth: 260 }}>{label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          COMPARISON TABLE — staggered row reveals
      ══════════════════════════════════════════════════════════════ */}
      <section id="comparison" style={{ padding: '120px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7 }}
            style={{ marginBottom: 60 }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.35em', color: 'rgba(220,20,60,0.6)', textTransform: 'uppercase' }}>Competitive Analysis</span>
            <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(36px, 5vw, 64px)', margin: '12px 0 0', lineHeight: 1 }}>
              How We Compare
            </h2>
          </motion.div>

          {/* Table header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{ display: 'grid', gridTemplateColumns: '2fr ' + TOOLS.map(() => '1fr').join(' '), gap: 0, marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Feature</div>
            {TOOLS.map(t => (
              <div key={t.key} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: t.highlight ? '#dc143c' : 'rgba(255,255,255,0.3)', padding: t.highlight ? '4px 8px' : undefined, background: t.highlight ? 'rgba(220,20,60,0.08)' : undefined, borderRadius: t.highlight ? 4 : undefined, boxShadow: t.highlight ? '0 0 20px rgba(220,20,60,0.15)' : undefined }}>
                {t.label}
              </div>
            ))}
          </motion.div>

          {FEATURES.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.035, ease: 'easeOut' }}
              style={{ display: 'grid', gridTemplateColumns: '2fr ' + TOOLS.map(() => '1fr').join(' '), gap: 0, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}
            >
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{row.label}</div>
              {TOOLS.map(t => {
                const has = row[t.key as ToolKey]
                return (
                  <div key={t.key} style={{ textAlign: 'center', background: t.highlight ? 'rgba(220,20,60,0.05)' : undefined }}>
                    {has
                      ? <CheckCircle2 size={15} style={{ color: t.highlight ? '#dc143c' : 'rgba(255,255,255,0.22)', display: 'inline-block', filter: t.highlight ? 'drop-shadow(0 0 4px rgba(220,20,60,0.6))' : undefined }} />
                      : <XCircle size={14} style={{ color: 'rgba(255,255,255,0.1)', display: 'inline-block' }} />
                    }
                  </div>
                )
              })}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          ARCHITECTURE PIPELINE — SVG draw line + alternating reveals
      ══════════════════════════════════════════════════════════════ */}
      <section id="architecture" style={{ padding: '120px 40px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{ marginBottom: 72, textAlign: 'center' }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.35em', color: 'rgba(220,20,60,0.6)', textTransform: 'uppercase' }}>9-Step Pipeline</span>
            <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(36px, 5vw, 64px)', margin: '12px 0 0', lineHeight: 1 }}>
              How It Works
            </h2>
          </motion.div>

          {/* Timeline with animated vertical line */}
          <div ref={pipelineRef} style={{ position: 'relative' }}>

            {/* Animated SVG line */}
            <div style={{ position: 'absolute', left: 31, top: 0, bottom: 0, width: 2, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.06)' }} />
              <motion.div
                style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'linear-gradient(to bottom, #dc143c, #d4af37, #22c55e)', height: lineHeight }}
              />
            </div>

            {PIPELINE.map((step, i) => {
              const Icon = step.icon
              const fromLeft = i % 2 === 0
              return (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, x: fromLeft ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex', gap: 28, alignItems: 'flex-start', marginBottom: i < PIPELINE.length - 1 ? 36 : 0, paddingLeft: 0 }}
                >
                  {/* Node */}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.08 }}
                    style={{ width: 64, height: 64, borderRadius: '50%', background: `${step.color}15`, border: `2px solid ${step.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1, boxShadow: `0 0 20px ${step.color}25` }}
                  >
                    <Icon size={22} style={{ color: step.color }} />
                  </motion.div>

                  {/* Card */}
                  <motion.div
                    whileHover={{ x: 4, boxShadow: `0 8px 32px ${step.color}20` }}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 22px', cursor: 'default', transition: 'box-shadow 0.2s' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: step.color, letterSpacing: '0.15em' }}>{step.n}</span>
                      <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: step.color, background: `${step.color}18`, padding: '2px 8px', borderRadius: 10, letterSpacing: '0.1em' }}>{step.layer}</span>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 22, letterSpacing: '0.04em', marginBottom: 6 }}>{step.label}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>{step.desc}</div>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          28 SIGNALS — CSS 3D perspective card tilt
      ══════════════════════════════════════════════════════════════ */}
      <section id="signals" style={{ padding: '120px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{ marginBottom: 60 }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.35em', color: 'rgba(220,20,60,0.6)', textTransform: 'uppercase' }}>Detection Engine</span>
            <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(36px, 5vw, 64px)', margin: '12px 0 8px', lineHeight: 1 }}>
              28 Heuristic Rules
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', maxWidth: 480, lineHeight: 1.7 }}>
              Six attack categories. Every rule is evidence-linked, confidence-scored, and reproducible.
            </p>
          </motion.div>

          {/* 3D perspective grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, perspective: '1200px' }}>
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon
              return (
                <motion.div
                  key={cat.label}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{
                    rotateX: -6,
                    rotateY: 5,
                    scale: 1.03,
                    z: 24,
                    boxShadow: `0 24px 60px ${cat.color}35`,
                  }}
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.08)`, borderLeft: `3px solid ${cat.color}`, borderRadius: 12, padding: '24px 22px', cursor: 'default', transformStyle: 'preserve-3d', position: 'relative' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 16px ${cat.color}30` }}>
                      <Icon size={20} style={{ color: cat.color }} />
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: cat.color, background: `${cat.color}15`, padding: '3px 9px', borderRadius: 10, letterSpacing: '0.08em' }}>
                      {cat.count} rules
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 22, letterSpacing: '0.04em', marginBottom: 8 }}>{cat.label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.65 }}>{cat.desc}</div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          PILLARS — scale + fade with count-up
      ══════════════════════════════════════════════════════════════ */}
      <section id="pillars" style={{ padding: '120px 40px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{ marginBottom: 60, textAlign: 'center' }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.35em', color: 'rgba(220,20,60,0.6)', textTransform: 'uppercase' }}>Design Philosophy</span>
            <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(36px, 5vw, 64px)', margin: '12px 0 0', lineHeight: 1 }}>
              What Makes It Novel
            </h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {PILLARS.map((p, i) => {
              const Icon = p.icon
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -8, boxShadow: '0 28px 56px rgba(0,0,0,0.5)' }}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '36px 28px', textAlign: 'center', cursor: 'default' }}
                >
                  <motion.div
                    initial={{ rotate: -30, opacity: 0 }}
                    whileInView={{ rotate: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: i * 0.1 + 0.2 }}
                    style={{ width: 60, height: 60, borderRadius: '50%', background: `${p.color}18`, border: `2px solid ${p.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: `0 0 24px ${p.color}30` }}
                  >
                    <Icon size={24} style={{ color: p.color }} />
                  </motion.div>
                  <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 26, letterSpacing: '0.04em', marginBottom: 14 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.75 }}>{p.desc}</div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          MARKET OPPORTUNITY — asymmetric layout
      ══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '120px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          {/* Left: big stat */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.35em', color: 'rgba(220,20,60,0.6)', textTransform: 'uppercase', display: 'block', marginBottom: 20 }}>Market Opportunity</span>
            <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(64px, 8vw, 110px)', lineHeight: 0.9, color: '#dc143c', filter: 'drop-shadow(0 0 30px rgba(220,20,60,0.4))', marginBottom: 16 }}>$28B</div>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 24 }}>blockchain security market by 2030</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>
              DeFi exploits alone exceeded $3.8B in 2023. Exchanges face mounting regulatory pressure. No enterprise-grade, self-hosted, evidence-linked tool exists.
            </div>
          </motion.div>

          {/* Right: buyer list */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              style={{ marginBottom: 28 }}
            >
              <h3 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 30, margin: 0, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.7)' }}>Who Buys This</h3>
            </motion.div>
            {BUYERS.map((b, i) => (
              <motion.div
                key={b.label}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
                whileHover={{ x: 6 }}
                style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 3 }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.02em' }}>{b.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>{b.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          CTA — crimson EtherealShadow pulse
      ══════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', padding: '140px 40px', overflow: 'hidden', isolation: 'isolate', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {/* EtherealShadow crimson background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <EtherealShadow
            color="rgba(220, 20, 60, 0.75)"
            animation={{ scale: 80, speed: 45 }}
            noise={{ opacity: 0.25, scale: 1 }}
          />
        </div>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'rgba(2,2,8,0.55)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(48px, 7vw, 88px)', lineHeight: 0.95, margin: '0 0 24px', letterSpacing: '0.02em' }}>
              Ready to Investigate?
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 48 }}>
              Open the dashboard, run a forensic simulation, or explore the 28 detection rules.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}>
                <Link to="/dashboard" style={{ padding: '16px 40px', borderRadius: 32, background: '#dc143c', color: 'white', textDecoration: 'none', fontSize: 15, fontWeight: 700, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 48px rgba(220,20,60,0.5)' }}>
                  Open Dashboard <ArrowRight size={16} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link to="/signals" style={{ padding: '16px 40px', borderRadius: 32, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  View Signals Catalog
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 40px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
          EVM FORENSICS AGENT — v2.0
        </span>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link to="/dashboard" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: '0.06em' }}>Dashboard</Link>
          <Link to="/signals"   style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: '0.06em' }}>Signals</Link>
          <Link to="/graphs"    style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: '0.06em' }}>Graphs</Link>
        </div>
      </footer>

    </div>
  )
}
