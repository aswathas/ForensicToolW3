import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { Player } from '@remotion/player'
import {
  ArrowRight, Zap, GitBranch, Activity, BarChart3,
  Search, Lock, TrendingUp, Network,
} from 'lucide-react'
import { WordsPullUp, WordsPullUpMultiStyle } from '../components/ui/WordsPullUp'
import { ThermodynamicGrid } from '../components/ui/interactive-thermodynamic-grid'
import { DemoVideo } from '../components/animations/DemoVideo'
import { FeaturesAd } from '../components/animations/FeaturesAd'
import { Navbar } from '../components/Layout/Navbar'
import { ShaderCanvas } from '../components/ui/animated-shader-hero'

const STATS = [
  { value: '28',   label: 'Detection Rules' },
  { value: '6',    label: 'Attack Categories' },
  { value: '36',   label: 'Derived Datasets' },
  { value: '100%', label: 'Evidence-Linked' },
]

type Severity = 'CRITICAL' | 'HIGH'

const TICKER_ITEMS: Array<{ type: string; address: string; confidence: string; severity: Severity }> = [
  { type: 'REENTRANCY',      address: '0x4f3a...b2d1', confidence: '0.97', severity: 'CRITICAL' },
  { type: 'FLASHLOAN',       address: '0x8b2c...a4e5', confidence: '0.89', severity: 'HIGH' },
  { type: 'ORACLE MANIP',    address: '0x1d9f...c8b3', confidence: '0.85', severity: 'HIGH' },
  { type: 'APPROVAL DRAIN',  address: '0x7a1e...d9c2', confidence: '0.91', severity: 'CRITICAL' },
  { type: 'FUND EXTRACTION', address: '0x3b6d...e1f4', confidence: '0.88', severity: 'HIGH' },
  { type: 'REENTRANCY',      address: '0x9c4a...a2b7', confidence: '0.95', severity: 'CRITICAL' },
  { type: 'ADMIN ABUSE',     address: '0x2e7f...f3a1', confidence: '0.92', severity: 'CRITICAL' },
  { type: 'PEEL CHAIN',      address: '0x5c0b...d8e6', confidence: '0.83', severity: 'HIGH' },
]
// Duplicate for seamless loop
const TICKER_ALL = [...TICKER_ITEMS, ...TICKER_ITEMS]

const ATTACK_CATS = [
  { label: 'REENTRANCY',  pct: 87, color: '#dc143c' },
  { label: 'APPROVALS',   pct: 71, color: '#d4af37' },
  { label: 'FLASHLOAN',   pct: 64, color: '#38bdf8' },
  { label: 'ORACLE',      pct: 59, color: '#dc143c' },
  { label: 'ADMIN/UPGRD', pct: 78, color: '#d4af37' },
  { label: 'FUND FLOW',   pct: 93, color: '#38bdf8' },
]

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function severityColor(sev: Severity): string {
  return sev === 'CRITICAL' ? '#dc143c' : '#d4af37'
}
const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '4px',
}

// ─────────────────────────────────────────────────────────────
// Noise overlay
// ─────────────────────────────────────────────────────────────
const NoiseOverlay: React.FC = () => (
  <div
    style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
      opacity: 0.4,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat',
      mixBlendMode: 'overlay',
    }}
  />
)

// ─────────────────────────────────────────────────────────────
// Mini sparkline SVG (28 data points)
// ─────────────────────────────────────────────────────────────
const MiniSparkline: React.FC<{ color?: string }> = ({ color = '#dc143c' }) => {
  const points = [3, 6, 4, 8, 5, 9, 6, 10, 7, 12, 8, 10, 9, 14, 10, 11, 12, 15, 10, 13, 11, 16, 12, 14, 13, 17, 15, 18]
  const max = Math.max(...points)
  const h = 32
  const w = 120
  const step = w / (points.length - 1)
  const poly = points.map((p, i) => `${(i * step).toFixed(1)},${(h - (p / max) * (h - 4)).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={poly} stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      <polygon points={`0,${h} ${poly} ${w},${h}`} fill={color} opacity="0.08" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// Mini fund-flow SVG network
// ─────────────────────────────────────────────────────────────
const MiniFundFlowSVG: React.FC = () => (
  <svg width="120" height="90" viewBox="0 0 120 90" fill="none">
    <circle cx="20" cy="45" r="7" fill="rgba(220,20,60,0.25)" stroke="#dc143c" strokeWidth="1" />
    <text x="20" y="48" textAnchor="middle" fill="#dc143c" fontSize="5" fontFamily="monospace">ATK</text>
    <circle cx="60" cy="20" r="6" fill="rgba(212,175,55,0.2)" stroke="#d4af37" strokeWidth="1" />
    <text x="60" y="23" textAnchor="middle" fill="#d4af37" fontSize="4" fontFamily="monospace">HOP</text>
    <circle cx="60" cy="70" r="6" fill="rgba(212,175,55,0.2)" stroke="#d4af37" strokeWidth="1" />
    <text x="60" y="73" textAnchor="middle" fill="#d4af37" fontSize="4" fontFamily="monospace">HOP</text>
    <circle cx="100" cy="45" r="7" fill="rgba(56,189,248,0.2)" stroke="#38bdf8" strokeWidth="1" />
    <text x="100" y="48" textAnchor="middle" fill="#38bdf8" fontSize="4" fontFamily="monospace">SINK</text>
    <line x1="27" y1="42" x2="54" y2="23" stroke="#dc143c" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.7" />
    <line x1="27" y1="48" x2="54" y2="67" stroke="#dc143c" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.7" />
    <line x1="66" y1="23" x2="93" y2="42" stroke="#d4af37" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.6" />
    <line x1="66" y1="67" x2="93" y2="48" stroke="#d4af37" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.6" />
    <polygon points="93,42 88,40 89,44" fill="#d4af37" opacity="0.6" />
    <polygon points="93,48 88,46 89,50" fill="#d4af37" opacity="0.6" />
  </svg>
)

// ─────────────────────────────────────────────────────────────
// Live Feed Ticker
// ─────────────────────────────────────────────────────────────
const LiveTicker: React.FC = () => (
  <div
    className="relative w-full overflow-hidden py-2.5"
    style={{
      background: '#020617',
      borderTop: '1px solid rgba(30,41,59,0.8)',
      borderBottom: '1px solid rgba(30,41,59,0.8)',
    }}
  >
    {/* Fade edges */}
    <div
      className="pointer-events-none absolute left-0 top-0 h-full w-16 z-10"
      style={{ background: 'linear-gradient(to right, #020617, transparent)' }}
    />
    <div
      className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10"
      style={{ background: 'linear-gradient(to left, #020617, transparent)' }}
    />

    <div className="animate-ticker flex items-center whitespace-nowrap" style={{ width: 'max-content' }}>
      {TICKER_ALL.map((item, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-2 px-4">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: severityColor(item.severity),
                boxShadow: `0 0 4px ${severityColor(item.severity)}`,
              }}
            />
            <span
              className="text-[10px] font-mono font-bold tracking-[0.5px]"
              style={{ color: severityColor(item.severity) }}
            >
              {item.type}
            </span>
            <span className="text-[10px] font-mono text-text-muted">{item.address}</span>
            <span className="text-[10px] font-mono text-text-dim">conf:{item.confidence}</span>
          </div>
          <span className="text-text-dim text-[10px] select-none">·</span>
        </React.Fragment>
      ))}
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────────
// Stats section
// ─────────────────────────────────────────────────────────────
const StatsSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  return (
    <section ref={ref} className="relative py-20 px-8 md:px-16 border-b border-border-dim">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map(({ value, label }, i) => (
          <motion.div
            key={label}
            initial={{ y: 30, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <div
              className="text-6xl font-black font-mono text-ferrari-500 leading-none"
              style={{ filter: 'drop-shadow(0 0 16px rgba(220,20,60,0.5))' }}
            >
              {value}
            </div>
            <div className="text-xs font-mono text-text-muted mt-3 tracking-[2px] uppercase">{label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Bento grid — asymmetric feature layout
// ─────────────────────────────────────────────────────────────
const BentoGrid: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })

  return (
    <section ref={ref} className="relative py-28 px-8 md:px-16 bg-bg-void">
      <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-14 overflow-hidden">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[11px] font-mono text-text-muted tracking-[4px] uppercase">Capabilities</span>
            <h2
              className="text-6xl md:text-7xl text-text-primary mt-4 leading-none"
              style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.02em' }}
            >
              DETECTION<br />
              <span className="text-ferrari-500">ENGINE</span>
            </h2>
          </motion.div>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* ── Row 1: Large (col-span-2) + Tall (row-span-2) ── */}

          {/* Large card — Heuristic Detection */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="md:col-span-2 p-8 flex flex-col justify-between"
            style={{ ...glassCard, minHeight: '220px', transition: 'all 0.25s ease' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(220,20,60,0.05)'
              e.currentTarget.style.borderColor = 'rgba(220,20,60,0.2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-4">
                  <Search size={22} style={{ color: '#dc143c', filter: 'drop-shadow(0 0 6px rgba(220,20,60,0.6))' }} />
                </div>
                <h3 className="font-mono font-bold text-text-primary text-lg tracking-[0.5px] mb-3">
                  Heuristic Detection
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed max-w-md">
                  28 battle-tested rules covering reentrancy, approvals, flashloans, oracle manipulation,
                  admin abuse, and fund flow — each with a deterministic confidence model and false-positive notes.
                </p>
              </div>
              <div className="flex-shrink-0 ml-6 mt-1 flex flex-col items-end gap-1">
                <MiniSparkline color="#dc143c" />
                <span className="text-[9px] font-mono text-text-muted tracking-[1px]">28 RULES · FIRING</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-6">
              {['REENTRANCY×6', 'APPROVALS×4', 'FLASHLOAN×4', 'ORACLE×4', 'ADMIN×4', 'FUND FLOW×6'].map(tag => (
                <span
                  key={tag}
                  className="text-[9px] font-mono px-2 py-0.5 tracking-[0.5px]"
                  style={{
                    background: 'rgba(220,20,60,0.08)',
                    border: '1px solid rgba(220,20,60,0.2)',
                    color: '#dc143c',
                    borderRadius: '2px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Tall card — Fund Flow (row-span-2) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="md:row-span-2 p-8 flex flex-col justify-between"
            style={{ ...glassCard, minHeight: '440px', transition: 'all 0.25s ease' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.04)'
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
            }}
          >
            <div>
              <div className="mb-4">
                <Network size={22} style={{ color: '#d4af37', filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.6))' }} />
              </div>
              <h3 className="font-mono font-bold text-text-primary text-base tracking-[0.5px] mb-3">Fund Flow Graphs</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Peel chains, consolidation patterns, and sink detection rendered as interactive directed graphs
                with multi-hop analysis.
              </p>
            </div>
            <div
              className="mt-8 flex items-center justify-center py-6"
              style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <MiniFundFlowSVG />
            </div>
            <div className="mt-auto pt-6 flex gap-3 text-[9px] font-mono tracking-[0.5px]">
              <span style={{ color: '#dc143c' }}>● ATTACKER</span>
              <span style={{ color: '#d4af37' }}>● HOP</span>
              <span style={{ color: '#38bdf8' }}>● SINK</span>
            </div>
          </motion.div>

          {/* Small card — Evidence-Linked */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="p-6 flex flex-col gap-3"
            style={{ ...glassCard, transition: 'all 0.25s ease' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(56,189,248,0.04)'
              e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
            }}
          >
            <GitBranch size={18} style={{ color: '#38bdf8' }} />
            <h3 className="font-mono font-bold text-text-primary text-sm tracking-[0.5px]">Evidence-Linked</h3>
            <p className="text-text-secondary text-xs leading-relaxed">Every finding references raw blockchain data. Full audit trail, zero fabrication.</p>
          </motion.div>

          {/* Small card — ML Risk Scoring */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="p-6 flex flex-col gap-3"
            style={{ ...glassCard, transition: 'all 0.25s ease' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.04)'
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
            }}
          >
            <TrendingUp size={18} style={{ color: '#d4af37' }} />
            <h3 className="font-mono font-bold text-text-primary text-sm tracking-[0.5px]">ML Risk Scoring</h3>
            <p className="text-text-secondary text-xs leading-relaxed">Feature vectors + community detection surface high-risk entities and correlated incidents.</p>
          </motion.div>

          {/* Small card — Confidence Layers */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="p-6 flex flex-col gap-3"
            style={{ ...glassCard, transition: 'all 0.25s ease' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(220,20,60,0.04)'
              e.currentTarget.style.borderColor = 'rgba(220,20,60,0.2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
            }}
          >
            <Lock size={18} style={{ color: '#dc143c' }} />
            <h3 className="font-mono font-bold text-text-primary text-sm tracking-[0.5px]">Confidence Layers</h3>
            <p className="text-text-secondary text-xs leading-relaxed">Separate facts from heuristics from ML from AI narrative — no conflation.</p>
          </motion.div>

          {/* Small card — AI Copilot */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="p-6 flex flex-col gap-3"
            style={{ ...glassCard, transition: 'all 0.25s ease' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(56,189,248,0.04)'
              e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
            }}
          >
            <Activity size={18} style={{ color: '#38bdf8' }} />
            <h3 className="font-mono font-bold text-text-primary text-sm tracking-[0.5px]">AI Analyst Copilot</h3>
            <p className="text-text-secondary text-xs leading-relaxed">Ollama-powered assistant grounded in forensic reports. Evidence-cited, never hallucinated.</p>
          </motion.div>

          {/* Wide card — Attack category stats bar chart (col-span-3) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="md:col-span-3 p-8"
            style={{ ...glassCard, transition: 'all 0.25s ease' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <BarChart3 size={18} style={{ color: '#d4af37' }} className="mb-3" />
                <h3 className="font-mono font-bold text-text-primary text-sm tracking-[0.5px]">Coverage Dashboard</h3>
                <p className="text-text-secondary text-xs mt-1">Signal detection rate across 6 attack categories</p>
              </div>
              <span className="text-[9px] font-mono text-text-muted tracking-[2px] uppercase">28 rules active</span>
            </div>

            <div className="flex items-end gap-3 h-16">
              {ATTACK_CATS.map(({ label, pct, color }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 flex-1">
                  <div className="w-full flex items-end justify-center" style={{ height: '44px' }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${(pct / 100) * 44}px`,
                        background: color,
                        opacity: 0.8,
                        borderRadius: '2px 2px 0 0',
                        boxShadow: `0 0 8px ${color}40`,
                      }}
                    />
                  </div>
                  <span className="text-[8px] font-mono text-text-muted tracking-[0.3px] text-center leading-tight">{label}</span>
                  <span className="text-[9px] font-mono font-bold" style={{ color }}>{pct}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// How It Works — 3 numbered steps
// ─────────────────────────────────────────────────────────────
const HowItWorks: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const steps = [
    {
      num: '01',
      label: 'RAW DATA',
      title: 'Import Blockchain Data',
      desc: 'Ingest live RPC feeds or client-exported raw logs — blocks, transactions, traces, state diffs, receipts.',
      color: '#dc143c',
    },
    {
      num: '02',
      label: '28 RULES',
      title: 'Heuristic + ML Engine',
      desc: 'Fire 28 detection rules against derived datasets. ML scoring clusters suspicious entities into incidents.',
      color: '#d4af37',
    },
    {
      num: '03',
      label: 'REPORT',
      title: 'Evidence-Linked Report',
      desc: 'Generate audit-ready forensic reports with full evidence chains, fund-flow graphs, and AI narratives.',
      color: '#38bdf8',
    },
  ]

  return (
    <section ref={ref} className="relative py-28 px-8 md:px-16 overflow-hidden" style={{ background: '#020617' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(220,20,60,0.04) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto">
        <div className="mb-14 overflow-hidden text-center">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[11px] font-mono text-text-muted tracking-[4px] uppercase">Process</span>
            <h2
              className="text-6xl md:text-7xl text-text-primary mt-4 leading-none"
              style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.02em' }}
            >
              HOW IT <span className="text-ferrari-500">WORKS</span>
            </h2>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 relative">
          {/* Connector line (desktop) */}
          <div
            className="hidden md:block absolute top-14 left-[16.6%] right-[16.6%] h-px pointer-events-none"
            style={{ background: 'linear-gradient(to right, rgba(220,20,60,0.3), rgba(212,175,55,0.3), rgba(56,189,248,0.3))' }}
          />

          {steps.map(({ num, label, title, desc, color }, i) => (
            <motion.div
              key={num}
              initial={{ y: 40, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center text-center px-4"
            >
              {/* Giant background number */}
              <div
                className="absolute -top-6 left-1/2 -translate-x-1/2 select-none pointer-events-none"
                style={{
                  fontFamily: "'Bebas Neue', monospace",
                  fontSize: '160px',
                  color,
                  opacity: 0.04,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {num}
              </div>

              {/* Numbered circle */}
              <div
                className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center mb-6 flex-shrink-0"
                style={{
                  background: `${color}15`,
                  border: `2px solid ${color}`,
                  boxShadow: `0 0 16px ${color}40`,
                }}
              >
                <span className="text-sm font-mono font-bold" style={{ color }}>{i + 1}</span>
              </div>

              {/* Label pill */}
              <span
                className="text-[9px] font-mono tracking-[2px] mb-3 px-2 py-0.5 rounded-sm"
                style={{ color, background: `${color}10`, border: `1px solid ${color}25` }}
              >
                {label}
              </span>

              <h3 className="font-mono font-bold text-text-primary text-base mb-3 tracking-[0.5px]">{title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>

              {/* Arrow (desktop) */}
              {i < 2 && (
                <div
                  className="hidden md:flex absolute -right-5 top-8 z-10 items-center"
                  style={{ color: 'rgba(255,255,255,0.12)' }}
                >
                  <ArrowRight size={14} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Features Commercial Ad placeholder section
// ─────────────────────────────────────────────────────────────
const FeaturesAdSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section
      ref={ref}
      className="relative py-28 px-8 md:px-16"
      style={{ background: '#020617', borderTop: '1px solid rgba(30,41,59,0.6)' }}
    >
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[11px] font-mono text-text-muted tracking-[4px] uppercase">Product Commercial</span>
            <h2
              className="text-6xl md:text-7xl text-text-primary mt-4 leading-none"
              style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.02em' }}
            >
              THE <span className="text-ferrari-500">CASE</span> FOR FORENSICS
            </h2>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative aspect-video max-w-5xl mx-auto overflow-hidden rounded-sm border border-border-dim"
          style={{ background: '#020617' }}
        >
          <Player
            component={FeaturesAd}
            durationInFrames={1800}
            fps={30}
            compositionWidth={1920}
            compositionHeight={1080}
            style={{ width: '100%', height: '100%' }}
            controls={true}
            autoPlay={false}
          />
        </motion.div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Landing
// ─────────────────────────────────────────────────────────────
export const Landing: React.FC = () => {
  return (
    <div className="bg-bg-void text-text-primary">

      {/* ── Red cursor heat trail — fixed full-page overlay ── */}
      <ThermodynamicGrid
        resolution={14}
        coolingFactor={0.965}
        className="fixed inset-0 z-[9999]"
        style={{ mixBlendMode: 'screen' }}
      />

      <Navbar />

      {/* ── HERO SECTION ── */}
      <section className="relative h-screen w-full overflow-hidden">

        {/* Nebula shader background */}
        <ShaderCanvas className="absolute inset-0 z-0 w-full h-full" />

        <NoiseOverlay />

        {/* Gradient overlays */}
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(2,6,23,0.4) 0%, transparent 25%, transparent 45%, rgba(2,6,23,0.95) 100%)' }}
        />
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(2,6,23,0.3) 0%, transparent 40%)' }}
        />

        {/* ── Hero content anchored to bottom ── */}
        <div className="absolute bottom-0 left-0 right-0 z-30 px-8 md:px-16 pb-4">
          <div className="grid grid-cols-12 items-end gap-6">

            <div className="col-span-12 lg:col-span-7 overflow-hidden">
              <div
                className="leading-none tracking-[0.02em] text-[18vw] md:text-[15vw] lg:text-[13vw]"
                style={{ color: '#f1f5f9', fontFamily: "'Bebas Neue', monospace" }}
              >
                <WordsPullUp text="FORENSICS" delayOffset={0.2} />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 flex flex-col gap-5 pb-8 lg:pb-12">
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-sm md:text-base text-text-secondary leading-relaxed max-w-sm"
              >
                Enterprise-grade blockchain forensics. Detect attacks, trace fund flows,
                and generate audit-ready reports with{' '}
                <span className="text-text-primary font-medium">28 advanced heuristic rules</span>.
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3"
              >
                <Link to="/dashboard">
                  <button
                    className="group inline-flex items-center gap-3 bg-ferrari-600 hover:bg-ferrari-500 transition-colors duration-200 py-3 px-5 text-sm font-mono font-medium text-white uppercase tracking-[1.28px]"
                    style={{ borderRadius: '2px' }}
                  >
                    Start Investigation
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                  </button>
                </Link>
                <Link
                  to="/signals"
                  className="text-xs font-mono text-text-muted hover:text-text-primary transition-colors duration-200 flex items-center gap-1"
                >
                  <Zap size={11} className="text-ferrari-500" />
                  Detection Rules
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="flex items-center gap-3 text-[10px] font-mono text-text-dim"
              >
                <span>EVM.Forensics Agent v2.0</span>
                <span className="text-border-dim">—</span>
                <span>Enterprise Edition</span>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE FEED TICKER ── */}
      <LiveTicker />

      {/* ── STATS ── */}
      <StatsSection />

      {/* ── BENTO FEATURES GRID ── */}
      <BentoGrid />

      {/* ── HOW IT WORKS ── */}
      <HowItWorks />

      {/* ── DEMO VIDEO ── */}
      <section
        className="relative py-20 px-8 md:px-16"
        style={{ background: '#020617', borderTop: '1px solid rgba(30,41,59,0.6)' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[11px] font-mono text-text-muted tracking-[4px] uppercase">Full Demo</span>
            <h2
              className="text-5xl mt-4 text-text-primary"
              style={{ fontFamily: "'Bebas Neue', monospace" }}
            >
              WATCH IT <span className="text-ferrari-500">WORK</span>
            </h2>
          </div>
          <div className="relative aspect-video max-w-5xl mx-auto rounded-sm overflow-hidden border border-border-dim">
            <Player
              component={DemoVideo}
              durationInFrames={9000}
              fps={30}
              compositionWidth={1920}
              compositionHeight={1080}
              style={{ width: '100%', height: '100%' }}
              controls={true}
              autoPlay={false}
            />
          </div>
        </div>
      </section>

      {/* ── FEATURES COMMERCIAL AD ── */}
      <FeaturesAdSection />

      {/* ── FOOTER CTA ── */}
      <section className="relative py-32 px-8 md:px-16 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(220,20,60,0.08) 0%, transparent 70%)' }}
        />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <WordsPullUpMultiStyle
            segments={[
              { text: 'INVESTIGATE.', className: 'text-text-primary' },
              { text: 'DETECT.',      className: 'text-ferrari-500' },
              { text: 'EXPOSE.',      className: 'text-text-primary' },
            ]}
            className="text-6xl md:text-8xl leading-none justify-center mb-10"
            style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.03em' }}
          />
          <Link to="/dashboard">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-3 px-8 py-4 border border-ferrari-600/50 bg-ferrari-600 hover:bg-ferrari-500 transition-colors duration-200 text-white font-mono text-sm uppercase tracking-[1.28px]"
              style={{ borderRadius: '2px' }}
            >
              <Zap size={14} />
              Launch Investigation Console
              <ArrowRight size={14} />
            </motion.button>
          </Link>
        </div>
      </section>

      {/* ── Bottom bar ── */}
      <div className="border-t border-border-dim px-8 md:px-16 py-6 flex items-center justify-between text-xs font-mono text-text-dim">
        <span>EVM.Forensics — Enterprise Edition</span>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>System Nominal</span>
        </div>
      </div>

    </div>
  )
}
