import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, Clock, ArrowRight,
  RefreshCw, Terminal, Activity, Database, Zap,
  ChevronUp, Shield, Eye,
} from 'lucide-react'
import { Navbar } from '../components/Layout/Navbar'
import { fadeInUp, staggerContainer } from '../components/animations/variants'
import { CopilotPanel } from '../components/Copilot/CopilotPanel'
import { SmokeBackground } from '../components/ui/spooky-smoke-animation'
import api from '../utils/api'
import type { ForensicBundle } from '../types/forensics'

// ── Types ──────────────────────────────────────────────────────────────────
interface RunMeta {
  runId: string
  attacksTotal: number
  attacksSucceeded: number
  blockRange: string
  scenario: string
  timestamp?: string
  threatLevel: 'CRITICAL' | 'HIGH' | 'LOW'
  signalCount?: number
  entityCount?: number
  suspiciousTxCount?: number
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getThreatLevel(succeeded: number): 'CRITICAL' | 'HIGH' | 'LOW' {
  if (succeeded >= 3) return 'CRITICAL'
  if (succeeded >= 1) return 'HIGH'
  return 'LOW'
}

const THREAT_BORDER: Record<string, string> = {
  CRITICAL: '#dc143c',
  HIGH: '#d4af37',
  LOW: '#22c55e',
}

// ── Skeleton card ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-black/40 border border-white/10 backdrop-blur-sm rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="skeleton h-4 w-48 rounded" />
          <div className="skeleton h-3 w-32 rounded" />
        </div>
        <div className="skeleton h-8 w-24 rounded" />
      </div>
      <div className="flex gap-4">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    </div>
  )
}

// ── Signal mini-badge ──────────────────────────────────────────────────────
function SignalBadge({ severity, name }: { severity: string; name: string }) {
  const cls =
    severity === 'critical' ? 'badge-critical' :
    severity === 'high'     ? 'badge-high' :
    severity === 'medium'   ? 'badge-medium' :
    'badge-low'

  return (
    <span className={`${cls} truncate max-w-[160px]`} title={name}>
      {name}
    </span>
  )
}

// ── Expanded details panel ─────────────────────────────────────────────────
interface ExpandedDetailsProps {
  runId: string
}

const ExpandedDetails: React.FC<ExpandedDetailsProps> = ({ runId }) => {
  const [bundle, setBundle] = useState<ForensicBundle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.getForensicRun(runId).then((raw: any) => {
      if (cancelled) return
      setBundle({
        runId,
        transactions: Array.isArray(raw?.transactions) ? raw.transactions : [],
        signals: Array.isArray(raw?.signals) ? raw.signals : [],
        entities: Array.isArray(raw?.entities) ? raw.entities : [],
        fundFlows: Array.isArray(raw?.fundFlows) ? raw.fundFlows : [],
        coverage: raw?.coverage ?? { tracesAvailable: false, stateDiffsAvailable: false, decodedABIs: 0 },
      })
    }).catch(() => {
      if (!cancelled) setBundle(null)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [runId])

  if (loading) {
    return (
      <div className="pt-4 border-t border-border-dim space-y-2">
        <div className="skeleton h-3 w-40 rounded" />
        <div className="skeleton h-3 w-56 rounded" />
        <div className="skeleton h-3 w-32 rounded" />
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="pt-4 border-t border-border-dim text-xs font-mono text-text-dim">
        Unable to load details for this run.
      </div>
    )
  }

  const topSignals = bundle.signals
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 }
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
    })
    .slice(0, 5)

  const highRiskEntities = bundle.entities
    .filter(e => e.riskScore >= 0.6)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="pt-4 border-t border-border-dim overflow-hidden"
    >
      <div className="grid grid-cols-2 gap-6">

        {/* Signals column */}
        <div>
          <p className="data-label mb-2 flex items-center gap-1.5">
            <Zap size={10} className="text-ferrari-400" />
            Signals Summary
            <span className="ml-auto text-text-muted normal-case font-normal tracking-normal">
              {bundle.signals.length} total
            </span>
          </p>
          {topSignals.length === 0 ? (
            <p className="text-xs font-mono text-text-dim">No signals fired</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {topSignals.map(s => (
                <SignalBadge key={s.id} severity={s.severity} name={s.name} />
              ))}
              {bundle.signals.length > 5 && (
                <span className="text-[10px] font-mono text-text-muted self-center">
                  +{bundle.signals.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Entities / coverage column */}
        <div className="space-y-3">
          {highRiskEntities.length > 0 && (
            <div>
              <p className="data-label mb-2 flex items-center gap-1.5">
                <Shield size={10} className="text-gold-400" />
                High-Risk Entities
              </p>
              <div className="space-y-1">
                {highRiskEntities.map(e => (
                  <div key={e.address} className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-text-muted truncate max-w-[140px]" title={e.address}>
                      {e.address.slice(0, 14)}…
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {e.role && (
                        <span className={`px-1 rounded text-[9px] border
                          ${e.role === 'attacker' ? 'text-ferrari-400 border-ferrari-500/30 bg-ferrari-500/10' :
                            e.role === 'victim'   ? 'text-gold-400 border-gold-500/30 bg-gold-500/10' :
                            'text-text-dim border-border-dim'}`
                        }>
                          {e.role}
                        </span>
                      )}
                      <span className={`font-bold ${e.riskScore >= 0.8 ? 'text-ferrari-400' : 'text-gold-400'}`}>
                        {(e.riskScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coverage pills */}
          <div className="flex gap-2 flex-wrap">
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border
              ${bundle.coverage.tracesAvailable
                ? 'text-green-400 border-green-500/30 bg-green-500/10'
                : 'text-text-dim border-border-dim'}`}
            >
              {bundle.coverage.tracesAvailable ? 'traces' : 'no traces'}
            </span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border
              ${bundle.coverage.stateDiffsAvailable
                ? 'text-green-400 border-green-500/30 bg-green-500/10'
                : 'text-text-dim border-border-dim'}`}
            >
              {bundle.coverage.stateDiffsAvailable ? 'state diffs' : 'no state diffs'}
            </span>
            {bundle.coverage.decodedABIs > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border text-sky-400 border-sky-500/30 bg-sky-500/10">
                {bundle.coverage.decodedABIs} ABIs
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Run card ───────────────────────────────────────────────────────────────
interface RunCardProps {
  runId: string
  meta: RunMeta
  idx: number
  expanded: boolean
  onToggleExpand: () => void
  onNavigate: () => void
}

const THREAT_LABEL: Record<string, string> = {
  CRITICAL: 'Active Attacks — Immediate Review Required',
  HIGH:     'Suspicious Activity Detected',
  LOW:      'No Attacks — Clean Run',
}

const RunCard: React.FC<RunCardProps> = ({ runId, meta, idx, expanded, onToggleExpand, onNavigate }) => {
  const { attacksSucceeded: succeeded, attacksTotal: total, threatLevel } = meta
  const borderColor = THREAT_BORDER[threatLevel] ?? '#22c55e'

  return (
    <motion.div
      key={runId}
      variants={fadeInUp}
      layout
      className="relative overflow-hidden rounded-lg"
      style={{
        background: 'rgba(1,3,10,0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `4px solid ${borderColor}`,
      }}
      whileHover={{ boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 24px ${borderColor}18` }}
      transition={{ duration: 0.18 }}
    >
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(to right, ${borderColor}50, transparent)` }} />

      {/* Main clickable area */}
      <div className="p-6 cursor-pointer" onClick={onNavigate}>
        <div className="flex items-start justify-between gap-6">

          {/* Left: threat status + run info */}
          <div className="flex-1 min-w-0">

            {/* Threat status — PRIMARY info for client */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${borderColor}15`, border: `1px solid ${borderColor}35` }}
              >
                {succeeded > 0
                  ? <AlertTriangle size={18} style={{ color: borderColor }} />
                  : <CheckCircle2 size={18} style={{ color: borderColor }} />
                }
              </div>
              <div>
                <div
                  className="font-bold leading-tight"
                  style={{ fontSize: 17, color: succeeded > 0 ? borderColor : '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}
                >
                  {THREAT_LABEL[threatLevel]}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border
                      ${threatLevel === 'CRITICAL' ? 'badge-critical' : ''}
                      ${threatLevel === 'HIGH'     ? 'badge-high'     : ''}
                      ${threatLevel === 'LOW'      ? 'badge-low'      : ''}`}
                  >
                    {threatLevel}
                  </span>
                  {meta.scenario && meta.scenario !== 'unknown' && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border-dim text-text-dim capitalize">
                      {meta.scenario}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-text-muted">#{idx + 1}</span>
                </div>
              </div>
            </div>

            {/* Plain-English summary row */}
            <div
              className="rounded-md px-4 py-2.5 mb-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui, sans-serif' }}>
                {succeeded > 0
                  ? `${succeeded} of ${total} attack simulation${total > 1 ? 's' : ''} succeeded.`
                  : `All ${total} simulated attack${total > 1 ? 's' : ''} were blocked.`
                }
                {meta.signalCount ? ` ${meta.signalCount} detection signal${meta.signalCount !== 1 ? 's' : ''} fired.` : ''}
                {meta.blockRange && meta.blockRange !== '—' ? ` Analyzed blocks ${meta.blockRange}.` : ''}
              </p>
            </div>

            {/* Technical detail strip */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-text-muted">
              {meta.timestamp && (
                <span className="flex items-center gap-1.5">
                  <Clock size={10} />
                  {meta.timestamp}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Zap size={10} style={{ color: succeeded > 0 ? borderColor : undefined }} />
                <span style={{ color: succeeded > 0 ? borderColor : undefined }}>
                  {succeeded}/{total} attacks
                </span>
              </span>
              {meta.signalCount !== undefined && (
                <span className="flex items-center gap-1.5 text-gold-400">
                  <Activity size={10} />
                  {meta.signalCount} signals
                </span>
              )}
              <span className="flex items-center gap-1.5 text-text-dim font-mono text-[10px]">
                run_{runId.slice(0, 16)}…
              </span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <motion.button
              className="btn-neon text-sm py-2.5 px-5"
              onClick={(e) => { e.stopPropagation(); onNavigate() }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              Investigate
              <ArrowRight size={14} />
            </motion.button>
            <motion.button
              className="w-8 h-8 rounded border border-border-dim flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-neon transition-colors"
              onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
              whileTap={{ scale: 0.92 }}
              title={expanded ? 'Collapse details' : 'View technical details'}
            >
              {expanded ? <ChevronUp size={13} /> : <Eye size={13} />}
            </motion.button>
          </div>
        </div>

        {/* Attack success progress bar */}
        {total > 0 && (
          <div className="mt-4 pt-4 border-t border-border-dim">
            <div className="flex justify-between text-[10px] font-mono mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <span>Attack success rate</span>
              <span style={{ color: borderColor }}>{Math.round((succeeded / total) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(to right, ${borderColor}cc, ${borderColor})`, boxShadow: `0 0 10px ${borderColor}60` }}
                initial={{ width: 0 }}
                animate={{ width: `${(succeeded / total) * 100}%` }}
                transition={{ duration: 0.9, delay: 0.15 + idx * 0.06, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expandable technical details */}
      <AnimatePresence>
        {expanded && (
          <div className="px-6 pb-6">
            <div className="pt-1 mb-3">
              <span className="text-[10px] font-mono text-text-dim tracking-widest uppercase">— Technical Details —</span>
            </div>
            <ExpandedDetails runId={runId} />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Dashboard page ─────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const [runs, setRuns] = useState<string[]>([])
  const [metas, setMetas] = useState<Record<string, RunMeta>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const navigate = useNavigate()

  const loadRuns = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const result = await api.listRuns()
      setRuns(result)

      const metaMap: Record<string, RunMeta> = {}
      await Promise.allSettled(
        result.map(async (runId) => {
          try {
            const raw: any = await api.getForensicRun(runId)
            const attacks = raw?.run_meta?.attacks ?? []
            const succeeded = attacks.filter((a: any) => a.status === 'ok').length
            const total = attacks.length
            const signals = Array.isArray(raw?.signals) ? raw.signals : []
            const entities = Array.isArray(raw?.entities) ? raw.entities : []
            const transactions = Array.isArray(raw?.transactions) ? raw.transactions : []

            metaMap[runId] = {
              runId,
              attacksTotal: total,
              attacksSucceeded: succeeded,
              blockRange: raw?.run_meta?.block_range
                ? `${raw.run_meta.block_range.from} → ${raw.run_meta.block_range.to}`
                : '—',
              scenario: raw?.run_meta?.scenario ?? 'reentrancy',
              timestamp: raw?.run_meta?.started_at
                ? new Date(raw.run_meta.started_at).toLocaleString()
                : undefined,
              threatLevel: getThreatLevel(succeeded),
              signalCount: signals.length,
              entityCount: entities.length,
              suspiciousTxCount: transactions.filter((t: any) => t.isAnomaly).length,
            }
          } catch {
            metaMap[runId] = {
              runId,
              attacksTotal: 0,
              attacksSucceeded: 0,
              blockRange: '—',
              scenario: 'unknown',
              threatLevel: 'LOW',
            }
          }
        })
      )
      setMetas(metaMap)
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadRuns() }, [])

  const totalAttacks = Object.values(metas).reduce((s, m) => s + m.attacksSucceeded, 0)
  const totalSignals = Object.values(metas).reduce((s, m) => s + (m.signalCount ?? 0), 0)

  const dashboardCopilotMeta = runs.length > 0
    ? {
        scenario: 'multiple runs',
        blockRange: '—',
        attacksTotal: Object.values(metas).reduce((s, m) => s + m.attacksTotal, 0),
        attacksSucceeded: totalAttacks,
      }
    : undefined

  // Latest block range for hero badge
  const latestMeta = runs.length > 0 ? metas[runs[0]] : undefined

  const statsData = [
    { icon: Database,      label: 'Total Runs',       value: runs.length,  color: 'text-sky-400',      glow: 'rgba(56,189,248,0.25)' },
    { icon: AlertTriangle, label: 'Attacks Detected', value: totalAttacks, color: 'text-ferrari-500',  glow: 'rgba(220,20,60,0.25)' },
    { icon: Activity,      label: 'Signals Fired',    value: totalSignals, color: 'text-gold-500',     glow: 'rgba(212,175,55,0.25)' },
  ]

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#010208', color: '#f1f5f9' }}>

      {/* ── Three.js horizon background — fixed full-viewport ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <SmokeBackground smokeColor="#a01020" className="w-full h-full" />
      </div>

      {/* ── Navbar ── */}
      <div style={{ position: 'relative', zIndex: 50 }}>
        <Navbar />
      </div>

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
      <div className="min-h-screen">

        {/* ── HERO BANNER ────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(1,2,8,0.25) 0%, rgba(1,2,8,0.6) 70%, #010208 100%)' }} />

          <div className="relative z-20 px-8 pt-12 pb-10">
            <motion.div variants={staggerContainer} initial="initial" animate="animate">
              <motion.div variants={fadeInUp} className="flex items-end justify-between gap-4 mb-1 flex-wrap">

                {/* Title */}
                <div>
                  <p className="text-[11px] font-mono text-text-muted tracking-[0.3em] uppercase mb-3">
                    // blockchain attack investigation workspace
                  </p>
                  <h1 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(42px, 6vw, 80px)', lineHeight: 0.95, letterSpacing: '0.04em', margin: 0 }}>
                    Forensic{' '}
                    <span style={{ color: '#dc143c', filter: 'drop-shadow(0 0 20px rgba(220,20,60,0.55))' }}>
                      Operations
                    </span>{' '}
                    Center
                  </h1>
                  <p className="mt-3 text-base" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'system-ui, sans-serif', maxWidth: 480 }}>
                    Select a forensic run below to investigate detected attacks, review signals, and trace suspicious fund flows.
                  </p>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-3 mb-1">
                  {latestMeta && latestMeta.blockRange !== '—' && (
                    <div className="px-3 py-2 rounded font-mono text-xs"
                      style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.22)', color: '#38bdf8' }}>
                      <span className="text-text-dim">latest: </span>blocks {latestMeta.blockRange}
                    </div>
                  )}
                  <motion.button
                    onClick={() => loadRuns(true)}
                    className="btn-ghost text-xs py-2"
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    disabled={refreshing}
                  >
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ── PAGE BODY ─────────────────────────────────────────────────── */}
        <div className="px-8 pb-10 max-w-5xl">

          {/* Stats row */}
          {!loading && runs.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-3 gap-4 mb-8"
            >
              {statsData.map(({ icon: Icon, label, value, color, glow }) => (
                <motion.div
                  key={label}
                  variants={fadeInUp}
                  className="relative rounded-lg overflow-hidden cursor-default group"
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    padding: '28px 24px',
                  }}
                  whileHover={{ boxShadow: `0 0 32px ${glow}, 0 4px 24px rgba(0,0,0,0.6)`, borderColor: 'rgba(255,255,255,0.13)' }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Icon top-right */}
                  <div className="absolute top-5 right-5 opacity-40 group-hover:opacity-70 transition-opacity">
                    <Icon size={22} className={color} />
                  </div>

                  {/* Big number */}
                  <div
                    className={`mb-1 leading-none ${color}`}
                    style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 56 }}
                  >
                    {value}
                  </div>

                  {/* Plain label */}
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.75)', fontFamily: 'system-ui, sans-serif', marginBottom: 4 }}>
                    {label}
                  </div>
                  <div className="text-[10px] font-mono text-text-dim tracking-widest uppercase">
                    {label === 'Total Runs' ? 'forensic analyses' : label === 'Attacks Detected' ? 'successful simulations' : 'heuristic rules fired'}
                  </div>

                  {/* Bottom accent */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: `linear-gradient(to right, ${glow.replace('0.25', '0.9')}, transparent)` }} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── Live Monitoring Widget ── */}
          {!loading && runs.length > 0 && (
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              className="mb-8 rounded-lg overflow-hidden"
              style={{ background: 'rgba(2,3,8,0.75)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}
            >
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-ferrari-600 animate-pulse" style={{ boxShadow: '0 0 6px rgba(220,20,60,0.8)' }} />
                  <span className="text-[11px] font-mono font-bold text-text-primary tracking-[1px] uppercase">52 Signals Detected</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-mono text-green-500">● MONITORING</span>
                  <span className="text-[9px] font-mono text-text-muted tracking-[1px]">LIVE</span>
                </div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {[
                  { type: 'REENTRANCY', tx: '0xd4f9...c1a2', conf: 0.97, sev: 'CRITICAL' as const },
                  { type: 'FLASHLOAN', tx: '0x8b2c...e5d7', conf: 0.89, sev: 'HIGH' as const },
                  { type: 'ORACLE MANIP', tx: '0x3f1b...9c04', conf: 0.85, sev: 'HIGH' as const },
                ].map((s, i) => {
                  const color = s.sev === 'CRITICAL' ? '#dc143c' : '#d4af37'
                  return (
                    <div key={i} className="flex items-center justify-between px-5 py-2.5 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
                        <span className="text-[10px] font-mono font-bold tracking-[0.5px]" style={{ color }}>{s.type}</span>
                      </div>
                      <span className="text-[9px] font-mono text-text-muted truncate flex-1 text-center">{s.tx}</span>
                      <span className="text-[10px] font-mono font-semibold flex-shrink-0 px-1.5 py-0.5 rounded-sm" style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
                        {s.conf.toFixed(2)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="px-5 py-2 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-[9px] font-mono text-text-dim">EVM.Forensics v2.0</span>
                <span className="text-[9px] font-mono text-text-muted">Demo signals — connect pipeline for live data</span>
              </div>
            </motion.div>
          )}

          {/* ── Run List ── */}
          {loading ? (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {/* Loading hero with ambient background */}
              <motion.div
                variants={fadeInUp}
                className="relative rounded-lg overflow-hidden mb-6"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  height: 120,
                }}
              >
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(204,26,46,0.04) 0%, transparent 60%)' }} />
                <div className="absolute inset-0 flex items-center justify-center gap-3">
                  <RefreshCw size={16} className="text-ferrari-400 animate-spin" />
                  <span className="font-mono text-sm text-text-muted">Loading forensic runs…</span>
                </div>
              </motion.div>
              {[1, 2, 3].map(i => (
                <motion.div key={i} variants={fadeInUp}>
                  <SkeletonCard />
                </motion.div>
              ))}
            </motion.div>
          ) : runs.length === 0 ? (
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              className="relative rounded-lg overflow-hidden"
              style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="p-16 text-center relative z-10">
                <Terminal size={40} className="text-text-muted mx-auto mb-6" />
                <h2
                  className="text-5xl text-text-muted mb-4"
                  style={{ fontFamily: "'Bebas Neue', monospace" }}
                >
                  NO FORENSIC RUNS FOUND
                </h2>
                <p className="text-text-dim font-mono text-sm mb-2">
                  Start a simulation to generate forensic data
                </p>
                <p className="text-text-dim font-mono text-xs mb-8">
                  Run the pipeline, then return here to investigate
                </p>
                <div className="flex flex-col items-center gap-3">
                  <code
                    className="inline-block px-5 py-2.5 rounded font-mono text-sm text-gold-400"
                    style={{
                      background: 'rgba(212,175,55,0.08)',
                      border: '1px solid rgba(212,175,55,0.25)',
                    }}
                  >
                    npm run sim:quick
                  </code>
                  <span className="text-text-dim text-xs font-mono">or</span>
                  <code
                    className="inline-block px-5 py-2.5 rounded font-mono text-sm text-sky-400"
                    style={{
                      background: 'rgba(56,189,248,0.08)',
                      border: '1px solid rgba(56,189,248,0.25)',
                    }}
                  >
                    npm run go
                  </code>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              <AnimatePresence>
                {runs.map((runId, idx) => {
                  const meta = metas[runId]
                  if (!meta) return null

                  return (
                    <RunCard
                      key={runId}
                      runId={runId}
                      meta={meta}
                      idx={idx}
                      expanded={expandedRun === runId}
                      onToggleExpand={() =>
                        setExpandedRun(prev => (prev === runId ? null : runId))
                      }
                      onNavigate={() => navigate(`/investigation/${runId}`)}
                    />
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
      </div>

      {/* ── Copilot panel ── */}
      <CopilotPanel runMeta={dashboardCopilotMeta} />
    </div>
  )
}
