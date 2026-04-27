import React from 'react'
import {
  AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Easing,
} from 'remotion'

// ── helpers ───────────────────────────────────────────────────────────────────
const f = (frame: number, [s, e]: [number, number], [from, to]: [number, number], ease = Easing.out(Easing.cubic)) =>
  interpolate(frame, [s, e], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })

// ── deterministic seed ────────────────────────────────────────────────────────
const seed = (n: number) => { const x = Math.sin(n + 31.41) * 10000; return x - Math.floor(x) }

// ── colors ────────────────────────────────────────────────────────────────────
const RED    = '#dc143c'
const GOLD   = '#d4af37'
const CYAN   = '#38bdf8'
const BLACK  = '#020617'
const NAVY   = '#0f172a'
const SLATE  = '#64748b'
const DIM    = '#1e293b'
const AMBER  = '#f59e0b'
// GREEN removed (unused)

// ── Node definitions (deterministic positions in 1920x1080) ──────────────────
// Canvas area: 200..1720 x 120..960
const CX = 960
const CY = 540

const NODES = [
  { id: 'ATTACKER',     label: 'ATTACKER',     role: 'attacker',      x: CX - 580, y: CY - 60,  baseColor: RED,    roleColor: RED    },
  { id: 'PROTOCOL',     label: 'PROTOCOL',     role: 'contract',      x: CX,       y: CY - 200, baseColor: CYAN,   roleColor: CYAN   },
  { id: 'VICTIM-1',     label: 'VICTIM-1',     role: 'victim',        x: CX + 300, y: CY - 100, baseColor: '#6366f1', roleColor: AMBER },
  { id: 'VICTIM-2',     label: 'VICTIM-2',     role: 'victim',        x: CX + 200, y: CY + 180, baseColor: '#6366f1', roleColor: AMBER },
  { id: 'INTERMEDIARY', label: 'INTERMEDIARY', role: 'intermediary',  x: CX - 160, y: CY + 200, baseColor: SLATE,  roleColor: SLATE  },
  { id: 'SINK-1',       label: 'SINK-1',       role: 'sink',          x: CX + 520, y: CY + 40,  baseColor: '#475569', roleColor: RED  },
  { id: 'SINK-2',       label: 'SINK-2',       role: 'sink',          x: CX + 420, y: CY - 260, baseColor: '#475569', roleColor: RED  },
  { id: 'BRIDGE',       label: 'BRIDGE',       role: 'bridge',        x: CX - 280, y: CY - 280, baseColor: GOLD,   roleColor: GOLD   },
]

// ── Edges: [from, to, label, color, width, animPhase (0..1 time within 600f)] ─
const EDGES = [
  { from: 0, to: 7,  label: 'ROUTE',      color: GOLD,   w: 1.5, startF: 30,  endF: 90,  totalLen: 380 },
  { from: 7, to: 1,  label: 'ENTRY',      color: CYAN,   w: 2,   startF: 80,  endF: 140, totalLen: 420 },
  { from: 1, to: 2,  label: '80 ETH',     color: AMBER,  w: 2.5, startF: 140, endF: 210, totalLen: 330 },
  { from: 1, to: 3,  label: '60 ETH',     color: AMBER,  w: 2,   startF: 160, endF: 230, totalLen: 380 },
  { from: 0, to: 4,  label: 'REENTER',    color: RED,    w: 3,   startF: 200, endF: 280, totalLen: 460 },
  { from: 4, to: 5,  label: '115 ETH',    color: RED,    w: 2.5, startF: 290, endF: 360, totalLen: 490 },
  { from: 2, to: 5,  label: '78 ETH',     color: SLATE,  w: 1.5, startF: 340, endF: 400, totalLen: 330 },
  { from: 3, to: 6,  label: '55 ETH',     color: SLATE,  w: 1.5, startF: 370, endF: 430, totalLen: 410 },
  { from: 5, to: 6,  label: 'CONSOLIDATE',color: '#475569', w: 1, startF: 440, endF: 490, totalLen: 280 },
]

// ── Phase transitions ────────────────────────────────────────────────────────
// 0–20:   fade in
// 20–100: attack routing starts
// 100–300: main reentrancy flow
// 300–450: extraction
// 450–520: alert overlay
// 520–570: reset / fade
// 570–600: loop back (fade out everything for seamless loop)

// ── Hex grid background ───────────────────────────────────────────────────────
const HexGrid: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const HEX_R = 28
  const HEX_W = HEX_R * 2
  const HEX_H = HEX_R * Math.sqrt(3)
  const cols = Math.ceil(1920 / HEX_W) + 2
  const rows = Math.ceil(1080 / HEX_H) + 2

  const hexPath = (cx: number, cy: number) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30)
      return `${cx + HEX_R * Math.cos(a)},${cy + HEX_R * Math.sin(a)}`
    })
    return `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(' ')} Z`
  }

  const hexes: React.ReactNode[] = []
  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const cx = col * HEX_W * 0.75
      const cy = row * HEX_H + (col % 2 === 0 ? 0 : HEX_H / 2)
      hexes.push(
        <path key={`${row}-${col}`} d={hexPath(cx, cy)}
          fill="none" stroke="rgba(30,41,59,0.5)" strokeWidth="0.5" />
      )
    }
  }

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }}>
      {hexes}
      {/* Vignette overlay */}
      <defs>
        <radialGradient id="hexVig" cx="50%" cy="50%">
          <stop offset="30%" stopColor="transparent" />
          <stop offset="100%" stopColor={BLACK} stopOpacity="0.8" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#hexVig)" />
    </svg>
  )
}

// ── Connection line between two nodes (dormant, always visible) ───────────────
const getNodeCenter = (i: number) => ({ x: NODES[i].x, y: NODES[i].y })

// ── Animated edge ─────────────────────────────────────────────────────────────
const AnimatedEdge: React.FC<{
  edge: typeof EDGES[0]; frame: number; idx: number
}> = ({ edge, frame, idx }) => {
  const fromN = getNodeCenter(edge.from)
  const toN   = getNodeCenter(edge.to)

  const cp = {
    x: (fromN.x + toN.x) / 2 + (seed(idx * 3) - 0.5) * 100,
    y: (fromN.y + toN.y) / 2 + (seed(idx * 7) - 0.5) * 100,
  }

  const dormantOp = f(frame, [0, 20], [0, 0.15])
  const activeProgress = f(frame, [edge.startF, edge.endF], [0, 1])
  const isActive = frame >= edge.startF && frame < edge.endF + 60

  const pathD = `M${fromN.x},${fromN.y} Q${cp.x},${cp.y} ${toN.x},${toN.y}`

  return (
    <g>
      {/* Dormant line */}
      <path d={pathD} fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="1" opacity={dormantOp} />

      {/* Active animated line */}
      {frame >= edge.startF && (
        <>
          <defs>
            <marker id={`arrow-${idx}`} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill={edge.color} opacity={activeProgress > 0.8 ? 1 : 0} />
            </marker>
          </defs>
          <path
            d={pathD}
            fill="none"
            stroke={edge.color}
            strokeWidth={edge.w}
            strokeDasharray={edge.totalLen}
            strokeDashoffset={edge.totalLen * (1 - activeProgress)}
            strokeLinecap="round"
            opacity={isActive ? 1 : 0.35}
            markerEnd={activeProgress > 0.85 ? `url(#arrow-${idx})` : undefined}
            style={{ filter: isActive ? `drop-shadow(0 0 5px ${edge.color})` : 'none' }}
          />
          {/* Glow copy */}
          {isActive && (
            <path
              d={pathD}
              fill="none"
              stroke={edge.color}
              strokeWidth={edge.w * 2.5}
              strokeDasharray={edge.totalLen}
              strokeDashoffset={edge.totalLen * (1 - activeProgress)}
              strokeLinecap="round"
              opacity={0.15}
              style={{ filter: `blur(4px)` }}
            />
          )}
          {/* Edge label at midpoint when progress > 0.5 */}
          {activeProgress > 0.5 && (
            <text
              x={cp.x} y={cp.y - 10}
              fill={edge.color} fillOpacity={0.9}
              fontSize="11" fontFamily="JetBrains Mono, monospace"
              textAnchor="middle" letterSpacing="1"
              style={{ filter: `drop-shadow(0 0 4px ${edge.color})` }}
            >
              {edge.label}
            </text>
          )}
        </>
      )}
    </g>
  )
}

// ── Node circle ───────────────────────────────────────────────────────────────
const NodeCircle: React.FC<{ node: typeof NODES[0]; frame: number; nodeIdx?: number }> = ({ node, frame }) => {
  const isAttacker     = node.role === 'attacker'
  const isVictim       = node.role === 'victim'
  const isSink         = node.role === 'sink'

  // Determine activation state
  const attackerActive  = frame >= 20 && frame < 520
  const victimHit       = frame >= 200 && frame < 520
  const sinkFull        = frame >= 380 && frame < 520
  const intermediaryLit = frame >= 200 && frame < 420
  const protocolHit     = frame >= 80  && frame < 300

  let activeColor = node.baseColor
  let glowIntensity = 0
  let pulseMult = 1

  if (isAttacker && attackerActive) {
    activeColor = RED
    glowIntensity = 0.8 + Math.sin(frame / 10) * 0.2
    pulseMult = 1 + Math.sin(frame / 8) * 0.06
  } else if (isVictim && victimHit) {
    activeColor = frame >= 300 ? RED : AMBER
    glowIntensity = 0.6 + Math.sin(frame / 12) * 0.2
    pulseMult = 1 + Math.sin(frame / 10) * 0.04
  } else if (isSink && sinkFull) {
    activeColor = RED
    glowIntensity = 0.9 + Math.sin(frame / 7) * 0.1
    pulseMult = 1 + Math.sin(frame / 6) * 0.08
  } else if (node.role === 'intermediary' && intermediaryLit) {
    activeColor = RED
    glowIntensity = 0.5 + Math.sin(frame / 14) * 0.15
  } else if (node.role === 'contract' && protocolHit) {
    activeColor = AMBER
    glowIntensity = 0.4 + Math.sin(frame / 16) * 0.15
  } else if (node.role === 'bridge') {
    activeColor = GOLD
    glowIntensity = frame >= 30 && frame < 200 ? 0.5 + Math.sin(frame / 12) * 0.2 : 0.15
  }

  const appearOp = f(frame, [0, 25], [0, 1])
  const resetOp  = f(frame, [520, 570], [1, 0])
  const opacity  = appearOp * resetOp

  const R = 36

  // Role indicator dot
  const roleDotColor = isAttacker ? RED : isVictim ? GOLD : isSink ? RED : SLATE

  return (
    <g transform={`translate(${node.x},${node.y}) scale(${pulseMult})`} opacity={opacity}>
      {/* Outer ring glow when active */}
      {glowIntensity > 0 && (
        <circle r={R + 16} fill="none" stroke={activeColor}
          strokeWidth="1" opacity={glowIntensity * 0.4}
          style={{ filter: `blur(3px)` }} />
      )}
      {/* Main circle */}
      <circle r={R} fill={NAVY} stroke={activeColor}
        strokeWidth={glowIntensity > 0.5 ? 2 : 1.2}
        style={{
          filter: glowIntensity > 0.3
            ? `drop-shadow(0 0 ${12 * glowIntensity}px ${activeColor})`
            : 'none',
        }}
      />
      {/* Inner fill glow */}
      <circle r={R - 3} fill={`${activeColor}${glowIntensity > 0.5 ? '18' : '08'}`} />
      {/* Role dot top-right */}
      <circle cx={R * 0.65} cy={-R * 0.65} r={5} fill={roleDotColor} opacity={0.9}
        style={{ filter: `drop-shadow(0 0 4px ${roleDotColor})` }} />
      {/* Label */}
      <text y={R + 18} textAnchor="middle"
        fill={glowIntensity > 0.3 ? activeColor : SLATE}
        fontSize="10" fontFamily="JetBrains Mono, monospace"
        letterSpacing="1.5" fontWeight="bold"
        style={{ filter: glowIntensity > 0.5 ? `drop-shadow(0 0 6px ${activeColor})` : 'none' }}>
        {node.label}
      </text>
      {/* Hex address stub */}
      <text y={R + 30} textAnchor="middle"
        fill="#1e293b" fontSize="7" fontFamily="JetBrains Mono, monospace">
        0x{node.id.slice(0, 4).toLowerCase()}...
      </text>
    </g>
  )
}

// ── REENTRANCY DETECTED alert ─────────────────────────────────────────────────
const AlertOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const lf  = frame - 450
  const op  = f(lf, [0, 20], [0, 1]) * f(lf, [50, 70], [1, 0])
  if (op <= 0) return null

  const scaleIn = f(lf, [0, 15], [0.7, 1], Easing.out(Easing.back(2)))
  const scanX   = f(lf, [10, 60], [-60, 1980])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 80, opacity: op, pointerEvents: 'none',
    }}>
      {/* Dark tinted overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} />

      {/* Scan line sweep */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: scanX, width: 120,
        background: `linear-gradient(to right, transparent, rgba(220,20,60,0.2), transparent)`,
        pointerEvents: 'none',
      }} />

      {/* Alert box */}
      <div style={{
        position: 'relative', zIndex: 10,
        transform: `scale(${scaleIn})`,
        background: 'rgba(15,23,42,0.95)',
        border: `2px solid ${RED}`,
        borderRadius: 6,
        padding: '40px 64px',
        textAlign: 'center',
        boxShadow: `0 0 80px rgba(220,20,60,0.5), 0 0 200px rgba(220,20,60,0.2), inset 0 0 40px rgba(220,20,60,0.05)`,
      }}>
        {/* Pulsing red corner indicators */}
        {[[0, 0], [0, 1], [1, 0], [1, 1]].map(([tx, ty], ci) => (
          <div key={ci} style={{
            position: 'absolute',
            top: tx === 0 ? -2 : undefined, bottom: tx === 1 ? -2 : undefined,
            left: ty === 0 ? -2 : undefined, right: ty === 1 ? -2 : undefined,
            width: 16, height: 16,
            borderTop: tx === 0 ? `3px solid ${RED}` : undefined,
            borderBottom: tx === 1 ? `3px solid ${RED}` : undefined,
            borderLeft: ty === 0 ? `3px solid ${RED}` : undefined,
            borderRight: ty === 1 ? `3px solid ${RED}` : undefined,
          }} />
        ))}

        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12, color: RED, letterSpacing: 6, marginBottom: 16,
          textShadow: `0 0 12px rgba(220,20,60,0.8)`,
        }}>
          ⚠  THREAT DETECTED
        </div>
        <div style={{
          fontFamily: "'Bebas Neue', monospace",
          fontSize: 72, color: RED, letterSpacing: 4, lineHeight: 1,
          textShadow: `0 0 40px rgba(220,20,60,0.9), 0 0 80px rgba(220,20,60,0.4)`,
        }}>
          REENTRANCY<br />DETECTED
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: SLATE, letterSpacing: 3, marginTop: 16,
        }}>
          RULE: REENT-001 · CONFIDENCE: 98% · 4 FUNDS AT RISK
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 40, marginTop: 20,
        }}>
          {['28 RULES', 'LIVE TRACE', 'EVIDENCE-LINKED'].map((t, i) => (
            <div key={i} style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9, color: GOLD, letterSpacing: 2,
              padding: '4px 12px',
              border: `1px solid rgba(212,175,55,0.3)`,
              borderRadius: 2,
            }}>{t}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Progress/phase indicator ──────────────────────────────────────────────────
const PhaseIndicator: React.FC<{ frame: number }> = ({ frame }) => {
  const phase =
    frame < 100 ? { label: 'INITIALIZING', color: CYAN } :
    frame < 200 ? { label: 'EXPLOIT ROUTING', color: GOLD } :
    frame < 350 ? { label: 'REENTRANCY ACTIVE', color: RED } :
    frame < 450 ? { label: 'FUND EXTRACTION', color: RED } :
    frame < 520 ? { label: 'ALERT TRIGGERED', color: RED } :
                  { label: 'LOOP RESET', color: SLATE }

  const op = f(frame, [0, 20], [0, 1]) * f(frame, [570, 600], [1, 0])

  return (
    <div style={{
      position: 'absolute', bottom: 48, left: 64,
      display: 'flex', alignItems: 'center', gap: 12,
      opacity: op, zIndex: 100,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: phase.color,
        boxShadow: `0 0 12px ${phase.color}`,
        animation: 'none',
      }} />
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10, color: phase.color, letterSpacing: 3,
      }}>
        {phase.label}
      </div>
      {/* Progress bar */}
      <div style={{ width: 120, height: 1.5, background: 'rgba(30,41,59,0.8)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${(frame / 600) * 100}%`,
          background: phase.color,
          boxShadow: `0 0 6px ${phase.color}`,
        }} />
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: SLATE }}>
        {Math.round((frame / 600) * 100)}%
      </div>
    </div>
  )
}

// ── Particle sparks along active edge ────────────────────────────────────────
const Sparks: React.FC<{ frame: number }> = ({ frame }) => {
  // When reentrancy is active (200–350f), emit sparks around attacker→intermediary edge
  if (frame < 195 || frame > 380) return null

  const lf = frame - 200
  const numSparks = 6
  const sparks = Array.from({ length: numSparks }, (_, i) => {
    const t  = ((lf * 0.02 + i / numSparks) % 1)
    const fx = NODES[0].x
    const fy = NODES[0].y
    const tx = NODES[4].x
    const ty = NODES[4].y
    const cpx = (fx + tx) / 2 + (seed(i * 3) - 0.5) * 100
    const cpy = (fy + ty) / 2 + (seed(i * 7) - 0.5) * 100

    // Quadratic bezier at t
    const bx = (1 - t) * (1 - t) * fx + 2 * (1 - t) * t * cpx + t * t * tx
    const by = (1 - t) * (1 - t) * fy + 2 * (1 - t) * t * cpy + t * t * ty
    const op = 0.6 + seed(i * 11 + lf * 0.1) * 0.4

    return (
      <circle key={i} cx={bx} cy={by} r={3 + seed(i * 5) * 3}
        fill={RED} opacity={op}
        style={{ filter: `drop-shadow(0 0 6px ${RED})` }} />
    )
  })

  return <g>{sparks}</g>
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROOT COMPOSITION — AttackViz  (600f @ 30fps = 20s loop)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const AttackViz: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  void fps

  const globalOp = f(frame, [0, 20], [0, 1]) * f(frame, [570, 600], [1, 0])

  // Red ambient build during attack
  const redBuild = frame >= 200 && frame < 450
    ? 0.05 + f(frame, [200, 350], [0, 0.1])
    : frame >= 450 && frame < 520
      ? 0.15 + Math.sin(frame / 4) * 0.04
      : 0

  return (
    <AbsoluteFill style={{ background: BLACK, overflow: 'hidden' }}>

      {/* Hex grid background */}
      <HexGrid opacity={0.6} />

      {/* Subtle scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.015) 3px, rgba(0,0,0,0.015) 6px)',
      }} />

      {/* Red ambient glow (attack phase) */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: `radial-gradient(ellipse 80% 70% at 40% 55%, rgba(220,20,60,${redBuild}) 0%, transparent 70%)`,
      }} />

      {/* Main SVG canvas */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 10, opacity: globalOp }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Edges */}
        {EDGES.map((edge, i) => (
          <AnimatedEdge key={i} edge={edge} frame={frame} idx={i} />
        ))}

        {/* Spark particles on reentrancy edge */}
        <Sparks frame={frame} />

        {/* Nodes */}
        {NODES.map((node, i) => (
          <NodeCircle key={i} node={node} frame={frame} nodeIdx={i} />
        ))}
      </svg>

      {/* Alert overlay */}
      <AlertOverlay frame={frame} />

      {/* Phase indicator */}
      <PhaseIndicator frame={frame} />

      {/* Top HUD */}
      <div style={{
        position: 'absolute', top: 48, left: 64, right: 64,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        zIndex: 50,
        opacity: f(frame, [0, 20], [0, 1]) * f(frame, [570, 600], [1, 0]),
      }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: SLATE, letterSpacing: 4, marginBottom: 6 }}>
            EVM.FORENSICS // ATTACK VISUALIZATION
          </div>
          <div style={{
            fontFamily: "'Bebas Neue', monospace",
            fontSize: 28, letterSpacing: 3,
            color: frame >= 200 ? RED : CYAN,
            textShadow: frame >= 200 ? `0 0 20px rgba(220,20,60,0.6)` : undefined,
          }}>
            REENTRANCY ATTACK SIMULATION
          </div>
        </div>

        {/* Live stats top-right */}
        <div style={{ display: 'flex', gap: 32, textAlign: 'right' }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 32, color: RED }}>
              {frame >= 200 ? (280 + Math.floor(f(frame, [200, 450], [0, 120]))) : '—'}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: SLATE, letterSpacing: 2 }}>
              ETH AT RISK
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: "'Bebas Neue', monospace", fontSize: 32,
              color: frame >= 350 ? RED : GOLD,
            }}>
              {frame >= 80 ? Math.min(9, Math.floor(f(frame, [80, 420], [0, 9]))) : '0'}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: SLATE, letterSpacing: 2 }}>
              SIGNALS FIRED
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: "'Bebas Neue', monospace", fontSize: 32,
              color: frame >= 350 ? RED : SLATE,
            }}>
              {frame >= 200 ? Math.round(f(frame, [200, 450], [0, 98])) : '0'}%
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: SLATE, letterSpacing: 2 }}>
              CONFIDENCE
            </div>
          </div>
        </div>
      </div>

      {/* Legend bottom-right */}
      <div style={{
        position: 'absolute', bottom: 48, right: 64,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
        zIndex: 50,
        opacity: f(frame, [0, 20], [0, 1]) * f(frame, [570, 600], [1, 0]),
      }}>
        {[
          { color: RED,   label: 'ATTACKER / EXPLOIT PATH' },
          { color: AMBER, label: 'VICTIM CONTRACTS' },
          { color: CYAN,  label: 'PROTOCOL ENTRY' },
          { color: GOLD,  label: 'BRIDGE / ROUTING' },
          { color: SLATE, label: 'SINK / LAUNDERING' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: SLATE, letterSpacing: 2 }}>
              {item.label}
            </div>
            <div style={{
              width: 20, height: 2, background: item.color,
              boxShadow: `0 0 6px ${item.color}80`,
            }} />
          </div>
        ))}
      </div>

      {/* Loop indicator (subtle) */}
      <div style={{
        position: 'absolute', bottom: 48, left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        opacity: f(frame, [0, 20], [0, 1]) * f(frame, [570, 600], [1, 0]),
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 8, color: DIM, letterSpacing: 3,
        }}>
          LOOP · 20s · 600f @ 30fps
        </div>
      </div>

    </AbsoluteFill>
  )
}
