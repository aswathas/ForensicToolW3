import React, { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, Activity, Shield, Zap, TrendingUp,
  ChevronDown, X, CheckCircle2, EyeOff, Clock, FileText, Lightbulb,
  ChevronRight,
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

const SEV_BG: Record<string, string> = {
  critical: 'rgba(204,26,46,0.12)',
  high:     'rgba(212,175,55,0.12)',
  medium:   'rgba(249,115,22,0.12)',
  low:      'rgba(34,197,94,0.12)',
}

const ROLE_COLOR: Record<string, string> = {
  attacker:     '#cc1a2e',
  victim:       '#d4af37',
  intermediary: '#38bdf8',
  sink:         '#a855f7',
}

function humanizeSignal(name: string): string {
  const MAP: Record<string, string> = {
    REENTRANCY_SAME_FUNC:    'Repeated Withdrawal Exploit',
    REENTRANCY_CROSS_FUNC:   'Cross-Function Fund Drain',
    REENTRANCY_CALLBACK:     'Callback Before Balance Update',
    REENTRANCY_DELEGATECALL: 'Delegated Call Exploit',
    REENTRANCY_MULTI_WITHDRAW:'Multiple Withdrawal Attack',
    APPROVAL_UNLIMITED:      'Unlimited Token Permission Granted',
    APPROVAL_DRAIN:          'Approved Funds Drained',
    APPROVAL_BURST:          'Rapid Approval Drain Burst',
    APPROVAL_SPENDER:        'Suspicious Spender Role',
    FLASHLOAN_BORROW_REPAY:  'Flash Loan in Single Transaction',
    FLASHLOAN_MULTI_POOL:    'Multi-Pool Flash Loan',
    FLASHLOAN_PRICE_IMPACT:  'Flash Loan Price Impact',
    FLASHLOAN_EXTRACTION:    'Flash Loan Fund Extraction',
    ORACLE_DEVIATION:        'Price Oracle Manipulation',
    ORACLE_SPOT_SPIKE:       'Spot Price Spike',
    ORACLE_SANDWICH:         'Sandwich Attack via Oracle',
    ORACLE_ARBITRAGE:        'Oracle-Enabled Arbitrage',
    ADMIN_PROXY_CHANGE:      'Contract Logic Replaced',
    ADMIN_ROLE_CHANGE:       'Admin Privileges Changed',
    ADMIN_SEQUENCE:          'Suspicious Admin Sequence',
    ADMIN_UPGRADE_OUTFLOW:   'Upgrade Followed by Fund Drain',
    FUNDFLOW_VICTIM_OUTFLOW: 'Large Victim Fund Outflow',
    FUNDFLOW_NEW_RECEIVER:   'New Wallet Received Large Inflow',
    FUNDFLOW_PEEL_CHAIN:     'Layered Fund Laundering',
    FUNDFLOW_CONSOLIDATION:  'Fund Consolidation Pattern',
    FUNDFLOW_RISKY_HOP:      'Hop to Risky Destination',
    FUNDFLOW_DIVERSIFICATION:'Asset Diversification After Attack',
  }
  const upper = name.toUpperCase()
  for (const [key, val] of Object.entries(MAP)) {
    if (upper.includes(key)) return val
  }
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const SIGNAL_EXPLANATIONS: Record<string, string> = {
  reentrancy: 'This attack exploited a vulnerability where a contract could be called repeatedly before it updated its balance records — like withdrawing money twice before the bank registers the first withdrawal.',
  approval:   'A wallet granted unlimited spending permission to a contract that exploited this to drain the entire token balance without further approval.',
  flashloan:  'A flash loan attack borrows a huge sum, uses it to manipulate markets or extract value, then repays everything in the same block — the protocol never sees the funds missing.',
  oracle:     'The price data that smart contracts rely on was manipulated, causing them to buy or sell at wrong prices — creating profit for the attacker at the expense of the protocol.',
  admin:      "The contract's core logic or ownership controls were changed by an unauthorized actor, allowing silent redirection of funds.",
  fundflow:   'Suspicious patterns detected in how funds moved between wallets — consistent with known money laundering, extraction, or layering techniques.',
}

// ── helpers ───────────────────────────────────────────────────────────────────

function truncAddr(addr: string, n = 8): string {
  if (!addr) return '—'
  return `${addr.slice(0, n + 2)}…${addr.slice(-4)}`
}

function truncHash(hash: string): string {
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`
}

// ── design tokens ─────────────────────────────────────────────────────────────

const glassPanel: React.CSSProperties = {
  background: 'rgba(2, 3, 8, 0.82)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.07)',
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: 'rgba(255,255,255,0.3)',
  fontWeight: 500,
}

const SECTION_HEAD: React.CSSProperties = {
  fontFamily: "'Bebas Neue', monospace",
  letterSpacing: '0.06em',
  color: 'rgba(255,255,255,0.9)',
}

// ── severity badge ────────────────────────────────────────────────────────────

const SevBadge: React.FC<{ sev: string; large?: boolean }> = ({ sev, large }) => (
  <span style={{
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: large ? 13 : 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: SEV_COLOR[sev] ?? '#22c55e',
    border: `1px solid ${SEV_COLOR[sev] ?? '#22c55e'}45`,
    background: SEV_BG[sev] ?? 'rgba(34,197,94,0.12)',
    padding: large ? '5px 14px' : '3px 9px',
    borderRadius: 6,
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    boxShadow: `0 0 12px ${SEV_COLOR[sev] ?? '#22c55e'}20`,
  }}>
    {sev}
  </span>
)

// ── section wrapper ───────────────────────────────────────────────────────────

interface SectionBoxProps {
  icon: React.FC<{ size?: number; className?: string }>
  title: string
  count?: number
  accent?: string
  subtitle?: string
  controls?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
}

const SectionBox: React.FC<SectionBoxProps> = ({
  icon: Icon,
  title,
  count,
  accent = 'rgba(255,255,255,0.4)',
  subtitle,
  controls,
  children,
  collapsible = false,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ ...glassPanel, borderRadius: 14, overflow: 'hidden' }}>
      {/* Section header */}
      <div
        style={{
          padding: '24px 32px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'rgba(255,255,255,0.01)',
        }}
      >
        <span style={{ color: accent, display: 'flex', flexShrink: 0 }}>
          <Icon size={20} />
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ ...SECTION_HEAD, fontSize: 28, margin: 0, lineHeight: 1 }}>{title}</h2>
            {count !== undefined && (
              <span style={{
                fontFamily: "'Bebas Neue', monospace",
                fontSize: 22,
                color: accent,
                opacity: 0.7,
                lineHeight: 1,
              }}>
                {count}
              </span>
            )}
          </div>
          {subtitle && (
            <p style={{ ...LABEL_STYLE, margin: '4px 0 0', fontSize: 11 }}>{subtitle}</p>
          )}
        </div>

        {controls && <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{controls}</div>}

        {collapsible && (
          <motion.button
            onClick={() => setOpen(o => !o)}
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: 'rgba(255,255,255,0.25)', display: 'flex', flexShrink: 0, cursor: 'pointer' }}
          >
            <ChevronDown size={18} />
          </motion.button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
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

// ── filter pill button ────────────────────────────────────────────────────────

const FilterPill: React.FC<{
  label: string
  active: boolean
  color?: string
  onClick: () => void
}> = ({ label, active, color = '#38bdf8', onClick }) => (
  <button
    onClick={onClick}
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
      padding: '5px 14px',
      borderRadius: 6,
      border: `1px solid ${active ? color + '55' : 'rgba(255,255,255,0.1)'}`,
      background: active ? `${color}15` : 'transparent',
      color: active ? color : 'rgba(255,255,255,0.35)',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }}
  >
    {label}
  </button>
)

// ── narrative banner ──────────────────────────────────────────────────────────

const NarrativeBanner: React.FC<{ narrative: string; threatColor: string }> = ({ narrative, threatColor }) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      ...glassPanel,
      borderRadius: 14,
      padding: '28px 36px',
      borderLeft: `4px solid ${threatColor}`,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
      <FileText size={20} style={{ color: threatColor, flexShrink: 0, marginTop: 3 }} />
      <div>
        <div style={{ ...LABEL_STYLE, marginBottom: 10 }}>Analyst Summary</div>
        <p style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.75)',
          lineHeight: 1.8,
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxWidth: 860,
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
  totalTxs: number
}

const RiskOverviewCards: React.FC<RiskOverviewCardsProps> = ({
  threat, threatColor, anomalyCount, signalCount, topEntity, totalTxs,
}) => {
  const topEntityColor = topEntity && topEntity.riskScore >= 0.8 ? '#cc1a2e' : '#d4af37'

  const cards = [
    {
      label: 'Threat Level',
      content: (
        <div style={{
          fontFamily: "'Bebas Neue', monospace",
          fontSize: 52,
          color: threatColor,
          lineHeight: 1,
          letterSpacing: '0.05em',
          textShadow: `0 0 40px ${threatColor}55`,
        }}>
          {threat}
        </div>
      ),
      sub: 'Overall assessment',
      delay: 0.05,
    },
    {
      label: 'Anomalous Transactions',
      content: (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 64, color: '#cc1a2e', lineHeight: 1 }}>
            {anomalyCount}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
            / {totalTxs}
          </span>
        </div>
      ),
      sub: 'flagged as suspicious',
      delay: 0.08,
    },
    {
      label: 'Detection Signals',
      content: (
        <span style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 64, color: '#d4af37', lineHeight: 1 }}>
          {signalCount}
        </span>
      ),
      sub: 'rules triggered',
      delay: 0.11,
    },
    {
      label: 'Highest Risk Entity',
      content: topEntity ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            color: topEntityColor,
            border: `1px solid ${topEntityColor}45`,
            background: `${topEntityColor}12`,
            padding: '4px 12px',
            borderRadius: 6,
            display: 'inline-block',
            width: 'fit-content',
          }}>
            {topEntity.role ?? 'unknown'}
          </span>
          <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 36, color: topEntityColor, lineHeight: 1 }}>
            {(topEntity.riskScore * 100).toFixed(0)}%
          </div>
          <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            {topEntity.address.slice(0, 10)}…{topEntity.address.slice(-6)}
          </code>
        </div>
      ) : (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>
          None detected
        </span>
      ),
      sub: 'risk score',
      delay: 0.14,
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {cards.map(({ label, content, sub, delay }) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ ...glassPanel, borderRadius: 14, padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div style={{ ...LABEL_STYLE, fontSize: 11 }}>{label}</div>
          {content}
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
            {sub}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ── signal detail modal ───────────────────────────────────────────────────────

interface SignalDetailPanelProps {
  signal: Signal
  onClose: () => void
}

const SignalDetailPanel: React.FC<SignalDetailPanelProps> = ({ signal: s, onClose }) => {
  const explanation = Object.entries(SIGNAL_EXPLANATIONS).find(
    ([key]) => s.category?.toLowerCase().includes(key)
  )?.[1]

  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        ...glassPanel,
        borderRadius: 14,
        padding: '32px',
        borderLeft: `4px solid ${SEV_COLOR[s.severity]}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SevBadge sev={s.severity} large />
          <h3 style={{ ...SECTION_HEAD, fontSize: 28, margin: 0 }}>{humanizeSignal(s.name)}</h3>
          <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
            {s.name}
          </code>
        </div>
        <button
          onClick={onClose}
          style={{ color: 'rgba(255,255,255,0.25)', cursor: 'pointer', marginTop: 4 }}
          className="hover:text-white/60 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {explanation && (
        <div style={{
          display: 'flex',
          gap: 14,
          padding: '18px 20px',
          borderRadius: 10,
          background: 'rgba(212,175,55,0.07)',
          border: '1px solid rgba(212,175,55,0.25)',
          marginBottom: 20,
        }}>
          <Lightbulb size={18} style={{ color: '#d4af37', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ ...LABEL_STYLE, fontSize: 10, marginBottom: 8, color: 'rgba(212,175,55,0.6)' }}>
              Plain English Explanation
            </div>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: 0 }}>
              {explanation}
            </p>
          </div>
        </div>
      )}

      {s.description && (
        <p style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.7,
          marginBottom: 24,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {s.description}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { l: 'Category',    v: s.category },
          { l: 'Confidence',  v: `${(s.confidence * 100).toFixed(0)}%` },
          { l: 'False Positive Risk', v: `${(s.falsePositiveProbability * 100).toFixed(0)}%` },
          { l: 'Affected Transactions', v: String(s.affectedTransactions.length) },
        ].map(({ l, v }) => (
          <div key={l} style={{
            padding: '14px 18px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ ...LABEL_STYLE, fontSize: 10, marginBottom: 6 }}>{l}</div>
            <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 28, color: 'rgba(255,255,255,0.8)', lineHeight: 1 }}>
              {v}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── tx detail panel ───────────────────────────────────────────────────────────

const TxDetailPanel: React.FC<{ tx: Transaction; allSignals: Signal[]; onClose: () => void }> = ({ tx, allSignals, onClose }) => {
  const related = allSignals.filter(s => s.affectedTransactions.includes(tx.hash))

  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        ...glassPanel,
        borderRadius: 14,
        padding: '32px',
        borderLeft: `4px solid ${tx.isAnomaly ? '#cc1a2e' : 'rgba(255,255,255,0.1)'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 10 }}>Transaction Detail</div>
          <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'rgba(255,255,255,0.7)', wordBreak: 'break-all' as const }}>
            {tx.hash}
          </code>
        </div>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }} className="hover:text-white/60 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { l: 'Block',  v: `#${tx.blockNumber}` },
          { l: 'Status', v: tx.status },
          { l: 'Gas Used', v: String(tx.gasUsed) },
          { l: 'Anomaly Score', v: tx.anomalyScore > 0 ? `${(tx.anomalyScore * 100).toFixed(0)}%` : '—' },
        ].map(({ l, v }) => (
          <div key={l} style={{ padding: '14px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ ...LABEL_STYLE, fontSize: 10, marginBottom: 6 }}>{l}</div>
            <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 26, color: 'rgba(255,255,255,0.8)', lineHeight: 1 }}>{v}</div>
          </div>
        ))}
      </div>

      {[
        { l: 'From', v: tx.from },
        { l: 'To',   v: tx.to },
        { l: 'Value', v: `${tx.value} wei` },
      ].map(({ l, v }) => (
        <div key={l} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ ...LABEL_STYLE, fontSize: 10, width: 48, flexShrink: 0, paddingTop: 2 }}>{l}</span>
          <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.55)', wordBreak: 'break-all' as const, lineHeight: 1.6 }}>{v}</code>
        </div>
      ))}

      {related.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 12 }}>Firing Signals</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {related.map(s => (
              <div key={s.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 8,
                background: `${SEV_COLOR[s.severity]}0d`,
                border: `1px solid ${SEV_COLOR[s.severity]}25`,
              }}>
                <SevBadge sev={s.severity} />
                <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                  {humanizeSignal(s.name)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ── signal cards ──────────────────────────────────────────────────────────────

const SignalCards: React.FC<{
  signals: Signal[]
  onSelect: (s: Signal) => void
  activeId?: string
}> = ({ signals, onSelect, activeId }) => (
  <div style={{ padding: '24px 32px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
    {signals.map((s, i) => {
      const active = activeId === s.id
      const color = SEV_COLOR[s.severity]
      return (
        <motion.button
          key={s.id}
          onClick={() => onSelect(s)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.3 }}
          whileHover={{ scale: 1.005 }}
          style={{
            width: '100%',
            textAlign: 'left' as const,
            padding: '20px 24px',
            borderRadius: 10,
            background: active ? `${color}0e` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${active ? color + '45' : 'rgba(255,255,255,0.07)'}`,
            borderLeft: `4px solid ${color}`,
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          {/* Signal name + code */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
              <SevBadge sev={s.severity} />
              <span style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: 18,
                fontWeight: 600,
                color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)',
                lineHeight: 1.2,
              }}>
                {humanizeSignal(s.name)}
              </span>
            </div>
            <code style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'rgba(255,255,255,0.22)',
              letterSpacing: '0.04em',
            }}>
              {s.name}
            </code>
          </div>

          {/* Confidence */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <div style={{ ...LABEL_STYLE, fontSize: 10 }}>Confidence</div>
            <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 32, color, lineHeight: 1 }}>
              {(s.confidence * 100).toFixed(0)}%
            </div>
          </div>

          {/* Affected txs */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, minWidth: 60 }}>
            <div style={{ ...LABEL_STYLE, fontSize: 10 }}>Txs</div>
            <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 32, color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>
              {s.affectedTransactions.length}
            </div>
          </div>

          {/* Category */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, minWidth: 90 }}>
            <div style={{ ...LABEL_STYLE, fontSize: 10 }}>Category</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>
              {s.category}
            </div>
          </div>

          <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
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
  allSignals: Signal[]
}> = ({ txs, onSelect, activeTx, allSignals }) => {
  const sigsByTx = new Map<string, Signal[]>()
  for (const s of allSignals) {
    for (const hash of s.affectedTransactions) {
      if (!sigsByTx.has(hash)) sigsByTx.set(hash, [])
      sigsByTx.get(hash)!.push(s)
    }
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '8px 1fr 1fr 90px 80px 70px', gap: 16, padding: '8px 32px 12px', ...LABEL_STYLE, fontSize: 11 }}>
        <span />
        <span>Transaction Hash</span>
        <span>From → To</span>
        <span style={{ textAlign: 'right' as const }}>Block</span>
        <span style={{ textAlign: 'right' as const }}>Anomaly</span>
        <span style={{ textAlign: 'right' as const }}>Status</span>
      </div>

      {txs.map((tx, i) => {
        const active = activeTx === tx.hash
        const signals = sigsByTx.get(tx.hash) ?? []
        const topSev = signals[0]?.severity
        return (
          <motion.button
            key={tx.hash}
            onClick={() => onSelect(tx)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.015 }}
            whileHover={{ background: 'rgba(255,255,255,0.025)' }}
            style={{
              width: '100%',
              textAlign: 'left' as const,
              display: 'grid',
              gridTemplateColumns: '8px 1fr 1fr 90px 80px 70px',
              gap: 16,
              padding: '14px 32px',
              background: active ? 'rgba(56,189,248,0.06)' : 'transparent',
              borderLeft: `3px solid ${active ? '#38bdf8' : tx.isAnomaly ? '#cc1a2e50' : 'transparent'}`,
              borderBottom: i < txs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              cursor: 'pointer',
              alignItems: 'center',
              transition: 'background 0.1s',
            }}
          >
            {/* anomaly dot */}
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: tx.isAnomaly ? '#cc1a2e' : 'rgba(255,255,255,0.1)',
              boxShadow: tx.isAnomaly ? '0 0 6px #cc1a2e80' : 'none',
              display: 'block',
            }} />

            {/* hash + signal tags */}
            <div>
              <code style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: tx.isAnomaly ? '#ff5566' : 'rgba(255,255,255,0.55)',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {truncHash(tx.hash)}
              </code>
              {topSev && (
                <span style={{ marginTop: 4, display: 'inline-block' }}>
                  <SevBadge sev={topSev} />
                </span>
              )}
            </div>

            {/* from → to */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: 'rgba(255,255,255,0.35)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {truncAddr(tx.from, 6)}
              <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.15)' }}>→</span>
              {truncAddr(tx.to, 6)}
            </div>

            {/* block */}
            <div style={{ textAlign: 'right' as const, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
              #{tx.blockNumber}
            </div>

            {/* anomaly score */}
            <div style={{
              textAlign: 'right' as const,
              fontFamily: "'Bebas Neue', monospace",
              fontSize: 20,
              color: tx.anomalyScore > 0.7 ? '#cc1a2e' : tx.anomalyScore > 0 ? '#d4af37' : 'rgba(255,255,255,0.2)',
            }}>
              {tx.anomalyScore > 0 ? `${(tx.anomalyScore * 100).toFixed(0)}%` : '—'}
            </div>

            {/* status */}
            <div style={{
              textAlign: 'right' as const,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              color: tx.status === 'success' ? '#22c55e' : '#cc1a2e',
            }}>
              {tx.status}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

// ── entity cards ──────────────────────────────────────────────────────────────

const EntityCards: React.FC<{ entities: Entity[] }> = ({ entities }) => (
  <div style={{ padding: '24px 32px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
    {entities.map((e, i) => {
      const pct = e.riskScore * 100
      const color =
        e.riskScore >= 0.8 ? '#cc1a2e' :
        e.riskScore >= 0.6 ? '#d4af37' :
        e.riskScore >= 0.4 ? '#f97316' :
        '#22c55e'
      const roleColor = ROLE_COLOR[e.role ?? ''] ?? 'rgba(255,255,255,0.3)'

      return (
        <motion.div
          key={e.address}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
          style={{
            padding: '22px 24px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${color}30`,
            borderLeft: `4px solid ${color}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Role + score */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: roleColor,
              border: `1px solid ${roleColor}40`,
              background: `${roleColor}12`,
              padding: '4px 10px',
              borderRadius: 6,
            }}>
              {e.role ?? 'unknown'}
            </span>
            <span style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 40, color, lineHeight: 1 }}>
              {pct.toFixed(0)}%
            </span>
          </div>

          {/* Address */}
          <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            {truncAddr(e.address, 14)}
          </code>

          {/* Risk bar */}
          <div>
            <div style={{ ...LABEL_STYLE, fontSize: 10, marginBottom: 6 }}>Risk Score</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', background: color, borderRadius: 4 }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.04, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ ...LABEL_STYLE, fontSize: 10, marginBottom: 2 }}>Transactions</div>
              <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 24, color: 'rgba(255,255,255,0.55)', lineHeight: 1 }}>
                {e.transactionCount}
              </div>
            </div>
            <div>
              <div style={{ ...LABEL_STYLE, fontSize: 10, marginBottom: 2 }}>Type</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginTop: 4 }}>
                {e.type}
              </div>
            </div>
          </div>
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
      <div style={{ padding: '32px', textAlign: 'center' as const }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>
          No suspicious events detected
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px 28px' }}>
      <div className="flex items-start gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 8 }}>
        {events.map((ev, i) => {
          const isActive = activeHash === ev.tx.hash
          const topSev = ev.signals[0]?.severity ?? 'low'
          const color = SEV_COLOR[topSev]

          return (
            <div key={ev.tx.hash} className="flex items-center" style={{ flexShrink: 0 }}>
              <motion.button
                onClick={() => onSelect(ev.tx)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.03 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column' as const,
                  gap: 10,
                  padding: '16px 20px',
                  borderRadius: 10,
                  background: isActive ? `${color}10` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? color + '50' : 'rgba(255,255,255,0.08)'}`,
                  borderTop: `3px solid ${color}`,
                  minWidth: 180,
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 20, color: isActive ? color : 'rgba(255,255,255,0.4)', lineHeight: 1, letterSpacing: '0.06em' }}>
                  Block {ev.block}
                </span>
                <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)' }}>
                  {truncHash(ev.tx.hash)}
                </code>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                  {ev.signals.slice(0, 2).map((s, si) => (
                    <SevBadge key={si} sev={s.severity} />
                  ))}
                  {ev.signals.length > 2 && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.25)', alignSelf: 'center' }}>
                      +{ev.signals.length - 2} more
                    </span>
                  )}
                </div>
                {ev.signals[0] && (
                  <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                    {humanizeSignal(ev.signals[0].name)}
                  </div>
                )}
              </motion.button>

              {i < events.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', flexShrink: 0 }}>
                  <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

type DetailState =
  | { type: 'signal'; data: Signal }
  | { type: 'tx'; data: Transaction }
  | null

export const Investigation: React.FC = () => {
  const { runId } = useParams<{ runId: string }>()
  const navigate = useNavigate()
  const { data, loading, error } = useForensicData(runId || null)

  const [detail, setDetail] = useState<DetailState>(null)
  const [txFilter, setTxFilter] = useState<'anomaly' | 'all'>('anomaly')
  const [sigFilter, setSigFilter] = useState<'all' | 'critical' | 'high'>('all')

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
          <EtherealShadow color="rgba(130, 12, 28, 0.9)" animation={{ scale: 80, speed: 60 }} noise={{ opacity: 0.4, scale: 1 }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 36, height: 36, border: '2px solid rgba(204,26,46,0.4)', borderTopColor: '#cc1a2e', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
            Loading Forensic Data
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
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <AlertTriangle size={32} style={{ color: '#cc1a2e' }} />
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'rgba(204,26,46,0.8)' }}>
            {error || 'Failed to load forensic data'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginTop: 8, cursor: 'pointer' }}
            className="hover:text-white/60 transition-colors"
          >
            <ArrowLeft size={14} />
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
    { label: 'Txs',       value: data.transactions.length, color: '#38bdf8' },
    { label: 'Anomalies', value: anomalyTxs.length,        color: '#cc1a2e' },
    { label: 'Signals',   value: data.signals.length,      color: '#d4af37' },
    { label: 'Entities',  value: data.entities.length,     color: '#a855f7' },
    { label: 'Flows',     value: data.fundFlows.length,    color: '#14b8a6' },
  ]

  const activeSignalId = detail?.type === 'signal' ? detail.data.id : undefined
  const activeTxHash  = detail?.type === 'tx' ? detail.data.hash : undefined

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#010208', color: '#f1f5f9' }}>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <EtherealShadow
          color="rgba(140, 12, 28, 0.88)"
          animation={{ scale: 100, speed: 55 }}
          noise={{ opacity: 0.5, scale: 1.1 }}
          sizing="fill"
        />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(1,2,8,0.94)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '0 48px',
          height: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}>
          {/* Back */}
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            className="hover:text-white/60 transition-colors"
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>

          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />

          {/* Run ID */}
          <span style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 22, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.8)' }}>
            Investigation
            <span style={{ color: threatColor, marginLeft: 12 }}>run_{runId}</span>
          </span>

          {/* Threat badge */}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: threatColor,
            border: `1px solid ${threatColor}50`,
            background: `${threatColor}12`,
            padding: '6px 14px',
            borderRadius: 6,
            boxShadow: `0 0 20px ${threatColor}20`,
          }}>
            {threat}
          </span>

          <div style={{ flex: 1 }} />

          {/* Metrics strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {metrics.map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 26, color, lineHeight: 1 }}>
                  {value}
                </span>
                <span style={{ ...LABEL_STYLE, fontSize: 10 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Coverage indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 8 }}>
            {[
              { label: 'traces',     ok: data.coverage.tracesAvailable },
              { label: 'state-diff', ok: data.coverage.stateDiffsAvailable },
            ].map(({ label, ok }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: ok ? '#22c55e' : 'rgba(255,255,255,0.2)' }}>
                {ok ? <CheckCircle2 size={12} /> : <EyeOff size={12} />}
                {label}
              </span>
            ))}
          </div>
        </header>

        {/* ── Main content ── */}
        <main style={{ padding: '36px 48px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1440, margin: '0 auto' }}>

          {/* Narrative */}
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
              totalTxs={data.transactions.length}
            />
          </motion.div>

          {/* Detail panel — appears inline when something selected */}
          <AnimatePresence mode="wait">
            {detail?.type === 'signal' && (
              <SignalDetailPanel key={detail.data.id} signal={detail.data} onClose={() => setDetail(null)} />
            )}
            {detail?.type === 'tx' && (
              <TxDetailPanel key={detail.data.hash} tx={detail.data} allSignals={data.signals} onClose={() => setDetail(null)} />
            )}
          </AnimatePresence>

          {/* Attack Timeline */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <SectionBox
              icon={Clock}
              title="Attack Timeline"
              count={timeline.length}
              accent="#38bdf8"
              subtitle={`${timeline.length} suspicious events in chronological order`}
            >
              <AttackTimeline events={timeline} activeHash={activeTxHash} onSelect={openTx} />
            </SectionBox>
          </motion.div>

          {/* Signals */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
            <SectionBox
              icon={Zap}
              title="Detection Signals"
              count={filteredSignals.length}
              accent="#cc1a2e"
              subtitle="Heuristic rules that fired — click any signal for explanation"
              controls={
                <>
                  {(['all', 'critical', 'high'] as const).map(f => (
                    <FilterPill
                      key={f}
                      label={f}
                      active={sigFilter === f}
                      color="#cc1a2e"
                      onClick={() => setSigFilter(f)}
                    />
                  ))}
                </>
              }
            >
              {filteredSignals.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' as const }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>
                    No signals match this filter
                  </p>
                </div>
              ) : (
                <SignalCards signals={filteredSignals} onSelect={openSignal} activeId={activeSignalId} />
              )}
            </SectionBox>
          </motion.div>

          {/* Transactions */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <SectionBox
              icon={Activity}
              title="Transactions"
              count={filteredTxs.length}
              accent="#38bdf8"
              subtitle="Click any row to see full transaction detail"
              collapsible
              defaultOpen={false}
              controls={
                <>
                  <FilterPill
                    label={`Anomalies (${anomalyTxs.length})`}
                    active={txFilter === 'anomaly'}
                    color="#cc1a2e"
                    onClick={() => setTxFilter('anomaly')}
                  />
                  <FilterPill
                    label={`All (${data.transactions.length})`}
                    active={txFilter === 'all'}
                    color="#38bdf8"
                    onClick={() => setTxFilter('all')}
                  />
                </>
              }
            >
              {filteredTxs.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' as const }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>
                    No transactions in this view
                  </p>
                </div>
              ) : (
                <TxList txs={filteredTxs} onSelect={openTx} activeTx={activeTxHash} allSignals={data.signals} />
              )}
            </SectionBox>
          </motion.div>

          {/* Entities */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <SectionBox
              icon={Shield}
              title="High-Risk Entities"
              count={highRiskEntities.length}
              accent="#a855f7"
              subtitle="Wallets with risk score ≥ 50% — sorted by risk"
              collapsible
              defaultOpen
            >
              {highRiskEntities.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' as const }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>
                    No high-risk entities detected
                  </p>
                </div>
              ) : (
                <EntityCards entities={highRiskEntities} />
              )}
            </SectionBox>
          </motion.div>

          {/* Fund Flow */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <SectionBox
              icon={TrendingUp}
              title="Fund Flow Graph"
              count={data.fundFlows.length}
              accent="#14b8a6"
              subtitle="How value moved between wallets"
              collapsible
              defaultOpen={false}
            >
              <div style={{ height: 380, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <FundFlowGraph flows={data.fundFlows} />
              </div>
            </SectionBox>
          </motion.div>

          <div style={{ height: 80 }} />
        </main>
      </div>

      {/* Copilot panel */}
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
