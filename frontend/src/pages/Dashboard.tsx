import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Player } from '@remotion/player'
import {
  AlertTriangle, CheckCircle2, Clock, ArrowRight,
  RefreshCw, Terminal, Activity, Database, Zap,
  ChevronUp, Shield, TrendingUp, Eye,
} from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { fadeInUp, staggerContainer } from '../components/animations/variants'
import { CopilotPanel } from '../components/Copilot/CopilotPanel'
import { AttackViz } from '../components/animations/AttackViz'
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
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `3px solid ${borderColor}`,
      }}
      whileHover={{
        y: expanded ? 0 : -2,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 16px ${borderColor}22`,
      }}
      transition={{ duration: 0.18 }}
    >
      {/* Subtle top gradient accent */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(to right, ${borderColor}60, transparent)` }}
      />

      {/* Main row — clickable to navigate */}
      <div
        className="p-5 cursor-pointer group"
        onClick={onNavigate}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">

            {/* Run ID + badges */}
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="flex items-center gap-2">
                {succeeded > 0
                  ? <AlertTriangle size={14} className="text-ferrari-500 shrink-0" />
                  : <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                }
                <span
                  className="font-mono text-sm font-semibold text-text-primary truncate"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  run_{runId}
                </span>
              </div>
              <span className={`
                text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border
                ${threatLevel === 'CRITICAL' ? 'badge-critical' : ''}
                ${threatLevel === 'HIGH'     ? 'badge-high' : ''}
                ${threatLevel === 'LOW'      ? 'badge-low' : ''}
              `}>
                {threatLevel}
              </span>
              <span className="text-[10px] font-mono text-text-muted">#{idx + 1}</span>

              {meta.scenario && meta.scenario !== 'unknown' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border-dim text-text-dim capitalize">
                  {meta.scenario}
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text-muted">
              {meta.timestamp && (
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {meta.timestamp}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Zap size={10} className={succeeded > 0 ? 'text-ferrari-500' : 'text-text-muted'} />
                <span className={succeeded > 0 ? 'text-ferrari-400' : ''}>
                  {succeeded}/{total} attacks
                </span>
              </span>
              {meta.blockRange && meta.blockRange !== '—' && (
                <span className="flex items-center gap-1">
                  <TrendingUp size={10} />
                  blocks {meta.blockRange}
                </span>
              )}
              {meta.signalCount !== undefined && (
                <span className="flex items-center gap-1 text-gold-400">
                  <Activity size={10} />
                  {meta.signalCount} signals
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              className="w-8 h-8 rounded border border-border-dim flex items-center justify-center
                         text-text-muted hover:text-text-primary hover:border-border-neon
                         bg-bg-secondary transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand()
              }}
              whileTap={{ scale: 0.92 }}
              title={expanded ? 'Collapse details' : 'View details'}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded
                ? <ChevronUp size={13} />
                : <Eye size={13} />
              }
            </motion.button>

            <motion.button
              className="btn-neon text-xs py-2 px-4"
              onClick={(e) => {
                e.stopPropagation()
                onNavigate()
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Investigate
              <ArrowRight size={13} />
            </motion.button>
          </div>
        </div>

        {/* Attack progress bar */}
        {total > 0 && (
          <div className="mt-4 pt-4 border-t border-border-dim">
            <div className="flex justify-between text-[10px] font-mono text-text-muted mb-1.5">
              <span>Attack success rate</span>
              <span className="text-ferrari-400">{Math.round((succeeded / total) * 100)}%</span>
            </div>
            <div className="h-1 rounded-full bg-bg-tertiary overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-ferrari-700 to-ferrari-500"
                initial={{ width: 0 }}
                animate={{ width: `${(succeeded / total) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.2 + idx * 0.05, ease: 'easeOut' }}
                style={{ boxShadow: '0 0 8px rgba(220,20,60,0.5)' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expandable details section */}
      <AnimatePresence>
        {expanded && (
          <div className="px-5 pb-5">
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
    <Layout>
      <div className="min-h-screen bg-bg-void">

        {/* ── HERO BANNER ────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden">
          {/* AttackViz ambient background */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ opacity: 0.13, filter: 'blur(1px)' }}
          >
            <Player
              component={AttackViz}
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

          {/* Gradient fade to page bg */}
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(2,6,23,0.55) 0%, rgba(2,6,23,0.75) 60%, #020617 100%)',
            }}
          />

          {/* Hero content */}
          <div className="relative z-20 px-8 pt-10 pb-8">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {/* Title row */}
              <motion.div
                variants={fadeInUp}
                className="flex items-start justify-between mb-2"
              >
                <div>
                  <h1
                    className="text-5xl text-text-primary leading-none tracking-wide mb-0"
                    style={{ fontFamily: "'Bebas Neue', monospace" }}
                  >
                    FORENSIC{' '}
                    <span
                      style={{
                        color: '#dc143c',
                        filter: 'drop-shadow(0 0 18px rgba(220,20,60,0.65))',
                      }}
                    >
                      OPERATIONS
                    </span>{' '}
                    CENTER
                  </h1>
                  {/* Red underline accent */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div
                      className="h-0.5 w-32"
                      style={{
                        background: 'linear-gradient(to right, #dc143c, transparent)',
                        boxShadow: '0 0 8px rgba(220,20,60,0.5)',
                      }}
                    />
                    <p className="text-text-muted text-xs font-mono">
                      // blockchain attack investigation workspace
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-1">
                  {/* Block range badge */}
                  {latestMeta && latestMeta.blockRange !== '—' && (
                    <div
                      className="px-3 py-1.5 rounded font-mono text-xs"
                      style={{
                        background: 'rgba(56,189,248,0.08)',
                        border: '1px solid rgba(56,189,248,0.25)',
                        color: '#38bdf8',
                      }}
                    >
                      <span className="text-text-dim">latest: </span>
                      blocks {latestMeta.blockRange}
                    </div>
                  )}

                  <motion.button
                    onClick={() => loadRuns(true)}
                    className="btn-ghost text-xs py-2"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
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
                  className="relative rounded-lg p-5 flex items-center gap-4 cursor-default group"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  whileHover={{
                    boxShadow: `0 0 28px ${glow}, 0 4px 20px rgba(0,0,0,0.5)`,
                    borderColor: 'rgba(255,255,255,0.15)',
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${glow.replace('0.25', '0.12')}`, border: `1px solid ${glow}` }}
                  >
                    <Icon size={20} className={color} />
                  </div>
                  <div>
                    <div
                      className={`text-4xl leading-none mb-0.5 ${color}`}
                      style={{ fontFamily: "'Bebas Neue', monospace" }}
                    >
                      {value}
                    </div>
                    <div className="text-xs text-text-muted font-mono tracking-widest uppercase">
                      {label}
                    </div>
                  </div>

                  {/* Hover glow bar */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: `linear-gradient(to right, ${glow.replace('0.25', '0.8')}, transparent)` }}
                  />
                </motion.div>
              ))}
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
                <div className="absolute inset-0 opacity-20">
                  <Player
                    component={AttackViz}
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

      {/* ── Copilot panel ── */}
      <CopilotPanel runMeta={dashboardCopilotMeta} />
    </Layout>
  )
}
