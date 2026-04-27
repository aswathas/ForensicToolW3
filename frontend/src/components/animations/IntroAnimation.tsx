import React from 'react'
import {
  AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing,
} from 'remotion'

// ── helpers ──────────────────────────────────────────────────────────────────
const f = (frame: number, [s, e]: [number, number], [from, to]: [number, number], ease = Easing.out(Easing.cubic)) =>
  interpolate(frame, [s, e], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })

const sp = (frame: number, start: number, fps: number, cfg: object = {}) =>
  spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 120, mass: 0.8, ...cfg } })

// ── fake terminal lines ───────────────────────────────────────────────────────
const SCAN_LINES = [
  '> connecting to anvil rpc...',
  '> block window: 21437820 → 21437924',
  '> loading 36 derived datasets...',
  '> tx_enriched: 2,847 records',
  '> token_transfers: 412 records',
  '> approvals: 89 records',
  '> running signal engine: 28 rules',
]

const SIGNALS = [
  { id: 'REENT-001', label: 'Reentrancy — same-function loop', sev: 'CRITICAL', conf: 98 },
  { id: 'FLOW-004', label: 'Victim net outflow spike (>50 ETH)', sev: 'HIGH', conf: 91 },
  { id: 'APPR-002', label: 'Allowance drain burst (3 txs)', sev: 'HIGH', conf: 87 },
  { id: 'FLASH-001', label: 'Borrow-repay same transaction', sev: 'CRITICAL', conf: 99 },
]

const NODES = [
  { id: 'ATK', label: 'ATTACKER', x: 120, y: 160, color: '#dc143c' },
  { id: 'VIC', label: 'VICTIM CONTRACT', x: 480, y: 100, color: '#d4af37' },
  { id: 'SIN', label: 'SINK WALLET', x: 840, y: 200, color: '#64748b' },
  { id: 'MIX', label: 'MIXER', x: 700, y: 360, color: '#475569' },
]

const EDGES = [
  { from: 0, to: 1, label: '150 ETH flash', progress: 0 },
  { from: 1, to: 0, label: '149.8 ETH drained', progress: 0 },
  { from: 0, to: 2, label: '142 ETH', progress: 0 },
  { from: 2, to: 3, label: '140 ETH', progress: 0 },
]

// ── Grid background ───────────────────────────────────────────────────────────
const Grid: React.FC<{ opacity: number }> = ({ opacity }) => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }}>
    <defs>
      <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(30,41,59,0.6)" strokeWidth="0.5" />
      </pattern>
      <radialGradient id="gridFade" cx="50%" cy="50%">
        <stop offset="0%" stopColor="white" stopOpacity="0.3" />
        <stop offset="80%" stopColor="white" stopOpacity="0.05" />
      </radialGradient>
      <mask id="gridMask">
        <rect width="100%" height="100%" fill="url(#gridFade)" />
      </mask>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" mask="url(#gridMask)" />
  </svg>
)

// ── Scanline overlay ──────────────────────────────────────────────────────────
const Scanlines: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
    zIndex: 100,
  }} />
)

// ── Scene 1: BOOT (0–90f) ─────────────────────────────────────────────────────
const SceneBoot: React.FC<{ frame: number; fps: number }> = ({ frame }) => {
  const gridOpacity = f(frame, [0, 60], [0, 1])
  const textOpacity = f(frame, [20, 50], [0, 1])
  const blinkOn = Math.floor(frame / 15) % 2 === 0

  return (
    <AbsoluteFill style={{ background: '#020617', justifyContent: 'center', alignItems: 'center' }}>
      <Grid opacity={gridOpacity} />
      <div style={{ opacity: textOpacity, textAlign: 'center', fontFamily: 'monospace', zIndex: 10 }}>
        <div style={{ fontSize: 11, color: '#475569', letterSpacing: 4, marginBottom: 16 }}>
          INITIALIZING FORENSIC ENGINE
        </div>
        <div style={{
          fontSize: 13, color: '#22c55e', letterSpacing: 2,
          display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', opacity: blinkOn ? 1 : 0.2 }} />
          CONNECTING TO RPC
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ── Scene 2: TERMINAL SCAN (90–240f) ─────────────────────────────────────────
const SceneTerminal: React.FC<{ frame: number }> = ({ frame }) => {
  const localFrame = frame - 90
  const windowSlide = f(localFrame, [0, 25], [-40, 0])
  const windowOpacity = f(localFrame, [0, 20], [0, 1])
  const linesVisible = Math.floor(f(localFrame, [10, 130], [0, SCAN_LINES.length + 1]))
  const cursorBlink = Math.floor(localFrame / 12) % 2 === 0

  return (
    <AbsoluteFill style={{ background: '#020617', justifyContent: 'center', alignItems: 'center' }}>
      <Grid opacity={0.8} />
      {/* Corner badge */}
      <div style={{
        position: 'absolute', top: 40, left: 60, fontFamily: 'monospace', fontSize: 10,
        color: '#1e293b', letterSpacing: 3,
      }}>
        EVM.FORENSICS // CHAIN ANALYSIS ENGINE v2.0
      </div>
      {/* Terminal window */}
      <div style={{
        transform: `translateY(${windowSlide}px)`,
        opacity: windowOpacity,
        background: '#040d1a',
        border: '1px solid #1e293b',
        borderRadius: 8,
        width: 700,
        padding: '0 0 20px 0',
        boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 30px rgba(220,20,60,0.05)',
        zIndex: 10,
        overflow: 'hidden',
      }}>
        {/* Title bar */}
        <div style={{
          background: '#0a1628', borderBottom: '1px solid #1e293b',
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc143c', opacity: 0.8 }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d4af37', opacity: 0.6 }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', opacity: 0.4 }} />
          <span style={{ flex: 1, textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#334155' }}>
            forensics-engine — bash
          </span>
        </div>
        {/* Lines */}
        <div style={{ padding: '16px 20px', minHeight: 220 }}>
          {SCAN_LINES.slice(0, linesVisible).map((line, i) => (
            <div key={i} style={{
              fontFamily: 'monospace', fontSize: 13, color: '#22c55e',
              marginBottom: 8, lineHeight: 1.4,
            }}>
              {line}
            </div>
          ))}
          {linesVisible <= SCAN_LINES.length && (
            <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#22c55e' }}>
              {'> '}
              <span style={{ opacity: cursorBlink ? 1 : 0 }}>█</span>
            </span>
          )}
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ── Scene 3: ALERT (240–390f) ─────────────────────────────────────────────────
const SceneAlert: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const localFrame = frame - 240
  const flashOpacity = f(localFrame, [0, 8], [0.6, 0], Easing.out(Easing.quad))
  const alertScale = sp(localFrame, 5, fps, { stiffness: 200, damping: 14 })
  const alertOpacity = f(localFrame, [5, 20], [0, 1])
  const cardOpacity = f(localFrame, [25, 50], [0, 1])
  const cardY = f(localFrame, [25, 55], [20, 0])

  return (
    <AbsoluteFill style={{ background: '#020617', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 32 }}>
      <Grid opacity={0.6} />
      {/* Red flash on trigger */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(220,20,60,0.15)',
        opacity: flashOpacity,
        pointerEvents: 'none',
      }} />
      {/* Alert header */}
      <div style={{
        transform: `scale(${0.8 + alertScale * 0.2})`,
        opacity: alertOpacity,
        textAlign: 'center',
        zIndex: 10,
      }}>
        <div style={{
          fontFamily: 'monospace', fontSize: 11, color: '#dc143c',
          letterSpacing: 4, marginBottom: 12,
        }}>
          ⚠ THREAT DETECTED
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: 42, fontWeight: 900, color: '#dc143c',
          letterSpacing: -1,
          textShadow: '0 0 40px rgba(220,20,60,0.8), 0 0 80px rgba(220,20,60,0.4)',
        }}>
          REENTRANCY
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: 14, color: '#94a3b8',
          letterSpacing: 2, marginTop: 8,
        }}>
          ATTACK CONFIRMED — 28 RULES ACTIVE
        </div>
      </div>

      {/* Signal cards */}
      <div style={{
        opacity: cardOpacity,
        transform: `translateY(${cardY}px)`,
        display: 'flex', gap: 12, zIndex: 10,
      }}>
        {SIGNALS.map((sig) => (
          <div key={sig.id} style={{
            background: '#040d1a',
            border: `1px solid ${sig.sev === 'CRITICAL' ? 'rgba(220,20,60,0.5)' : 'rgba(212,175,55,0.3)'}`,
            borderRadius: 6,
            padding: '10px 14px',
            minWidth: 180,
          }}>
            <div style={{
              fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, marginBottom: 6,
              color: sig.sev === 'CRITICAL' ? '#dc143c' : '#d4af37',
            }}>
              {sig.sev} — {sig.id}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
              {sig.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                flex: 1, height: 2, background: '#0f172a', borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${sig.conf}%`,
                  background: sig.sev === 'CRITICAL' ? '#dc143c' : '#d4af37',
                  borderRadius: 2,
                }} />
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#475569' }}>{sig.conf}%</span>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

// ── Scene 4: FUND FLOW (390–510f) ─────────────────────────────────────────────
const SceneFundFlow: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const localFrame = frame - 390

  const titleOpacity = f(localFrame, [0, 20], [0, 1])

  const nodeOpacity = NODES.map((_, i) =>
    Math.min(1, sp(localFrame, i * 18, fps, { stiffness: 160, damping: 16 }))
  )

  const edgeProgress = EDGES.map((_, i) =>
    f(localFrame, [40 + i * 15, 80 + i * 15], [0, 1])
  )

  return (
    <AbsoluteFill style={{ background: '#020617', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <Grid opacity={0.5} />
      <div style={{ opacity: titleOpacity, fontFamily: 'monospace', fontSize: 11, color: '#475569', letterSpacing: 4, marginBottom: 32, zIndex: 10 }}>
        FUND FLOW TRACE — EVIDENCE LINKED
      </div>

      <div style={{ position: 'relative', width: 980, height: 460, zIndex: 10 }}>
        {/* SVG edges */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <marker id="arrowRed" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#dc143c" opacity="0.8" />
            </marker>
            <marker id="arrowGold" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#d4af37" opacity="0.6" />
            </marker>
          </defs>
          {EDGES.map((edge, i) => {
            const from = NODES[edge.from]
            const to = NODES[edge.to]
            const progress = edgeProgress[i]
            const cx = (from.x + to.x) / 2
            const cy = (from.y + to.y) / 2 - 40
            const pathD = `M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`
            const totalLen = 280
            return (
              <path
                key={i}
                d={pathD}
                fill="none"
                stroke={i < 2 ? '#dc143c' : '#d4af37'}
                strokeWidth={i < 2 ? 2 : 1.5}
                strokeOpacity={i < 2 ? 0.7 : 0.5}
                strokeDasharray={totalLen}
                strokeDashoffset={totalLen * (1 - progress)}
                markerEnd={i < 2 ? 'url(#arrowRed)' : 'url(#arrowGold)'}
              />
            )
          })}
        </svg>

        {/* Nodes */}
        {NODES.map((node, i) => (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: node.x - 60,
              top: node.y - 28,
              transform: `scale(${nodeOpacity[i]})`,
              opacity: nodeOpacity[i],
              background: '#040d1a',
              border: `1px solid ${node.color}60`,
              borderRadius: 6,
              padding: '8px 14px',
              minWidth: 120,
              textAlign: 'center',
              boxShadow: `0 0 20px ${node.color}20`,
            }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: node.color, letterSpacing: 2, marginBottom: 4 }}>
              {node.label}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#334155' }}>
              0x{node.id.toLowerCase()}...
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

// ── Scene 5: EVIDENCE LOCKED (510–570f) ───────────────────────────────────────
const SceneEvidenceLocked: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const localFrame = frame - 510
  const shieldScale = sp(localFrame, 0, fps, { stiffness: 140, damping: 12 })
  const shieldOpacity = f(localFrame, [0, 15], [0, 1])
  const textOpacity = f(localFrame, [20, 40], [0, 1])
  const itemsOpacity = f(localFrame, [35, 55], [0, 1])

  return (
    <AbsoluteFill style={{ background: '#020617', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 20 }}>
      <Grid opacity={0.4} />
      <div style={{ opacity: shieldOpacity, transform: `scale(${0.4 + shieldScale * 0.6})`, zIndex: 10 }}>
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
            stroke="#22c55e" strokeWidth="1.5" fill="rgba(34,197,94,0.1)"
            style={{ filter: 'drop-shadow(0 0 16px rgba(34,197,94,0.6))' }} />
          <path d="M9 12l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ opacity: textOpacity, textAlign: 'center', zIndex: 10 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 900, color: '#22c55e', letterSpacing: 4,
          textShadow: '0 0 30px rgba(34,197,94,0.6)' }}>
          EVIDENCE LOCKED
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569', marginTop: 8, letterSpacing: 2 }}>
          FORENSIC REPORT — INTEGRITY VERIFIED — SHA256 CONFIRMED
        </div>
      </div>
      <div style={{ opacity: itemsOpacity, display: 'flex', gap: 20, zIndex: 10 }}>
        {['28 SIGNALS CHECKED', '4 INCIDENTS CLUSTERED', 'EVIDENCE-LINKED REPORT'].map(item => (
          <div key={item} style={{
            fontFamily: 'monospace', fontSize: 10, color: '#22c55e', letterSpacing: 1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ color: '#22c55e' }}>✓</span> {item}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}

// ── Scene 6: LOGO REVEAL (570–600f) ───────────────────────────────────────────
const SceneLogoReveal: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const localFrame = frame - 570
  const logoScale = sp(localFrame, 0, fps, { stiffness: 100, damping: 14 })
  const logoOpacity = f(localFrame, [0, 12], [0, 1])
  const tagOpacity = f(localFrame, [15, 28], [0, 1])
  const enterOpacity = f(localFrame, [20, 30], [0, 1])

  return (
    <AbsoluteFill style={{ background: '#020617', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 16 }}>
      <Grid opacity={0.3} />
      {/* Logo glow bloom */}
      <div style={{
        position: 'absolute',
        width: 400, height: 200,
        background: 'radial-gradient(ellipse, rgba(220,20,60,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        opacity: logoOpacity, transform: `scale(${0.7 + logoScale * 0.3})`, zIndex: 10,
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'monospace', fontWeight: 900, fontSize: 64, color: '#f1f5f9',
          letterSpacing: -2, lineHeight: 1,
        }}>
          EVM<span style={{ color: '#dc143c', textShadow: '0 0 30px rgba(220,20,60,0.9)' }}>.</span>Forensics
        </div>
      </div>
      <div style={{ opacity: tagOpacity, textAlign: 'center', zIndex: 10 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#475569', letterSpacing: 4 }}>
          DETECT &nbsp;·&nbsp; TRACE &nbsp;·&nbsp; EXPOSE
        </div>
      </div>
      <div style={{
        opacity: enterOpacity, zIndex: 10,
        background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.4)',
        borderRadius: 6, padding: '8px 24px',
        fontFamily: 'monospace', fontSize: 11, color: '#dc143c', letterSpacing: 3,
      }}>
        ENTER INVESTIGATION
      </div>
    </AbsoluteFill>
  )
}

// ── Cross-scene fade helper ───────────────────────────────────────────────────
const SceneFade: React.FC<{ children: React.ReactNode; frame: number; inAt: number; outAt: number }> = ({
  children, frame, inAt, outAt,
}) => {
  const opacity = interpolate(frame, [inAt, inAt + 10, outAt - 10, outAt], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return <div style={{ position: 'absolute', inset: 0, opacity }}>{children}</div>
}

// ── Root composition ──────────────────────────────────────────────────────────
export const IntroAnimation: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ background: '#020617' }}>
      <Scanlines />
      <SceneFade frame={frame} inAt={0}   outAt={90}>  <SceneBoot       frame={frame} fps={fps} /></SceneFade>
      <SceneFade frame={frame} inAt={80}  outAt={240}>  <SceneTerminal   frame={frame} /></SceneFade>
      <SceneFade frame={frame} inAt={230} outAt={390}>  <SceneAlert      frame={frame} fps={fps} /></SceneFade>
      <SceneFade frame={frame} inAt={380} outAt={510}>  <SceneFundFlow   frame={frame} fps={fps} /></SceneFade>
      <SceneFade frame={frame} inAt={500} outAt={570}>  <SceneEvidenceLocked frame={frame} fps={fps} /></SceneFade>
      <SceneFade frame={frame} inAt={560} outAt={600}>  <SceneLogoReveal frame={frame} fps={fps} /></SceneFade>
    </AbsoluteFill>
  )
}
