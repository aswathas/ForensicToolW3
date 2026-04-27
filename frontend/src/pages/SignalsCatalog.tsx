import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Zap, AlertTriangle, TrendingUp, Settings, GitBranch } from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { fadeInUp, staggerContainer } from '../components/animations/variants'
import { WebGPUDepthMap } from '../components/ui/webgpu-depth-map'

// ── Full 28-rule catalog ───────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: string; borderColor: string; icon: React.ElementType }> = {
  reentrancy: { label: 'Reentrancy',    color: '#dc143c', borderColor: 'rgba(220,20,60,0.6)',   icon: Zap },
  approval:   { label: 'Approvals',     color: '#d4af37', borderColor: 'rgba(212,175,55,0.6)',  icon: Shield },
  flashloan:  { label: 'Flashloan',     color: '#38bdf8', borderColor: 'rgba(56,189,248,0.6)',  icon: TrendingUp },
  oracle:     { label: 'Oracle/Price',  color: '#f97316', borderColor: 'rgba(249,115,22,0.6)',  icon: AlertTriangle },
  admin:      { label: 'Admin/Upgrade', color: '#a78bfa', borderColor: 'rgba(167,139,250,0.6)', icon: Settings },
  fundflow:   { label: 'Fund Flow',     color: '#22c55e', borderColor: 'rgba(34,197,94,0.6)',   icon: GitBranch },
}

const FILTER_TABS = [
  { key: 'all',       label: 'ALL'          },
  { key: 'reentrancy',label: 'REENTRANCY'   },
  { key: 'approval',  label: 'APPROVALS'    },
  { key: 'flashloan', label: 'FLASHLOAN'    },
  { key: 'oracle',    label: 'ORACLE'       },
  { key: 'admin',     label: 'ADMIN'        },
  { key: 'fundflow',  label: 'FUND FLOW'    },
]

interface SignalDef {
  id: string
  name: string
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: 'deterministic' | 'heuristic' | 'ml-assist'
  desc: string
  fpNote: string
}

const SIGNALS: SignalDef[] = [
  // REENTRANCY (6)
  {
    id: 'RE-01', name: 'Same-Function Reentrancy',      category: 'reentrancy',
    severity: 'critical', confidence: 'deterministic',
    desc: 'Same function called recursively within a single transaction before state update.',
    fpNote: 'Low — requires call stack depth > 1 on same function selector.',
  },
  {
    id: 'RE-02', name: 'Cross-Function Reentrancy',     category: 'reentrancy',
    severity: 'critical', confidence: 'heuristic',
    desc: 'State shared across functions exploited via re-entry into a different function.',
    fpNote: 'Medium — multi-contract protocols may trigger this via legitimate callbacks.',
  },
  {
    id: 'RE-03', name: 'Callback Before State Update',  category: 'reentrancy',
    severity: 'high',     confidence: 'heuristic',
    desc: 'External call made before storage write in same function (CEI violation).',
    fpNote: 'Medium — common in older contracts; not always exploitable.',
  },
  {
    id: 'RE-04', name: 'Delegatecall in Sensitive Path', category: 'reentrancy',
    severity: 'high',     confidence: 'heuristic',
    desc: 'DELEGATECALL opcode used inside a withdraw or transfer-sensitive function.',
    fpNote: 'Low-medium — proxy patterns may benignly use delegatecall.',
  },
  {
    id: 'RE-05', name: 'Multiple Withdrawals Same TX',  category: 'reentrancy',
    severity: 'critical', confidence: 'deterministic',
    desc: 'More than one withdraw-pattern call succeeds from the same sender in one tx.',
    fpNote: 'Low — legitimate batch withdrawals are rare and typically event-flagged.',
  },
  {
    id: 'RE-06', name: 'Revert After Partial State',    category: 'reentrancy',
    severity: 'medium',   confidence: 'heuristic',
    desc: 'Transaction reverts after some internal state was modified, suggesting partial-write exploit.',
    fpNote: 'High — reverts happen frequently for non-attack reasons.',
  },
  // APPROVALS (4)
  {
    id: 'AP-01', name: 'Unlimited Approval (MaxUint)',  category: 'approval',
    severity: 'high',     confidence: 'deterministic',
    desc: 'ERC-20 approve() called with amount = 2^256-1 (unlimited allowance).',
    fpNote: 'Medium — many DeFi protocols request unlimited allowances for UX.',
  },
  {
    id: 'AP-02', name: 'Allowance Drain Burst',         category: 'approval',
    severity: 'critical', confidence: 'heuristic',
    desc: 'Full allowance consumed in a single transferFrom() call within seconds of approval.',
    fpNote: 'Low — legitimate: single large authorised transfer.',
  },
  {
    id: 'AP-03', name: 'Approval + Drain Window',       category: 'approval',
    severity: 'high',     confidence: 'heuristic',
    desc: 'Approval event followed by transferFrom() drain within N blocks.',
    fpNote: 'Medium — DEX swap flows also match this pattern.',
  },
  {
    id: 'AP-04', name: 'Spender Role Anomaly',          category: 'approval',
    severity: 'medium',   confidence: 'heuristic',
    desc: 'Spender address has no known protocol role and drains allowance.',
    fpNote: 'High — new protocol addresses may have no known label.',
  },
  // FLASHLOAN (4)
  {
    id: 'FL-01', name: 'Borrow-Repay Same TX',          category: 'flashloan',
    severity: 'high',     confidence: 'deterministic',
    desc: 'Flash loan borrow and full repayment detected within same transaction.',
    fpNote: 'Low — flash loans are always detectable. Severity depends on usage.',
  },
  {
    id: 'FL-02', name: 'Multi-Pool Flash Hop',          category: 'flashloan',
    severity: 'critical', confidence: 'heuristic',
    desc: 'Flash loan borrowed across 2+ protocols in same tx to amplify capital.',
    fpNote: 'Low — multi-hop arbitrage may be legitimate but is high-risk.',
  },
  {
    id: 'FL-03', name: 'Large Price Impact in TX',      category: 'flashloan',
    severity: 'high',     confidence: 'heuristic',
    desc: 'Spot price deviation > threshold caused by a single transaction.',
    fpNote: 'Medium — large whale trades can also cause price impact.',
  },
  {
    id: 'FL-04', name: 'Extraction Outflow Post-Loan',  category: 'flashloan',
    severity: 'critical', confidence: 'heuristic',
    desc: 'Net ETH/token outflow from victim protocol after a flashloan-containing tx.',
    fpNote: 'Low — extraction pattern is a strong signal of attack success.',
  },
  // ORACLE (4)
  {
    id: 'OR-01', name: 'Oracle Deviation Same Block',   category: 'oracle',
    severity: 'high',     confidence: 'heuristic',
    desc: 'On-chain price deviates > X% from TWAP in same block.',
    fpNote: 'Medium — volatile markets can cause legitimate deviations.',
  },
  {
    id: 'OR-02', name: 'Spot Price Spike',              category: 'oracle',
    severity: 'high',     confidence: 'heuristic',
    desc: 'Instantaneous spot price moves > 2 stddev from recent median.',
    fpNote: 'Medium — low-liquidity pools spike naturally.',
  },
  {
    id: 'OR-03', name: 'Sandwich-Like Price Impact',    category: 'oracle',
    severity: 'critical', confidence: 'heuristic',
    desc: 'Same-block buy before and sell after a victim transaction pattern.',
    fpNote: 'Low — classic sandwich MEV pattern.',
  },
  {
    id: 'OR-04', name: 'Arbitrage With Victim',         category: 'oracle',
    severity: 'medium',   confidence: 'ml-assist',
    desc: 'Arbitrage profit correlates with same-block victim loss.',
    fpNote: 'High — benign arb is common; victim correlation is the differentiator.',
  },
  // ADMIN (4)
  {
    id: 'AD-01', name: 'Proxy Implementation Change',   category: 'admin',
    severity: 'critical', confidence: 'deterministic',
    desc: 'Proxy Upgraded() event detected — contract logic replaced.',
    fpNote: 'Low — legitimate upgrades should come from governance multisig.',
  },
  {
    id: 'AD-02', name: 'Privileged Role Change',        category: 'admin',
    severity: 'high',     confidence: 'deterministic',
    desc: 'RoleGranted / OwnershipTransferred event on sensitive contract.',
    fpNote: 'Low — expected during legitimate protocol transitions.',
  },
  {
    id: 'AD-03', name: 'Suspicious Admin Sequence',     category: 'admin',
    severity: 'high',     confidence: 'heuristic',
    desc: 'Multiple admin actions in rapid sequence (upgrade + role change + pause).',
    fpNote: 'Low — attack prep typically chains admin calls quickly.',
  },
  {
    id: 'AD-04', name: 'Upgrade + Outflow Pattern',     category: 'admin',
    severity: 'critical', confidence: 'heuristic',
    desc: 'Proxy upgrade followed by token/ETH outflow within same or next block.',
    fpNote: 'Very low — upgrade-and-drain is a known rug vector.',
  },
  // FUND FLOW (6)
  {
    id: 'FF-01', name: 'Victim Net Outflow Spike',      category: 'fundflow',
    severity: 'critical', confidence: 'heuristic',
    desc: 'Protocol or victim address net balance drops > threshold in single block.',
    fpNote: 'Low — large withdrawals can mimic this; context required.',
  },
  {
    id: 'FF-02', name: 'New Receiver Large Inflow',     category: 'fundflow',
    severity: 'high',     confidence: 'heuristic',
    desc: 'Fresh address (0 prior txs) receives > X ETH/tokens in one transaction.',
    fpNote: 'Medium — CEX deposit addresses are fresh by design.',
  },
  {
    id: 'FF-03', name: 'Peel Chain Detected',           category: 'fundflow',
    severity: 'high',     confidence: 'heuristic',
    desc: 'Value split and forwarded across 3+ hops in rapid succession (mixing pattern).',
    fpNote: 'Medium — DeFi routing can produce similar hop patterns.',
  },
  {
    id: 'FF-04', name: 'Consolidation Pattern',         category: 'fundflow',
    severity: 'medium',   confidence: 'heuristic',
    desc: 'Multiple senders funnel value into single receiver address.',
    fpNote: 'High — aggregators and bridges consolidate legitimately.',
  },
  {
    id: 'FF-05', name: 'Hop To Risky Destination',      category: 'fundflow',
    severity: 'high',     confidence: 'heuristic',
    desc: 'Funds reach known mixer or flagged bridge contract.',
    fpNote: 'Medium — privacy tools are used legitimately.',
  },
  {
    id: 'FF-06', name: 'Asset Diversification Post-Attack', category: 'fundflow',
    severity: 'high',     confidence: 'ml-assist',
    desc: 'Attacker converts stolen tokens to multiple assets within N blocks.',
    fpNote: 'Medium — DeFi strategies also diversify rapidly.',
  },
]

// ── Rule Card ──────────────────────────────────────────────────────────────

function RuleCard({ signal }: { signal: SignalDef }) {
  const cat = CATEGORY_META[signal.category] ?? CATEGORY_META.fundflow
  const Icon = cat.icon

  const severityBadge =
    signal.severity === 'critical' ? 'badge-critical' :
    signal.severity === 'high'     ? 'badge-high' :
    signal.severity === 'medium'   ? 'badge-medium' : 'badge-low'

  const confidenceColor =
    signal.confidence === 'deterministic' ? '#22c55e' :
    signal.confidence === 'heuristic'     ? '#d4af37' : '#a78bfa'

  return (
    <motion.div
      variants={fadeInUp}
      className="relative overflow-hidden rounded-lg"
      style={{
        background: 'rgba(0,0,0,0.40)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderLeft: `3px solid ${cat.borderColor}`,
      }}
      whileHover={{
        y: -2,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 16px ${cat.color}18`,
        borderColor: 'rgba(255,255,255,0.15)',
      }}
      transition={{ duration: 0.18 }}
    >
      {/* Top gradient accent */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(to right, ${cat.color}50, transparent)` }}
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded flex items-center justify-center shrink-0"
              style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}40` }}
            >
              <Icon size={13} style={{ color: cat.color }} />
            </div>
            <div>
              <span
                className="text-sm font-semibold text-text-primary"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {signal.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={severityBadge}>{signal.severity.toUpperCase()}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-text-secondary font-mono leading-relaxed mb-3">
          {signal.desc}
        </p>

        {/* Footer meta row */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/5">
          {/* Rule ID */}
          <code
            className="text-[10px] font-mono px-2 py-0.5 rounded"
            style={{
              background: `${cat.color}12`,
              border: `1px solid ${cat.color}30`,
              color: cat.color,
              letterSpacing: '0.08em',
            }}
          >
            {signal.id}
          </code>

          {/* Confidence label */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest">confidence</span>
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-wider"
              style={{ color: confidenceColor }}
            >
              {signal.confidence}
            </span>
          </div>

          {/* FP note */}
          <span className="text-[9px] font-mono text-text-muted truncate max-w-[200px]" title={`FP Risk: ${signal.fpNote}`}>
            FP: {signal.fpNote.split(' — ')[0]}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export const SignalsCatalog: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const filtered = activeFilter === 'all'
    ? SIGNALS
    : SIGNALS.filter(s => s.category === activeFilter)

  // Group by category for display
  const grouped: Record<string, SignalDef[]> = {}
  filtered.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = []
    grouped[s.category].push(s)
  })

  return (
    <Layout>
      <div className="p-8 max-w-5xl">

        {/* ── Hero with WebGPU depth-map background ── */}
        <div
          className="relative overflow-hidden rounded-lg mb-8"
          style={{ minHeight: '240px', background: 'rgba(2,6,23,0.95)' }}
        >
          <WebGPUDepthMap />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />

          {/* Header content floated over the depth map */}
          <div className="relative z-10 p-8">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <motion.div variants={fadeInUp}>
                <h1
                  className="text-4xl text-text-primary leading-none mb-1"
                  style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.08em' }}
                >
                  DETECTION ENGINE —{' '}
                  <span style={{ color: '#dc143c', filter: 'drop-shadow(0 0 12px rgba(220,20,60,0.5))' }}>
                    28 RULES
                  </span>
                </h1>
                <p className="text-text-muted text-xs font-mono mt-1">
                  // heuristic signal catalog · 6 attack categories · evidence-linked
                </p>
              </motion.div>

              {/* Stats row */}
              <motion.div variants={fadeInUp} className="flex items-center gap-6 mt-4 flex-wrap">
                {Object.entries(CATEGORY_META).map(([key, meta]) => {
                  const Icon = meta.icon
                  const count = SIGNALS.filter(s => s.category === key).length
                  return (
                    <div key={key} className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
                      <Icon size={11} style={{ color: meta.color }} />
                      <span style={{ color: meta.color }}>{count}</span>
                      <span>{meta.label}</span>
                    </div>
                  )
                })}
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="flex items-center gap-1 flex-wrap mb-8 p-1 rounded-lg"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {FILTER_TABS.map(tab => {
            const isActive = activeFilter === tab.key
            const catMeta = tab.key !== 'all' ? CATEGORY_META[tab.key] : null
            return (
              <motion.button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className="px-4 py-2 text-[11px] font-mono font-semibold tracking-widest rounded transition-all duration-200"
                style={{
                  background: isActive
                    ? (catMeta ? `${catMeta.color}20` : 'rgba(220,20,60,0.15)')
                    : 'transparent',
                  color: isActive
                    ? (catMeta ? catMeta.color : '#dc143c')
                    : 'rgba(148,163,184,0.7)',
                  border: isActive
                    ? `1px solid ${catMeta ? catMeta.borderColor : 'rgba(220,20,60,0.5)'}`
                    : '1px solid transparent',
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {tab.label}
                {tab.key !== 'all' && (
                  <span className="ml-1.5 opacity-60">
                    ({SIGNALS.filter(s => s.category === tab.key).length})
                  </span>
                )}
              </motion.button>
            )
          })}
          <span className="ml-auto text-[10px] font-mono text-text-muted pr-2">
            {filtered.length} / {SIGNALS.length} rules
          </span>
        </motion.div>

        {/* ── Rule Cards ── */}
        {Object.entries(grouped).map(([cat, rules]) => {
          const catMeta = CATEGORY_META[cat]
          const Icon = catMeta.icon
          return (
            <div key={cat} className="mb-8">
              {/* Category heading */}
              <motion.div
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                className="flex items-center gap-2.5 mb-4"
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ background: `${catMeta.color}20`, border: `1px solid ${catMeta.borderColor}` }}
                >
                  <Icon size={11} style={{ color: catMeta.color }} />
                </div>
                <h2
                  className="text-lg tracking-widest"
                  style={{
                    fontFamily: "'Bebas Neue', monospace",
                    color: catMeta.color,
                    letterSpacing: '0.1em',
                  }}
                >
                  {catMeta.label}
                </h2>
                <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(to right, ${catMeta.color}30, transparent)` }} />
                <span className="text-[10px] font-mono text-text-muted">{rules.length} rules</span>
              </motion.div>

              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid gap-3 md:grid-cols-2"
              >
                {rules.map((signal) => (
                  <RuleCard key={signal.id} signal={signal} />
                ))}
              </motion.div>
            </div>
          )
        })}

        {/* Legend */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="mt-4 pt-6 border-t border-white/5 flex items-center gap-6 flex-wrap"
        >
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Confidence levels:</span>
          {[
            { label: 'Deterministic', color: '#22c55e', desc: 'Observable fact — high certainty' },
            { label: 'Heuristic',     color: '#d4af37', desc: 'Pattern-based — may have false positives' },
            { label: 'ML-Assist',     color: '#a78bfa', desc: 'Model-scored — auxiliary evidence only' },
          ].map(({ label, color, desc }) => (
            <div key={label} className="flex items-center gap-2" title={desc}>
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] font-mono" style={{ color }}>{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </Layout>
  )
}
