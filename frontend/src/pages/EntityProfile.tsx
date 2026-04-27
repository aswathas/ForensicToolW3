import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Shield, Activity, Clock,
  Zap, ChevronRight, TrendingUp,
} from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { fadeInUp, staggerContainer } from '../components/animations/variants'
import api from '../utils/api'
import type { Entity, Signal } from '../types/forensics'

// ── Helpers ────────────────────────────────────────────────────────────────

function RiskGauge({ score }: { score: number }) {
  const pct = score * 100
  const color = score >= 0.8 ? '#dc143c' : score >= 0.5 ? '#d4af37' : '#22c55e'
  const label = score >= 0.8 ? 'CRITICAL' : score >= 0.5 ? 'HIGH' : 'LOW'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 40}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - score) }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-mono font-black" style={{ color }}>{pct.toFixed(0)}</span>
          <span className="text-[8px] font-mono text-text-muted">RISK</span>
        </div>
      </div>
      <span className="text-[10px] font-mono font-bold tracking-widest" style={{ color }}>{label}</span>
    </div>
  )
}

function DataRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest shrink-0 w-28">{label}</span>
      <span className="text-xs font-mono text-right break-all" style={{ color: accent ?? '#94a3b8' }}>{value}</span>
    </div>
  )
}

// ── Fallback static entity (shown when no URL param / no run data) ──────────

const STATIC_ENTITY: Entity = {
  address: '0x1234567890123456789012345678901234567890',
  type: 'contract',
  role: 'attacker',
  riskScore: 0.95,
  transactionCount: 42,
  firstSeen: Date.now() - 86400000,
  lastSeen: Date.now(),
}

const STATIC_SIGNALS: Signal[] = [
  {
    id: 'RE-01', name: 'Same-Function Reentrancy', category: 'reentrancy',
    severity: 'critical', confidence: 0.97,
    description: 'Multiple calls to same function in same tx',
    sourceDataPath: 'derived/traces', recordIds: [], affectedTransactions: [],
    falsePositiveProbability: 0.02,
  },
  {
    id: 'FL-01', name: 'Borrow-Repay Same TX', category: 'flashloan',
    severity: 'high', confidence: 0.91,
    description: 'Flash loan borrow and full repayment in single tx',
    sourceDataPath: 'derived/traces', recordIds: [], affectedTransactions: [],
    falsePositiveProbability: 0.05,
  },
]

// ── Page ───────────────────────────────────────────────────────────────────

export const EntityProfile: React.FC = () => {
  const [searchParams] = useSearchParams()
  const addressParam = searchParams.get('address')
  const runId = searchParams.get('runId')

  const [entity, setEntity] = useState<Entity>(STATIC_ENTITY)
  const [signals, setSignals] = useState<Signal[]>(STATIC_SIGNALS)
  const [loading, setLoading] = useState(false)

  // Attempt to load real entity data if params provided
  useEffect(() => {
    if (!runId || !addressParam) return
    setLoading(true)
    api.getForensicRun(runId).then((raw: any) => {
      const entities: Entity[] = Array.isArray(raw?.entities) ? raw.entities : []
      const found = entities.find(e => e.address.toLowerCase() === addressParam.toLowerCase())
      if (found) setEntity(found)

      const allSignals: Signal[] = Array.isArray(raw?.signals) ? raw.signals : []
      const related = allSignals.filter(s =>
        s.affectedTransactions?.length > 0 ||
        s.recordIds?.includes(addressParam.toLowerCase())
      )
      if (related.length > 0) setSignals(related)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [runId, addressParam])

  const roleColor =
    entity.role === 'attacker'     ? '#dc143c' :
    entity.role === 'victim'       ? '#d4af37' :
    entity.role === 'intermediary' ? '#38bdf8' :
    entity.role === 'sink'         ? '#a78bfa' : '#94a3b8'

  const signalsBySev = {
    critical: signals.filter(s => s.severity === 'critical').length,
    high:     signals.filter(s => s.severity === 'high').length,
    medium:   signals.filter(s => s.severity === 'medium').length,
    low:      signals.filter(s => s.severity === 'low').length,
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl">

        {/* ── Header ── */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="mb-8">
          <motion.div variants={fadeInUp}>
            <h1
              className="text-4xl text-text-primary leading-none mb-1"
              style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.08em' }}
            >
              ENTITY{' '}
              <span style={{ color: '#dc143c', filter: 'drop-shadow(0 0 12px rgba(220,20,60,0.5))' }}>
                PROFILE
              </span>
            </h1>
            <p className="text-text-muted text-xs font-mono">
              // address intelligence · risk scoring · signal associations
            </p>
          </motion.div>
        </motion.div>

        {loading && (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="skeleton h-32 rounded-lg" />)}
          </div>
        )}

        {!loading && (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">

            {/* ── Identity card ── */}
            <motion.div
              variants={fadeInUp}
              className="relative overflow-hidden rounded-lg p-6"
              style={{
                background: 'rgba(0,0,0,0.40)',
                border: `1px solid ${roleColor}30`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderLeft: `3px solid ${roleColor}`,
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                style={{ background: `linear-gradient(to right, ${roleColor}50, transparent)` }} />

              <div className="flex items-start gap-8">
                <RiskGauge score={entity.riskScore} />

                <div className="flex-1 min-w-0">
                  {/* Address */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Shield size={14} style={{ color: roleColor }} />
                    <code
                      className="font-mono text-sm break-all"
                      style={{ color: '#f1f5f9' }}
                    >
                      {entity.address}
                    </code>
                    {entity.role && (
                      <span
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider"
                        style={{
                          color: roleColor,
                          borderColor: `${roleColor}50`,
                          background: `${roleColor}12`,
                        }}
                      >
                        {entity.role}
                      </span>
                    )}
                  </div>

                  {/* Meta grid */}
                  <div className="space-y-0">
                    <DataRow label="Type"      value={entity.type === 'contract' ? 'Smart Contract' : 'Externally Owned Account'} />
                    <DataRow label="TX Count"  value={entity.transactionCount.toString()} accent="#38bdf8" />
                    <DataRow label="First Seen" value={new Date(entity.firstSeen).toLocaleString()} />
                    <DataRow label="Last Seen"  value={new Date(entity.lastSeen).toLocaleString()} />
                    {entity.balance && (
                      <DataRow label="Balance"  value={entity.balance} accent="#d4af37" />
                    )}
                    {entity.label && (
                      <DataRow label="Label"    value={entity.label} accent="#a78bfa" />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Signal stats row ── */}
            <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Critical',  value: signalsBySev.critical, color: '#dc143c', glow: 'rgba(220,20,60,0.25)' },
                { label: 'High',      value: signalsBySev.high,     color: '#d4af37', glow: 'rgba(212,175,55,0.25)' },
                { label: 'Medium',    value: signalsBySev.medium,   color: '#f97316', glow: 'rgba(249,115,22,0.25)' },
                { label: 'Low',       value: signalsBySev.low,      color: '#22c55e', glow: 'rgba(34,197,94,0.25)' },
              ].map(({ label, value, color, glow }) => (
                <motion.div
                  key={label}
                  className="rounded-lg p-4"
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
                  whileHover={{ boxShadow: `0 0 20px ${glow}` }}
                >
                  <div className="text-2xl font-mono font-black mb-0.5" style={{ color, fontFamily: "'Bebas Neue', monospace" }}>
                    {value}
                  </div>
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-widest">{label} signals</div>
                </motion.div>
              ))}
            </motion.div>

            {/* ── Signals table ── */}
            <motion.div
              variants={fadeInUp}
              className="rounded-lg p-5"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
            >
              <div className="flex items-center gap-2 mb-5">
                <Zap size={13} className="text-ferrari-500" />
                <h3
                  className="text-sm text-text-primary"
                  style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.08em' }}
                >
                  ASSOCIATED SIGNALS ({signals.length})
                </h3>
              </div>

              {signals.length === 0 ? (
                <p className="text-xs font-mono text-text-muted">No signals associated with this entity.</p>
              ) : (
                <div className="space-y-2">
                  {signals.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0 group"
                    >
                      <span className={
                        s.severity === 'critical' ? 'badge-critical' :
                        s.severity === 'high'     ? 'badge-high' :
                        s.severity === 'medium'   ? 'badge-medium' : 'badge-low'
                      }>
                        {s.severity.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-text-primary font-mono">{s.name}</span>
                          <ChevronRight size={11} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[10px] font-mono text-text-muted">{s.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-gold-400">
                          {(s.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-[9px] font-mono text-text-muted">conf.</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* ── Activity summary ── */}
            <motion.div
              variants={fadeInUp}
              className="rounded-lg p-5"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity size={13} className="text-sky-400" />
                <h3
                  className="text-sm text-text-primary"
                  style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.08em' }}
                >
                  ACTIVITY TIMELINE
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center py-3 rounded"
                  style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)' }}>
                  <div className="text-3xl font-mono font-black text-sky-400 mb-1"
                    style={{ fontFamily: "'Bebas Neue', monospace" }}>
                    {entity.transactionCount}
                  </div>
                  <div className="text-[9px] font-mono text-text-muted uppercase tracking-widest">transactions</div>
                </div>
                <div className="flex flex-col justify-center px-3">
                  <div className="flex items-center gap-2 mb-2 text-xs font-mono text-text-muted">
                    <Clock size={10} />
                    <span>First seen</span>
                  </div>
                  <span className="text-xs font-mono text-text-secondary">
                    {new Date(entity.firstSeen).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col justify-center px-3">
                  <div className="flex items-center gap-2 mb-2 text-xs font-mono text-text-muted">
                    <TrendingUp size={10} />
                    <span>Last seen</span>
                  </div>
                  <span className="text-xs font-mono text-text-secondary">
                    {new Date(entity.lastSeen).toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>

          </motion.div>
        )}
      </div>
    </Layout>
  )
}
