import React from 'react'
import {
  AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing,
} from 'remotion'

// ── helpers ───────────────────────────────────────────────────────────────────
const f = (frame: number, [s, e]: [number, number], [from, to]: [number, number], ease = Easing.out(Easing.cubic)) =>
  interpolate(frame, [s, e], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })

const sp = (frame: number, start: number, fps: number, cfg: object = {}) =>
  spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 120, mass: 0.8, ...cfg } })

// ── colors ────────────────────────────────────────────────────────────────────
const RED   = '#dc143c'
const GOLD  = '#d4af37'
const WHITE = '#f8fafc'
const BLACK = '#000000'
const NAVY  = '#0f172a'
const SLATE = '#94a3b8'
const DIM   = '#334155'

// ── deterministic seed ────────────────────────────────────────────────────────
const seed = (n: number) => { const x = Math.sin(n) * 10000; return x - Math.floor(x) }
const HEX_CHARS = '0123456789ABCDEF'
const hexByte = (i: number) => HEX_CHARS[Math.floor(seed(i) * 16)] + HEX_CHARS[Math.floor(seed(i + 0.5) * 16)]

// ── Scanlines ─────────────────────────────────────────────────────────────────
const Scanlines: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 200,
    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
  }} />
)

// ── Heartbeat waveform ────────────────────────────────────────────────────────
const Heartbeat: React.FC<{ frame: number; opacity: number }> = ({ frame, opacity }) => {
  const W = 1920
  const H = 1080
  const cx = W / 2
  const cy = H / 2
  const progress = Math.min(1, frame / 60)

  // Generate a heartbeat waveform path
  const pts: string[] = []
  const totalWidth = 700
  const baseline = cy
  const steps = 200

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = cx - totalWidth / 2 + t * totalWidth
    let y = baseline

    // Heartbeat bump logic
    const rel = (t - 0.3) * 10
    if (t > 0.25 && t < 0.35) {
      y = baseline - Math.max(0, 1 - rel * rel) * 120 * 0.3
    } else if (t > 0.35 && t < 0.38) {
      y = baseline + Math.max(0, 1 - ((t - 0.365) * 30) ** 2) * 60
    } else if (t > 0.38 && t < 0.5) {
      y = baseline - Math.max(0, 1 - ((t - 0.42) * 12) ** 2) * 200
    } else if (t > 0.5 && t < 0.6) {
      y = baseline + Math.max(0, 1 - ((t - 0.53) * 15) ** 2) * 80
    } else if (t > 0.6 && t < 0.7) {
      y = baseline - Math.max(0, 1 - ((t - 0.64) * 18) ** 2) * 50
    }

    pts.push(`${i === 0 ? 'M' : 'L'}${x},${y}`)
  }

  const pathStr = pts.join(' ')
  const totalLen = 1400

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }}>
      <defs>
        <linearGradient id="hbGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={RED} stopOpacity="0" />
          <stop offset="30%" stopColor={RED} stopOpacity="0.8" />
          <stop offset="70%" stopColor={RED} stopOpacity="0.8" />
          <stop offset="100%" stopColor={RED} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={pathStr}
        fill="none"
        stroke="url(#hbGrad)"
        strokeWidth="2"
        strokeDasharray={totalLen}
        strokeDashoffset={totalLen * (1 - progress)}
        style={{ filter: `drop-shadow(0 0 8px ${RED})` }}
      />
      {/* Trailing glow copy */}
      <path
        d={pathStr}
        fill="none"
        stroke={RED}
        strokeWidth="1"
        strokeDasharray={totalLen}
        strokeDashoffset={totalLen * (1 - progress)}
        opacity="0.3"
        style={{ filter: `blur(3px)` }}
      />
    </svg>
  )
}

// ── Hex scroll background ─────────────────────────────────────────────────────
const HexScroll: React.FC<{ frame: number; scale?: number }> = ({ frame, scale = 1 }) => {
  const rows = Array.from({ length: 28 }, (_, row) => {
    const cols = Array.from({ length: 22 }, (_, col) => hexByte(row * 100 + col + frame * 0.3))
    return cols.join(' ')
  })

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: `scale(${scale})`,
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 16, color: RED,
        lineHeight: 2.2, letterSpacing: 4,
        opacity: 0.85,
        textAlign: 'center',
        whiteSpace: 'pre',
        userSelect: 'none',
      }}>
        {rows.map((row, i) => (
          <div key={i} style={{ opacity: 0.4 + seed(i * 37 + frame * 0.001) * 0.6 }}>{row}</div>
        ))}
      </div>
    </div>
  )
}

// ── Stats slam in ─────────────────────────────────────────────────────────────
const STATS = [
  { value: '$4.4B', label: 'LOST TO EXPLOITS', delay: 0 },
  { value: '126',   label: 'PROTOCOLS ATTACKED', delay: 60 },
  { value: 'ZERO',  label: 'FORENSICS GRADE TOOLS EXISTED', delay: 120 },
]

// ── Feature items for showcase ────────────────────────────────────────────────
const FEATURES_SHOWCASE = [
  {
    word: 'DETECT',
    sub: '28 heuristic rules — 6 attack categories',
    color: RED,
    icon: () => (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="24" stroke={RED} strokeWidth="2" opacity="0.4" />
        <circle cx="32" cy="32" r="16" stroke={RED} strokeWidth="2" opacity="0.6" />
        <circle cx="32" cy="32" r="8"  stroke={RED} strokeWidth="2.5" />
        <circle cx="32" cy="32" r="3"  fill={RED} />
        <line x1="32" y1="4"  x2="32" y2="14" stroke={RED} strokeWidth="2" />
        <line x1="32" y1="50" x2="32" y2="60" stroke={RED} strokeWidth="2" />
        <line x1="4"  y1="32" x2="14" y2="32" stroke={RED} strokeWidth="2" />
        <line x1="50" y1="32" x2="60" y2="32" stroke={RED} strokeWidth="2" />
      </svg>
    ),
  },
  {
    word: 'TRACE',
    sub: 'Fund flow arrows — full money trail',
    color: GOLD,
    icon: () => (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="10" cy="32" r="6" fill={GOLD} opacity="0.9" />
        <circle cx="32" cy="16" r="6" fill={GOLD} opacity="0.7" />
        <circle cx="54" cy="32" r="6" fill={GOLD} opacity="0.5" />
        <circle cx="32" cy="48" r="6" fill={GOLD} opacity="0.4" />
        <path d="M16 32 Q24 16 26 16" stroke={GOLD} strokeWidth="2" fill="none" markerEnd="url(#tfArrow)" />
        <path d="M38 16 Q54 16 48 32" stroke={GOLD} strokeWidth="2" fill="none" markerEnd="url(#tfArrow)" />
        <path d="M54 38 Q54 54 38 48" stroke={GOLD} strokeWidth="2" fill="none" markerEnd="url(#tfArrow)" />
        <defs>
          <marker id="tfArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={GOLD} />
          </marker>
        </defs>
      </svg>
    ),
  },
  {
    word: 'SCORE',
    sub: 'ML risk vectors — entity-level scoring',
    color: '#a855f7',
    icon: () => {
      const purple = '#a855f7'
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="4" y="44" width="8" height="16" rx="2" fill={purple} opacity="0.3" />
          <rect x="16" y="32" width="8" height="28" rx="2" fill={purple} opacity="0.5" />
          <rect x="28" y="20" width="8" height="40" rx="2" fill={purple} opacity="0.7" />
          <rect x="40" y="10" width="8" height="50" rx="2" fill={purple} opacity="0.85" />
          <rect x="52" y="4"  width="8" height="56" rx="2" fill={purple} />
          <line x1="4" y1="60" x2="60" y2="60" stroke={purple} strokeWidth="1" opacity="0.4" />
          <path d="M4 44 L16 32 L28 20 L40 10 L60 4" stroke={purple} strokeWidth="2" fill="none"
            style={{ filter: `drop-shadow(0 0 4px ${purple})` }} />
        </svg>
      )
    },
  },
  {
    word: 'REPORT',
    sub: 'Evidence-linked · Audit-ready · Reproducible',
    color: '#22c55e',
    icon: () => {
      const green = '#22c55e'
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="10" y="4" width="44" height="56" rx="3" stroke={green} strokeWidth="2" fill="none" opacity="0.5" />
          <line x1="18" y1="18" x2="46" y2="18" stroke={green} strokeWidth="2" opacity="0.8" />
          <line x1="18" y1="28" x2="46" y2="28" stroke={green} strokeWidth="1.5" opacity="0.6" />
          <line x1="18" y1="38" x2="38" y2="38" stroke={green} strokeWidth="1.5" opacity="0.5" />
          <circle cx="22" cy="50" r="4" stroke={green} strokeWidth="2" />
          <path d="M20 50l1.5 1.5L24 48" stroke={green} strokeWidth="1.5" strokeLinecap="round" />
          <rect x="38" y="46" width="16" height="10" rx="2" fill={green} opacity="0.2"
            style={{ filter: `drop-shadow(0 0 6px ${green})` }} />
          <text x="46" y="53" fill={green} fontSize="6" fontFamily="monospace" textAnchor="middle">100%</text>
        </svg>
      )
    },
  },
  {
    word: 'ANALYZE',
    sub: 'AI copilot — grounded in forensic reports',
    color: '#38bdf8',
    icon: () => {
      const cyan = '#38bdf8'
      return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="4"  y="8"  width="36" height="20" rx="4" fill={cyan} fillOpacity="0.15" stroke={cyan} strokeWidth="1.5" />
          <rect x="24" y="36" width="36" height="20" rx="4" fill={cyan} fillOpacity="0.1"  stroke={cyan} strokeWidth="1.5" opacity="0.8" />
          <line x1="8"  y1="16" x2="36" y2="16" stroke={cyan} strokeWidth="1.5" opacity="0.7" />
          <line x1="8"  y1="22" x2="28" y2="22" stroke={cyan} strokeWidth="1.5" opacity="0.5" />
          <line x1="28" y1="44" x2="56" y2="44" stroke={cyan} strokeWidth="1.5" opacity="0.7" />
          <line x1="28" y1="50" x2="48" y2="50" stroke={cyan} strokeWidth="1.5" opacity="0.5" />
          {/* Chat bubble tails */}
          <path d="M40 28 L34 34 L44 34 Z" fill={cyan} fillOpacity="0.15" stroke={cyan} strokeWidth="1" />
          <path d="M24 36 L20 30 L16 36 Z" fill={cyan} fillOpacity="0.1" stroke={cyan} strokeWidth="1" opacity="0.8" />
        </svg>
      )
    },
  },
  {
    word: 'EXPOSE',
    sub: 'Shield + checkmark — zero hallucination',
    color: WHITE,
    icon: () => (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <path d="M32 4L8 16v16c0 14 10.7 27.1 24 30.3C45.3 59.1 56 46 56 32V16L32 4z"
          stroke={WHITE} strokeWidth="2" fill="rgba(255,255,255,0.07)" />
        <path d="M22 32l6 6 12-12" stroke={WHITE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 8px rgba(255,255,255,0.8))` }} />
      </svg>
    ),
  },
]

// ── Dashboard signal rows ─────────────────────────────────────────────────────
const SIGNAL_ROWS = [
  { id: 'REENT-001', sev: 'CRITICAL', label: 'Same-function reentrancy loop detected',   conf: 98, addr: '0xDEAD...c0ff' },
  { id: 'FLASH-003', sev: 'CRITICAL', label: 'Borrow-repay in same transaction window', conf: 99, addr: '0xBEEF...cafe' },
  { id: 'FLOW-004',  sev: 'HIGH',     label: 'Victim net outflow spike >50 ETH',        conf: 91, addr: '0xA3F0...1234' },
  { id: 'APPR-002',  sev: 'HIGH',     label: 'Allowance drain burst — 3 txs in 12s',    conf: 87, addr: '0xCAFE...dead' },
  { id: 'ORAC-003',  sev: 'MEDIUM',   label: 'Spot price spike 6.4σ — same block',      conf: 78, addr: '0xF00D...abcd' },
  { id: 'ADMI-001',  sev: 'HIGH',     label: 'Proxy implementation changed + outflow',  conf: 83, addr: '0xBABE...face' },
]

// ── Final stats ───────────────────────────────────────────────────────────────
const FINAL_STATS = [
  { val: '28', label: 'RULES',     color: RED },
  { val: '36', label: 'DATASETS',  color: GOLD },
  { val: '100%', label: 'EVIDENCE', color: '#22c55e' },
  { val: 'ZERO', label: 'HALLUCINATION', color: WHITE },
]

// ── Typewriter ────────────────────────────────────────────────────────────────
const useTypewriter = (text: string, frame: number, startAt: number, rate = 0.5) =>
  text.slice(0, Math.floor(Math.max(0, (frame - startAt) * rate)))

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROOT COMPOSITION — FeaturesAd  (1800f @ 30fps = 60s)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const FeaturesAd: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // ── 0–120f: Heartbeat + white flash ─────────────────────────────────────────
  const hbOp    = f(frame, [0, 20], [0, 1])
  const flashOp = f(frame, [100, 120], [0, 1])
  const flashOut = f(frame, [120, 150], [1, 0])

  // ── 120–240f: Hex scroll + camera pull + "0x" reveal ────────────────────────
  const hexScale = f(frame, [120, 240], [6, 1], Easing.inOut(Easing.cubic))
  const hexOp    = f(frame, [120, 150], [0, 1])
  const hexOut   = f(frame, [220, 250], [1, 0])
  const zeroXOp  = f(frame, [135, 165], [0, 1])
  const zeroXSc  = sp(frame, 135, fps, { stiffness: 60, damping: 10 })
  const zeroXOut = f(frame, [230, 250], [1, 0])

  // ── 240–480f: Stats slam in ──────────────────────────────────────────────────
  const statOps   = STATS.map((_s, i) => f(frame, [250 + i * 60, 280 + i * 60], [0, 1]))
  const statScales = STATS.map((_s, i) => {
    const hit = f(frame, [250 + i * 60, 254 + i * 60], [1.08, 1])
    return hit
  })
  const statsOut  = f(frame, [460, 490], [1, 0])

  // ── 480–720f: "UNTIL NOW." red glow build ──────────────────────────────────
  const untilOp   = f(frame, [490, 530], [0, 1])
  const untilSp   = sp(frame, 490, fps, { stiffness: 50, damping: 10 })
  const redBloom  = f(frame, [490, 680], [0, 1])
  const untilOut  = f(frame, [700, 730], [1, 0])

  // ── 720–960f: Feature showcase ───────────────────────────────────────────────
  const featFrameLen = 40
  const activeFeature = Math.min(
    FEATURES_SHOWCASE.length - 1,
    Math.max(0, Math.floor((frame - 720) / featFrameLen))
  )
  const featOp     = frame >= 720 && frame < 960 ? f(frame, [720, 750], [0, 1]) : 0
  const featOut    = f(frame, [940, 965], [1, 0])
  const featImpact = f(frame, [720 + activeFeature * featFrameLen, 720 + activeFeature * featFrameLen + 4], [1.04, 1])

  // ── 960–1200f: Dashboard rows materialize ───────────────────────────────────
  const dashOp   = f(frame, [970, 1000], [0, 1])
  const dashOut  = f(frame, [1180, 1210], [1, 0])
  const rowOps   = SIGNAL_ROWS.map((_, i) => f(frame, [990 + i * 25, 1020 + i * 25], [0, 1]))
  const rowYs    = SIGNAL_ROWS.map((_, i) => f(frame, [990 + i * 25, 1030 + i * 25], [20, 0]))
  // Live counter that ticks up
  const sigCount  = Math.floor(f(frame, [1000, 1180], [0, 52]))
  const riskScore = Math.floor(f(frame, [1020, 1180], [0, 97]))

  // ── 1200–1440f: Final stats slam ────────────────────────────────────────────
  const fstatOps   = FINAL_STATS.map((_, i) => f(frame, [1210 + i * 50, 1245 + i * 50], [0, 1]))
  const fstatSps   = FINAL_STATS.map((_, i) => sp(frame, 1210 + i * 50, fps, { stiffness: 280, damping: 16, mass: 0.4 }))
  const fstatOut   = f(frame, [1430, 1450], [1, 0])

  // ── 1440–1680f: EVM.FORENSICS types out ─────────────────────────────────────
  const fullText  = 'EVM.FORENSICS'
  const typed     = useTypewriter(fullText, frame, 1450, 0.4)
  const subtitleOp = f(frame, [1560, 1600], [0, 1])
  const evmOut    = f(frame, [1665, 1688], [1, 0])

  // ── 1680–1800f: Logo + glow + fade ──────────────────────────────────────────
  const logoSp    = sp(frame, 1690, fps, { stiffness: 80, damping: 14 })
  const logoOp    = f(frame, [1690, 1720], [0, 1])
  const shieldGlow = 0.5 + Math.sin(frame / 18) * 0.35
  const taglineOp  = f(frame, [1730, 1760], [0, 1])
  const finalFade  = f(frame, [1760, 1800], [0, 1])

  return (
    <AbsoluteFill style={{ background: BLACK, overflow: 'hidden' }}>
      <Scanlines />

      {/* ── 0–120f: Heartbeat + flash ── */}
      {frame < 130 && (
        <>
          <Heartbeat frame={frame} opacity={hbOp} />
          {/* White flash */}
          {frame >= 100 && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 90,
              background: WHITE,
              opacity: flashOp * flashOut,
            }} />
          )}
        </>
      )}

      {/* ── 120–250f: Hex scroll pull-back + 0x ── */}
      {frame >= 115 && frame < 260 && (
        <div style={{ position: 'absolute', inset: 0, opacity: hexOp * hexOut, zIndex: 5 }}>
          <HexScroll frame={frame} scale={hexScale} />
        </div>
      )}
      {frame >= 130 && frame < 255 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: zeroXOp * zeroXOut,
          transform: `scale(${0.3 + zeroXSc * 0.7})`,
        }}>
          <div style={{
            fontFamily: "'Bebas Neue', monospace",
            fontSize: 400,
            color: RED,
            letterSpacing: -10,
            lineHeight: 1,
            textShadow: `0 0 80px rgba(220,20,60,0.8), 0 0 200px rgba(220,20,60,0.4)`,
          }}>
            0x
          </div>
        </div>
      )}

      {/* ── 240–480f: Blockchain attacks stats ── */}
      {frame >= 240 && frame < 495 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 48, opacity: statsOut,
        }}>
          {/* Header */}
          {frame >= 244 && (
            <div style={{
              fontFamily: "'Bebas Neue', monospace",
              fontSize: 56, letterSpacing: 4,
              color: WHITE,
              opacity: f(frame, [244, 265], [0, 1]),
              textAlign: 'center',
              textShadow: `0 0 40px rgba(255,255,255,0.2)`,
            }}>
              BLOCKCHAIN ATTACKS <span style={{ color: RED }}>ARE GROWING</span>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 64, alignItems: 'center' }}>
            {STATS.map((stat, i) => (
              <div key={i} style={{
                opacity: statOps[i],
                transform: `scale(${statScales[i]})`,
                textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: "'Bebas Neue', monospace",
                  fontSize: 96, lineHeight: 0.9,
                  color: i === 2 ? RED : WHITE,
                  letterSpacing: -2,
                  textShadow: i === 2
                    ? `0 0 40px rgba(220,20,60,0.7)`
                    : `0 0 30px rgba(255,255,255,0.2)`,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10, color: SLATE, letterSpacing: 3, marginTop: 8,
                }}>
                  {stat.label}
                </div>
                {/* Impact separator */}
                <div style={{
                  width: 40, height: 2, margin: '8px auto 0',
                  background: i === 2 ? RED : `rgba(255,255,255,0.2)`,
                }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 480–730f: "UNTIL NOW." ── */}
      {frame >= 480 && frame < 735 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 30,
          background: BLACK,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Growing red bloom */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 90% 70% at 50% 50%, rgba(220,20,60,${redBloom * 0.22}) 0%, transparent 65%)`,
            pointerEvents: 'none',
          }} />

          <div style={{
            opacity: untilOp * untilOut,
            transform: `scale(${0.4 + untilSp * 0.6})`,
            textAlign: 'center', zIndex: 10,
          }}>
            <div style={{
              fontFamily: "'Bebas Neue', monospace",
              fontSize: 200,
              color: RED,
              letterSpacing: 6,
              lineHeight: 0.9,
              textShadow: `0 0 80px rgba(220,20,60,0.9), 0 0 200px rgba(220,20,60,0.5), 0 0 400px rgba(220,20,60,0.2)`,
            }}>
              UNTIL
            </div>
            <div style={{
              fontFamily: "'Bebas Neue', monospace",
              fontSize: 200,
              color: WHITE,
              letterSpacing: 6,
              lineHeight: 0.9,
              textShadow: `0 0 40px rgba(255,255,255,0.3)`,
            }}>
              NOW.
            </div>
          </div>
        </div>
      )}

      {/* ── 720–965f: Feature showcase ── */}
      {frame >= 715 && frame < 970 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 40,
          background: BLACK,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 32,
          opacity: featOp * featOut,
        }}>
          {/* Subtle grid */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.15,
            backgroundImage: `
              linear-gradient(rgba(220,20,60,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(220,20,60,0.15) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }} />

          {FEATURES_SHOWCASE.map((feat, i) => {
            const isActive = i === activeFeature
            const wasActive = i < activeFeature
            const itemOp = isActive ? 1 : wasActive ? 0.25 : 0.08
            const itemScale = isActive ? featImpact : 1

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 32,
                opacity: itemOp,
                transform: `scale(${isActive ? itemScale : 1})`,
                zIndex: 10,
                transition: 'all 0.1s',
              }}>
                {/* Icon */}
                <div style={{
                  width: 80, display: 'flex', justifyContent: 'center',
                  filter: isActive ? `drop-shadow(0 0 16px ${feat.color}80)` : 'none',
                }}>
                  {feat.icon()}
                </div>

                {/* Word */}
                <div style={{
                  fontFamily: "'Bebas Neue', monospace",
                  fontSize: isActive ? 80 : 52,
                  color: isActive ? feat.color : WHITE,
                  letterSpacing: 4,
                  textShadow: isActive ? `0 0 40px ${feat.color}80` : 'none',
                  minWidth: 320,
                }}>
                  {feat.word}
                </div>

                {/* Subtitle (only for active) */}
                {isActive && (
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12, color: SLATE, letterSpacing: 2,
                    maxWidth: 360,
                    opacity: f(frame, [720 + i * featFrameLen + 8, 720 + i * featFrameLen + 24], [0, 1]),
                  }}>
                    {feat.sub}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── 960–1210f: Live dashboard mockup ── */}
      {frame >= 955 && frame < 1215 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: NAVY,
          opacity: dashOp * dashOut,
          padding: '60px 80px',
          display: 'flex', flexDirection: 'column', gap: 24,
        }}>
          {/* Dashboard header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: RED, letterSpacing: 4, marginBottom: 6 }}>
                LIVE FORENSICS DASHBOARD
              </div>
              <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 36, color: WHITE, letterSpacing: 2 }}>
                SIGNAL DETECTION ACTIVE
              </div>
            </div>
            <div style={{ display: 'flex', gap: 48, textAlign: 'right' }}>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 56, color: GOLD,
                  textShadow: `0 0 20px rgba(212,175,55,0.5)` }}>
                  {sigCount}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, letterSpacing: 2 }}>
                  SIGNALS FIRED
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 56,
                  color: riskScore > 80 ? RED : riskScore > 50 ? GOLD : '#22c55e',
                  textShadow: `0 0 20px rgba(220,20,60,${riskScore / 150})` }}>
                  {riskScore}%
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, letterSpacing: 2 }}>
                  RISK SCORE
                </div>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: `linear-gradient(to right, ${RED}60, transparent)` }} />

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px 80px 1fr 80px 120px',
            gap: 16,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            color: DIM, letterSpacing: 2, paddingLeft: 8,
          }}>
            <span>RULE</span>
            <span>SEV</span>
            <span>DESCRIPTION</span>
            <span>CONF</span>
            <span>ADDRESS</span>
          </div>

          {/* Signal rows */}
          {SIGNAL_ROWS.map((row, i) => {
            const sevColor = row.sev === 'CRITICAL' ? RED : row.sev === 'HIGH' ? GOLD : '#38bdf8'
            const blinkOp  = row.sev === 'CRITICAL'
              ? 0.7 + Math.sin(frame / 6 + i) * 0.3
              : 1
            return (
              <div key={i} style={{
                opacity: rowOps[i] * blinkOp,
                transform: `translateY(${rowYs[i]}px)`,
                display: 'grid',
                gridTemplateColumns: '80px 80px 1fr 80px 120px',
                gap: 16,
                background: `${sevColor}08`,
                border: `1px solid ${sevColor}20`,
                borderRadius: 3,
                padding: '10px 8px',
                alignItems: 'center',
              }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM }}>{row.id}</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
                  color: sevColor, letterSpacing: 1,
                  textShadow: `0 0 8px ${sevColor}60`,
                }}>
                  {row.sev}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: SLATE }}>{row.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: WHITE }}>{row.conf}%</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: DIM }}>{row.addr}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 1200–1450f: Final stats slam ── */}
      {frame >= 1200 && frame < 1455 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 60,
          background: BLACK,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 80,
          opacity: fstatOut,
        }}>
          {FINAL_STATS.map((stat, i) => (
            <div key={i} style={{
              opacity: fstatOps[i],
              transform: `scale(${0.5 + fstatSps[i] * 0.5})`,
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: "'Bebas Neue', monospace",
                fontSize: 110, lineHeight: 0.85, letterSpacing: -2,
                color: stat.color,
                textShadow: `0 0 60px ${stat.color}80`,
              }}>
                {stat.val}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, color: SLATE, letterSpacing: 3,
                marginTop: 12,
              }}>
                {stat.label}
              </div>
              {/* Impact bar below */}
              <div style={{
                width: 60, height: 2, margin: '12px auto 0',
                background: stat.color,
                boxShadow: `0 0 12px ${stat.color}`,
                opacity: 0.8,
              }} />
            </div>
          ))}
        </div>
      )}

      {/* ── 1440–1688f: EVM.FORENSICS types out ── */}
      {frame >= 1440 && frame < 1692 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 70,
          background: BLACK,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 24,
          opacity: evmOut,
        }}>
          {/* Ambient bloom */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,20,60,0.05) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            fontFamily: "'Bebas Neue', monospace",
            fontSize: 128, letterSpacing: 8, lineHeight: 1,
            minHeight: 145, display: 'flex', alignItems: 'center', zIndex: 10,
          }}>
            {typed.split('').map((ch, ci) => (
              <span key={ci} style={{
                color: ch === '.' ? RED : WHITE,
                textShadow: ch === '.' ? `0 0 20px rgba(220,20,60,0.9)` : `0 0 30px rgba(255,255,255,0.15)`,
              }}>{ch}</span>
            ))}
            {typed.length < fullText.length && (
              <span style={{ color: RED, opacity: Math.floor(frame / 16) % 2 === 0 ? 1 : 0 }}>|</span>
            )}
          </div>

          <div style={{ opacity: subtitleOp, textAlign: 'center', zIndex: 10 }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 18, color: SLATE, letterSpacing: 4,
            }}>
              Enterprise-grade blockchain forensics.
            </div>
          </div>
        </div>
      )}

      {/* ── 1680–1800f: Logo + glow + tagline + fade ── */}
      {frame >= 1680 && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 80,
          background: BLACK,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 28,
          opacity: logoOp,
        }}>
          {/* Strong red bloom */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(220,20,60,${0.12 * shieldGlow}) 0%, transparent 65%)`,
            pointerEvents: 'none',
          }} />

          {/* Shield */}
          <div style={{
            transform: `scale(${0.3 + logoSp * 0.7})`,
            filter: `drop-shadow(0 0 ${28 * shieldGlow}px rgba(220,20,60,0.9))`,
            zIndex: 10,
          }}>
            <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
                stroke={RED} strokeWidth="1.2" fill="rgba(220,20,60,0.14)" />
              <path d="M9 12l2 2 4-4" stroke={RED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Tagline */}
          <div style={{ opacity: taglineOp, textAlign: 'center', zIndex: 10 }}>
            <div style={{
              fontFamily: "'Bebas Neue', monospace",
              fontSize: 56, letterSpacing: 8,
              color: WHITE,
              textShadow: `0 0 30px rgba(255,255,255,0.15)`,
            }}>
              Investigate. <span style={{ color: RED }}>Detect.</span> Expose.
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13, color: SLATE, letterSpacing: 4, marginTop: 12,
            }}>
              EVM.FORENSICS · Enterprise Edition
            </div>
          </div>
        </div>
      )}

      {/* Final fade to black */}
      <div style={{
        position: 'absolute', inset: 0,
        background: BLACK,
        opacity: finalFade,
        pointerEvents: 'none', zIndex: 190,
      }} />

      {/* Corner HUD labels */}
      <div style={{
        position: 'absolute', top: 48, left: 64,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        color: frame >= 960 && frame < 1210 ? RED : DIM,
        letterSpacing: 3, zIndex: 195,
        opacity: finalFade > 0.9 ? 0 : 1,
      }}>
        EVM.FORENSICS // PRODUCT AD
      </div>
      <div style={{
        position: 'absolute', bottom: 48, right: 64,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
        color: DIM, letterSpacing: 2, zIndex: 195,
        opacity: finalFade > 0.9 ? 0 : 1,
      }}>
        60s COMMERCIAL · 1800f @ 30fps
      </div>
    </AbsoluteFill>
  )
}
