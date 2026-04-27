import React, { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, Activity, Shield, Zap, TrendingUp,
  ChevronDown, X, CheckCircle2, EyeOff, Clock, FileText, Lightbulb,
} from 'lucide-react'
import { EtherealShadow } from '../components/ui/etheral-shadow'
import { FundFlowGraph } from '../components/Investigation/FundFlowGraph'
import { CopilotPanel } from '../components/Copilot/CopilotPanel'
import { useForensicData } from '../hooks/useForensicData'
import type { Transaction, Signal, Entity } from '../types/forensics'

// ── constants ─────────────────────────────────────────────────────────────────

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

const SEV_COLOR: Record<string, string> = {
  critical: '#cc1a2e',
  high:     '#d4af37',
  medium:   '#f97316',
  low:      '#22c55e',
}

const ROLE_COLOR: Record<string, string> = {
  attacker:     '#cc1a2e',
  victim:       '#d4af37',
  intermediary: '#38bdf8',
  sink:         '#a855f7',
}

function humanizeSignal(name: string): string {
  const MAP: Record<string, string> = {
    REENTRANCY_SAME_FUNC: 'Repeated Withdrawal Exploit',
    REENTRANCY_CROSS_FUNC: 'Cross-Function Fund Drain',
    REENTRANCY_CALLBACK: 'Callback Before Balance Update',
    REENTRANCY_DELEGATECALL: 'Delegated Call Exploit',
    REENTRANCY_MULTI_WITHDRAW: 'Multiple Withdrawal Attack',
    APPROVAL_UNLIMITED: 'Unlimited Token Permission Granted',
    APPROVAL_DRAIN: 'Approved Funds Drained',
    APPROVAL_BURST: 'Rapid Approval Drain Burst',
    APPROVAL_SPENDER: 'Suspicious Spender Role',
    FLASHLOAN_BORROW_REPAY: 'Flash Loan in Single Transaction',
    FLASHLOAN_MULTI_POOL: 'Multi-Pool Flash Loan',
    FLASHLOAN_PRICE_IMPACT: 'Flash Loan Price Impact',
    FLASHLOAN_EXTRACTION: 'Flash Loan Fund Extraction',
    ORACLE_DEVIATION: 'Price Oracle Manipulation',
    ORACLE_SPOT_SPIKE: 'Spot Price Spike',
    ORACLE_SANDWICH: 'Sandwich Attack via Oracle',
    ORACLE_ARBITRAGE: 'Oracle-Enabled Arbitrage',
    ADMIN_PROXY_CHANGE: 'Contract Logic Replaced',
    ADMIN_ROLE_CHANGE: 'Admin Privileges Changed',
    ADMIN_SEQUENCE: 'Suspicious Admin Sequence',
    ADMIN_UPGRADE_OUTFLOW: 'Upgrade Followed by Fund Drain',
    FUNDFLOW_VICTIM_OUTFLOW: 'Large Victim Fund Outflow',
    FUNDFLOW_NEW_RECEIVER: 'New Wallet Received Large Inflow',
    FUNDFLOW_PEEL_CHAIN: 'Layered Fund Laundering',
    FUNDFLOW_CONSOLIDATION: 'Fund Consolidation Pattern',
    FUNDFLOW_RISKY_HOP: 'Hop to Risky Destination',
    FUNDFLOW_DIVERSIFICATION: 'Asset Diversification After Attack',
  }
  const upper = name.toUpperCase()
  for (const [key, val] of Object.entries(MAP)) {
    if (upper.includes(key)) return val
  }
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const SIGNAL_EXPLANATIONS: Record<string, string> = {
  reentrancy: 'This attack exploited a vulnerability where a contract could be called repeatedly before it updated its balance records — like withdrawing money twice before the bank registers the first withdrawal.',
  approval: 'A wallet granted unlimited spending permission to a contract that exploited this to drain the entire token balance without further approval.',
  flashloan: 'A flash loan attack borrows a huge sum, uses it to manipulate markets or extract value, then repays everything in the same block — the protocol never sees the funds missing.',
  oracle: 'The price data that smart contracts rely on was manipulated, causing them to buy or sell at wrong prices — creating profit for the attacker at the expense of the protocol.',
  admin: 'The contract\'s core logic or ownership controls were changed by an unauthorized actor, allowing silent redirection of funds.',
  fundflow: 'Suspicious patterns detected in how funds moved between wallets — consistent with known money laundering, extraction, or layering techniques.',
}

// ── helpers ───────────────────────────────────────────────────────────────────

function truncAddr(addr: string, n = 8): string {
  if (!addr) return '—'
  return `${addr.slice(0, n + 2)}…${addr.slice(-4)}`
}

function truncHash(hash: string): string {
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`
}

// ── styles ────────────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
  background: 'rgba(2, 3, 8, 0.82)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.07)',
}

const divider: React.CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.05)',
}

// ── accordion section ─────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.FC<{ size?: number; className?: string }>
  title: string
  count?: number
  accent?: string
  defaultOpen?: boolean
  badge?: React.ReactNode
  children: React.ReactNode
}

const Section: React.FC<SectionProps> = ({
  icon: Icon,
  title,
  count,
  accent = 'rgba(255,255,255,0.4)',
  defaultOpen = false,
  badge,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ ...panel, borderRadius: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 transition-colors duration-150"
        style={{
          padding: '18px 28px',
          background: open ? 'rgba(255,255,255,0.02)' : 'transparent',
          borderBottom: open ? '1px solid rgba(255,255,255,0.05)' : 'none',
        }}
      >
        <span style={{ color: accent, flexShrink: 0, display: 'flex' }}><Icon size={13} /></span>

        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
            fontWeight: 600,
          }}
        >
          {title}
        </span>

        {count !== undefined && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'rgba(255,255,255,0.22)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '1px 7px',
              borderRadius: 4,
            }}
          >
            {count}
          </span>
        )}

        {badge && <span className="ml-1">{badge}</span>}

        <div className="flex-1" />

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── severity indicator ────────────────────────────────────────────────────────

const SevPip: React.FC<{ sev: string }> = ({ sev }) => (
  <span
    style={{
      display: 'inline-block',
      width: 6,
      height: 6,
      borderRadius: '50%',
      flexShrink: 0,
      background: SEV_COLOR[sev] ?? '#22c55e',
      boxShadow: `0 0 6px ${SEV_COLOR[sev] ?? '#22c55e'}90`,
    }}
  />
)

const SevTag: React.FC<{ sev: string }> = ({ sev }) => (
  <span
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: SEV_COLOR[sev] ?? '#22c55e',
      border: `1px solid ${SEV_COLOR[sev] ?? '#22c55e'}35`,
      background: `${SEV_COLOR[sev] ?? '#22c55e'}12`,
      padding: '2px 7px',
      borderRadius: 4,
      flexShrink: 0,
    }}
  >
    {sev}
  </span>
)

// ── narrative banner ──────────────────────────────────────────────────────────

const NarrativeBanner: React.FC<{
  narrative: string
  threatColor: string
}> = ({ narrative, threatColor }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    style={{
      ...panel,
      borderRadius: 10,
      padding: '20px 28px',
      borderLeft: `3px solid ${threatColor}`,
      marginBottom: 0,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <FileText size={14} style={{ color: threatColor, flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
          marginBottom: 8,
        }}>
          Analyst Summary
        </div>
        <p style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.75,
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {narrative}
        </p>
      </div>
    </div>
  </motion.div>
)

// ── risk overview cards ───────────────────────────────────────────────────────

interface RiskOverviewCardsProps {
  threat: string
  threatColor: string
  anomalyCount: number
  signalCount: number
  topEntity: { address: string; role?: string; riskScore: number } | undefined
}

const RiskOverviewCards: React.FC<RiskOverviewCardsProps> = ({
  threat, threatColor, anomalyCount, signalCount, topEntity,
}) => {
  const topEntityColor = topEntity && topEntity.riskScore >= 0.8 ? '#cc1a2e' : '#d4af37'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {/* Threat Level */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        style={{ ...panel, borderRadius: 10, padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>Threat Level</span>
        <span style={{
          fontFamily: "'Bebas Neue', monospace",
          fontSize: 28,
          letterSpacing: '0.08em',
          color: threatColor,
          boxShadow: `0 0 20px ${threatColor}30`,
          padding: '4px 10px',
          background: `${threatColor}12`,
          border: `1px solid ${threatColor}40`,
          borderRadius: 6,
          display: 'inline-block',
          lineHeight: 1.2,
        }}>
          {threat}
        </span>
      </motion.div>

      {/* Anomalous Txs */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08 }}
        style={{ ...panel, borderRadius: 10, padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>Anomalous Transactions</span>
        <span style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 40, color: '#cc1a2e', lineHeight: 1 }}>{anomalyCount}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>transactions flagged</span>
      </motion.div>

      {/* Signals */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.11 }}
        style={{ ...panel, borderRadius: 10, padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>Signals Fired</span>
        <span style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 40, color: '#d4af37', lineHeight: 1 }}>{signalCount}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.22)' }}>detection rules triggered</span>
      </motion.div>

      {/* Top Entity */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.14 }}
        style={{ ...panel, borderRadius: 10, padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>Highest Risk Entity</span>
        {topEntity ? (
          <>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: topEntityColor, border: `1px solid ${topEntityColor}40`, background: `${topEntityColor}12`, padding: '2px 7px', borderRadius: 4, display: 'inline-block', width: 'fit-content' }}>
              {topEntity.role ?? 'unknown'}
            </span>
            <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              {topEntity.address.slice(0, 8)}…{topEntity.address.slice(-6)}
            </code>
          </>
        ) : (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>—</span>
        )}
      </motion.div>
    </div>
  )
}

// ── signal rows ───────────────────────────────────────────────────────────────

interface SignalDetailState {
  type: 'signal'
  data: Signal
}
interface TxDetailState {
  type: 'tx'
  data: Transaction
}
type DetailState = SignalDetailState | TxDetailState | null

const SignalList: React.FC<{
  signals: Signal[]
  onSelect: (s: Signal) => void
  activeId?: string
}> = ({ signals, onSelect, activeId }) => (
  <div style={{ padding: '8px 0' }}>
    {/* table header */}
    <div
      className="flex items-center gap-4"
      style={{
        padding: '6px 28px 10px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.2)',
      }}
    >
      <span style={{ width: 6 }} />
      <span style={{ flex: 1 }}>Signal Name</span>
      <span style={{ width: 80, textAlign: 'right' }}>Category</span>
      <span style={{ width: 72, textAlign: 'right' }}>Confidence</span>
      <span style={{ width: 48, textAlign: 'right' }}>Txs</span>
    </div>

    {signals.map((s, i) => {
      const active = activeId === s.id
      return (
        <motion.button
          key={s.id}
          onClick={() => onSelect(s)}
          className="w-full flex items-center gap-4 text-left transition-colors duration-100"
          style={{
            padding: '13px 28px',
            background: active ? `${SEV_COLOR[s.severity]}0d` : 'transparent',
            borderLeft: `2px solid ${active ? SEV_COLOR[s.severity] : 'transparent'}`,
            borderBottom: i < signals.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
          }}
          whileHover={{ background: 'rgba(255,255,255,0.02)' }}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.025 }}
        >
          <SevPip sev={s.severity} />
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <SevTag sev={s.severity} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.65)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: active ? 600 : 400,
              }}>
                {humanizeSignal(s.name)}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'rgba(255,255,255,0.2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: 2,
              }}>
                {s.name}
              </div>
            </div>
          </div>
          <span
            style={{
              width: 80,
              textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'rgba(255,255,255,0.28)',
              letterSpacing: '0.06em',
            }}
          >
            {s.category}
          </span>
          <span
            style={{
              width: 72,
              textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: SEV_COLOR[s.severity],
              fontWeight: 700,
            }}
          >
            {(s.confidence * 100).toFixed(0)}%
          </span>
          <span
            style={{
              width: 48,
              textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            {s.affectedTransactions.length}
          </span>
        </motion.button>
      )
    })}
  </div>
)

// ── transaction rows ──────────────────────────────────────────────────────────

const TxList: React.FC<{
  txs: Transaction[]
  onSelect: (t: Transaction) => void
  activeTx?: string
}> = ({ txs, onSelect, activeTx }) => (
  <div style={{ padding: '8px 0' }}>
    <div
      className="flex items-center gap-4"
      style={{
        padding: '6px 28px 10px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.2)',
      }}
    >
      <span style={{ width: 8 }} />
      <span style={{ flex: 1 }}>Hash</span>
      <span style={{ flex: 1 }}>From → To</span>
      <span style={{ width: 70, textAlign: 'right' }}>Block</span>
      <span style={{ width: 70, textAlign: 'right' }}>Anomaly</span>
      <span style={{ width: 60, textAlign: 'right' }}>Status</span>
    </div>

    {txs.map((tx, i) => {
      const active = activeTx === tx.hash
      return (
        <motion.button
          key={tx.hash}
          onClick={() => onSelect(tx)}
          className="w-full flex items-center gap-4 text-left transition-colors duration-100"
          style={{
            padding: '13px 28px',
            background: active ? 'rgba(56,189,248,0.05)' : 'transparent',
            borderLeft: `2px solid ${active ? '#38bdf8' : tx.isAnomaly ? '#cc1a2e40' : 'transparent'}`,
            borderBottom: i < txs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
          }}
          whileHover={{ background: 'rgba(255,255,255,0.02)' }}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.018 }}
        >
          {/* anomaly dot */}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: tx.isAnomaly ? '#cc1a2e' : 'rgba(255,255,255,0.1)',
              boxShadow: tx.isAnomaly ? '0 0 6px #cc1a2e80' : 'none',
              flexShrink: 0,
            }}
          />
          {/* hash */}
          <code
            style={{
              flex: 1,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: tx.isAnomaly ? '#ff5566' : 'rgba(255,255,255,0.5)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {truncHash(tx.hash)}
          </code>
          {/* from → to */}
          <div
            style={{
              flex: 1,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'rgba(255,255,255,0.3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {truncAddr(tx.from, 6)}
            <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.15)' }}>→</span>
            {truncAddr(tx.to, 6)}
          </div>
          {/* block */}
          <span
            style={{
              width: 70,
              textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'rgba(255,255,255,0.25)',
            }}
          >
            #{tx.blockNumber}
          </span>
          {/* anomaly score */}
          <span
            style={{
              width: 70,
              textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              color: tx.anomalyScore > 0.7 ? '#cc1a2e' : tx.anomalyScore > 0 ? '#d4af37' : 'rgba(255,255,255,0.2)',
            }}
          >
            {tx.anomalyScore > 0 ? `${(tx.anomalyScore * 100).toFixed(0)}%` : '—'}
          </span>
          {/* status */}
          <span
            style={{
              width: 60,
              textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.08em',
              color: tx.status === 'success' ? '#22c55e' : '#cc1a2e',
              textTransform: 'uppercase',
            }}
          >
            {tx.status}
          </span>
        </motion.button>
      )
    })}
  </div>
)

// ── entity rows ───────────────────────────────────────────────────────────────

const EntityList: React.FC<{ entities: Entity[] }> = ({ entities }) => (
  <div style={{ padding: '8px 0' }}>
    <div
      className="flex items-center gap-4"
      style={{
        padding: '6px 28px 10px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.2)',
      }}
    >
      <span style={{ width: 72 }}>Role</span>
      <span style={{ flex: 1 }}>Address</span>
      <span style={{ width: 120, textAlign: 'center' }}>Risk</span>
      <span style={{ width: 48, textAlign: 'right' }}>Score</span>
      <span style={{ width: 48, textAlign: 'right' }}>Txs</span>
      <span style={{ width: 52, textAlign: 'right' }}>Type</span>
    </div>

    {entities.map((e, i) => {
      const pct = e.riskScore * 100
      const color =
        e.riskScore >= 0.8 ? '#cc1a2e' :
        e.riskScore >= 0.6 ? '#d4af37' :
        e.riskScore >= 0.4 ? '#f97316' :
        '#22c55e'

      return (
        <motion.div
          key={e.address}
          className="flex items-center gap-4"
          style={{
            padding: '13px 28px',
            borderBottom: i < entities.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
          }}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          <span
            style={{
              width: 72,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: ROLE_COLOR[e.role ?? ''] ?? 'rgba(255,255,255,0.3)',
              border: `1px solid ${ROLE_COLOR[e.role ?? ''] ?? 'rgba(255,255,255,0.1)'}40`,
              background: `${ROLE_COLOR[e.role ?? ''] ?? 'rgba(255,255,255,0.05)'}12`,
              padding: '2px 7px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {e.role ?? 'unknown'}
          </span>
          <code
            style={{
              flex: 1,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'rgba(255,255,255,0.55)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {truncAddr(e.address, 12)}
          </code>
          {/* risk bar */}
          <div
            style={{
              width: 120,
              height: 2,
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <motion.div
              style={{ height: '100%', background: color, borderRadius: 2 }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.04, ease: 'easeOut' }}
            />
          </div>
          <span
            style={{
              width: 48,
              textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              color,
            }}
          >
            {pct.toFixed(0)}%
          </span>
          <span
            style={{
              width: 48,
              textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'rgba(255,255,255,0.28)',
            }}
          >
            {e.transactionCount}
          </span>
          <span
            style={{
              width: 52,
              textAlign: 'right',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.22)',
            }}
          >
            {e.type}
          </span>
        </motion.div>
      )
    })}
  </div>
)

// ── attack timeline ────────────────────────────────────────────────────────────

interface TimelineEvent {
  block: number
  tx: Transaction
  signals: Signal[]
}

function buildTimeline(txs: Transaction[], signals: Signal[]): TimelineEvent[] {
  const sigsByTx = new Map<string, Signal[]>()
  for (const s of signals) {
    for (const hash of s.affectedTransactions) {
      if (!sigsByTx.has(hash)) sigsByTx.set(hash, [])
      sigsByTx.get(hash)!.push(s)
    }
  }
  return txs
    .filter(t => t.isAnomaly || sigsByTx.has(t.hash))
    .sort((a, b) => a.blockNumber - b.blockNumber)
    .map(tx => ({
      block: tx.blockNumber,
      tx,
      signals: (sigsByTx.get(tx.hash) ?? []).sort(
        (a, b) => (SEV_ORDER[a.severity] ?? 4) - (SEV_ORDER[b.severity] ?? 4)
      ),
    }))
}

const AttackTimeline: React.FC<{
  events: TimelineEvent[]
  activeHash?: string
  onSelect: (tx: Transaction) => void
}> = ({ events, activeHash, onSelect }) => {
  if (events.length === 0) {
    return (
      <div style={{ padding: '24px 28px' }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
          No suspicious events detected
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 28px 24px' }}>
      <div
        className="flex items-start gap-0 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {events.map((ev, i) => {
          const isActive = activeHash === ev.tx.hash
          const topSev = ev.signals[0]?.severity ?? 'low'
          const color = SEV_COLOR[topSev]

          return (
            <div key={ev.tx.hash} className="flex items-center">
              <button
                onClick={() => onSelect(ev.tx)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: isActive ? `${color}12` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? color + '45' : 'rgba(255,255,255,0.07)'}`,
                  minWidth: 140,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    letterSpacing: '0.12em',
                    color: isActive ? color : 'rgba(255,255,255,0.25)',
                    textTransform: 'uppercase',
                  }}
                >
                  block {ev.block}
                </span>
                <code
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {truncHash(ev.tx.hash)}
                </code>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {ev.signals.slice(0, 2).map((s, si) => (
                    <span
                      key={si}
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 8,
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: `${SEV_COLOR[s.severity]}15`,
                        color: SEV_COLOR[s.severity],
                        border: `1px solid ${SEV_COLOR[s.severity]}30`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {s.category}
                    </span>
                  ))}
                  {ev.signals.length > 2 && (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 8,
                        color: 'rgba(255,255,255,0.2)',
                      }}
                    >
                      +{ev.signals.length - 2}
                    </span>
                  )}
                </div>
              </button>

              {i < events.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', flexShrink: 0 }}>
                  <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── detail overlay ────────────────────────────────────────────────────────────

const DetailOverlay: React.FC<{
  detail: DetailState
  allSignals: Signal[]
  onClose: () => void
}> = ({ detail, allSignals, onClose }) => {
  if (!detail) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      style={{
        ...panel,
        borderRadius: 10,
        padding: '24px 28px',
        position: 'relative',
      }}
    >
      <div className="flex items-start justify-between mb-5">
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          {detail.type === 'tx' ? 'Transaction Detail' : 'Signal Detail'}
        </span>
        <button
          onClick={onClose}
          style={{ color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}
          className="hover:text-white/60 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {detail.type === 'tx' && (() => {
        const tx = detail.data
        const related = allSignals.filter(s => s.affectedTransactions.includes(tx.hash))
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { l: 'Hash',   v: tx.hash },
              { l: 'From',   v: tx.from },
              { l: 'To',     v: tx.to },
              { l: 'Block',  v: String(tx.blockNumber) },
              { l: 'Value',  v: `${tx.value} wei` },
              { l: 'Gas',    v: String(tx.gasUsed) },
              { l: 'Status', v: tx.status },
            ].map(({ l, v }) => (
              <div key={l} className="flex gap-4">
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.22)',
                    width: 48,
                    flexShrink: 0,
                    paddingTop: 1,
                  }}
                >
                  {l}
                </span>
                <code
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.6)',
                    wordBreak: 'break-all',
                    lineHeight: 1.6,
                  }}
                >
                  {v}
                </code>
              </div>
            ))}

            {related.length > 0 && (
              <div style={{ marginTop: 8, ...divider, paddingTop: 16 }}>
                <p
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.2)',
                    marginBottom: 10,
                  }}
                >
                  Firing Signals
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {related.map(s => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: `${SEV_COLOR[s.severity]}0c`,
                        border: `1px solid ${SEV_COLOR[s.severity]}25`,
                      }}
                    >
                      <SevPip sev={s.severity} />
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.65)',
                        }}
                      >
                        {s.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {detail.type === 'signal' && (() => {
        const s = detail.data
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="flex items-center gap-3 mb-2">
              <SevPip sev={s.severity} />
              <SevTag sev={s.severity} />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                {s.name}
              </span>
            </div>
            {/* Plain-English explanation */}
            {(() => {
              const explanation = Object.entries(SIGNAL_EXPLANATIONS).find(
                ([key]) => s.category?.toLowerCase().includes(key)
              )?.[1]
              if (!explanation) return null
              return (
                <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 8, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.22)', marginBottom: 8 }}>
                  <Lightbulb size={13} style={{ color: '#d4af37', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.6)', marginBottom: 5 }}>What this means</div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                      {explanation}
                    </p>
                  </div>
                </div>
              )
            })()}
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: 'rgba(255,255,255,0.42)',
                lineHeight: 1.7,
              }}
            >
              {s.description}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
              {[
                { l: 'Category',    v: s.category },
                { l: 'Confidence',  v: `${(s.confidence * 100).toFixed(0)}%` },
                { l: 'FP Risk',     v: `${(s.falsePositiveProbability * 100).toFixed(0)}%` },
                { l: 'Affected Txs', v: String(s.affectedTransactions.length) },
              ].map(({ l, v }) => (
                <div key={l}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
                    {l}
                  </span>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                    {v}
                  </p>
                </div>
              ))}
            </div>
            {s.sourceDataPath && (
              <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                {s.sourceDataPath}
              </code>
            )}
          </div>
        )
      })()}
    </motion.div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export const Investigation: React.FC = () => {
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()
  const { data, loading, error } = useForensicData(runId || null)

  const [detail, setDetail] = useState<DetailState>(null)
  const [txFilter, setTxFilter] = useState<'anomaly' | 'all'>('anomaly')
  const [sigFilter, setSigFilter] = useState<'all' | 'critical' | 'high'>('all')
  const [techOpen, setTechOpen] = useState(false)

  const openSignal = useCallback((s: Signal) => {
    setDetail(prev => prev?.type === 'signal' && prev.data.id === s.id ? null : { type: 'signal', data: s })
  }, [])

  const openTx = useCallback((tx: Transaction) => {
    setDetail(prev => prev?.type === 'tx' && prev.data.hash === tx.hash ? null : { type: 'tx', data: tx })
  }, [])

  // ── loading ──
  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: '#010208', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
          <EtherealShadow
            color="rgba(130, 12, 28, 0.9)"
            animation={{ scale: 80, speed: 60 }}
            noise={{ opacity: 0.4, scale: 1 }}
          />
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 28, height: 28, border: '1.5px solid rgba(204,26,46,0.4)', borderTopColor: '#cc1a2e', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
            Loading forensic data
          </span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── error ──
  if (error || !data) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: '#010208', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
          <EtherealShadow color="rgba(130, 12, 28, 0.9)" animation={{ scale: 80, speed: 60 }} noise={{ opacity: 0.4, scale: 1 }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={22} style={{ color: '#cc1a2e' }} />
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'rgba(204,26,46,0.8)' }}>
            {error || 'Failed to load forensic data'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginTop: 8 }}
            className="hover:text-white/60 transition-colors"
          >
            <ArrowLeft size={11} />
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── derived ──
  const anomalyTxs = data.transactions.filter(t => t.isAnomaly)
  const filteredTxs = txFilter === 'anomaly' ? anomalyTxs : data.transactions

  const filteredSignals = data.signals
    .filter(s => {
      if (sigFilter === 'critical') return s.severity === 'critical'
      if (sigFilter === 'high') return ['critical', 'high'].includes(s.severity)
      return true
    })
    .sort((a, b) => (SEV_ORDER[a.severity] ?? 4) - (SEV_ORDER[b.severity] ?? 4))

  const highRiskEntities = data.entities
    .filter(e => e.riskScore >= 0.5)
    .sort((a, b) => b.riskScore - a.riskScore)

  const critCount = data.signals.filter(s => s.severity === 'critical').length
  const highCount = data.signals.filter(s => s.severity === 'high').length
  const threat = critCount > 0 ? 'CRITICAL' : highCount > 0 ? 'HIGH' : 'LOW'
  const threatColor = threat === 'CRITICAL' ? '#cc1a2e' : threat === 'HIGH' ? '#d4af37' : '#22c55e'

  const timeline = buildTimeline(data.transactions, data.signals)

  const topEntity = [...data.entities].sort((a, b) => b.riskScore - a.riskScore)[0]
  const narrative =
    `We analyzed ${data.transactions.length} transactions in this forensic run. ` +
    `Our engine detected ${data.signals.length} suspicious pattern${data.signals.length !== 1 ? 's' : ''} — ` +
    `${critCount} critical and ${highCount} high severity. ` +
    `${data.entities.filter(e => e.riskScore >= 0.7).length} wallet${data.entities.filter(e => e.riskScore >= 0.7).length !== 1 ? 's' : ''} were flagged as high-risk. ` +
    (data.signals[0] ? `The most severe finding: ${humanizeSignal(data.signals[0].name)}. ` : '') +
    `Threat assessment: ${threat}.`

  const metrics = [
    { label: 'Transactions', value: data.transactions.length, color: '#38bdf8' },
    { label: 'Anomalies',    value: anomalyTxs.length,        color: '#cc1a2e' },
    { label: 'Signals',      value: data.signals.length,      color: '#d4af37' },
    { label: 'Entities',     value: data.entities.length,     color: '#a855f7' },
    { label: 'Fund Flows',   value: data.fundFlows.length,    color: '#14b8a6' },
  ]

  const activeSignalId = detail?.type === 'signal' ? detail.data.id : undefined
  const activeTxHash  = detail?.type === 'tx' ? detail.data.hash : undefined

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#010208', color: '#f1f5f9' }}>

      {/* ── ethereal shadow background ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <EtherealShadow
          color="rgba(140, 12, 28, 0.88)"
          animation={{ scale: 100, speed: 55 }}
          noise={{ opacity: 0.5, scale: 1.1 }}
          sizing="fill"
        />
      </div>

      {/* ── content ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── header ── */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'rgba(1,2,8,0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '0 40px',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          {/* back */}
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.28)',
              flexShrink: 0,
              transition: 'color 0.15s',
            }}
            className="hover:text-white/55"
          >
            <ArrowLeft size={11} />
            Dashboard
          </button>

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

          {/* run id */}
          <span
            style={{
              fontFamily: "'Bebas Neue', monospace",
              fontSize: 17,
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            Investigation
            <span style={{ color: threatColor, marginLeft: 10 }}>run_{runId}</span>
          </span>

          {/* threat */}
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: threatColor,
              border: `1px solid ${threatColor}45`,
              background: `${threatColor}10`,
              padding: '4px 10px',
              borderRadius: 5,
              boxShadow: `0 0 16px ${threatColor}18`,
            }}
          >
            {threat}
          </span>

          <div style={{ flex: 1 }} />

          {/* metrics strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {metrics.map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span
                  style={{
                    fontFamily: "'Bebas Neue', monospace",
                    fontSize: 20,
                    color,
                    lineHeight: 1,
                  }}
                >
                  {value}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.2)',
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* coverage */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
            {[
              { label: 'traces',     ok: data.coverage.tracesAvailable },
              { label: 'state-diff', ok: data.coverage.stateDiffsAvailable },
            ].map(({ label, ok }) => (
              <span
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  color: ok ? '#22c55e' : 'rgba(255,255,255,0.18)',
                }}
              >
                {ok ? <CheckCircle2 size={8} /> : <EyeOff size={8} />}
                {label}
              </span>
            ))}
          </div>
        </header>

        {/* ── main content ── */}
        <main style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1400, margin: '0 auto' }}>

          {/* Narrative banner */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.01 }}>
            <NarrativeBanner narrative={narrative} threatColor={threatColor} />
          </motion.div>

          {/* Risk overview cards */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
            <RiskOverviewCards
              threat={threat}
              threatColor={threatColor}
              anomalyCount={anomalyTxs.length}
              signalCount={data.signals.length}
              topEntity={topEntity}
            />
          </motion.div>

          {/* detail overlay — appears at top when something is selected */}
          <AnimatePresence mode="wait">
            {detail && (
              <DetailOverlay
                key={detail.type === 'tx' ? detail.data.hash : detail.data.id}
                detail={detail}
                allSignals={data.signals}
                onClose={() => setDetail(null)}
              />
            )}
          </AnimatePresence>

          {/* ── attack timeline ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <Section
              icon={Clock}
              title="Attack Timeline"
              count={timeline.length}
              accent="#38bdf8"
              defaultOpen={true}
            >
              <AttackTimeline
                events={timeline}
                activeHash={activeTxHash}
                onSelect={openTx}
              />
            </Section>
          </motion.div>

          {/* ── signals ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Section
              icon={Zap}
              title="Signals"
              count={filteredSignals.length}
              accent="#cc1a2e"
              defaultOpen={true}
              badge={
                <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                  {(['all', 'critical', 'high'] as const).map(f => (
                    <button
                      key={f}
                      onClick={e => { e.stopPropagation(); setSigFilter(f) }}
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 8,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: 4,
                        border: `1px solid ${sigFilter === f ? '#cc1a2e50' : 'rgba(255,255,255,0.1)'}`,
                        background: sigFilter === f ? '#cc1a2e15' : 'transparent',
                        color: sigFilter === f ? '#cc1a2e' : 'rgba(255,255,255,0.28)',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              }
            >
              {filteredSignals.length === 0 ? (
                <div style={{ padding: '20px 28px' }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                    No signals match this filter
                  </p>
                </div>
              ) : (
                <SignalList signals={filteredSignals} onSelect={openSignal} activeId={activeSignalId} />
              )}
            </Section>
          </motion.div>

          {/* ── transactions ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <Section
              icon={Activity}
              title="Transactions"
              count={filteredTxs.length}
              accent="#38bdf8"
              defaultOpen={false}
              badge={
                <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                  {([
                    { key: 'anomaly' as const, label: `anomalies (${anomalyTxs.length})` },
                    { key: 'all' as const,     label: `all (${data.transactions.length})` },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={e => { e.stopPropagation(); setTxFilter(key) }}
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 8,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: 4,
                        border: `1px solid ${txFilter === key ? '#38bdf850' : 'rgba(255,255,255,0.1)'}`,
                        background: txFilter === key ? '#38bdf815' : 'transparent',
                        color: txFilter === key ? '#38bdf8' : 'rgba(255,255,255,0.28)',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              }
            >
              {filteredTxs.length === 0 ? (
                <div style={{ padding: '20px 28px' }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                    No transactions in this view
                  </p>
                </div>
              ) : (
                <TxList txs={filteredTxs} onSelect={openTx} activeTx={activeTxHash} />
              )}
            </Section>
          </motion.div>

          {/* ── entities ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <Section
              icon={Shield}
              title="Entities"
              count={highRiskEntities.length}
              accent="#a855f7"
              defaultOpen={false}
              badge={
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.22)',
                    marginLeft: 4,
                  }}
                >
                  risk ≥ 50%
                </span>
              }
            >
              {highRiskEntities.length === 0 ? (
                <div style={{ padding: '20px 28px' }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                    No high-risk entities detected
                  </p>
                </div>
              ) : (
                <EntityList entities={highRiskEntities} />
              )}
            </Section>
          </motion.div>

          {/* ── fund flow ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Section
              icon={TrendingUp}
              title="Fund Flow Graph"
              count={data.fundFlows.length}
              accent="#14b8a6"
              defaultOpen={false}
            >
              <div style={{ height: 340, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <FundFlowGraph flows={data.fundFlows} />
              </div>
            </Section>
          </motion.div>

          {/* Technical Details accordion */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <div style={{ ...panel, borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setTechOpen(o => !o)}
                className="w-full flex items-center gap-4 transition-colors duration-150"
                style={{ padding: '18px 28px', background: techOpen ? 'rgba(255,255,255,0.02)' : 'transparent', borderBottom: techOpen ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                  Technical Details — For Analysts
                </span>
                <div style={{ flex: 1 }} />
                <motion.div animate={{ rotate: techOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {techOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <TxList txs={filteredTxs} onSelect={openTx} activeTx={activeTxHash} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* bottom spacer */}
          <div style={{ height: 60 }} />
        </main>
      </div>

      {/* ── copilot panel ── */}
      <CopilotPanel
        runId={runId}
        runData={data}
        runMeta={{
          scenario: 'investigation',
          attacksTotal: data.transactions.length,
          attacksSucceeded: anomalyTxs.length,
        }}
      />
    </div>
  )
}
