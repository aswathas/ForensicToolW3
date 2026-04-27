import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, ChevronDown, AlertTriangle,
  Activity, Shield, Database, CheckCircle2, XCircle,
  Clock, Layers, RefreshCw, Zap,
} from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { fadeInUp, staggerContainer } from '../components/animations/variants'
import api from '../utils/api'
import html2pdf from 'html2pdf.js'

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

// ── Print Template (captured by html2pdf) ─────────────────────────────────

const PrintTemplate: React.FC<{ summary: RunSummary }> = ({ summary }) => {
  const threatColor = THREAT_COLOR[summary.threatLevel] ?? '#22c55e'
  return (
    <div style={{ fontFamily: 'monospace', color: '#f1f5f9', lineHeight: 1.6, fontSize: 13 }}>
      <div style={{ borderBottom: `3px solid ${threatColor}`, paddingBottom: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: 4, margin: '0 0 6px', color: '#fff' }}>
          EVM FORENSICS REPORT
        </h1>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          Run ID: {summary.runId} &nbsp;|&nbsp; Generated: {new Date().toLocaleString()} &nbsp;|&nbsp; Scenario: {summary.scenario}
        </div>
      </div>
      <div style={{ background: `${threatColor}18`, border: `1px solid ${threatColor}50`, borderLeft: `4px solid ${threatColor}`, padding: '14px 18px', marginBottom: 24, borderRadius: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: threatColor, letterSpacing: 2, marginBottom: 4 }}>
          ⚠ {summary.threatLevel} THREAT LEVEL
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          Blocks {summary.blockRange.from.toLocaleString()} → {summary.blockRange.to.toLocaleString()} &nbsp;|&nbsp; {summary.timestamp}
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase' }}>Executive Summary</h2>
        <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, margin: 0 }}>
          This forensic analysis examined {summary.attacksTotal} attack{summary.attacksTotal !== 1 ? 's' : ''} in the {summary.scenario} scenario.{' '}
          {summary.attacksSucceeded} attack{summary.attacksSucceeded !== 1 ? 's' : ''} succeeded, triggering {summary.signalCount} detection signal{summary.signalCount !== 1 ? 's' : ''} across {summary.entityCount} monitored entities.{' '}
          {summary.suspiciousTxCount} transactions were flagged as anomalous. Threat level: {summary.threatLevel}.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {([
          { label: 'Attacks Succeeded', value: summary.attacksSucceeded, color: threatColor },
          { label: 'Signals Detected', value: summary.signalCount, color: '#d4af37' },
          { label: 'Entities Flagged', value: summary.entityCount, color: '#a855f7' },
          { label: 'Suspicious TXs', value: summary.suspiciousTxCount, color: '#38bdf8' },
        ] as const).map(({ label, value, color }) => (
          <div key={label} style={{ border: `1px solid ${color}35`, background: `${color}0e`, padding: '12px', borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
      {summary.topSignals.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase' }}>Detection Signals</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                {['Severity', 'Signal Name', 'Category'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', fontSize: 9, letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.topSignals.map((s, i) => {
                const c = s.severity === 'critical' ? '#dc143c' : s.severity === 'high' ? '#d4af37' : s.severity === 'medium' ? '#f97316' : '#22c55e'
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                    <td style={{ padding: '6px 8px' }}><span style={{ color: c, fontWeight: 700, textTransform: 'uppercase', fontSize: 9 }}>{s.severity}</span></td>
                    <td style={{ padding: '6px 8px', color: '#e2e8f0' }}>{s.name.replace(/_/g, ' ')}</td>
                    <td style={{ padding: '6px 8px', color: '#64748b' }}>{s.category}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {summary.highRiskEntities.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase' }}>High-Risk Entities</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                {['Address', 'Role', 'Risk Score'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', fontSize: 9, letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.highRiskEntities.map((e, i) => {
                const c = e.riskScore >= 0.8 ? '#dc143c' : '#d4af37'
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                    <td style={{ padding: '6px 8px', color: '#e2e8f0', fontFamily: 'monospace' }}>{e.address.slice(0, 10)}…{e.address.slice(-6)}</td>
                    <td style={{ padding: '6px 8px', color: '#94a3b8', textTransform: 'uppercase', fontSize: 10 }}>{e.role ?? '—'}</td>
                    <td style={{ padding: '6px 8px', color: c, fontWeight: 700 }}>{(e.riskScore * 100).toFixed(0)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase' }}>Evidence Coverage</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Execution Traces', ok: summary.coverage.tracesAvailable },
            { label: 'State Diffs', ok: summary.coverage.stateDiffsAvailable },
            { label: `${summary.coverage.decodedABIs} ABIs Decoded`, ok: summary.coverage.decodedABIs > 0 },
          ].map(({ label, ok }) => (
            <div key={label} style={{ padding: '8px 12px', border: `1px solid ${ok ? '#22c55e35' : '#47556935'}`, borderRadius: 4, color: ok ? '#86efac' : '#475569', fontSize: 11 }}>
              {ok ? '✓' : '✗'} {label}
            </div>
          ))}
        </div>
      </div>
      <div style={{ borderTop: '1px solid #1e293b', paddingTop: 14 }}>
        <div style={{ fontSize: 9, color: '#334155', textAlign: 'center', letterSpacing: 1 }}>
          GENERATED BY EVM FORENSICS AGENT &nbsp;|&nbsp; EVIDENCE-FIRST · DETERMINISTIC · REPRODUCIBLE &nbsp;|&nbsp; {new Date().toISOString()}
        </div>
      </div>
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
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Load run list
  useEffect(() => {
    api.listRuns().then(r => {
      setRuns(r)
      if (r.length > 0) setSelectedRun(r[0])
    }).catch(() => {})
  }, [])

  // Try to load AI executive summary for selected run
  useEffect(() => {
    if (!selectedRun) return
    setAiSummary(null)
    setAiLoading(true)
    fetch(`http://localhost:3001/api/forensics/${selectedRun}/ai`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: any) => setAiSummary(d?.summary ?? d?.executive_summary ?? null))
      .catch(() => setAiSummary(null))
      .finally(() => setAiLoading(false))
  }, [selectedRun])

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
    if (!summary || !printRef.current) return
    setGenerating(true)
    try {
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `forensic-report-${summary.runId.slice(0, 12)}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0a0a0a' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      }
      await html2pdf().set(opt).from(printRef.current).save()
      setExportDone(true)
      setTimeout(() => setExportDone(false), 4000)
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setGenerating(false)
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

            {/* AI Executive Summary */}
            <motion.div variants={fadeInUp}
              className="rounded-lg p-5"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(168,85,247,0.2)', backdropFilter: 'blur(8px)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap size={13} className="text-purple-400" />
                <h3 className="text-xs font-mono font-semibold text-text-primary uppercase tracking-wider">AI Executive Summary</h3>
                <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded border border-purple-500/30 text-purple-400 bg-purple-500/10">Ollama</span>
              </div>
              {aiLoading ? (
                <div className="space-y-2">
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-4/5 rounded" />
                  <div className="skeleton h-3 w-3/4 rounded" />
                </div>
              ) : aiSummary ? (
                <p className="text-xs text-text-secondary leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>{aiSummary}</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-mono text-text-muted">AI narrative requires Ollama running locally.</p>
                  <div className="rounded p-3 text-[10px] font-mono text-text-dim space-y-1" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)' }}>
                    <p className="text-purple-400 font-semibold mb-2">Quick Setup:</p>
                    <p>1. Install Ollama → <span className="text-text-secondary">ollama.ai</span></p>
                    <p>2. <span className="text-gold-400">ollama serve</span></p>
                    <p>3. <span className="text-gold-400">ollama pull phi3:mini</span></p>
                    <p>4. <span className="text-gold-400">npm run ai:analyze</span></p>
                  </div>
                </div>
              )}
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
              <p className="text-xs font-mono text-text-muted mb-3">
                Generates an evidence-linked PDF audit report from{' '}
                <code className="text-gold-400">run_{selectedRun.slice(0, 12)}…</code>
              </p>
              <ul style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 16, listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {['Executive summary & threat level', 'Signal detection table', 'High-risk entity table', 'Evidence coverage checklist'].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#d4af37' }}>›</span> {item}
                  </li>
                ))}
              </ul>
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

        {exportDone && summary && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ margin: '12px 0 0', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ✓ forensic-report-{summary.runId.slice(0, 12)}.pdf downloaded
          </motion.p>
        )}
      </div>

      {/* Hidden print template — captured by html2pdf.js */}
      <div
        ref={printRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '794px',
          background: '#0a0a0a',
          color: '#f1f5f9',
          padding: '40px',
          fontFamily: 'monospace',
        }}
      >
        {summary && <PrintTemplate summary={summary} />}
      </div>
    </Layout>
  )
}

