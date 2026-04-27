import React from 'react'
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  AbsoluteFill,
} from 'remotion'

// ── Design tokens ─────────────────────────────────────────────────────────────
const RED    = '#dc143c'
const GOLD   = '#d4af37'
const GREEN  = '#22c55e'
const DIM    = '#334155'
const BG     = '#020617'
const SURF   = '#0f172a'
const BORDER = '#1e293b'

// ── Helpers ───────────────────────────────────────────────────────────────────
function ease(frame: number, s: number, e: number, from: number, to: number) {
  return interpolate(frame, [s, e], [from, to], {
    easing: Easing.inOut(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}
function clamp(frame: number, s: number, e: number, from: number, to: number) {
  return interpolate(frame, [s, e], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

// ── Static data ───────────────────────────────────────────────────────────────
const SIGNALS = [
  { label: 'Reentrancy',    color: RED,      pct: 0.85 },
  { label: 'Flashloan',     color: '#38bdf8',pct: 0.30 },
  { label: 'Oracle/Price',  color: '#f97316',pct: 0.20 },
  { label: 'Fund Flow',     color: GREEN,    pct: 0.70 },
  { label: 'Admin/Upgrade', color: '#a78bfa',pct: 0.15 },
  { label: 'Approvals',     color: GOLD,     pct: 0.40 },
]

const ATTACKS = [
  { name: 'classic_reentrancy',    status: 'ok',     tx: '0x74e3411a…' },
  { name: 'cross_func_reentrancy', status: 'ok',     tx: '0x61f73813…' },
  { name: 'readonly_reentrancy',   status: 'ok',     tx: '0xc6e8f4bf…' },
  { name: 'erc777_hook',           status: 'failed', tx: '—' },
  { name: 'flashloan_price_manip', status: 'failed', tx: '—' },
]

// ── Grid + atmosphere ─────────────────────────────────────────────────────────
function Grid() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: `
        linear-gradient(rgba(220,20,60,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(220,20,60,0.03) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
    }} />
  )
}

function HeroBg({ frame }: { frame: number }) {
  const glow = Math.sin(frame * 0.05) * 0.5 + 0.5
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `radial-gradient(ellipse 60% 40% at 50% 0%, rgba(220,20,60,${0.06 + glow * 0.06}) 0%, transparent 70%)`,
    }} />
  )
}

function ScanLine({ frame }: { frame: number }) {
  const y = (frame * 4) % 720
  return (
    <div style={{
      position: 'absolute', top: y, left: 0, right: 0, height: 2,
      background: `linear-gradient(90deg, transparent, ${RED}25, transparent)`,
      pointerEvents: 'none', zIndex: 100,
    }} />
  )
}

// ── Scene 1: Init (0–60) ──────────────────────────────────────────────────────
function SceneInit({ frame }: { frame: number }) {
  const opacity = ease(frame, 0, 20, 0, 1)
  const logoScale = spring({ frame, fps: 30, config: { stiffness: 80, damping: 16 }, delay: 5 })
  const progress = clamp(frame, 10, 55, 0, 1)

  const lines = [
    { delay: 0,  text: '$ evm-forensics scan --run a636493477896e75', color: '#94a3b8' },
    { delay: 8,  text: '[✓] Loading raw bundle: 41 txs, 58 blocks',   color: GREEN },
    { delay: 16, text: '[✓] ABI bindings: 14 contracts indexed',       color: GREEN },
    { delay: 24, text: '[→] Firing 28 detection rules...',             color: GOLD },
    { delay: 32, text: '[!] SIGNAL: reentrancy.classic — CONFIRMED',   color: RED },
    { delay: 40, text: '[!] SIGNAL: reentrancy.cross_func — CONFIRMED',color: RED },
    { delay: 48, text: '[!] SIGNAL: reentrancy.readonly — CONFIRMED',  color: RED },
  ]

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Logo */}
      <div style={{
        position: 'absolute', top: 36, left: 52,
        display: 'flex', alignItems: 'center', gap: 10,
        transform: `scale(${logoScale})`, transformOrigin: 'left center',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 6,
          background: `${RED}20`, border: `1.5px solid ${RED}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>
          EVM<span style={{ color: RED }}>.</span>Forensics
        </span>
      </div>

      {/* Terminal */}
      <div style={{
        position: 'absolute', top: 90, left: 52, right: 52,
        background: SURF, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden',
      }}>
        <div style={{
          background: '#0a0f1e', padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 7,
          borderBottom: `1px solid ${BORDER}`,
        }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => (
            <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
          ))}
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569', marginLeft: 10 }}>
            evm-forensics — scan
          </span>
        </div>
        <div style={{ padding: '16px 18px', minHeight: 200 }}>
          {lines.map(({ delay, text, color }, i) => {
            if (frame < delay) return null
            return (
              <div key={i} style={{
                fontFamily: 'monospace', fontSize: 12, color, lineHeight: 1.9,
                opacity: clamp(frame, delay, delay + 5, 0, 1),
              }}>
                {text}
              </div>
            )
          })}
          {frame >= 10 && (
            <span style={{
              fontFamily: 'monospace', fontSize: 12, color: '#f1f5f9',
              opacity: Math.sin(frame * 0.4) > 0 ? 1 : 0,
            }}>█</span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div style={{ position: 'absolute', bottom: 44, left: 52, right: 52 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: 'monospace', fontSize: 10, color: '#475569', marginBottom: 6,
        }}>
          <span>Scanning blockchain data</span>
          <span style={{ color: RED }}>{Math.round(progress * 100)}%</span>
        </div>
        <div style={{ height: 2, background: BORDER, borderRadius: 1, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 1,
            background: `linear-gradient(90deg, ${RED}70, ${RED})`,
            width: `${progress * 100}%`,
            boxShadow: `0 0 6px ${RED}80`,
          }} />
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ── Scene 2: Signals (60–150) ─────────────────────────────────────────────────
function SceneSignals({ frame }: { frame: number }) {
  const lf = frame - 60
  const opacity = ease(lf, 0, 15, 0, 1)

  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{
        position: 'absolute', top: 32, left: 52,
        display: 'flex', alignItems: 'baseline', gap: 12,
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>
          SIGNAL ANALYSIS
        </span>
        <span style={{
          fontFamily: 'monospace', fontSize: 11, color: RED,
          border: `1px solid ${RED}60`, padding: '2px 7px', borderRadius: 3,
        }}>3 CRITICAL</span>
      </div>

      <div style={{
        position: 'absolute', top: 90, left: 52, right: 52,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        {SIGNALS.map(({ label, color, pct }, i) => {
          const d = i * 10
          const bw = ease(lf, d, d + 25, 0, pct * 100)
          const bo = clamp(lf, d, d + 8, 0, 1)
          const count = Math.round(clamp(lf, d + 5, d + 30, 0, pct * 28))
          return (
            <div key={label} style={{ opacity: bo }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginBottom: 5,
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color, fontWeight: 700 }}>
                  {count} signals
                </span>
              </div>
              <div style={{
                height: 24, background: BORDER, borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${color}25, ${color}70)`,
                  width: `${bw}%`,
                  boxShadow: `0 0 10px ${color}40`,
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Attack list */}
      <div style={{ position: 'absolute', bottom: 32, left: 52, right: 52 }}>
        <div style={{
          fontFamily: 'monospace', fontSize: 10, color: '#475569',
          marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2,
        }}>
          Ground Truth Attack Transactions
        </div>
        {ATTACKS.map(({ name, status, tx }, i) => (
          <div key={name} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            opacity: clamp(lf, 48 + i * 7, 55 + i * 7, 0, 1),
            marginBottom: 5, fontFamily: 'monospace', fontSize: 11,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: status === 'ok' ? RED : DIM,
              boxShadow: status === 'ok' ? `0 0 5px ${RED}` : 'none',
            }} />
            <span style={{ color: '#94a3b8', width: 180 }}>{name.replace(/_/g, ' ')}</span>
            <span style={{ color: status === 'ok' ? RED : '#475569', fontSize: 10, fontWeight: 700 }}>
              {status === 'ok' ? 'CONFIRMED' : 'FAILED'}
            </span>
            {status === 'ok' && (
              <span style={{ color: '#334155', fontSize: 10 }}>{tx}</span>
            )}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

// ── Scene 3: Fund Flow (150–240) ──────────────────────────────────────────────
function SceneFlow({ frame }: { frame: number }) {
  const lf = frame - 150
  const opacity = ease(lf, 0, 15, 0, 1)

  const ATK  = { x: 80,  y: 290, label: 'ATTACKER', addr: '0xbdEd0D2b…', color: RED }
  const VIC1 = { x: 480, y: 180, label: 'VICTIM 1', addr: '0x9fE46736…', color: GOLD }
  const VIC2 = { x: 480, y: 360, label: 'VICTIM 2', addr: '0xCf7Ed3Ac…', color: GOLD }
  const SINK = { x: 900, y: 265, label: 'SINK',     addr: '0x000dead…',  color: '#a78bfa' }
  const NODES = [ATK, VIC1, VIC2, SINK]

  const EDGES = [
    { from: ATK,  to: VIC1, label: '3.0 ETH', delay: 18 },
    { from: ATK,  to: VIC2, label: '3.0 ETH', delay: 30 },
    { from: VIC1, to: SINK, label: '6.0 ETH', delay: 50 },
    { from: VIC2, to: SINK, label: '3.0 ETH', delay: 60 },
  ]

  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{
        position: 'absolute', top: 32, left: 52,
        display: 'flex', alignItems: 'baseline', gap: 12,
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>
          FUND FLOW GRAPH
        </span>
        <span style={{
          fontFamily: 'monospace', fontSize: 11, color: GOLD,
          border: `1px solid ${GOLD}60`, padding: '2px 7px', borderRadius: 3,
        }}>TRACED</span>
      </div>

      <svg style={{ position: 'absolute', inset: 0 }} width="1280" height="720">
        {EDGES.map(({ from, to, label, delay }, i) => {
          if (lf < delay) return null
          const prog = ease(lf, delay, delay + 20, 0, 1)
          const mx = (from.x + to.x) / 2
          const my = Math.min(from.y, to.y) - 40
          const pathD = `M ${from.x + 130} ${from.y + 16} Q ${mx + 130} ${my} ${to.x} ${to.y + 16}`
          const pathLen = 350
          return (
            <g key={i}>
              <path
                d={pathD} fill="none" stroke={RED} strokeWidth="1.5"
                strokeDasharray={pathLen}
                strokeDashoffset={pathLen * (1 - prog)}
                opacity="0.55"
                style={{ filter: `drop-shadow(0 0 3px ${RED})` }}
              />
              {prog > 0.55 && (
                <text x={mx + 130} y={my - 6} textAnchor="middle"
                  fill={RED} fontSize="11" fontFamily="monospace" opacity={prog}>
                  {label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {NODES.map(({ x, y, label, addr, color }, i) => {
        const ns = spring({ frame: lf - i * 8, fps: 30, config: { stiffness: 200, damping: 18 } })
        return (
          <div key={label} style={{
            position: 'absolute', left: x, top: y,
            transform: `scale(${ns})`, transformOrigin: 'center',
            opacity: clamp(lf, i * 8, i * 8 + 10, 0, 1),
          }}>
            <div style={{
              background: SURF, border: `1.5px solid ${color}60`,
              borderRadius: 7, padding: '7px 12px',
              boxShadow: `0 0 14px ${color}25`, minWidth: 130,
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8' }}>{addr}</div>
            </div>
          </div>
        )
      })}

      <div style={{
        position: 'absolute', bottom: 32, left: 52, right: 52,
        display: 'flex', gap: 18,
        opacity: clamp(lf, 60, 72, 0, 1),
      }}>
        {[
          { label: 'Total Stolen', value: '9.0 ETH',  color: RED },
          { label: 'Attack Hops',  value: '2',         color: GOLD },
          { label: 'Unique Sinks', value: '1',         color: '#a78bfa' },
          { label: 'Confidence',   value: '97%',       color: GREEN },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: SURF, border: `1px solid ${BORDER}`, borderRadius: 7, padding: '8px 16px',
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#475569', marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color }}>{value}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

// ── Scene 4: Evidence Locked (240–300) ────────────────────────────────────────
function SceneEvidence({ frame }: { frame: number }) {
  const lf = frame - 240
  const opacity = ease(lf, 0, 15, 0, 1)
  const bs = spring({ frame: lf - 10, fps: 30, config: { stiffness: 120, damping: 14 } })

  const checks = [
    '28/28 detection rules evaluated',
    'Referential integrity: PASS',
    'SHA256 checksums: VERIFIED',
    'Evidence chain: COMPLETE',
    'Report generated: forensic_report.md',
  ]

  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: `translate(-50%, -50%) scale(${bs})`, textAlign: 'center',
      }}>
        <div style={{
          width: 68, height: 68, borderRadius: '50%',
          background: `${RED}15`, border: `2px solid ${RED}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
          boxShadow: `0 0 36px ${RED}40`,
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" stroke={GREEN} strokeWidth="2.5" />
          </svg>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 900, color: '#f1f5f9', marginBottom: 6 }}>
          EVIDENCE LOCKED
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569', marginBottom: 28 }}>
          run_a636493477896e75 · 2026-04-27
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'flex-start' }}>
          {checks.map((text, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              opacity: clamp(lf, 15 + i * 7, 22 + i * 7, 0, 1),
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ── Main composition export ───────────────────────────────────────────────────
export const ForensicsAnimation: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const s1o = interpolate(frame, [0,5,50,65],   [0,1,1,0], { extrapolateLeft:'clamp', extrapolateRight:'clamp' })
  const s2o = interpolate(frame, [55,70,140,155],[0,1,1,0], { extrapolateLeft:'clamp', extrapolateRight:'clamp' })
  const s3o = interpolate(frame, [145,160,230,245],[0,1,1,0],{ extrapolateLeft:'clamp', extrapolateRight:'clamp' })
  const s4o = interpolate(frame, [240,255,290,300],[0,1,1,0],{ extrapolateLeft:'clamp', extrapolateRight:'clamp' })

  return (
    <AbsoluteFill style={{ background: BG, overflow: 'hidden' }}>
      <Grid />
      <HeroBg frame={frame} />
      <ScanLine frame={frame} />

      <div style={{ position: 'absolute', inset: 0, opacity: s1o }}><SceneInit frame={frame} /></div>
      <div style={{ position: 'absolute', inset: 0, opacity: s2o }}><SceneSignals frame={frame} /></div>
      <div style={{ position: 'absolute', inset: 0, opacity: s3o }}><SceneFlow frame={frame} /></div>
      <div style={{ position: 'absolute', inset: 0, opacity: s4o }}><SceneEvidence frame={frame} /></div>

      {/* Live indicator */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        fontFamily: 'monospace', fontSize: 10, color: '#1e293b',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <div style={{
          width: 5, height: 5, borderRadius: '50%', background: RED,
          boxShadow: `0 0 4px ${RED}`,
          opacity: Math.sin(frame * 0.2) > 0 ? 1 : 0.3,
        }} />
        LIVE · {Math.floor(frame / fps)}s
      </div>
    </AbsoluteFill>
  )
}
