import React from 'react'
import {
  AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing,
} from 'remotion'

// ── helpers ──────────────────────────────────────────────────────────────────
const f = (frame: number, [s, e]: [number, number], [from, to]: [number, number], ease = Easing.out(Easing.cubic)) =>
  interpolate(frame, [s, e], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })

const sp = (frame: number, start: number, fps: number, cfg: object = {}) =>
  spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 120, mass: 0.8, ...cfg } })

// ── deterministic seed ────────────────────────────────────────────────────────
const seed = (n: number) => { const x = Math.sin(n) * 10000; return x - Math.floor(x) }
const HEX_CHARS = '0123456789ABCDEF'
const hexAddr = (i: number) =>
  '0x' + Array.from({ length: 40 }, (_, k) => HEX_CHARS[Math.floor(seed(i * 17 + k) * 16)]).join('')

// ── COLORS ────────────────────────────────────────────────────────────────────
const RED   = '#dc143c'
const GOLD  = '#d4af37'
const BLUE  = '#38bdf8'
const BLACK = '#020617'
const NAVY  = '#040d1a'
const SLATE = '#94a3b8'
const DIM   = '#334155'

// ── Reusable: Grid background ─────────────────────────────────────────────────
const Grid: React.FC<{ opacity?: number; size?: number }> = ({ opacity = 0.6, size = 60 }) => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }}>
    <defs>
      <pattern id={`grid-${size}`} width={size} height={size} patternUnits="userSpaceOnUse">
        <path d={`M ${size} 0 L 0 0 0 ${size}`} fill="none" stroke="rgba(30,41,59,0.5)" strokeWidth="0.5" />
      </pattern>
      <radialGradient id="gridFadeD" cx="50%" cy="50%">
        <stop offset="0%" stopColor="white" stopOpacity="0.25" />
        <stop offset="80%" stopColor="white" stopOpacity="0.03" />
      </radialGradient>
      <mask id="gridMaskD">
        <rect width="100%" height="100%" fill="url(#gridFadeD)" />
      </mask>
    </defs>
    <rect width="100%" height="100%" fill={`url(#grid-${size})`} mask="url(#gridMaskD)" />
  </svg>
)

// ── Reusable: Scanlines ───────────────────────────────────────────────────────
const Scanlines: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100,
    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)',
  }} />
)

// ── Reusable: SceneFade ───────────────────────────────────────────────────────
const SceneFade: React.FC<{ children: React.ReactNode; frame: number; inAt: number; outAt: number; fadeLen?: number }> = ({
  children, frame, inAt, outAt, fadeLen = 20,
}) => {
  const opacity = interpolate(
    frame,
    [inAt, inAt + fadeLen, outAt - fadeLen, outAt],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )
  return <div style={{ position: 'absolute', inset: 0, opacity }}>{children}</div>
}

// ── Reusable: FloatingHexAddresses background ─────────────────────────────────
const FloatingAddresses: React.FC<{ frame: number; opacity?: number }> = ({ frame, opacity = 0.07 }) => {
  const STREAMS = Array.from({ length: 16 }, (_, i) => ({
    x: seed(i * 3) * 100,
    speed: 0.08 + seed(i * 7) * 0.15,
    op: opacity * (0.5 + seed(i * 13) * 0.7),
    delay: seed(i * 19) * 300,
    addr: hexAddr(i * 50),
  }))
  return (
    <>
      {STREAMS.map((s, i) => {
        const y = ((frame * s.speed + s.delay) % 130) - 15
        return (
          <div key={i} style={{
            position: 'absolute', left: `${s.x}%`, top: `${y}%`,
            opacity: s.op, fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            color: '#64748b', whiteSpace: 'nowrap', letterSpacing: 1,
            transform: 'translateX(-50%)',
          }}>
            {s.addr}
          </div>
        )
      })}
    </>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE 1 — THE PROBLEM  (0–900f, 0–30s)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Scene1Problem: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const lf = frame  // local = global for scene 1

  // Big stat materialise
  const statScale   = sp(lf, 30, fps, { stiffness: 80, damping: 14 })
  const statOpacity = f(lf, [30, 70], [0, 1])
  const subOpacity  = f(lf, [120, 180], [0, 1])
  const sub2Opacity = f(lf, [220, 290], [0, 1])
  const sub2Y       = f(lf, [220, 290], [20, 0])
  const dollarPulse = 0.95 + Math.sin(lf / 20) * 0.05

  return (
    <AbsoluteFill style={{ background: BLACK, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <Grid opacity={0.4} />
      <FloatingAddresses frame={lf} opacity={0.05} />

      {/* Red ambient bloom */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(220,20,60,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Main stat */}
      <div style={{
        opacity: statOpacity,
        transform: `scale(${0.6 + statScale * 0.4}) scale(${dollarPulse})`,
        textAlign: 'center', zIndex: 10,
      }}>
        <div style={{
          fontFamily: "'Bebas Neue', monospace",
          fontSize: 220,
          lineHeight: 0.9,
          color: RED,
          letterSpacing: '-4px',
          textShadow: `0 0 80px rgba(220,20,60,0.7), 0 0 160px rgba(220,20,60,0.3)`,
        }}>
          $4.4B
        </div>
      </div>

      {/* Subtitle 1 */}
      <div style={{
        opacity: subOpacity, textAlign: 'center', zIndex: 10,
        marginTop: 24,
      }}>
        <div style={{
          fontFamily: "'Bebas Neue', monospace",
          fontSize: 36,
          color: '#e2e8f0',
          letterSpacing: '6px',
        }}>
          LOST TO BLOCKCHAIN EXPLOITS
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
          color: SLATE,
          letterSpacing: '4px',
          marginTop: 8,
        }}>
          2022 — 2024 · VERIFIED ON-CHAIN
        </div>
      </div>

      {/* Subtitle 2 */}
      <div style={{
        opacity: sub2Opacity,
        transform: `translateY(${sub2Y}px)`,
        textAlign: 'center', zIndex: 10,
        marginTop: 40,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ width: 40, height: 1, background: `rgba(220,20,60,0.5)` }} />
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14, color: GOLD,
          letterSpacing: '3px',
          textShadow: `0 0 20px rgba(212,175,55,0.5)`,
        }}>
          126+ PROTOCOLS ATTACKED
        </div>
        <div style={{ width: 40, height: 1, background: `rgba(220,20,60,0.5)` }} />
      </div>

      {/* Corner label */}
      <div style={{ position: 'absolute', top: 48, left: 64, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: DIM, letterSpacing: 3 }}>
        EVM.FORENSICS // DEMO
      </div>
      <div style={{ position: 'absolute', bottom: 48, right: 64, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, letterSpacing: 2 }}>
        SCENE 01 · THE PROBLEM
      </div>
    </AbsoluteFill>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE 2 — CURRENT TOOLS FAIL  (900–1800f, 30–60s)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const FAIL_CARDS = [
  { tool: 'Block Explorers',       issue: 'Manual lookups, no pattern detection,\nno contextual understanding', delay: 20 },
  { tool: 'Chain Analysis Tools',  issue: 'Expensive subscriptions, opaque logic,\nnot audit-grade or reproducible', delay: 80 },
  { tool: 'Manual Investigation',  issue: 'Weeks of analyst time, human error,\nzero reproducibility', delay: 140 },
]

const Scene2ToolsFail: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const lf = frame - 900
  const titleOpacity = f(lf, [0, 40], [0, 1])
  const redFlood     = f(lf, [750, 900], [0, 0.12])

  return (
    <AbsoluteFill style={{ background: BLACK, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 48 }}>
      <Grid opacity={0.45} />

      {/* Red flood at end */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `rgba(220,20,60,${redFlood})`,
        pointerEvents: 'none',
      }} />

      {/* Title */}
      <div style={{ opacity: titleOpacity, textAlign: 'center', zIndex: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: RED, letterSpacing: 4, marginBottom: 12 }}>
          WHY EXISTING TOOLS FAIL
        </div>
        <div style={{
          fontFamily: "'Bebas Neue', monospace",
          fontSize: 72, letterSpacing: 2, color: '#e2e8f0', lineHeight: 1,
        }}>
          THE PROBLEM <span style={{ color: RED }}>IS SYSTEMIC</span>
        </div>
      </div>

      {/* Failure cards */}
      <div style={{ display: 'flex', gap: 28, zIndex: 10 }}>
        {FAIL_CARDS.map((card, i) => {
          const cardSp    = sp(lf, card.delay, fps, { stiffness: 100, damping: 16 })
          const cardX     = f(lf, [card.delay, card.delay + 40], [-80, 0])
          const cardOp    = f(lf, [card.delay, card.delay + 40], [0, 1])
          const xProgress = f(lf, [card.delay + 60, card.delay + 100], [0, 1])

          return (
            <div key={i} style={{
              opacity: cardOp,
              transform: `translateX(${cardX}px) scale(${0.85 + cardSp * 0.15})`,
              background: NAVY,
              border: '1px solid rgba(220,20,60,0.25)',
              borderRadius: 4,
              padding: '32px 28px',
              width: 300,
              position: 'relative',
              boxShadow: '0 0 40px rgba(0,0,0,0.6)',
            }}>
              {/* Red X */}
              <div style={{
                position: 'absolute', top: 20, right: 20,
                width: 32, height: 32,
                border: '2px solid rgba(220,20,60,0.7)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" style={{ opacity: xProgress }}>
                  <line x1="2" y1="2" x2="12" y2="12" stroke={RED} strokeWidth="2" strokeLinecap="round" />
                  <line x1="12" y1="2" x2="2" y2="12" stroke={RED} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 28, color: '#e2e8f0', letterSpacing: 1, marginBottom: 12 }}>
                {card.tool}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: SLATE,
                lineHeight: 1.7, whiteSpace: 'pre-line',
              }}>
                {card.issue}
              </div>

              {/* Bottom accent */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0,
                width: `${xProgress * 100}%`, height: 2,
                background: `linear-gradient(to right, ${RED}, transparent)`,
                borderRadius: '0 0 0 4px',
              }} />
            </div>
          )
        })}
      </div>

      <div style={{ position: 'absolute', bottom: 48, right: 64, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, letterSpacing: 2 }}>
        SCENE 02 · CURRENT TOOLS FAIL
      </div>
    </AbsoluteFill>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE 3 — INTRODUCING EVM.FORENSICS  (1800–3000f, 60–100s)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const INTRO_DIFFERENTIATORS = [
  { text: '28 heuristic detection rules across 6 attack categories', color: RED },
  { text: '100% evidence-linked — every finding cites raw data', color: GOLD },
  { text: 'AI-powered narratives grounded in forensic reports', color: BLUE },
]

// Typewriter effect
const useTypewriter = (text: string, frame: number, startAt: number, charsPerFrame = 0.6) => {
  const chars = Math.floor(Math.max(0, (frame - startAt) * charsPerFrame))
  return text.slice(0, chars)
}

const Scene3Intro: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const lf = frame - 1800

  const shieldScale   = sp(lf, 0, fps, { stiffness: 90, damping: 14 })
  const shieldOpacity = f(lf, [0, 30], [0, 1])
  const shieldGlow    = 0.5 + Math.sin(lf / 25) * 0.3

  const fullText     = 'EVM.FORENSICS'
  const typedText    = useTypewriter(fullText, lf, 80, 0.5)
  const cursorBlink  = Math.floor(lf / 18) % 2 === 0

  const subtitleOp   = f(lf, [280, 340], [0, 1])

  return (
    <AbsoluteFill style={{ background: BLACK, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 32 }}>
      <Grid opacity={0.5} size={80} />

      {/* Central crimson bloom */}
      <div style={{
        position: 'absolute',
        width: 600, height: 400,
        top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        background: `radial-gradient(ellipse, rgba(220,20,60,${0.1 * shieldGlow}) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Shield */}
      <div style={{
        opacity: shieldOpacity,
        transform: `scale(${0.3 + shieldScale * 0.7})`,
        zIndex: 10,
        filter: `drop-shadow(0 0 ${24 * shieldGlow}px rgba(220,20,60,0.8))`,
      }}>
        <svg width="96" height="96" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
            stroke={RED} strokeWidth="1.2" fill="rgba(220,20,60,0.12)"
          />
          <path d="M9 12l2 2 4-4" stroke={RED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Typewriter title */}
      <div style={{ zIndex: 10, textAlign: 'center', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          fontFamily: "'Bebas Neue', monospace",
          fontSize: 128,
          letterSpacing: 8,
          color: '#f1f5f9',
          lineHeight: 1,
          textShadow: `0 0 40px rgba(241,245,249,0.1)`,
        }}>
          {typedText.split('').map((ch, ci) => (
            <span key={ci} style={{
              color: ch === '.' ? RED : '#f1f5f9',
              textShadow: ch === '.' ? `0 0 20px rgba(220,20,60,0.9)` : undefined,
            }}>{ch}</span>
          ))}
          {typedText.length < fullText.length && (
            <span style={{ opacity: cursorBlink ? 1 : 0, color: RED }}>|</span>
          )}
        </div>
      </div>

      {/* Subtitle */}
      <div style={{ opacity: subtitleOp, textAlign: 'center', zIndex: 10 }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 16, color: SLATE, letterSpacing: 4,
        }}>
          Enterprise-grade blockchain forensics
        </div>
      </div>

      {/* Differentiators */}
      <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        {INTRO_DIFFERENTIATORS.map((item, i) => {
          const itemOp = f(lf, [400 + i * 80, 460 + i * 80], [0, 1])
          const itemX  = f(lf, [400 + i * 80, 460 + i * 80], [-30, 0])
          return (
            <div key={i} style={{
              opacity: itemOp,
              transform: `translateX(${itemX}px)`,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 20, height: 20, border: `1.5px solid ${item.color}`,
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 10px ${item.color}40`,
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path d="M2 5l2.5 2.5L8 3" stroke={item.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13, color: '#cbd5e1', letterSpacing: 1,
              }}>
                {item.text}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ position: 'absolute', bottom: 48, right: 64, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, letterSpacing: 2 }}>
        SCENE 03 · INTRODUCING EVM.FORENSICS
      </div>
    </AbsoluteFill>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE 4 — PIPELINE  (3000–5400f, 100–180s)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PIPELINE_STAGES = [
  { id: 'RAW',      label: 'RAW DATA',        sub: 'Blocks · Txs\nTraces · State diffs', color: '#475569' },
  { id: 'ABI',      label: 'ABI DECODING',    sub: 'ERC20/721/1155\nCustom contracts',    color: BLUE },
  { id: 'DERIVED',  label: '36 DATASETS',     sub: 'Enriched txs\nToken transfers',       color: GOLD },
  { id: 'SIGNALS',  label: '28 RULES',        sub: 'Heuristic engine\nSignal dispatch',   color: RED },
  { id: 'ML',       label: 'ML SCORING',      sub: 'Risk vectors\nCommunity detection',   color: '#a855f7' },
  { id: 'REPORT',   label: 'REPORT',          sub: 'Evidence-linked\nAudit-ready PDF',    color: '#22c55e' },
]

const Scene4Pipeline: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const lf = frame - 3000
  const titleOp = f(lf, [0, 50], [0, 1])

  // Stages appear sequentially
  const stageProgress = PIPELINE_STAGES.map((_, i) => ({
    appear:   Math.min(1, sp(lf, 80 + i * 120, fps, { stiffness: 120, damping: 16 })),
    lit:      f(lf, [80 + i * 120, 130 + i * 120], [0, 1]),
    arrowProg: i < PIPELINE_STAGES.length - 1
      ? f(lf, [150 + i * 120, 220 + i * 120], [0, 1])
      : 1,
  }))

  // Looping active stage highlight
  const cycleLen = 80
  const activeStage = Math.floor(lf / cycleLen) % PIPELINE_STAGES.length

  const gridPulse = 0.3 + Math.sin(lf / 40) * 0.1

  return (
    <AbsoluteFill style={{ background: BLACK, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 56 }}>
      <Grid opacity={gridPulse} size={40} />

      <div style={{ opacity: titleOp, textAlign: 'center', zIndex: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: RED, letterSpacing: 4, marginBottom: 10 }}>
          HOW IT WORKS
        </div>
        <div style={{
          fontFamily: "'Bebas Neue', monospace",
          fontSize: 72, letterSpacing: 3, lineHeight: 1,
          color: '#e2e8f0',
        }}>
          THE <span style={{ color: RED }}>FORENSIC PIPELINE</span>
        </div>
      </div>

      {/* Pipeline stages */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0, zIndex: 10,
        position: 'relative',
      }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const prog    = stageProgress[i]
          const isActive = i === activeStage
          const glow    = isActive ? 1 : 0.3

          return (
            <React.Fragment key={stage.id}>
              {/* Stage box */}
              <div style={{
                opacity: prog.appear,
                transform: `scale(${0.7 + prog.appear * 0.3}) translateY(${(1 - prog.appear) * 20}px)`,
                background: isActive ? `rgba(${stage.color === RED ? '220,20,60' : stage.color === GOLD ? '212,175,55' : stage.color === BLUE ? '56,189,248' : '34,197,94'},0.1)` : NAVY,
                border: `1px solid ${stage.color}${Math.round(glow * 0x99).toString(16).padStart(2,'0')}`,
                borderRadius: 6,
                padding: '20px 18px',
                width: 148,
                textAlign: 'center',
                boxShadow: isActive ? `0 0 30px ${stage.color}30, inset 0 0 20px ${stage.color}08` : 'none',
                transition: 'all 0.3s',
                position: 'relative',
              }}>
                {/* Active indicator dot */}
                {isActive && (
                  <div style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 8, height: 8, borderRadius: '50%',
                    background: stage.color,
                    boxShadow: `0 0 8px ${stage.color}`,
                  }} />
                )}
                <div style={{
                  fontFamily: "'Bebas Neue', monospace",
                  fontSize: 20, letterSpacing: 1.5,
                  color: prog.lit > 0.5 ? stage.color : DIM,
                  marginBottom: 8,
                }}>
                  {stage.label}
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9, color: SLATE,
                  lineHeight: 1.6, whiteSpace: 'pre-line', opacity: prog.lit,
                }}>
                  {stage.sub}
                </div>
              </div>

              {/* Arrow */}
              {i < PIPELINE_STAGES.length - 1 && (
                <svg width="40" height="24" viewBox="0 0 40 24" style={{ opacity: stageProgress[i].arrowProg, flexShrink: 0 }}>
                  <defs>
                    <marker id={`arr${i}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill={PIPELINE_STAGES[i].color} opacity="0.8" />
                    </marker>
                  </defs>
                  <line
                    x1="2" y1="12" x2={36 * stageProgress[i].arrowProg + 2} y2="12"
                    stroke={PIPELINE_STAGES[i].color} strokeWidth="1.5" opacity="0.7"
                    markerEnd={`url(#arr${i})`}
                    strokeDasharray="4 2"
                  />
                </svg>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Data flow subtitle */}
      <div style={{
        opacity: f(lf, [800, 900], [0, 1]),
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11, color: SLATE, letterSpacing: 3,
        textAlign: 'center', zIndex: 10,
      }}>
        Deterministic · Evidence-linked · Reproducible
      </div>

      <div style={{ position: 'absolute', bottom: 48, right: 64, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, letterSpacing: 2 }}>
        SCENE 04 · PIPELINE ARCHITECTURE
      </div>
    </AbsoluteFill>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE 5 — LIVE DEMO DETECTION  (5400–7200f, 180–240s)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SIGNAL_CARDS = [
  { id: 'REENT-001', label: 'Reentrancy — same-function loop',      sev: 'CRITICAL', conf: 98, cat: 'Reentrancy' },
  { id: 'FLASH-001', label: 'Borrow-repay same transaction',         sev: 'CRITICAL', conf: 99, cat: 'Flashloan' },
  { id: 'FLOW-004',  label: 'Victim net outflow spike (>50 ETH)',    sev: 'HIGH',     conf: 91, cat: 'Fund Flow' },
  { id: 'APPR-002',  label: 'Allowance drain burst (3 txs)',         sev: 'HIGH',     conf: 87, cat: 'Approvals' },
  { id: 'ORAC-003',  label: 'Spot price spike 6.4σ in same block',  sev: 'MEDIUM',   conf: 78, cat: 'Oracle' },
]

const FUND_FLOW_NODES = [
  { id: 'ATK', label: 'ATTACKER',        x: 100, y: 220, color: RED },
  { id: 'VIC', label: 'VICTIM\nCONTRACT',x: 480, y: 80,  color: GOLD },
  { id: 'SIN', label: 'SINK\nWALLET',    x: 820, y: 200, color: '#64748b' },
  { id: 'MIX', label: 'MIXER',           x: 680, y: 360, color: '#475569' },
  { id: 'INT', label: 'INTERMEDIARY',    x: 340, y: 360, color: '#475569' },
]

const FUND_FLOW_EDGES = [
  { from: 0, to: 1, label: '150 ETH flash', color: RED,   width: 2.5 },
  { from: 1, to: 0, label: '149.8 ETH drain', color: RED, width: 2 },
  { from: 0, to: 4, label: '20 ETH',         color: GOLD, width: 1.5 },
  { from: 4, to: 2, label: '115 ETH',        color: GOLD, width: 1.5 },
  { from: 2, to: 3, label: '112 ETH',        color: DIM,  width: 1 },
]

const Scene5Detection: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const lf = frame - 5400

  // Alert flash (terminal intro handled by alertOp below)

  // Alert flash
  const flashOp = f(lf, [20, 60], [0.5, 0], Easing.out(Easing.quad))

  // Alert text
  const alertScale = sp(lf, 30, fps, { stiffness: 180, damping: 14 })
  const alertOp    = f(lf, [30, 60], [0, 1])

  // Signal cards cascade
  const cardOpacities = SIGNAL_CARDS.map((_, i) =>
    f(lf, [200 + i * 60, 260 + i * 60], [0, 1])
  )
  const cardYs = SIGNAL_CARDS.map((_, i) =>
    f(lf, [200 + i * 60, 270 + i * 60], [24, 0])
  )

  // Fund flow
  const flowOp  = f(lf, [600, 660], [0, 1])
  const nodeOps = FUND_FLOW_NODES.map((_, i) =>
    Math.min(1, sp(lf, 640 + i * 20, fps, { stiffness: 140, damping: 16 }))
  )
  const edgeProgs = FUND_FLOW_EDGES.map((_, i) =>
    f(lf, [720 + i * 40, 800 + i * 40], [0, 1])
  )

  // Risk counter
  const riskScore = Math.floor(f(lf, [900, 1200], [0, 98]))
  const riskOp    = f(lf, [880, 920], [0, 1])

  // Signals fired counter
  const sigCount  = Math.floor(f(lf, [400, 700], [0, 52]))
  const sigOp     = f(lf, [380, 420], [0, 1])

  return (
    <AbsoluteFill style={{ background: BLACK, overflow: 'hidden' }}>
      <Grid opacity={0.35} size={50} />

      {/* Flash overlay */}
      <div style={{ position: 'absolute', inset: 0, background: `rgba(220,20,60,0.15)`, opacity: flashOp, pointerEvents: 'none', zIndex: 50 }} />

      {/* LEFT PANEL — Alert + signal cards (55% width) */}
      <div style={{
        position: 'absolute', left: 64, top: 0, bottom: 0, width: '52%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24, zIndex: 10,
      }}>
        {/* Main alert */}
        <div style={{
          opacity: alertOp,
          transform: `scale(${0.7 + alertScale * 0.3})`,
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: RED,
            letterSpacing: 5, marginBottom: 8,
          }}>
            ⚠ THREAT DETECTED
          </div>
          <div style={{
            fontFamily: "'Bebas Neue', monospace",
            fontSize: 64, letterSpacing: 2, lineHeight: 1,
            color: RED,
            textShadow: `0 0 40px rgba(220,20,60,0.8), 0 0 80px rgba(220,20,60,0.3)`,
          }}>
            REENTRANCY<br />ATTACK
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: SLATE,
            letterSpacing: 2, marginTop: 8,
          }}>
            Confidence: 0.98 · 28 Rules Active
          </div>
        </div>

        {/* Signal cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SIGNAL_CARDS.map((sig, i) => (
            <div key={sig.id} style={{
              opacity: cardOpacities[i],
              transform: `translateY(${cardYs[i]}px)`,
              background: NAVY,
              border: `1px solid ${sig.sev === 'CRITICAL' ? 'rgba(220,20,60,0.4)' : sig.sev === 'HIGH' ? 'rgba(212,175,55,0.3)' : 'rgba(56,189,248,0.2)'}`,
              borderRadius: 4,
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
                color: sig.sev === 'CRITICAL' ? RED : sig.sev === 'HIGH' ? GOLD : BLUE,
                width: 60, flexShrink: 0,
              }}>
                {sig.sev}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, width: 72, flexShrink: 0 }}>
                {sig.id}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: SLATE, flex: 1 }}>
                {sig.label}
              </div>
              {/* Confidence bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ width: 60, height: 2, background: '#0f172a', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${sig.conf}%`,
                    background: sig.sev === 'CRITICAL' ? RED : sig.sev === 'HIGH' ? GOLD : BLUE,
                  }} />
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#475569', width: 28 }}>
                  {sig.conf}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Signals fired + risk score counters */}
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ opacity: sigOp }}>
            <div style={{ fontFamily: "'Bebas Neue', monospace", fontSize: 48, color: GOLD, textShadow: `0 0 20px rgba(212,175,55,0.5)` }}>
              {sigCount}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, letterSpacing: 2, marginTop: 2 }}>
              SIGNALS FIRED
            </div>
          </div>
          <div style={{ opacity: riskOp }}>
            <div style={{
              fontFamily: "'Bebas Neue', monospace", fontSize: 48,
              color: riskScore > 80 ? RED : riskScore > 50 ? GOLD : BLUE,
              textShadow: `0 0 20px rgba(220,20,60,${riskScore / 200})`,
            }}>
              {riskScore}%
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, letterSpacing: 2, marginTop: 2 }}>
              RISK SCORE
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Fund flow graph */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '44%',
        opacity: flowOp, zIndex: 10,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        paddingRight: 64,
      }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: RED, letterSpacing: 3, marginBottom: 24 }}>
          FUND FLOW TRACE — EVIDENCE LINKED
        </div>

        <div style={{ position: 'relative', width: '100%', height: 440 }}>
          {/* SVG edges */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              {FUND_FLOW_EDGES.map((edge, i) => (
                <marker key={i} id={`dm${i}`} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L7,3 z" fill={edge.color} opacity="0.8" />
                </marker>
              ))}
            </defs>
            {FUND_FLOW_EDGES.map((edge, i) => {
              const from = FUND_FLOW_NODES[edge.from]
              const to   = FUND_FLOW_NODES[edge.to]
              const prog = edgeProgs[i]
              const cx   = (from.x + to.x) / 2
              const cy   = (from.y + to.y) / 2 - 50
              const totalLen = 350
              return (
                <g key={i}>
                  <path
                    d={`M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`}
                    fill="none"
                    stroke={edge.color} strokeWidth={edge.width}
                    strokeOpacity={0.7}
                    strokeDasharray={totalLen}
                    strokeDashoffset={totalLen * (1 - prog)}
                    markerEnd={prog > 0.9 ? `url(#dm${i})` : undefined}
                  />
                  {/* Edge label at midpoint */}
                  {prog > 0.5 && (
                    <text
                      x={cx} y={cy - 6}
                      fill={edge.color} fillOpacity={0.8}
                      fontSize="9" fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {/* Nodes */}
          {FUND_FLOW_NODES.map((node, i) => (
            <div key={node.id} style={{
              position: 'absolute',
              left: node.x - 55,
              top: node.y - 32,
              transform: `scale(${nodeOps[i]})`,
              opacity: nodeOps[i],
              background: NAVY,
              border: `1px solid ${node.color}60`,
              borderRadius: 4,
              padding: '8px 12px',
              minWidth: 110,
              textAlign: 'center',
              boxShadow: `0 0 16px ${node.color}20`,
            }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: node.color, letterSpacing: 2, marginBottom: 4, whiteSpace: 'pre-line', lineHeight: 1.4 }}>
                {node.label}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: DIM }}>
                0x{node.id.toLowerCase()}a3f...
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 48, right: 64, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, letterSpacing: 2 }}>
        SCENE 05 · LIVE DETECTION
      </div>
    </AbsoluteFill>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE 6 — IMPACT + STATS  (7200–8400f, 240–280s)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const IMPACT_STATS = [
  { value: '28',   suffix: '',  label: 'Detection Rules',    sub: 'Covering reentrancy, flashloans, oracles, admin abuse,\napprovals, and fund flow patterns',   color: RED },
  { value: '6',    suffix: '',  label: 'Attack Categories',  sub: 'Reentrancy · Approvals · Flashloans · Oracle\nAdmin/Upgrade · Fund Flow',              color: GOLD },
  { value: '36',   suffix: '',  label: 'Derived Datasets',   sub: 'Enriched txs, token transfers, approvals,\nstate diffs, trace analysis, and more',     color: BLUE },
  { value: '100',  suffix: '%', label: 'Evidence-Linked',    sub: 'Every finding references upstream data.\nNo fabrication — full audit trail.',          color: '#22c55e' },
]

const Scene6Stats: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const lf = frame - 7200

  const titleOp = f(lf, [0, 50], [0, 1])

  return (
    <AbsoluteFill style={{ background: BLACK, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 52 }}>
      <Grid opacity={0.4} size={70} />

      {/* Subtle center bloom */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,20,60,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Title */}
      <div style={{ opacity: titleOp, textAlign: 'center', zIndex: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: RED, letterSpacing: 4, marginBottom: 10 }}>
          BY THE NUMBERS
        </div>
        <div style={{
          fontFamily: "'Bebas Neue', monospace",
          fontSize: 72, letterSpacing: 3, color: '#e2e8f0', lineHeight: 1,
        }}>
          ENTERPRISE <span style={{ color: RED }}>CAPABILITIES</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center', zIndex: 10 }}>
        {IMPACT_STATS.map((stat, i) => {
          const delay      = 80 + i * 100
          const statSp     = sp(lf, delay, fps, { stiffness: 90, damping: 14 })
          const statOp     = f(lf, [delay, delay + 50], [0, 1])
          const targetVal  = parseInt(stat.value)
          const counted    = Math.floor(f(lf, [delay + 20, delay + 120], [0, targetVal]))
          const counterStr = isNaN(counted) ? stat.value : String(counted)

          return (
            <div key={i} style={{
              opacity: statOp,
              transform: `scale(${0.6 + statSp * 0.4}) translateY(${(1 - statSp) * 30}px)`,
              textAlign: 'center',
              background: NAVY,
              border: `1px solid ${stat.color}30`,
              borderRadius: 6,
              padding: '32px 40px',
              width: 240,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Glow behind number */}
              <div style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${stat.color}08 0%, transparent 70%)`,
                pointerEvents: 'none',
              }} />

              <div style={{
                fontFamily: "'Bebas Neue', monospace",
                fontSize: 96, lineHeight: 0.9,
                color: stat.color,
                textShadow: `0 0 40px ${stat.color}60`,
                letterSpacing: -2,
              }}>
                {counterStr}{stat.suffix}
              </div>
              <div style={{
                fontFamily: "'Bebas Neue', monospace",
                fontSize: 18, letterSpacing: 2,
                color: '#e2e8f0', marginTop: 12, marginBottom: 8,
              }}>
                {stat.label}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9, color: SLATE, lineHeight: 1.7,
                whiteSpace: 'pre-line',
              }}>
                {stat.sub}
              </div>

              {/* Bottom accent line */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 2, background: `linear-gradient(to right, transparent, ${stat.color}60, transparent)`,
              }} />
            </div>
          )
        })}
      </div>

      <div style={{ position: 'absolute', bottom: 48, right: 64, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, letterSpacing: 2 }}>
        SCENE 06 · IMPACT & STATISTICS
      </div>
    </AbsoluteFill>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE 7 — THE VERDICT  (8400–9000f, 280–300s)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const VERDICT_WORDS = [
  { word: 'INVESTIGATE.',  color: '#f1f5f9', hitAt: 40 },
  { word: 'DETECT.',       color: RED,       hitAt: 160 },
  { word: 'EXPOSE.',       color: '#f1f5f9', hitAt: 280 },
]

const Scene7Verdict: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const lf = frame - 8400

  // Fade to black at very end
  const fadeOut = f(lf, [520, 600], [0, 1])

  // Shield final reveal
  const shieldSp  = sp(lf, 380, fps, { stiffness: 80, damping: 12 })
  const shieldOp  = f(lf, [380, 420], [0, 1])
  const shieldPulse = 0.6 + Math.sin(lf / 18) * 0.25

  // Tagline
  const tagOp = f(lf, [440, 490], [0, 1])
  const verOp = f(lf, [470, 520], [0, 1])

  return (
    <AbsoluteFill style={{ background: BLACK, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 32 }}>
      <Grid opacity={0.35} />

      {/* Deep red bloom that grows */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 100% 80% at 50% 50%, rgba(220,20,60,${0.06 + f(lf, [0, 400], [0, 0.08])}) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* The three VERDICT words */}
      <div style={{
        display: 'flex', gap: 32, alignItems: 'baseline',
        flexWrap: 'wrap', justifyContent: 'center',
        zIndex: 10,
      }}>
        {VERDICT_WORDS.map((item, i) => {
          const hit   = Math.min(1, sp(lf, item.hitAt, fps, { stiffness: 400, damping: 18, mass: 0.5 }))
          const punch = f(lf, [item.hitAt, item.hitAt + 8], [1.25, 1])
          const wordOp = f(lf, [item.hitAt - 4, item.hitAt + 10], [0, 1])

          return (
            <div key={i} style={{
              opacity: wordOp * hit,
              transform: `scale(${punch})`,
              fontFamily: "'Bebas Neue', monospace",
              fontSize: 120,
              letterSpacing: 4,
              lineHeight: 1,
              color: item.color,
              textShadow: item.color === RED
                ? `0 0 60px rgba(220,20,60,0.9), 0 0 120px rgba(220,20,60,0.4)`
                : `0 0 30px rgba(241,245,249,0.15)`,
            }}>
              {item.word}
            </div>
          )
        })}
      </div>

      {/* Shield logo final reveal */}
      <div style={{
        opacity: shieldOp,
        transform: `scale(${0.4 + shieldSp * 0.6})`,
        filter: `drop-shadow(0 0 ${32 * shieldPulse}px rgba(220,20,60,0.9))`,
        zIndex: 10, marginTop: 16,
      }}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
            stroke={RED} strokeWidth="1.2" fill="rgba(220,20,60,0.15)"
          />
          <path d="M9 12l2 2 4-4" stroke={RED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Tagline */}
      <div style={{ opacity: tagOp, textAlign: 'center', zIndex: 10, marginTop: 8 }}>
        <div style={{
          fontFamily: "'Bebas Neue', monospace",
          fontSize: 28, letterSpacing: 8,
          color: '#e2e8f0',
        }}>
          EVM<span style={{ color: RED }}>.</span>Forensics Agent v2.0
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: SLATE, letterSpacing: 4, marginTop: 6 }}>
          Enterprise Edition
        </div>
      </div>

      {/* Final version badge */}
      <div style={{
        opacity: verOp, zIndex: 10,
        background: 'rgba(220,20,60,0.1)',
        border: '1px solid rgba(220,20,60,0.35)',
        borderRadius: 3, padding: '8px 24px',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: RED, letterSpacing: 3,
      }}>
        INVESTIGATE · DETECT · EXPOSE
      </div>

      {/* Fade to black overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: BLACK,
        opacity: fadeOut,
        pointerEvents: 'none',
        zIndex: 200,
      }} />

      {/* Red glow that lingers */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `rgba(220,20,60,${0.04 * (1 - fadeOut)})`,
        pointerEvents: 'none',
        zIndex: 201,
      }} />

      <div style={{ position: 'absolute', bottom: 48, right: 64, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: DIM, letterSpacing: 2, zIndex: 10 }}>
        SCENE 07 · THE VERDICT
      </div>
    </AbsoluteFill>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROOT COMPOSITION — DemoVideo
// Total: 9000 frames @ 30fps = 5 minutes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const DemoVideo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <Scanlines />

      {/* Scene 1: THE PROBLEM — 0–900f */}
      <SceneFade frame={frame} inAt={0}    outAt={900}  fadeLen={30}>
        <Scene1Problem frame={frame} fps={fps} />
      </SceneFade>

      {/* Scene 2: CURRENT TOOLS FAIL — 900–1800f */}
      <SceneFade frame={frame} inAt={870}  outAt={1800} fadeLen={30}>
        <Scene2ToolsFail frame={frame} fps={fps} />
      </SceneFade>

      {/* Scene 3: INTRODUCING EVM.FORENSICS — 1800–3000f */}
      <SceneFade frame={frame} inAt={1770} outAt={3000} fadeLen={30}>
        <Scene3Intro frame={frame} fps={fps} />
      </SceneFade>

      {/* Scene 4: PIPELINE — 3000–5400f */}
      <SceneFade frame={frame} inAt={2970} outAt={5400} fadeLen={30}>
        <Scene4Pipeline frame={frame} fps={fps} />
      </SceneFade>

      {/* Scene 5: LIVE DEMO DETECTION — 5400–7200f */}
      <SceneFade frame={frame} inAt={5370} outAt={7200} fadeLen={30}>
        <Scene5Detection frame={frame} fps={fps} />
      </SceneFade>

      {/* Scene 6: IMPACT + STATS — 7200–8400f */}
      <SceneFade frame={frame} inAt={7170} outAt={8400} fadeLen={30}>
        <Scene6Stats frame={frame} fps={fps} />
      </SceneFade>

      {/* Scene 7: THE VERDICT — 8400–9000f */}
      <SceneFade frame={frame} inAt={8370} outAt={9000} fadeLen={20}>
        <Scene7Verdict frame={frame} fps={fps} />
      </SceneFade>
    </AbsoluteFill>
  )
}
