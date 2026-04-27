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
const CYAN  = '#38bdf8'
const BLACK = '#020617'
// NAVY removed (unused)
const SLATE = '#94a3b8'
const DIM   = '#334155'

// ── Grid ──────────────────────────────────────────────────────────────────────
const Grid: React.FC<{ opacity?: number; size?: number }> = ({ opacity = 0.5, size = 60 }) => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }}>
    <defs>
      <pattern id={`tgrid-${size}`} width={size} height={size} patternUnits="userSpaceOnUse">
        <path d={`M ${size} 0 L 0 0 0 ${size}`} fill="none" stroke="rgba(30,41,59,0.6)" strokeWidth="0.5" />
      </pattern>
      <radialGradient id="tgridFade" cx="50%" cy="50%">
        <stop offset="0%" stopColor="white" stopOpacity="0.2" />
        <stop offset="75%" stopColor="white" stopOpacity="0.02" />
      </radialGradient>
      <mask id="tgridMask">
        <rect width="100%" height="100%" fill="url(#tgridFade)" />
      </mask>
    </defs>
    <rect width="100%" height="100%" fill={`url(#tgrid-${size})`} mask="url(#tgridMask)" />
  </svg>
)

// ── Scanlines ─────────────────────────────────────────────────────────────────
const Scanlines: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100,
    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
  }} />
)

// ── Pulsing Orb ───────────────────────────────────────────────────────────────
const PulsingOrb: React.FC<{ frame: number }> = ({ frame }) => {
  const scale1 = 1 + Math.sin(frame / 22) * 0.12
  const scale2 = 1 + Math.sin(frame / 14 + 1.2) * 0.08
  const opacity = f(frame, [0, 40], [0, 1])
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity }}>
      {/* Outer ring */}
      <div style={{
        position: 'absolute',
        width: 320, height: 320,
        borderRadius: '50%',
        border: '1px solid rgba(220,20,60,0.12)',
        transform: `scale(${scale1})`,
      }} />
      {/* Mid ring */}
      <div style={{
        position: 'absolute',
        width: 200, height: 200,
        borderRadius: '50%',
        border: '1px solid rgba(220,20,60,0.25)',
        transform: `scale(${scale2})`,
      }} />
      {/* Core glow */}
      <div style={{
        position: 'absolute',
        width: 80, height: 80,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(220,20,60,0.9) 0%, rgba(220,20,60,0.4) 50%, transparent 75%)`,
        transform: `scale(${scale1})`,
        boxShadow: `0 0 60px rgba(220,20,60,0.7), 0 0 120px rgba(220,20,60,0.3)`,
      }} />
      {/* Inner bright core */}
      <div style={{
        position: 'absolute',
        width: 16, height: 16,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: `0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(220,20,60,0.8)`,
      }} />
    </div>
  )
}

// ── Chain Links SVG Icon ──────────────────────────────────────────────────────
const ChainIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <rect x="2" y="16" width="20" height="10" rx="5" stroke={color} strokeWidth="2.5" fill="none" />
    <rect x="26" y="22" width="20" height="10" rx="5" stroke={color} strokeWidth="2.5" fill="none" />
    <line x1="22" y1="21" x2="26" y2="21" stroke={color} strokeWidth="2.5" />
    <line x1="22" y1="27" x2="26" y2="27" stroke={color} strokeWidth="2.5" />
    <rect x="12" y="8" width="20" height="10" rx="5" stroke={color} strokeWidth="2" fill="none" opacity="0.5" />
    <rect x="16" y="30" width="20" height="10" rx="5" stroke={color} strokeWidth="2" fill="none" opacity="0.5" />
  </svg>
)

// ── Fingerprint SVG Icon ──────────────────────────────────────────────────────
const FingerprintIcon: React.FC<{ color: string; size?: number; progress?: number }> = ({ color, size = 48, progress = 1 }) => {
  const totalLen = 280
  const drawn = totalLen * progress
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 6c-9.9 0-18 8.1-18 18" stroke={color} strokeWidth="2" strokeLinecap="round"
        strokeDasharray={totalLen} strokeDashoffset={totalLen - drawn * 0.12} opacity="0.4" />
      <path d="M24 10c-7.7 0-14 6.3-14 14" stroke={color} strokeWidth="2.2" strokeLinecap="round"
        strokeDasharray={totalLen} strokeDashoffset={totalLen - drawn * 0.15} opacity="0.6" />
      <path d="M14 24a10 10 0 0 1 10-10c5.52 0 10 4.48 10 10" stroke={color} strokeWidth="2.4" strokeLinecap="round"
        strokeDasharray={totalLen} strokeDashoffset={totalLen - drawn * 0.2} opacity="0.75" />
      <path d="M18 24a6 6 0 0 1 6-6 6 6 0 0 1 6 6" stroke={color} strokeWidth="2.4" strokeLinecap="round"
        strokeDasharray={totalLen} strokeDashoffset={totalLen - drawn * 0.25} opacity="0.9" />
      <path d="M21 24a3 3 0 0 1 3-3 3 3 0 0 1 3 3 3 3 0 0 1-3 3" stroke={color} strokeWidth="2.2" strokeLinecap="round"
        strokeDasharray={totalLen} strokeDashoffset={totalLen - drawn * 0.3} />
      <path d="M14 28c1.3 5 5.8 9 10.5 9s9.5-4 10.5-9" stroke={color} strokeWidth="2" strokeLinecap="round"
        strokeDasharray={totalLen} strokeDashoffset={totalLen - drawn * 0.35} opacity="0.7" />
      <path d="M10 32c2 7 8 13 14 13s12-6 14-13" stroke={color} strokeWidth="1.5" strokeLinecap="round"
        strokeDasharray={totalLen} strokeDashoffset={totalLen - drawn * 0.4} opacity="0.4" />
    </svg>
  )
}

// ── Radar Sweep Icon ──────────────────────────────────────────────────────────
const RadarIcon: React.FC<{ color: string; size?: number; frame?: number }> = ({ color, size = 48, frame = 0 }) => {
  const angle = (frame * 4) % 360
  const rad   = (angle * Math.PI) / 180
  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.4
  const ex = cx + r * Math.cos(rad)
  const ey = cy + r * Math.sin(rad)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {/* Circles */}
      <circle cx={cx} cy={cy} r={r * 0.33} stroke={color} strokeWidth="1" opacity="0.3" />
      <circle cx={cx} cy={cy} r={r * 0.66} stroke={color} strokeWidth="1" opacity="0.25" />
      <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* Cross hairs */}
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={color} strokeWidth="0.75" opacity="0.2" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={color} strokeWidth="0.75" opacity="0.2" />
      {/* Sweep line */}
      <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={color} strokeWidth="2" opacity="0.9"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      {/* Sweep trail */}
      {[0.15, 0.3, 0.45, 0.6].map((t, i) => {
        const ta  = ((angle - t * 60 + 360) % 360) * Math.PI / 180
        const tx1 = cx + r * 0.15 * Math.cos(ta)
        const ty1 = cy + r * 0.15 * Math.sin(ta)
        const tx2 = cx + r * Math.cos(ta)
        const ty2 = cy + r * Math.sin(ta)
        return (
          <line key={i} x1={tx1} y1={ty1} x2={tx2} y2={ty2}
            stroke={color} strokeWidth="1.5" opacity={0.5 * (1 - t)} />
        )
      })}
      {/* Dot at center */}
      <circle cx={cx} cy={cy} r="3" fill={color} opacity="0.9" />
      {/* Detected blip */}
      <circle cx={cx + r * 0.55} cy={cy - r * 0.3} r="3" fill={color}
        opacity={0.6 + Math.sin(frame / 8) * 0.4}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
    </svg>
  )
}

// ── Feature Card ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    title: 'MULTI-CHAIN TRACING',
    subtitle: 'Ethereum, Arbitrum, Base, Polygon — single investigation surface',
    color: CYAN,
    icon: (color: string, _frame: number) => <ChainIcon color={color} size={52} />,
  },
  {
    title: 'ENTITY ATTRIBUTION',
    subtitle: 'Cross-chain identity clustering & address ownership inference',
    color: GOLD,
    icon: (color: string, frame: number) => <FingerprintIcon color={color} size={52} progress={Math.min(1, (frame % 120) / 90)} />,
  },
  {
    title: 'REALTIME MONITORING',
    subtitle: 'Live mempool surveillance & instant alert dispatch',
    color: RED,
    icon: (color: string, frame: number) => <RadarIcon color={color} size={52} frame={frame} />,
  },
]

// ── Scan-line sweep across a card ─────────────────────────────────────────────
const CardScanLine: React.FC<{ progress: number; color: string }> = ({ progress, color }) => {
  const x = progress * 100
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 6, pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute',
        left: `${x}%`,
        top: 0, bottom: 0,
        width: 80,
        background: `linear-gradient(to right, transparent, ${color}18, ${color}10, transparent)`,
        transform: 'translateX(-50%)',
      }} />
      {/* Bright leading edge */}
      <div style={{
        position: 'absolute',
        left: `${x}%`,
        top: 0, bottom: 0,
        width: 2,
        background: `linear-gradient(to bottom, transparent, ${color}60, ${color}80, ${color}60, transparent)`,
        transform: 'translateX(-50%)',
      }} />
    </div>
  )
}

// ── Shield Logo ───────────────────────────────────────────────────────────────
const ShieldLogo: React.FC<{ glow: number }> = ({ glow }) => (
  <svg width="120" height="120" viewBox="0 0 24 24" fill="none"
    style={{ filter: `drop-shadow(0 0 ${20 * glow}px rgba(220,20,60,0.9)) drop-shadow(0 0 ${40 * glow}px rgba(220,20,60,0.4))` }}>
    <path
      d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
      stroke={RED} strokeWidth="1" fill="rgba(220,20,60,0.14)"
    />
    <path d="M9 12l2 2 4-4" stroke={RED} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROOT COMPOSITION — UpcomingTeaser  (900f @ 30fps = 30s)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const UpcomingTeaser: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // ── Scene A: 0–120f  — Dark void + orb + "WHAT'S NEXT" ──────────────────────
  const sceneAOpacity = f(frame, [90, 120], [1, 0])
  const titleOpA      = f(frame, [40, 80], [0, 1])
  const titleScaleA   = sp(frame, 40, fps, { stiffness: 70, damping: 14 })
  // persist title into Scene B
  const titleBridgeOp = frame >= 120
    ? f(frame, [120, 180], [1, 1])
    : titleOpA

  // ── Scene B: 120–300f — Three cards slide up ──────────────────────────────
  const cardData = FEATURES.map((_feat, i) => {
    const start    = 140 + i * 60
    const cardSp   = sp(frame, start, fps, { stiffness: 100, damping: 15 })
    const cardY    = f(frame, [start, start + 50], [80, 0])
    const cardOp   = f(frame, [start, start + 50], [0, 1])
    return { sp: cardSp, y: cardY, op: cardOp }
  })

  // ── Scene C: 300–600f — Cards stay visible, scan animation ────────────────
  const scanCyclePeriod = 120
  const cardScanProgress = FEATURES.map((_, i) => {
    if (frame < 300) return 0
    const lf   = frame - 300
    const base = (lf - i * 30) % scanCyclePeriod
    return Math.max(0, Math.min(1, base / (scanCyclePeriod * 0.7)))
  })

  // ── Scene D: 600–750f — Countdown ─────────────────────────────────────────
  const countdownOp    = f(frame, [620, 660], [0, 1])
  const countdownScale = sp(frame, 620, fps, { stiffness: 60, damping: 12 })
  const cardsOutOp     = f(frame, [600, 640], [1, 0])

  // ── Scene E: 750–900f — Logo reveal ───────────────────────────────────────
  const logoSp   = sp(frame, 760, fps, { stiffness: 80, damping: 14 })
  const logoOp   = f(frame, [760, 800], [0, 1])
  const shieldGlow = 0.5 + Math.sin(frame / 20) * 0.35
  const evmTyped  = frame >= 800
    ? Math.floor(f(frame, [800, 880], [0, 13]))
    : 0
  const fullEvm  = 'EVM.FORENSICS'
  const tagOp    = f(frame, [860, 900], [0, 1])
  const finalFade = f(frame, [870, 900], [0, 1])

  // Combined card opacity (visible 120–600, fade out 600–640)
  const cardsGlobalOp = frame < 120
    ? 0
    : frame < 600
      ? f(frame, [120, 160], [0, 1])
      : cardsOutOp

  return (
    <AbsoluteFill style={{ background: BLACK, overflow: 'hidden' }}>
      <Scanlines />
      <Grid opacity={0.45} />

      {/* Deep crimson ambient bloom */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(220,20,60,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── SCENE A: Orb (0–120f) ── */}
      {frame < 130 && (
        <div style={{ position: 'absolute', inset: 0, opacity: sceneAOpacity }}>
          <PulsingOrb frame={frame} />
        </div>
      )}

      {/* ── "WHAT'S NEXT" title (persists 40–650f) ── */}
      {frame < 650 && (
        <div style={{
          position: 'absolute',
          top: 120, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          opacity: titleBridgeOp,
          transform: `scale(${0.5 + titleScaleA * 0.5})`,
          zIndex: 20,
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11, color: RED, letterSpacing: 6, marginBottom: 12,
          }}>
            COMING SOON
          </div>
          <div style={{
            fontFamily: "'Bebas Neue', monospace",
            fontSize: 96,
            color: RED,
            letterSpacing: 6,
            lineHeight: 1,
            textShadow: `0 0 60px rgba(220,20,60,0.7), 0 0 120px rgba(220,20,60,0.3)`,
          }}>
            WHAT'S NEXT
          </div>
          {/* Separator line */}
          <div style={{
            width: 160, height: 1,
            background: `linear-gradient(to right, transparent, ${RED}60, transparent)`,
            marginTop: 16,
          }} />
        </div>
      )}

      {/* ── SCENE B & C: Feature cards (120–640f) ── */}
      <div style={{
        position: 'absolute',
        top: 280, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        gap: 40,
        opacity: cardsGlobalOp,
        zIndex: 10,
      }}>
        {FEATURES.map((feat, i) => {
          const cd = cardData[i]
          return (
            <div key={i} style={{
              opacity: cd.op,
              transform: `translateY(${cd.y}px) scale(${0.75 + cd.sp * 0.25})`,
              background: 'rgba(15,23,42,0.85)',
              border: `1px solid rgba(220,20,60,0.3)`,
              borderRadius: 6,
              padding: '32px 28px',
              width: 340,
              position: 'relative',
              backdropFilter: 'blur(4px)',
              boxShadow: `0 0 40px rgba(0,0,0,0.6), 0 0 20px ${feat.color}08`,
              overflow: 'hidden',
            }}>
              {/* Scan line animation */}
              {frame >= 300 && (
                <CardScanLine progress={cardScanProgress[i]} color={feat.color} />
              )}

              {/* COMING SOON badge top-right */}
              <div style={{
                position: 'absolute', top: 12, right: 12,
                background: `${feat.color}18`,
                border: `1px solid ${feat.color}50`,
                borderRadius: 3,
                padding: '3px 8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 8, color: feat.color, letterSpacing: 2,
              }}>
                COMING SOON
              </div>

              {/* Icon */}
              <div style={{
                marginBottom: 20,
                filter: `drop-shadow(0 0 8px ${feat.color}60)`,
              }}>
                {feat.icon(feat.color, frame)}
              </div>

              {/* Title */}
              <div style={{
                fontFamily: "'Bebas Neue', monospace",
                fontSize: 28, letterSpacing: 2,
                color: '#e2e8f0', marginBottom: 10, lineHeight: 1,
              }}>
                {feat.title}
              </div>

              {/* Subtitle */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10.5, color: SLATE,
                lineHeight: 1.75, letterSpacing: 0.5,
              }}>
                {feat.subtitle}
              </div>

              {/* Bottom accent */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 2,
                background: `linear-gradient(to right, transparent, ${feat.color}50, transparent)`,
              }} />

              {/* Corner accent */}
              <div style={{
                position: 'absolute', top: 0, left: 0,
                width: 24, height: 24,
                borderTop: `2px solid ${feat.color}60`,
                borderLeft: `2px solid ${feat.color}60`,
                borderRadius: '4px 0 0 0',
              }} />
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 24, height: 24,
                borderBottom: `2px solid ${feat.color}30`,
                borderRight: `2px solid ${feat.color}30`,
                borderRadius: '0 0 4px 0',
              }} />
            </div>
          )
        })}
      </div>

      {/* ── SCENE D: Countdown 2025 (600–750f) ── */}
      {frame >= 600 && frame < 760 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          opacity: countdownOp, zIndex: 30,
        }}>
          {/* Big year */}
          <div style={{
            fontFamily: "'Bebas Neue', monospace",
            fontSize: 300,
            lineHeight: 0.85,
            color: '#0f172a',
            letterSpacing: -8,
            position: 'relative',
            transform: `scale(${0.5 + countdownScale * 0.5})`,
          }}>
            {/* Outline version behind */}
            <span style={{
              position: 'absolute', inset: 0,
              WebkitTextStroke: `2px rgba(220,20,60,0.25)`,
              color: 'transparent',
            }}>2025</span>
            {/* Main gradient text */}
            <span style={{
              background: `linear-gradient(135deg, ${RED} 0%, rgba(220,20,60,0.6) 50%, rgba(220,20,60,0.2) 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              filter: `drop-shadow(0 0 60px rgba(220,20,60,0.5))`,
            }}>2025</span>
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13, color: SLATE, letterSpacing: 8,
            marginTop: 24,
            opacity: f(frame, [680, 720], [0, 1]),
          }}>
            THE ROADMAP
          </div>
        </div>
      )}

      {/* ── SCENE E: Logo reveal (750–900f) ── */}
      {frame >= 750 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          opacity: logoOp, zIndex: 40,
          gap: 24,
        }}>
          {/* Shield */}
          <div style={{
            transform: `scale(${0.3 + logoSp * 0.7})`,
          }}>
            <ShieldLogo glow={shieldGlow} />
          </div>

          {/* Typewriter EVM.FORENSICS */}
          <div style={{
            fontFamily: "'Bebas Neue', monospace",
            fontSize: 96, letterSpacing: 8,
            lineHeight: 1, minHeight: 110,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: f(frame, [800, 830], [0, 1]),
          }}>
            {fullEvm.slice(0, evmTyped).split('').map((ch, ci) => (
              <span key={ci} style={{
                color: ch === '.' ? RED : '#f1f5f9',
                textShadow: ch === '.' ? `0 0 20px rgba(220,20,60,0.9)` : `0 0 20px rgba(241,245,249,0.1)`,
              }}>{ch}</span>
            ))}
            {evmTyped < fullEvm.length && (
              <span style={{ color: RED, opacity: Math.floor(frame / 16) % 2 === 0 ? 1 : 0 }}>|</span>
            )}
          </div>

          {/* Enterprise Edition */}
          <div style={{ opacity: tagOp, textAlign: 'center' }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 14, color: GOLD, letterSpacing: 6,
              textShadow: `0 0 20px rgba(212,175,55,0.5)`,
            }}>
              Enterprise Edition
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10, color: DIM, letterSpacing: 4, marginTop: 8,
            }}>
              INVESTIGATE · DETECT · EXPOSE
            </div>
          </div>
        </div>
      )}

      {/* Final fade to black */}
      <div style={{
        position: 'absolute', inset: 0,
        background: BLACK,
        opacity: finalFade,
        pointerEvents: 'none', zIndex: 90,
      }} />

      {/* Corner labels */}
      <div style={{ position: 'absolute', top: 48, left: 64, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: DIM, letterSpacing: 3, zIndex: 50 }}>
        EVM.FORENSICS // UPCOMING
      </div>
      <div style={{ position: 'absolute', bottom: 48, right: 64, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, letterSpacing: 2, zIndex: 50 }}>
        30s TEASER · 2025 ROADMAP
      </div>
    </AbsoluteFill>
  )
}
