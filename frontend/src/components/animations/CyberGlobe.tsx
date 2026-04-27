import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion'

const f = (frame: number, [s, e]: [number, number], [from, to]: [number, number], ease = Easing.out(Easing.cubic)) =>
  interpolate(frame, [s, e], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })

const seed = (n: number) => { const x = Math.sin(n + 7.31) * 10000; return x - Math.floor(x) }
const HEX = '0123456789ABCDEF'
const hexAddr = (i: number) =>
  '0x' + Array.from({ length: 10 }, (_, k) => HEX[Math.floor(seed(i * 13 + k) * 16)]).join('')

const CX = 960
const CY = 520
const GR = 300 // globe radius

// ── Globe wireframe ───────────────────────────────────────────────────────────
const GlobeWireframe: React.FC<{ opacity: number }> = ({ opacity }) => {
  const latitudes = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75]
  const longitudes = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5]

  return (
    <g opacity={opacity}>
      {/* Latitude ellipses */}
      {latitudes.map(lat => {
        const radLat = (lat * Math.PI) / 180
        const rx = GR * Math.cos(radLat)
        const ry = rx * 0.18
        return (
          <ellipse
            key={`lat-${lat}`}
            cx={CX} cy={CY + GR * Math.sin(radLat) * 0.9}
            rx={rx} ry={ry}
            fill="none"
            stroke={lat === 0 ? 'rgba(220,20,60,0.25)' : 'rgba(30,41,59,0.7)'}
            strokeWidth={lat === 0 ? 1.2 : 0.6}
          />
        )
      })}

      {/* Longitude ellipses - rotated around center */}
      {longitudes.map(lng => (
        <ellipse
          key={`lng-${lng}`}
          cx={CX} cy={CY}
          rx={GR * 0.18} ry={GR}
          fill="none"
          stroke="rgba(30,41,59,0.55)"
          strokeWidth={0.6}
          transform={`rotate(${lng} ${CX} ${CY})`}
        />
      ))}

      {/* Outer circle */}
      <circle cx={CX} cy={CY} r={GR} fill="none" stroke="rgba(220,20,60,0.15)" strokeWidth={1.5} />
    </g>
  )
}

// ── City definitions ──────────────────────────────────────────────────────────
const CITIES = [
  { name: 'NEW YORK',   x: CX - 185, y: CY - 80  },
  { name: 'LONDON',     x: CX - 55,  y: CY - 115 },
  { name: 'FRANKFURT',  x: CX - 15,  y: CY - 100 },
  { name: 'SINGAPORE',  x: CX + 165, y: CY - 18  },
  { name: 'TOKYO',      x: CX + 225, y: CY - 58  },
  { name: 'SHANGHAI',   x: CX + 195, y: CY - 52  },
  { name: 'DUBAI',      x: CX + 82,  y: CY - 72  },
  { name: 'MOSCOW',     x: CX + 38,  y: CY - 132 },
  { name: 'MIAMI',      x: CX - 205, y: CY - 48  },
  { name: 'SYDNEY',     x: CX + 222, y: CY + 118 },
  { name: 'SAO PAULO',  x: CX - 128, y: CY + 102 },
  { name: 'MUMBAI',     x: CX + 112, y: CY + 22  },
]

// ── Attack arc definitions ────────────────────────────────────────────────────
const ATTACKS = [
  { from: 0, to: 1,  delay: 0,   label: 'EXPLOIT',  color: '#dc143c' },
  { from: 5, to: 9,  delay: 60,  label: 'DRAIN',    color: '#dc143c' },
  { from: 6, to: 2,  delay: 30,  label: 'REENT',    color: '#f97316' },
  { from: 7, to: 4,  delay: 90,  label: 'FLASH',    color: '#dc143c' },
  { from: 10, to: 3, delay: 45,  label: 'ORACLE',   color: '#d4af37' },
  { from: 0, to: 11, delay: 120, label: 'EXPLOIT',  color: '#dc143c' },
]

const ARC_DURATION = 110

interface AttackArcProps {
  attack: typeof ATTACKS[0]
  frame: number
}

const AttackArc: React.FC<AttackArcProps> = ({ attack, frame }) => {
  const { from, to, delay, label, color } = attack
  const fromCity = CITIES[from]
  const toCity = CITIES[to]
  const localFrame = (frame - delay + 600) % 600

  const progress = f(localFrame, [0, ARC_DURATION * 0.8], [0, 1])
  const hitProgress = f(localFrame, [ARC_DURATION * 0.75, ARC_DURATION], [0, 1])
  const fadeOut = f(localFrame, [ARC_DURATION, ARC_DURATION + 20], [1, 0])

  if (localFrame > ARC_DURATION + 20 && localFrame < 580) return null

  // Bezier control point — arc peaks upward
  const cpX = (fromCity.x + toCity.x) / 2
  const cpY = Math.min(fromCity.y, toCity.y) - 180

  // Total path length approximation for dash trick
  const pathLen = 600
  const dashOffset = pathLen * (1 - progress)

  // Hit flash effect
  const hitFlash = hitProgress > 0 ? Math.sin(hitProgress * Math.PI) : 0
  const ringScale = 1 + hitProgress * 2.5

  return (
    <g opacity={fadeOut}>
      {/* The arc */}
      <path
        d={`M ${fromCity.x} ${fromCity.y} Q ${cpX} ${cpY} ${toCity.x} ${toCity.y}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={pathLen}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />

      {/* Arrowhead / impact dot at end */}
      {progress > 0.7 && (
        <circle
          cx={toCity.x} cy={toCity.y} r={3 + hitFlash * 4}
          fill={color}
          opacity={0.4 + hitFlash * 0.6}
          style={{ filter: `drop-shadow(0 0 ${6 + hitFlash * 10}px ${color})` }}
        />
      )}

      {/* Impact ring */}
      {hitProgress > 0 && hitProgress < 1 && (
        <circle
          cx={toCity.x} cy={toCity.y}
          r={8 * ringScale}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={1 - hitProgress}
        />
      )}

      {/* Label badge */}
      {progress > 0.3 && progress < 0.9 && (
        <text
          x={(fromCity.x + toCity.x) / 2 + (cpX - (fromCity.x + toCity.x) / 2) * 0.4}
          y={(fromCity.y + toCity.y) / 2 + (cpY - (fromCity.y + toCity.y) / 2) * 0.5 - 6}
          fill={color}
          fontSize={8}
          fontFamily="monospace"
          letterSpacing={1.5}
          textAnchor="middle"
          opacity={0.85}
        >
          {label}
        </text>
      )}
    </g>
  )
}

// ── City node ─────────────────────────────────────────────────────────────────
const CityNode: React.FC<{ city: typeof CITIES[0]; frame: number; idx: number }> = ({ city, frame, idx }) => {
  const pulse = Math.sin((frame + idx * 20) / 25) * 0.4 + 0.6
  return (
    <g>
      <circle cx={city.x} cy={city.y} r={4} fill="rgba(220,20,60,0.8)" opacity={pulse}
        style={{ filter: 'drop-shadow(0 0 5px rgba(220,20,60,0.8))' }} />
      <circle cx={city.x} cy={city.y} r={8} fill="none" stroke="rgba(220,20,60,0.25)"
        strokeWidth={0.8} opacity={pulse * 0.5} />
    </g>
  )
}

// ── Floating hex addresses ────────────────────────────────────────────────────
const FloatingAddresses: React.FC<{ frame: number }> = ({ frame }) => (
  <g>
    {[0, 1, 2, 3].map(i => {
      const speed = 0.3 + seed(i) * 0.2
      const x = 60 + seed(i * 7) * 300
      const yBase = 900 - ((frame * speed + seed(i) * 600) % 700)
      const opacity = 0.06 + seed(i * 3) * 0.04
      return (
        <text key={i} x={x} y={yBase} fill="#38bdf8" fontSize={9} fontFamily="monospace"
          opacity={opacity} letterSpacing={1}>
          {hexAddr(i + Math.floor(frame / 120))}
        </text>
      )
    })}
  </g>
)

// ── Live exploit counter ──────────────────────────────────────────────────────
const ExploitCounter: React.FC<{ frame: number }> = ({ frame }) => {
  const count = 2847 + Math.floor(frame / 18)
  return (
    <text x={1860} y={1060} fill="rgba(220,20,60,0.5)" fontSize={10}
      fontFamily="monospace" textAnchor="end" letterSpacing={1}>
      {count} EXPLOITS DETECTED TODAY
    </text>
  )
}

// ── Hex grid overlay ──────────────────────────────────────────────────────────
const HexGrid: React.FC = () => (
  <g opacity={0.04}>
    <defs>
      <pattern id="hexgrid" x="0" y="0" width="40" height="46" patternUnits="userSpaceOnUse">
        <polygon points="20,2 38,12 38,34 20,44 2,34 2,12"
          fill="none" stroke="#38bdf8" strokeWidth="0.8" />
      </pattern>
    </defs>
    <rect width="1920" height="1080" fill="url(#hexgrid)" />
  </g>
)

// ── Main composition ──────────────────────────────────────────────────────────
export const CyberGlobe: React.FC = () => {
  const frame = useCurrentFrame()

  const globeIn = f(frame, [0, 40], [0, 1])

  return (
    <AbsoluteFill style={{ background: '#020617' }}>
      {/* Radial glow under globe */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 60% 55% at 50% 48%, rgba(220,20,60,0.07) 0%, rgba(56,189,248,0.03) 40%, transparent 70%)`,
      }} />

      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0 }}>
        <HexGrid />
        <FloatingAddresses frame={frame} />

        <g opacity={globeIn}>
          <GlobeWireframe opacity={0.9} />

          {/* Attack arcs */}
          {ATTACKS.map((atk, i) => (
            <AttackArc key={i} attack={atk} frame={frame} />
          ))}

          {/* City nodes */}
          {CITIES.map((city, i) => (
            <CityNode key={i} city={city} frame={frame} idx={i} />
          ))}
        </g>

        <ExploitCounter frame={frame} />
      </svg>
    </AbsoluteFill>
  )
}
