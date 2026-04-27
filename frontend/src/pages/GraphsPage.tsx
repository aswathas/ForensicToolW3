import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Zap, TrendingUp, ShieldOff, Settings,
  RefreshCw, Shield, ArrowRight, ChevronDown,
  SearchX, Clock, BarChart3, Network, Layers,
} from 'lucide-react'
import { Layout } from '../components/Layout/Layout'
import { fadeInUp, staggerContainer } from '../components/animations/variants'
import { GradientBackground } from '../components/ui/paper-design-shader-background'
import { EtherealShadow } from '../components/ui/etheral-shadow'
import api from '../utils/api'

// ── Types ──────────────────────────────────────────────────────────────────

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
}

// ── Attack info map ────────────────────────────────────────────────────────

interface AttackInfo {
  title: string
  description: string
  icon: React.FC<{ size?: number; style?: React.CSSProperties }>
  color: string
}

const ATTACK_INFO: Record<string, AttackInfo> = {
  reentrancy: {
    title: 'Reentrancy Attack',
    description: "The attacker's contract called back into the victim's contract before the first transaction finished — like withdrawing money twice before the bank records the first withdrawal.",
    icon: RefreshCw,
    color: '#dc143c',
  },
  flashloan: {
    title: 'Flash Loan Attack',
    description: 'The attacker borrowed millions of dollars, manipulated prices using that temporary liquidity, then repaid everything in the same transaction — pocketing the difference.',
    icon: Zap,
    color: '#38bdf8',
  },
  oracle: {
    title: 'Oracle Manipulation',
    description: "The attacker fed false price data to smart contracts, causing them to make decisions based on wrong information — like hacking a bank's exchange rate display.",
    icon: TrendingUp,
    color: '#f97316',
  },
  approval: {
    title: 'Approval Exploit',
    description: 'A malicious contract was granted unlimited permission to spend tokens. The attacker then drained the entire balance at will.',
    icon: ShieldOff,
    color: '#d4af37',
  },
  admin: {
    title: 'Admin Takeover',
    description: "The attacker gained admin privileges and silently replaced the contract's core logic, redirecting all funds to their wallet.",
    icon: Settings,
    color: '#a78bfa',
  },
  price: {
    title: 'Price Manipulation',
    description: 'Spot prices in liquidity pools were manipulated to create artificial arbitrage opportunities that drained protocol reserves.',
    icon: TrendingUp,
    color: '#f97316',
  },
}

function getAttackInfo(attackName: string): AttackInfo {
  const lower = attackName.toLowerCase()
  for (const [key, info] of Object.entries(ATTACK_INFO)) {
    if (lower.includes(key)) return info
  }
  return {
    title: attackName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: 'A suspicious pattern was detected and recorded by the forensic engine.',
    icon: AlertTriangle,
    color: '#94a3b8',
  }
}

// ── Address truncation ─────────────────────────────────────────────────────

function truncAddr(addr: string): string {
  if (!addr || addr === '—') return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// ── GraphsPage ─────────────────────────────────────────────────────────────

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
    api.getForensicRun(selectedRun).then((raw) => {
      // raw is ForensicBundle; run_meta lives on the raw server response but
      // may not be typed — cast to access it safely
      const anyRaw = raw as unknown as Record<string, unknown>
      const meta = (anyRaw?.run_meta as Record<string, unknown>) ?? {}
      setSummary({
        runId: selectedRun,
        attacks: (meta.attacks as AttackEntry[]) ?? [],
        scenario: (meta.scenario as string) ?? 'unknown',
        blockRange: (meta.block_range as { from: number; to: number }) ?? { from: 0, to: 0 },
        contracts: (meta.contracts as Record<string, string>) ?? {},
        timestamp: (meta.started_at as string) ?? '',
      })
    }).catch(() => setSummary(null)).finally(() => setLoading(false))
  }, [selectedRun])

  const succeeded = summary?.attacks.filter(a => a.status === 'ok') ?? []
  const failed = summary?.attacks.filter(a => a.status !== 'ok') ?? []
  const blockCount = summary ? summary.blockRange.to - summary.blockRange.from : 0

  const uniqueAttackTypes = summary
    ? [...new Map(summary.attacks.map(a => [a.attack.split('_')[0].toLowerCase(), a])).values()]
    : []

  const contractEntries = Object.entries(summary?.contracts ?? {})

  return (
    <Layout>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        {/* Fixed ethereal background — same as Investigation page */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <EtherealShadow color="rgba(130, 12, 28, 0.85)" animation={{ scale: 90, speed: 50 }} noise={{ opacity: 0.35, scale: 1 }} />
        </div>
        {/* All existing content */}
        <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── HERO SECTION ── */}
        <div style={{ position: 'relative', minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '60px 40px', isolation: 'isolate' }}>
          <GradientBackground
            colors={['hsl(0, 85%, 35%)', 'hsl(14, 100%, 45%)', 'hsl(350, 80%, 28%)']}
            colorBack="hsl(0, 0%, 2%)"
            intensity={0.38}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.60)', zIndex: 0 }} />

          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 700 }}>
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 20 }}>
                FORENSIC ANALYSIS
              </span>
            </motion.div>

            {summary ? (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(72px, 12vw, 140px)', lineHeight: 1, color: succeeded.length > 0 ? '#dc143c' : '#22c55e', filter: `drop-shadow(0 0 30px ${succeeded.length > 0 ? 'rgba(220,20,60,0.4)' : 'rgba(34,197,94,0.4)'})` }}
                >
                  {succeeded.length}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 'clamp(20px, 3vw, 36px)', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.75)', marginBottom: 24 }}
                >
                  Attack{succeeded.length !== 1 ? 's' : ''} Detected &amp; Analyzed
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 32 }}
                >
                  {uniqueAttackTypes.map(atk => {
                    const info = getAttackInfo(atk.attack)
                    return (
                      <span
                        key={atk.attack}
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '5px 12px', borderRadius: 20, background: `${info.color}18`, border: `1px solid ${info.color}40`, color: info.color }}
                      >
                        {info.title}
                      </span>
                    )
                  })}
                </motion.div>
              </>
            ) : !loading ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 32 }}>
                <SearchX size={40} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }} />
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)' }}>Select a forensic run to begin analysis</p>
              </motion.div>
            ) : null}

            {/* Run selector */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <motion.button
                onClick={() => setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 24, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
                whileHover={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}
              >
                {selectedRun ? `Analyzing run_${selectedRun.slice(0, 12)}…` : 'Select a run'}
                <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </motion.button>
              <AnimatePresence>
                {open && runs.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{ position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', minWidth: 260, background: 'rgba(2,3,8,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', zIndex: 200 }}
                  >
                    {runs.map(r => (
                      <button
                        key={r}
                        onClick={() => { setSelectedRun(r); setOpen(false) }}
                        style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: r === selectedRun ? '#dc143c' : 'rgba(255,255,255,0.5)', background: r === selectedRun ? 'rgba(220,20,60,0.08)' : 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        run_{r}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── LOADING ── */}
        {loading && (
          <div style={{ padding: '48px 40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 900, margin: '0 auto 24px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />
              ))}
            </div>
            <div className="skeleton" style={{ height: 200, borderRadius: 12, maxWidth: 900, margin: '0 auto' }} />
          </div>
        )}

        {!loading && summary && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            style={{ padding: '48px 40px', maxWidth: 1100, margin: '0 auto' }}
          >

            {/* ── WHAT HAPPENED ── */}
            <motion.section variants={fadeInUp} style={{ marginBottom: 56 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 32, letterSpacing: '0.08em', color: '#fff', marginBottom: 8 }}>
                What Happened in This Run
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 720, marginBottom: 32 }}>
                In this forensic simulation, <strong style={{ color: '#fff' }}>{summary.attacks.length} blockchain attack{summary.attacks.length !== 1 ? 's' : ''}</strong> were executed across <strong style={{ color: '#d4af37' }}>{blockCount.toLocaleString()} blocks</strong>.{' '}
                <strong style={{ color: '#dc143c' }}>{succeeded.length}</strong> succeeded and <strong style={{ color: '#94a3b8' }}>{failed.length}</strong> failed.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { label: 'Attacks Succeeded', value: succeeded.length, color: succeeded.length > 0 ? '#dc143c' : '#22c55e', glow: succeeded.length > 0 ? 'rgba(220,20,60,0.15)' : 'rgba(34,197,94,0.15)', icon: AlertTriangle },
                  { label: 'Attacks Blocked', value: failed.length, color: '#64748b', glow: 'rgba(100,116,139,0.1)', icon: Shield },
                  { label: 'Blocks Analyzed', value: blockCount, color: '#d4af37', glow: 'rgba(212,175,55,0.12)', icon: Layers },
                ].map(({ label, value, color, glow, icon: Icon }) => (
                  <motion.div
                    key={label}
                    variants={fadeInUp}
                    style={{ padding: '24px', borderRadius: 14, background: glow, border: `1px solid ${color}30`, backdropFilter: 'blur(8px)' }}
                    whileHover={{ boxShadow: `0 0 28px ${color}25` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Icon size={14} style={{ color }} />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{label}</span>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 48, color, lineHeight: 1 }}>
                      {typeof value === 'number' ? value.toLocaleString() : value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* ── ATTACK BREAKDOWN CARDS ── */}
            <motion.section variants={fadeInUp} style={{ marginBottom: 56 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 32, letterSpacing: '0.08em', color: '#fff', marginBottom: 8 }}>
                Detected Attack Types
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>What each attack does — in plain language</p>

              {summary.attacks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <BarChart3 size={32} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>No attack data available for this run</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {summary.attacks.map((atk, i) => {
                    const info = getAttackInfo(atk.attack)
                    const succeeded_atk = atk.status === 'ok'
                    return (
                      <motion.div
                        key={`${atk.attack}-${i}`}
                        variants={fadeInUp}
                        style={{ padding: '24px', borderRadius: 14, background: 'rgba(2,3,8,0.7)', border: `1px solid ${succeeded_atk ? info.color + '40' : 'rgba(255,255,255,0.07)'}`, backdropFilter: 'blur(12px)', borderLeft: `3px solid ${succeeded_atk ? info.color : '#374151'}` }}
                        whileHover={{ boxShadow: succeeded_atk ? `0 0 24px ${info.color}20` : 'none' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${info.color}15`, border: `1px solid ${info.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <info.icon size={18} style={{ color: info.color }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{info.title}</div>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: succeeded_atk ? info.color : '#6b7280', background: succeeded_atk ? `${info.color}15` : 'rgba(107,114,128,0.1)', border: `1px solid ${succeeded_atk ? info.color + '35' : 'rgba(107,114,128,0.2)'}`, padding: '2px 7px', borderRadius: 4 }}>
                              {succeeded_atk ? 'Succeeded' : 'Blocked'}
                            </span>
                          </div>
                        </div>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: 0 }}>{info.description}</p>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.section>

            {/* ── FUND FLOW (only for succeeded) ── */}
            {succeeded.length > 0 && (
              <motion.section variants={fadeInUp} style={{ marginBottom: 56 }}>
                <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 32, letterSpacing: '0.08em', color: '#fff', marginBottom: 8 }}>
                  How Funds Moved
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>Attacker → victim flow for succeeded attacks</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {succeeded.slice(0, 5).map((atk, i) => {
                    const info = getAttackInfo(atk.attack)
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.06 * i }}
                        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', borderRadius: 12, background: 'rgba(2,3,8,0.7)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '14px 18px', borderRadius: 10, background: 'rgba(220,20,60,0.08)', border: '1px solid rgba(220,20,60,0.3)', minWidth: 160 }}>
                          <AlertTriangle size={14} style={{ color: '#dc143c' }} />
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#dc143c', fontWeight: 700 }}>Attacker Wallet</span>
                          <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{truncAddr(atk.attacker ?? '—')}</code>
                        </div>

                        <motion.div
                          initial={{ scaleX: 0, opacity: 0 }}
                          animate={{ scaleX: 1, opacity: 1 }}
                          transition={{ delay: 0.2 + 0.06 * i, duration: 0.4 }}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, transformOrigin: 'left' }}
                        >
                          <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, rgba(220,20,60,0.5), ${info.color}50)` }} />
                          <ArrowRight size={14} style={{ color: info.color, flexShrink: 0 }} />
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Funds Drained</div>
                          <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${info.color}50, rgba(212,175,55,0.5))` }} />
                          <ArrowRight size={14} style={{ color: '#d4af37', flexShrink: 0 }} />
                        </motion.div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '14px 18px', borderRadius: 10, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)', minWidth: 160 }}>
                          <Shield size={14} style={{ color: '#d4af37' }} />
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#d4af37', fontWeight: 700 }}>Target Contract</span>
                          <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{truncAddr(atk.victim ?? '—')}</code>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 16 }}>
                  Ground truth flow. Full forensic fund-flow analysis with multi-hop tracing requires running the complete pipeline.
                </p>
              </motion.section>
            )}

            {/* ── ATTACK TIMELINE ── */}
            <motion.section variants={fadeInUp} style={{ marginBottom: 56 }}>
              <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 32, letterSpacing: '0.08em', color: '#fff', marginBottom: 8 }}>
                Attack Sequence
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>What happened, in order</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {summary.attacks.map((atk, i) => {
                  const info = getAttackInfo(atk.attack)
                  const ok = atk.status === 'ok'
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 10, background: 'rgba(2,3,8,0.6)', border: `1px solid ${ok ? info.color + '25' : 'rgba(255,255,255,0.05)'}`, backdropFilter: 'blur(8px)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? info.color : '#374151', boxShadow: ok ? `0 0 8px ${info.color}` : 'none', flexShrink: 0 }} />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                          <Clock size={9} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                          Event {i + 1}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, color: ok ? '#fff' : 'rgba(255,255,255,0.45)', fontWeight: ok ? 600 : 400 }}>
                          {info.title}
                        </span>
                        {atk.tx && (
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>
                            TX: {atk.tx.slice(0, 20)}…
                          </div>
                        )}
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: ok ? info.color : '#6b7280', background: ok ? `${info.color}15` : 'rgba(107,114,128,0.1)', border: `1px solid ${ok ? info.color + '35' : 'rgba(107,114,128,0.2)'}`, padding: '3px 9px', borderRadius: 4, flexShrink: 0 }}>
                        {ok ? 'Succeeded' : 'Blocked'}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </motion.section>

            {/* ── CONTRACTS ── */}
            {contractEntries.length > 0 && (
              <motion.section variants={fadeInUp} style={{ marginBottom: 56 }}>
                <h2 style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 32, letterSpacing: '0.08em', color: '#fff', marginBottom: 8 }}>
                  Contracts Involved
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>Smart contracts deployed in this simulation run</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {contractEntries.map(([name, addr]) => (
                    <div
                      key={name}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 10, background: 'rgba(2,3,8,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <Network size={14} style={{ color: '#d4af37', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500, marginBottom: 2 }}>{name}</div>
                        <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{truncAddr(addr)}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

          </motion.div>
        )}

        </div>
      </div>
    </Layout>
  )
}
