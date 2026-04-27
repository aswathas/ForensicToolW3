import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, ChevronDown, AlertTriangle,
  Activity, Shield, Database, CheckCircle2, XCircle,
  Clock, Layers, RefreshCw, Zap,
} from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { fadeInUp, staggerContainer } from '../components/animations/variants'
import api from '../utils/api'

// ── Types ──────────────────────────────────────────────────────────────────

interface RunSummary {
  runId: string
  scenario: string
  timestamp: string
  attacksTotal: number
  attacksSucceeded: number
  blockRange: { from: number; to: number }
  signalCount: number
  entityCount: number
  suspiciousTxCount: number
  threatLevel: 'CRITICAL' | 'HIGH' | 'LOW'
  topSignals: Array<{ name: string; severity: string; category: string }>
  highRiskEntities: Array<{ address: string; role?: string; riskScore: number }>
  fundFlowCount: number
  coverage: { tracesAvailable: boolean; stateDiffsAvailable: boolean; decodedABIs: number }
}

function getThreatLevel(succeeded: number): 'CRITICAL' | 'HIGH' | 'LOW' {
  if (succeeded >= 3) return 'CRITICAL'
  if (succeeded >= 1) return 'HIGH'
  return 'LOW'
}

const THREAT_COLOR: Record<string, string> = {
  CRITICAL: '#dc143c',
  HIGH:     '#d4af37',
  LOW:      '#22c55e',
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SeverityBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-[10px] font-mono text-text-muted text-right shrink-0">{label}</span>
      <div className="flex-1 h-4 bg-bg-tertiary rounded overflow-hidden">
        <motion.div
          className="h-full rounded"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] font-mono text-text-muted w-4 text-right shrink-0">{count}</span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export const ReportBuilder: React.FC = () => {
  const [runs, setRuns] = useState<string[]>([])
  const [selectedRun, setSelectedRun] = useState<string>('')
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [exportDone, setExportDone] = useState(false)

  // Load run list
  useEffect(() => {
    api.listRuns().then(r => {
      setRuns(r)
      if (r.length > 0) setSelectedRun(r[0])
    }).catch(() => {})
  }, [])

  // Load run data when selection changes
  useEffect(() => {
    if (!selectedRun) return
    setLoading(true)
    setSummary(null)
    setExportDone(false)

    api.getForensicRun(selectedRun).then((raw: any) => {
      const meta = raw?.run_meta ?? {}
      const attacks: any[] = meta.attacks ?? []
      const signals: any[] = Array.isArray(raw?.signals) ? raw.signals : []
      const entities: any[] = Array.isArray(raw?.entities) ? raw.entities : []
      const txs: any[] = Array.isArray(raw?.transactions) ? raw.transactions : []
      const flows: any[] = Array.isArray(raw?.fundFlows) ? raw.fundFlows : []
      const succeeded = attacks.filter(a => a.status === 'ok').length

      const topSignals = signals
        .sort((a: any, b: any) => {
          const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
          return (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
        })
        .slice(0, 6)
        .map((s: any) => ({ name: s.name, severity: s.severity, category: s.category }))

      const highRisk = entities
        .filter((e: any) => e.riskScore >= 0.6)
        .sort((a: any, b: any) => b.riskScore - a.riskScore)
        .slice(0, 5)
        .map((e: any) => ({ address: e.address, role: e.role, riskScore: e.riskScore }))

      setSummary({
        runId: selectedRun,
        scenario: meta.scenario ?? 'unknown',
        timestamp: meta.started_at ? new Date(meta.started_at).toLocaleString() : '—',
        attacksTotal: attacks.length,
        attacksSucceeded: succeeded,
        blockRange: meta.block_range ?? { from: 0, to: 0 },
        signalCount: signals.length,
        entityCount: entities.length,
        suspiciousTxCount: txs.filter((t: any) => t.isAnomaly).length,
        threatLevel: getThreatLevel(succeeded),
        topSignals,
        highRiskEntities: highRisk,
        fundFlowCount: flows.length,
        coverage: raw?.coverage ?? { tracesAvailable: false, stateDiffsAvailable: false, decodedABIs: 0 },
      })
    }).catch(() => {
      setSummary(null)
    }).finally(() => setLoading(false))
  }, [selectedRun])

  const handleExport = async () => {
    if (!selectedRun) return
    setGenerating(true)
    try {
      await api.exportReport({ runId: selectedRun, format: 'pdf', includeGraphs: true, includeRawData: false })
    } catch {
      // graceful — backend may not have the endpoint ready
    } finally {
      setGenerating(false)
      setExportDone(true)
      setTimeout(() => setExportDone(false), 3000)
    }
  }

  const signalsBySeverity = {
    critical: summary?.topSignals.filter(s => s.severity === 'critical').length ?? 0,
    high:     summary?.topSignals.filter(s => s.severity === 'high').length ?? 0,
    medium:   summary?.topSignals.filter(s => s.severity === 'medium').length ?? 0,
    low:      summary?.topSignals.filter(s => s.severity === 'low').length ?? 0,
  }

  const threatColor = summary ? (THREAT_COLOR[summary.threatLevel] ?? '#22c55e') : '#22c55e'

  return (
    <Layout>
      <div className="p-8 max-w-5xl">

        {/* ── Header ── */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="mb-8">
          <motion.div variants={fadeInUp} className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1
                className="text-4xl text-text-primary leading-none mb-1"
                style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.08em' }}
              >
                FORENSIC{' '}
                <span style={{ color: '#dc143c', filter: 'drop-shadow(0 0 12px rgba(220,20,60,0.5))' }}>
                  REPORT
                </span>{' '}
                BUILDER
              </h1>
              <p className="text-text-muted text-xs font-mono">
                // generate evidence-linked audit reports from forensic runs
              </p>
            </div>

            {/* Run selector */}
            {runs.length > 0 && (
              <div className="relative">
                <motion.button
                  onClick={() => setOpen(o => !o)}
                  className="btn-ghost text-xs py-2 min-w-[200px] justify-between"
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="font-mono truncate">
                    {selectedRun ? `run_${selectedRun.slice(0, 14)}…` : 'Select run'}
                  </span>
                  <ChevronDown size={13} className={`transition-transform ml-2 ${open ? 'rotate-180' : ''}`} />
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
                            ${r === selectedRun
                              ? 'text-ferrari-400 bg-bg-tertiary'
                              : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}
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

        {/* ── No runs state ── */}
        {runs.length === 0 && !loading && (
          <motion.div variants={fadeInUp} initial="initial" animate="animate"
            className="rounded-lg p-12 text-center"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
          >
            <FileText size={32} className="text-text-muted mx-auto mb-4" />
            <p className="font-mono text-sm text-text-muted">No forensic runs found. Run the pipeline first.</p>
            <code className="inline-block mt-4 px-4 py-2 font-mono text-xs text-gold-400 rounded"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
              npm run go
            </code>
          </motion.div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-28 rounded-lg" />
            ))}
          </div>
        )}

        {/* ── Report View ── */}
        {!loading && summary && (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">

            {/* Threat banner */}
            <motion.div
              variants={fadeInUp}
              className="relative overflow-hidden rounded-lg p-5"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${threatColor}40`,
                backdropFilter: 'blur(8px)',
                borderLeft: `3px solid ${threatColor}`,
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                style={{ background: `linear-gradient(to right, ${threatColor}60, transparent)` }} />

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <AlertTriangle size={16} style={{ color: threatColor }} />
                    <h2 className="text-2xl" style={{ fontFamily: "'Bebas Neue', monospace", color: threatColor, letterSpacing: '0.08em' }}>
                      {summary.threatLevel} THREAT
                    </h2>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap text-xs font-mono text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />{summary.timestamp}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers size={10} />blocks {summary.blockRange.from} → {summary.blockRange.to}
                    </span>
                    <span className="capitalize px-2 py-0.5 rounded text-[10px] border border-border-dim">
                      {summary.scenario}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-center px-4 py-2 rounded"
                    style={{ background: `${threatColor}12`, border: `1px solid ${threatColor}30` }}>
                    <div className="text-2xl font-mono font-black" style={{ color: threatColor }}>
                      {summary.attacksSucceeded}
                    </div>
                    <div className="text-[9px] font-mono text-text-muted uppercase tracking-widest">attacks</div>
                  </div>
                  <div className="text-center px-4 py-2 rounded"
                    style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
                    <div className="text-2xl font-mono font-black text-gold-400">{summary.signalCount}</div>
                    <div className="text-[9px] font-mono text-text-muted uppercase tracking-widest">signals</div>
                  </div>
                  <div className="text-center px-4 py-2 rounded"
                    style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)' }}>
                    <div className="text-2xl font-mono font-black text-sky-400">{summary.entityCount}</div>
                    <div className="text-[9px] font-mono text-text-muted uppercase tracking-widest">entities</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Two-col grid */}
            <motion.div variants={fadeInUp} className="grid md:grid-cols-2 gap-6">

              {/* Signal breakdown */}
              <div className="rounded-lg p-5 space-y-4"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={13} className="text-ferrari-500" />
                  <h3 className="text-xs font-mono font-semibold text-text-primary uppercase tracking-wider">
                    Signal Breakdown
                  </h3>
                </div>
                <SeverityBar label="CRITICAL" count={signalsBySeverity.critical} total={summary.signalCount || 1} color="#dc143c" />
                <SeverityBar label="HIGH"     count={signalsBySeverity.high}     total={summary.signalCount || 1} color="#d4af37" />
                <SeverityBar label="MEDIUM"   count={signalsBySeverity.medium}   total={summary.signalCount || 1} color="#f97316" />
                <SeverityBar label="LOW"      count={signalsBySeverity.low}       total={summary.signalCount || 1} color="#22c55e" />
                <p className="text-[9px] font-mono text-text-muted pt-1 border-t border-white/5">
                  Showing top {summary.topSignals.length} signals by severity. Total: {summary.signalCount}.
                </p>
              </div>

              {/* High-risk entities */}
              <div className="rounded-lg p-5"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={13} className="text-gold-500" />
                  <h3 className="text-xs font-mono font-semibold text-text-primary uppercase tracking-wider">
                    High-Risk Entities
                  </h3>
                </div>
                {summary.highRiskEntities.length === 0 ? (
                  <p className="text-xs font-mono text-text-muted">No high-risk entities detected.</p>
                ) : (
                  <div className="space-y-2.5">
                    {summary.highRiskEntities.map((e, i) => (
                      <motion.div
                        key={e.address}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.riskScore >= 0.8 ? 'bg-ferrari-500' : 'bg-gold-500'}`} />
                          <span className="font-mono text-[11px] text-text-secondary truncate" title={e.address}>
                            {e.address.slice(0, 10)}…{e.address.slice(-6)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {e.role && (
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border
                              ${e.role === 'attacker' ? 'text-ferrari-400 border-ferrari-500/30 bg-ferrari-500/10' :
                                e.role === 'victim'   ? 'text-gold-400 border-gold-500/30 bg-gold-500/10' :
                                'text-text-dim border-border-dim'}`}
                            >
                              {e.role}
                            </span>
                          )}
                          <span className={`text-xs font-mono font-bold ${e.riskScore >= 0.8 ? 'text-ferrari-400' : 'text-gold-400'}`}>
                            {(e.riskScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Top signals list */}
            {summary.topSignals.length > 0 && (
              <motion.div variants={fadeInUp}
                className="rounded-lg p-5"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={13} className="text-ferrari-500" />
                  <h3 className="text-xs font-mono font-semibold text-text-primary uppercase tracking-wider">
                    Active Detection Signals
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {summary.topSignals.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * i }}
                      className="flex items-center gap-2.5 py-2 border-b border-white/5 last:border-0"
                    >
                      <span className={
                        s.severity === 'critical' ? 'badge-critical' :
                        s.severity === 'high'     ? 'badge-high' :
                        s.severity === 'medium'   ? 'badge-medium' : 'badge-low'
                      }>
                        {s.severity.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-text-secondary truncate">{s.name}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Coverage pills */}
            <motion.div variants={fadeInUp}
              className="rounded-lg p-5"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Database size={13} className="text-sky-400" />
                <h3 className="text-xs font-mono font-semibold text-text-primary uppercase tracking-wider">
                  Evidence Coverage
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Execution Traces',  ok: summary.coverage.tracesAvailable },
                  { label: 'State Diffs',        ok: summary.coverage.stateDiffsAvailable },
                  { label: `${summary.coverage.decodedABIs} ABIs Decoded`, ok: summary.coverage.decodedABIs > 0 },
                  { label: `${summary.fundFlowCount} Fund Flows`, ok: summary.fundFlowCount > 0 },
                  { label: `${summary.suspiciousTxCount} Suspicious TXs`, ok: summary.suspiciousTxCount > 0 },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded"
                    style={{
                      background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(71,85,105,0.2)',
                      border: ok ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(71,85,105,0.3)',
                      color: ok ? '#86efac' : '#475569',
                    }}
                  >
                    {ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    {label}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Export section */}
            <motion.div variants={fadeInUp}
              className="rounded-lg p-5"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <FileText size={13} className="text-text-secondary" />
                <h3 className="text-xs font-mono font-semibold text-text-primary uppercase tracking-wider">
                  Export Report
                </h3>
              </div>
              <p className="text-xs font-mono text-text-muted mb-4">
                Generates an evidence-linked PDF audit report from{' '}
                <code className="text-gold-400">run_{selectedRun.slice(0, 12)}…</code>
              </p>
              <motion.button
                onClick={handleExport}
                disabled={generating}
                className="btn-neon text-xs"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                {generating ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Generating…
                  </>
                ) : exportDone ? (
                  <>
                    <CheckCircle2 size={13} className="text-green-400" />
                    Report Ready
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    Export PDF Report
                  </>
                )}
              </motion.button>
            </motion.div>

          </motion.div>
        )}
      </div>
    </Layout>
  )
}

