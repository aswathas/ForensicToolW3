import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, ArrowRight, AlertTriangle, Activity,
  ChevronDown, Network, TrendingUp, Layers,
} from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { fadeInUp, staggerContainer } from '../components/animations/variants'
import api from '../utils/api'

const SIGNAL_CATEGORIES = [
  { key: 'reentrancy', label: 'Reentrancy',     color: '#dc143c' },
  { key: 'approval',   label: 'Approvals',       color: '#d4af37' },
  { key: 'flashloan',  label: 'Flashloan',       color: '#38bdf8' },
  { key: 'oracle',     label: 'Oracle/Price',    color: '#f97316' },
  { key: 'admin',      label: 'Admin/Upgrade',   color: '#a78bfa' },
  { key: 'fundflow',   label: 'Fund Flow',       color: '#22c55e' },
]

interface AttackEntry {
  attack: string
  status: string
  attacker?: string
  victim?: string
  tx?: string
}

interface RunSummary {
  runId: string
  attacks: AttackEntry[]
  scenario: string
  blockRange: { from: number; to: number }
  contracts: Record<string, string>
  timestamp: string
  txCount: number
}

function CategoryBar({
  label, color, value, max, delay,
}: { label: string; color: string; value: number; max: number; delay: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <motion.div
      variants={fadeInUp}
      className="flex items-center gap-3"
    >
      <span className="w-28 text-xs font-mono text-text-secondary shrink-0 text-right">{label}</span>
      <div className="flex-1 h-6 bg-bg-tertiary rounded overflow-hidden relative">
        <motion.div
          className="h-full rounded"
          style={{ background: `linear-gradient(90deg, ${color}60, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 flex items-center px-2">
          <span className="text-xs font-mono text-white/80">{value}</span>
        </div>
      </div>
    </motion.div>
  )
}

function FundFlowNode({ label, addr, role, delay }: {
  label: string; addr: string; role: 'attacker' | 'victim' | 'contract'; delay: number
}) {
  const colors = {
    attacker: 'border-ferrari-600/60 bg-ferrari-600/10 text-ferrari-400',
    victim:   'border-gold-600/60 bg-gold-600/10 text-gold-400',
    contract: 'border-border-subtle bg-bg-tertiary text-text-secondary',
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.35, type: 'spring', stiffness: 300, damping: 25 }}
      className={`flex flex-col px-3 py-2 rounded-lg border text-xs font-mono ${colors[role]}`}
    >
      <span className="font-bold text-[10px] uppercase tracking-wider opacity-60">{label}</span>
      <span className="truncate max-w-[140px]">{addr}</span>
    </motion.div>
  )
}

export const GraphsPage: React.FC = () => {
  const [runs, setRuns] = useState<string[]>([])
  const [selectedRun, setSelectedRun] = useState<string>('')
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api.listRuns().then(r => {
      setRuns(r)
      if (r.length > 0) setSelectedRun(r[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedRun) return
    setLoading(true)
    setSummary(null)
    api.getForensicRun(selectedRun).then((raw: any) => {
      const meta = raw?.run_meta ?? {}
      setSummary({
        runId: selectedRun,
        attacks: meta.attacks ?? [],
        scenario: meta.scenario ?? 'reentrancy',
        blockRange: meta.block_range ?? { from: 0, to: 0 },
        contracts: meta.contracts ?? {},
        timestamp: meta.started_at ?? '',
        txCount: 0,
      })
    }).catch(() => {
      setSummary(null)
    }).finally(() => setLoading(false))
  }, [selectedRun])

  const succeeded = summary?.attacks.filter(a => a.status === 'ok') ?? []
  const failed = summary?.attacks.filter(a => a.status !== 'ok') ?? []

  // Map attacks → signal categories
  const categoryHits: Record<string, number> = {}
  summary?.attacks.forEach(a => {
    if (a.attack?.includes('reentrancy')) {
      categoryHits['reentrancy'] = (categoryHits['reentrancy'] ?? 0) + (a.status === 'ok' ? 1 : 0)
    }
    if (a.attack?.includes('flashloan')) {
      categoryHits['flashloan'] = (categoryHits['flashloan'] ?? 0) + (a.status === 'ok' ? 1 : 0)
    }
    if (a.attack?.includes('oracle') || a.attack?.includes('price')) {
      categoryHits['oracle'] = (categoryHits['oracle'] ?? 0) + (a.status === 'ok' ? 1 : 0)
    }
  })
  const maxHit = Math.max(...Object.values(categoryHits), 1)

  const contractEntries = Object.entries(summary?.contracts ?? {})

  return (
    <Layout>
      <div className="p-8 max-w-5xl">

        {/* ── Header ── */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="mb-8">
          <motion.div variants={fadeInUp} className="flex items-center justify-between mb-6">
            <div>
              <h1
                className="text-4xl text-text-primary leading-none mb-1"
                style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.08em' }}
              >
                ATTACK
                <span className="ml-2" style={{ color: '#dc143c', filter: 'drop-shadow(0 0 10px rgba(220,20,60,0.5))' }}>
                  GRAPHS
                </span>
              </h1>
              <p className="text-text-muted text-sm font-mono">// visual forensic analysis</p>
            </div>

            {/* Run selector */}
            {runs.length > 0 && (
              <div className="relative">
                <motion.button
                  onClick={() => setOpen(o => !o)}
                  className="btn-ghost text-xs py-2 min-w-[180px] justify-between"
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="font-mono truncate">run_{selectedRun.slice(0, 12)}…</span>
                  <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </motion.button>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-full mt-1 w-64 bg-bg-secondary border border-border-dim rounded-lg shadow-card z-50 py-1 overflow-hidden"
                    >
                      {runs.map(r => (
                        <button
                          key={r}
                          onClick={() => { setSelectedRun(r); setOpen(false) }}
                          className={`
                            w-full text-left px-4 py-2.5 text-xs font-mono transition-colors
                            ${r === selectedRun ? 'text-ferrari-400 bg-bg-tertiary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}
                          `}
                        >
                          run_{r}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </motion.div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-lg" />)}
          </div>
        )}

        {!loading && !summary && (
          <motion.div variants={fadeInUp} initial="initial" animate="animate"
            className="p-12 text-center rounded-lg"
            style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
          >
            <BarChart3 size={32} className="text-text-muted mx-auto mb-4" />
            <p className="text-text-muted font-mono text-sm">No run selected or run data unavailable</p>
          </motion.div>
        )}

        {!loading && summary && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >

            {/* ── Overview stat cards ── */}
            <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Attacks', value: summary.attacks.length, icon: AlertTriangle, color: '#f1f5f9',  glow: 'rgba(241,245,249,0.1)' },
                { label: 'Succeeded',     value: succeeded.length,       icon: Activity,     color: '#dc143c',  glow: 'rgba(220,20,60,0.2)' },
                { label: 'Failed',        value: failed.length,          icon: TrendingUp,   color: '#475569',  glow: 'rgba(71,85,105,0.2)' },
                { label: 'Block Range',   value: `${summary.blockRange.to - summary.blockRange.from}`,
                  icon: Layers, color: '#d4af37', glow: 'rgba(212,175,55,0.2)', suffix: 'blks' },
              ].map(({ label, value, icon: Icon, color, glow, suffix }) => (
                <motion.div
                  key={label}
                  className="rounded-lg p-4"
                  style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
                  whileHover={{ boxShadow: `0 0 20px ${glow}` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={13} style={{ color }} />
                    <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{label}</span>
                  </div>
                  <div className="text-2xl font-mono font-black" style={{ color, fontFamily: "'Bebas Neue', monospace" }}>
                    {value}{suffix && <span className="text-sm font-normal ml-1 text-text-muted">{suffix}</span>}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* ── Attack breakdown bar chart ── */}
            <motion.div variants={fadeInUp} className="rounded-lg p-6"
              style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={15} className="text-ferrari-500" />
                <h2 className="text-base text-text-primary" style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.08em' }}>
                  Attack Category Distribution
                </h2>
              </div>
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-3"
              >
                {SIGNAL_CATEGORIES.map(({ key, label, color }, i) => (
                  <CategoryBar
                    key={key}
                    label={label}
                    color={color}
                    value={categoryHits[key] ?? 0}
                    max={maxHit}
                    delay={0.1 + i * 0.06}
                  />
                ))}
              </motion.div>
              <p className="text-[10px] font-mono text-text-dim mt-4">
                Based on attack hashes from ground truth. Full signal coverage requires forensic analysis.
              </p>
            </motion.div>

            {/* ── Attack timeline ── */}
            <motion.div variants={fadeInUp} className="rounded-lg p-6"
              style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-2 mb-5">
                <Activity size={15} className="text-ferrari-500" />
                <h2 className="text-base text-text-primary" style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.08em' }}>
                  Attack Execution Timeline
                </h2>
              </div>
              <div className="space-y-3">
                {summary.attacks.map((atk, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.3 }}
                    className="flex items-start gap-3 group"
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center mt-1">
                      <div className={`
                        w-2.5 h-2.5 rounded-full border-2 shrink-0
                        ${atk.status === 'ok'
                          ? 'bg-ferrari-500 border-ferrari-600'
                          : 'bg-bg-tertiary border-border-subtle'}
                      `}
                        style={atk.status === 'ok' ? { boxShadow: '0 0 6px rgba(220,20,60,0.7)' } : {}}
                      />
                      {i < summary.attacks.length - 1 && (
                        <div className="w-px flex-1 mt-1 bg-border-dim" style={{ minHeight: 16 }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold text-text-primary capitalize">
                          {atk.attack?.replace(/_/g, ' ')}
                        </span>
                        <span className={atk.status === 'ok' ? 'badge-critical' : 'badge-low'}>
                          {atk.status === 'ok' ? 'SUCCEEDED' : 'FAILED'}
                        </span>
                      </div>
                      {atk.tx && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="data-label">TX</span>
                          <span className="hash">{atk.tx.slice(0, 20)}…</span>
                        </div>
                      )}
                      {atk.attacker && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="data-label">ATTKR</span>
                          <span className="hash text-ferrari-400/70">{atk.attacker.slice(0, 20)}…</span>
                        </div>
                      )}
                      {atk.victim && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="data-label">VICTIM</span>
                          <span className="hash text-gold-500/70">{atk.victim.slice(0, 20)}…</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* ── Fund Flow graph (addresses) ── */}
            {succeeded.length > 0 && (
              <motion.div variants={fadeInUp} className="rounded-lg p-6"
                style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <Network size={15} className="text-ferrari-500" />
                  <h2 className="text-base text-text-primary" style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.08em' }}>
                    Fund Flow — Attack Nodes
                  </h2>
                </div>
                <div className="space-y-4">
                  {succeeded.map((atk, i) => (
                    <div key={i} className="flex items-center gap-3 flex-wrap">
                      <FundFlowNode
                        label="Attacker"
                        addr={atk.attacker ?? '—'}
                        role="attacker"
                        delay={0.05 * i}
                      />
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ delay: 0.15 + 0.05 * i, duration: 0.35 }}
                        className="flex items-center gap-1 text-ferrari-500"
                        style={{ transformOrigin: 'left' }}
                      >
                        <div className="h-px w-8 bg-ferrari-600/50" />
                        <ArrowRight size={12} />
                      </motion.div>
                      <FundFlowNode
                        label="Victim"
                        addr={atk.victim ?? '—'}
                        role="victim"
                        delay={0.1 + 0.05 * i}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-mono text-text-dim mt-5">
                  Showing attacker → victim flow from ground truth.
                  Run <code className="text-gold-400">npm run go:skip-sim</code> for full fund-flow graph with hops.
                </p>
              </motion.div>
            )}

            {/* ── Contract Registry ── */}
            {contractEntries.length > 0 && (
              <motion.div variants={fadeInUp} className="rounded-lg p-6"
                style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <Layers size={15} className="text-gold-500" />
                  <h2 className="text-base text-text-primary" style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.08em' }}>
                    Deployed Contract Registry
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {contractEntries.map(([name, addr], i) => (
                    <motion.div
                      key={name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.04 * i }}
                      className="flex items-center gap-3 py-2 border-b border-border-dim last:border-0"
                    >
                      <span className="w-2 h-2 rounded-full bg-gold-500/60 shrink-0" />
                      <span className="text-xs font-mono text-text-secondary w-32 shrink-0">{name}</span>
                      <span className="font-mono text-[11px] text-text-muted truncate">{addr}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

          </motion.div>
        )}
      </div>
    </Layout>
  )
}
