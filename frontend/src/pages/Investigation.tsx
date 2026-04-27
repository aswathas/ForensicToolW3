import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, ArrowLeft, Activity, Shield,
  Zap, TrendingUp, EyeOff, ChevronDown,
} from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { FundFlowGraph } from '../components/Investigation/FundFlowGraph'
import { CopilotPanel } from '../components/Copilot/CopilotPanel'
import { fadeInUp, staggerContainer } from '../components/animations/variants'
import { useForensicData } from '../hooks/useForensicData'
import type { Transaction, Signal, Entity } from '../types/forensics'

// ── Helpers ────────────────────────────────────────────────────────────────
const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

const SEVERITY_BORDER: Record<string, string> = {
  critical: '#dc143c',
  high: '#d4af37',
  medium: '#f59e0b',
  low: '#22c55e',
}

function severityClass(s: string) {
  if (s === 'critical') return 'badge-critical'
  if (s === 'high') return 'badge-high'
  if (s === 'medium') return 'badge-medium'
  return 'badge-low'
}

function truncAddr(addr: string, chars = 8) {
  if (!addr) return '—'
  return `${addr.slice(0, chars + 2)}…${addr.slice(-4)}`
}

// ── Glass card style ───────────────────────────────────────────────────────
const glassStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
}

// ── Section header ─────────────────────────────────────────────────────────
const SectionHeader: React.FC<{
  icon: React.FC<{ size?: number; className?: string }>
  title: string
  count?: number
  iconColor?: string
  children?: React.ReactNode
}> = ({ icon: Icon, title, count, iconColor = 'text-ferrari-500', children }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <Icon size={14} className={iconColor} />
      <h2
        className="text-sm font-bold text-text-primary uppercase tracking-wider"
        style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.12em' }}
      >
        {title}
      </h2>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-text-muted border border-border-dim px-1.5 py-0.5 rounded">
          {count}
        </span>
      )}
    </div>
    {children}
  </div>
)

// ── Summary stat pill ──────────────────────────────────────────────────────
const StatPill: React.FC<{ label: string; value: string | number; color?: string; glowColor?: string }> = ({
  label, value, color = 'text-text-primary', glowColor,
}) => (
  <motion.div
    className="flex flex-col items-center px-5 py-3 rounded-lg min-w-[90px] cursor-default group"
    style={glassStyle}
    whileHover={{
      boxShadow: glowColor ? `0 0 24px ${glowColor}, 0 4px 16px rgba(0,0,0,0.4)` : '0 4px 16px rgba(0,0,0,0.4)',
      borderColor: 'rgba(255,255,255,0.14)',
      y: -2,
    }}
    transition={{ duration: 0.18 }}
  >
    <span
      className={`text-2xl leading-none mb-1 ${color}`}
      style={{ fontFamily: "'Bebas Neue', monospace" }}
    >
      {value}
    </span>
    <span className="text-[10px] font-mono text-text-muted mt-0.5 uppercase tracking-widest">{label}</span>
  </motion.div>
)

// ── Signal row ─────────────────────────────────────────────────────────────
const SignalRow: React.FC<{ signal: Signal; onClick: () => void; active: boolean }> = ({
  signal, onClick, active,
}) => {
  const borderColor = SEVERITY_BORDER[signal.severity] ?? '#22c55e'

  return (
    <motion.div
      layout
      onClick={onClick}
      className="relative rounded-lg cursor-pointer overflow-hidden"
      style={{
        background: active ? 'rgba(220,20,60,0.06)' : 'rgba(0,0,0,0.3)',
        border: `1px solid ${active ? 'rgba(220,20,60,0.35)' : 'rgba(255,255,255,0.06)'}`,
        borderLeft: `3px solid ${borderColor}`,
      }}
      whileHover={{
        background: active ? 'rgba(220,20,60,0.08)' : 'rgba(255,255,255,0.03)',
        borderColor: active ? 'rgba(220,20,60,0.4)' : 'rgba(255,255,255,0.1)',
      }}
      transition={{ duration: 0.12 }}
    >
      {/* Active red accent bar at top */}
      {active && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, #dc143c80, transparent)' }}
        />
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={severityClass(signal.severity)}>{signal.severity}</span>
            <span className="text-xs font-mono font-semibold text-text-primary">{signal.name}</span>
          </div>
          <span className="text-[10px] font-mono text-text-muted shrink-0 border border-border-dim px-1 rounded">
            {signal.category}
          </span>
        </div>
        <p className="text-[11px] font-mono text-text-muted leading-relaxed line-clamp-2">
          {signal.description}
        </p>
        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-text-dim">
          <span>confidence: <span className="text-text-secondary">{(signal.confidence * 100).toFixed(0)}%</span></span>
          <span>fp-risk: <span className="text-text-secondary">{(signal.falsePositiveProbability * 100).toFixed(0)}%</span></span>
          <span>txs: <span className="text-text-secondary">{signal.affectedTransactions.length}</span></span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Transaction row ────────────────────────────────────────────────────────
const TxRow: React.FC<{ tx: Transaction; onClick: () => void; active: boolean }> = ({
  tx, onClick, active,
}) => (
  <motion.div
    layout
    onClick={onClick}
    className="relative rounded-lg cursor-pointer overflow-hidden"
    style={{
      background: active ? 'rgba(56,189,248,0.05)' : 'rgba(0,0,0,0.3)',
      border: `1px solid ${active ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)'}`,
      borderLeft: tx.isAnomaly
        ? '3px solid #dc143c'
        : '3px solid rgba(255,255,255,0.06)',
    }}
    whileHover={{
      background: active ? 'rgba(56,189,248,0.07)' : 'rgba(255,255,255,0.025)',
      borderColor: active ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.1)',
    }}
    transition={{ duration: 0.12 }}
  >
    <div className="p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <code
          className="text-[11px] font-mono truncate"
          style={{
            color: tx.isAnomaly ? '#dc143c' : '#94a3b8',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {tx.hash.slice(0, 20)}…{tx.hash.slice(-6)}
        </code>
        <div className="flex items-center gap-1.5 shrink-0">
          {tx.isAnomaly && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-ferrari-500"
              style={{ boxShadow: '0 0 5px rgba(220,20,60,0.8)' }}
            />
          )}
          <span className={`text-[10px] font-mono px-1 rounded border
            ${tx.status === 'success'
              ? 'text-green-400 border-green-500/30 bg-green-500/10'
              : 'text-ferrari-400 border-ferrari-500/30 bg-ferrari-500/10'
            }`}
          >
            {tx.status}
          </span>
        </div>
      </div>
      <div className="text-[10px] font-mono text-text-muted">
        <span>{truncAddr(tx.from)}</span>
        <span className="mx-1.5 text-border-subtle">→</span>
        <span>{truncAddr(tx.to)}</span>
      </div>
      <div className="flex items-center gap-3 mt-1 text-[9px] font-mono text-text-dim">
        <span>block {tx.blockNumber}</span>
        {tx.anomalyScore > 0 && (
          <span className={tx.anomalyScore > 0.7 ? 'text-ferrari-400 font-bold' : 'text-gold-400'}>
            anomaly: {(tx.anomalyScore * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  </motion.div>
)

// ── Entity row ─────────────────────────────────────────────────────────────
const EntityRow: React.FC<{ entity: Entity; index: number }> = ({ entity, index }) => {
  const riskPct = entity.riskScore * 100
  const riskColor =
    entity.riskScore >= 0.8 ? '#dc143c' :
    entity.riskScore >= 0.6 ? '#d4af37' :
    entity.riskScore >= 0.4 ? '#f97316' :
    '#22c55e'

  const textColorClass =
    entity.riskScore >= 0.8 ? 'text-ferrari-400' :
    entity.riskScore >= 0.6 ? 'text-gold-400' :
    entity.riskScore >= 0.4 ? 'text-orange-400' :
    'text-green-400'

  return (
    <motion.div
      className="flex items-center gap-3 p-3 rounded-lg overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeft: `3px solid ${riskColor}`,
      }}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      whileHover={{
        background: 'rgba(255,255,255,0.025)',
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <code
            className="text-[11px] font-mono text-text-secondary truncate"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {truncAddr(entity.address, 10)}
          </code>
          {entity.role && (
            <span className={`text-[9px] font-mono px-1 rounded border shrink-0
              ${entity.role === 'attacker'     ? 'text-ferrari-400 border-ferrari-500/30 bg-ferrari-500/10' :
                entity.role === 'victim'       ? 'text-gold-400 border-gold-500/30 bg-gold-500/10' :
                entity.role === 'intermediary' ? 'text-sky-400 border-sky-500/30 bg-sky-500/10' :
                'text-text-dim border-border-dim'}`
            }>
              {entity.role}
            </span>
          )}
          {entity.label && (
            <span className="text-[9px] font-mono text-text-dim shrink-0">{entity.label}</span>
          )}
        </div>
        {/* Risk progress bar — animated on mount */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-bg-tertiary overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: riskColor, boxShadow: `0 0 6px ${riskColor}80` }}
              initial={{ width: 0 }}
              animate={{ width: `${riskPct}%` }}
              transition={{ duration: 0.7, delay: 0.1 + index * 0.05, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono text-text-dim shrink-0">
            <span>{entity.type === 'contract' ? 'contract' : 'EOA'}</span>
            <span>·</span>
            <span>{entity.transactionCount} txs</span>
          </div>
        </div>
      </div>

      <div className={`text-sm font-black font-mono shrink-0 ${textColorClass}`}>
        {riskPct.toFixed(0)}%
      </div>
    </motion.div>
  )
}

// ── Tx detail drawer ───────────────────────────────────────────────────────
const TxDetailDrawer: React.FC<{
  tx: Transaction
  signals: Signal[]
  onClose: () => void
}> = ({ tx, signals, onClose }) => {
  const related = signals.filter(s => s.affectedTransactions.includes(tx.hash))

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg p-4 space-y-4"
      style={glassStyle}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-xs font-bold text-text-primary uppercase tracking-wider"
          style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.1em' }}
        >
          Transaction Detail
        </h3>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors text-xs font-mono"
        >
          ✕ close
        </button>
      </div>

      <div className="space-y-2 text-[11px] font-mono">
        {[
          { label: 'Hash',   value: tx.hash },
          { label: 'From',   value: tx.from },
          { label: 'To',     value: tx.to },
          { label: 'Block',  value: String(tx.blockNumber) },
          { label: 'Value',  value: `${tx.value} wei` },
          { label: 'Gas',    value: `${tx.gasUsed} @ ${tx.gasPrice}` },
          { label: 'Status', value: tx.status },
        ].map(({ label, value }) => (
          <div key={label} className="flex gap-2">
            <span className="text-text-muted w-12 shrink-0">{label}</span>
            <code
              className="text-text-secondary break-all"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {value}
            </code>
          </div>
        ))}
      </div>

      {related.length > 0 && (
        <div>
          <p className="data-label mb-2">Firing Signals</p>
          <div className="space-y-2">
            {related.map(s => (
              <div
                key={s.id}
                className="rounded p-2 text-[11px] font-mono space-y-0.5"
                style={{
                  background: 'rgba(220,20,60,0.05)',
                  border: '1px solid rgba(220,20,60,0.2)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={severityClass(s.severity)}>{s.severity}</span>
                  <span className="text-text-primary font-semibold">{s.name}</span>
                </div>
                <p className="text-text-muted">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ── Investigation page ─────────────────────────────────────────────────────
export const Investigation: React.FC = () => {
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()
  const { data, loading, error } = useForensicData(runId || null)

  const [selectedTx, setSelectedTx] = useState<Transaction | undefined>()
  const [selectedSignal, setSelectedSignal] = useState<Signal | undefined>()
  const [txFilter, setTxFilter] = useState<'all' | 'anomaly'>('anomaly')
  const [sigFilter, setSigFilter] = useState<'all' | 'critical' | 'high'>('all')
  const [showGraph, setShowGraph] = useState(false)

  // ── Loading state ──
  if (loading) {
    return (
      <Layout>
        <div className="p-8 max-w-6xl">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-4"
          >
            {[1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="rounded-lg p-5"
                style={glassStyle}
              >
                <div className="space-y-2">
                  <div className="skeleton h-4 w-48 rounded" />
                  <div className="skeleton h-3 w-72 rounded" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Layout>
    )
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <Layout>
        <div className="p-8 flex flex-col items-center justify-center gap-4">
          <AlertTriangle size={32} className="text-ferrari-500" />
          <p className="text-ferrari-400 font-mono text-sm">{error || 'Failed to load forensic data'}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-ghost text-xs">
            <ArrowLeft size={13} />
            Back to Dashboard
          </button>
        </div>
      </Layout>
    )
  }

  // ── Derived values ──
  const anomalyTxs = data.transactions.filter(t => t.isAnomaly)
  const filteredTxs = txFilter === 'anomaly' ? anomalyTxs : data.transactions

  const filteredSignals = data.signals
    .filter(s => {
      if (sigFilter === 'critical') return s.severity === 'critical'
      if (sigFilter === 'high')     return s.severity === 'critical' || s.severity === 'high'
      return true
    })
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4))

  const highRiskEntities = data.entities
    .filter(e => e.riskScore >= 0.5)
    .sort((a, b) => b.riskScore - a.riskScore)

  const criticalCount  = data.signals.filter(s => s.severity === 'critical').length
  const highCount      = data.signals.filter(s => s.severity === 'high').length
  const threatLevel    = criticalCount > 0 ? 'CRITICAL' : highCount > 0 ? 'HIGH' : 'LOW'

  const statPills = [
    { label: 'Transactions', value: data.transactions.length, color: 'text-sky-400',     glow: 'rgba(56,189,248,0.3)' },
    { label: 'Anomalies',    value: anomalyTxs.length,        color: 'text-ferrari-400', glow: 'rgba(220,20,60,0.3)' },
    { label: 'Signals',      value: data.signals.length,      color: 'text-gold-400',    glow: 'rgba(212,175,55,0.3)' },
    { label: 'Entities',     value: data.entities.length,     color: 'text-purple-400',  glow: 'rgba(168,85,247,0.3)' },
    { label: 'Fund Flows',   value: data.fundFlows.length,    color: 'text-teal-400',    glow: 'rgba(20,184,166,0.3)' },
  ]

  return (
    <Layout>
      <div className="p-6 max-w-7xl">

        {/* ── Page header ── */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="mb-6"
        >
          <motion.div variants={fadeInUp} className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-ghost text-xs py-1.5 px-3"
              >
                <ArrowLeft size={12} />
              </button>
              <div>
                <h1
                  className="text-3xl leading-none"
                  style={{ fontFamily: "'Bebas Neue', monospace" }}
                >
                  <span className="text-text-primary">INVESTIGATION</span>
                  <span
                    className="ml-3"
                    style={{
                      color: '#dc143c',
                      filter: 'drop-shadow(0 0 10px rgba(220,20,60,0.6))',
                    }}
                  >
                    run_{runId}
                  </span>
                </h1>
                <p className="text-text-muted text-xs font-mono mt-0.5">
                  // forensic analysis · evidence-first reporting
                </p>
              </div>
            </div>

            {/* Threat level badge */}
            <span className={`text-sm font-mono font-bold px-3 py-1.5 rounded border
              ${threatLevel === 'CRITICAL' ? 'badge-critical text-sm' :
                threatLevel === 'HIGH'     ? 'badge-high text-sm' :
                'badge-low text-sm'}`}
            >
              {threatLevel}
            </span>
          </motion.div>

          {/* ── Stat summary row ── */}
          <motion.div variants={fadeInUp} className="flex flex-wrap gap-3 mb-6">
            {statPills.map(({ label, value, color, glow }) => (
              <StatPill key={label} label={label} value={value} color={color} glowColor={glow} />
            ))}

            {/* Coverage pill */}
            <motion.div
              className="flex flex-col justify-center px-5 py-3 rounded-lg"
              style={glassStyle}
              whileHover={{ boxShadow: '0 4px 16px rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.14)', y: -2 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex gap-2 text-[10px] font-mono">
                {[
                  { label: 'traces',      ok: data.coverage.tracesAvailable },
                  { label: 'state-diffs', ok: data.coverage.stateDiffsAvailable },
                ].map(({ label, ok }) => (
                  <span key={label} className={`flex items-center gap-1 ${ok ? 'text-green-400' : 'text-text-dim'}`}>
                    {ok ? <CheckCircle2 size={9} /> : <EyeOff size={9} />}
                    {label}
                  </span>
                ))}
              </div>
              <span className="text-[10px] font-mono text-text-dim mt-0.5">
                {data.coverage.decodedABIs} ABIs decoded
              </span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* ── Main three-column grid ── */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-3 gap-5 mb-6"
        >

          {/* ─ Column 1: Signals ─ */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <div className="rounded-lg p-4" style={glassStyle}>
              <SectionHeader
                icon={Zap}
                title="Signals"
                count={data.signals.length}
                iconColor="text-ferrari-500"
              >
                <div className="flex gap-1">
                  {(['all', 'critical', 'high'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setSigFilter(f)}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors
                        ${sigFilter === f
                          ? 'border-ferrari-500/50 text-ferrari-400 bg-ferrari-500/10'
                          : 'border-border-dim text-text-dim hover:border-border-subtle'
                        }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </SectionHeader>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredSignals.length === 0 ? (
                  <p className="text-xs font-mono text-text-dim text-center py-4">
                    No signals match this filter
                  </p>
                ) : (
                  filteredSignals.map(signal => (
                    <SignalRow
                      key={signal.id}
                      signal={signal}
                      active={selectedSignal?.id === signal.id}
                      onClick={() =>
                        setSelectedSignal(prev =>
                          prev?.id === signal.id ? undefined : signal
                        )
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </motion.section>

          {/* ─ Column 2: Transactions ─ */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            <div className="rounded-lg p-4" style={glassStyle}>
              <SectionHeader
                icon={Activity}
                title="Transactions"
                count={filteredTxs.length}
                iconColor="text-sky-400"
              >
                <div className="flex gap-1">
                  {([
                    { key: 'anomaly', label: `anomalies (${anomalyTxs.length})` },
                    { key: 'all',     label: `all (${data.transactions.length})` },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setTxFilter(key)}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors
                        ${txFilter === key
                          ? 'border-sky-500/50 text-sky-400 bg-sky-500/10'
                          : 'border-border-dim text-text-dim hover:border-border-subtle'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </SectionHeader>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredTxs.length === 0 ? (
                  <p className="text-xs font-mono text-text-dim text-center py-4">
                    No transactions in this view
                  </p>
                ) : (
                  filteredTxs.map(tx => (
                    <TxRow
                      key={tx.hash}
                      tx={tx}
                      active={selectedTx?.hash === tx.hash}
                      onClick={() =>
                        setSelectedTx(prev =>
                          prev?.hash === tx.hash ? undefined : tx
                        )
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </motion.section>

          {/* ─ Column 3: Entities + selected detail ─ */}
          <motion.section variants={fadeInUp} className="flex flex-col gap-3">
            {/* Selected transaction detail */}
            <AnimatePresence>
              {selectedTx && (
                <TxDetailDrawer
                  tx={selectedTx}
                  signals={data.signals}
                  onClose={() => setSelectedTx(undefined)}
                />
              )}
            </AnimatePresence>

            {/* Selected signal detail */}
            <AnimatePresence>
              {selectedSignal && !selectedTx && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg p-4 space-y-3"
                  style={glassStyle}
                >
                  <div className="flex items-center justify-between">
                    <h3
                      className="text-xs font-bold text-text-primary uppercase tracking-wider"
                      style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.1em' }}
                    >
                      Signal Detail
                    </h3>
                    <button
                      onClick={() => setSelectedSignal(undefined)}
                      className="text-text-muted hover:text-text-primary transition-colors text-xs font-mono"
                    >
                      ✕ close
                    </button>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={severityClass(selectedSignal.severity)}>
                        {selectedSignal.severity}
                      </span>
                      <span className="text-xs font-mono font-bold text-text-primary">
                        {selectedSignal.name}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-text-muted leading-relaxed mb-3">
                      {selectedSignal.description}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      {[
                        { l: 'Category',    v: selectedSignal.category },
                        { l: 'Confidence',  v: `${(selectedSignal.confidence * 100).toFixed(0)}%` },
                        { l: 'FP Risk',     v: `${(selectedSignal.falsePositiveProbability * 100).toFixed(0)}%` },
                        { l: 'Affected Txs', v: selectedSignal.affectedTransactions.length },
                      ].map(({ l, v }) => (
                        <div key={l}>
                          <span className="text-text-muted">{l}: </span>
                          <span className="text-text-secondary">{v}</span>
                        </div>
                      ))}
                    </div>
                    {selectedSignal.sourceDataPath && (
                      <div className="mt-2 text-[10px] font-mono text-text-dim">
                        <span className="text-text-muted">Source: </span>
                        <code>{selectedSignal.sourceDataPath}</code>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Entity list */}
            <div className="rounded-lg p-4 flex-1" style={glassStyle}>
              <SectionHeader
                icon={Shield}
                title="Entities"
                count={highRiskEntities.length}
                iconColor="text-purple-400"
              >
                <span className="text-[9px] font-mono text-text-dim">risk ≥ 50%</span>
              </SectionHeader>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {highRiskEntities.length === 0 ? (
                  <p className="text-xs font-mono text-text-dim text-center py-4">
                    No high-risk entities detected
                  </p>
                ) : (
                  highRiskEntities.map((entity, i) => (
                    <EntityRow key={entity.address} entity={entity} index={i} />
                  ))
                )}
              </div>
            </div>
          </motion.section>
        </motion.div>

        {/* ── Fund Flow Section ── */}
        <motion.section
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <div className="rounded-lg overflow-hidden" style={glassStyle}>
            {/* Collapsible header */}
            <motion.button
              className="w-full flex items-center justify-between p-4 transition-colors"
              style={{ background: 'transparent' }}
              onClick={() => setShowGraph(g => !g)}
              whileHover={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-teal-400" />
                <span
                  className="text-sm font-bold text-text-primary uppercase tracking-wider"
                  style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.12em' }}
                >
                  Fund Flow Graph
                </span>
                <span className="text-[10px] font-mono text-text-muted border border-border-dim px-1.5 py-0.5 rounded">
                  {data.fundFlows.length} flows
                </span>
              </div>
              <motion.div
                animate={{ rotate: showGraph ? 180 : 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <ChevronDown size={14} className="text-text-muted" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {showGraph && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 320, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeInOut' }}
                  className="overflow-hidden"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <FundFlowGraph flows={data.fundFlows} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </div>

      {/* ── Copilot panel ── */}
      <CopilotPanel
        runId={runId}
        runData={data}
        runMeta={{
          scenario: 'investigation',
          attacksTotal: data.transactions.length,
          attacksSucceeded: anomalyTxs.length,
        }}
      />
    </Layout>
  )
}
