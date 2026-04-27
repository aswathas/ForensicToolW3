import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'

const HEX_CHARS = '0123456789ABCDEF'
const seed = (n: number) => {
  let x = Math.sin(n) * 10000
  return x - Math.floor(x)
}

const hexAddr = (i: number) =>
  '0x' + Array.from({ length: 8 }, (_, k) => HEX_CHARS[Math.floor(seed(i * 17 + k) * 16)]).join('')

// Floating data streams
const STREAMS = Array.from({ length: 12 }, (_, i) => ({
  x: seed(i * 3) * 100,
  speed: 0.15 + seed(i * 7) * 0.25,
  opacity: 0.04 + seed(i * 13) * 0.08,
  delay: seed(i * 19) * 200,
  items: Array.from({ length: 6 }, (_, j) => hexAddr(i * 100 + j)),
}))

// Particle nodes
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: seed(i * 11) * 100,
  y: seed(i * 23) * 100,
  size: 1 + seed(i * 7) * 3,
  color: i % 3 === 0 ? '#dc143c' : i % 3 === 1 ? '#d4af37' : '#1e293b',
  pulseOffset: seed(i * 31) * 300,
}))

export const AmbientLoop: React.FC = () => {
  const frame = useCurrentFrame()
  // frame used for animation timing

  return (
    <AbsoluteFill style={{ background: '#020617', overflow: 'hidden' }}>
      {/* Grid */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <pattern id="ambientGrid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(30,41,59,0.4)" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="radCenter" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(220,20,60,0.06)" />
            <stop offset="60%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#ambientGrid)" />
        <rect width="100%" height="100%" fill="url(#radCenter)" />
      </svg>

      {/* Floating hex data streams */}
      {STREAMS.map((stream, si) => {
        const scrollY = ((frame + stream.delay) * stream.speed) % 140 - 20
        return (
          <div
            key={si}
            style={{
              position: 'absolute',
              left: `${stream.x}%`,
              top: `${scrollY}%`,
              opacity: stream.opacity,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              transform: 'translateX(-50%)',
            }}
          >
            {stream.items.map((addr, ai) => (
              <div key={ai} style={{
                fontFamily: 'monospace', fontSize: 9, color: '#64748b',
                whiteSpace: 'nowrap', letterSpacing: 1,
              }}>
                {addr}
              </div>
            ))}
          </div>
        )
      })}

      {/* Particles */}
      {PARTICLES.map((p, pi) => {
        const pulse = Math.sin((frame + p.pulseOffset) / 40) * 0.5 + 0.5
        return (
          <div
            key={pi}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: p.color,
              opacity: 0.2 + pulse * 0.3,
              boxShadow: `0 0 ${6 + pulse * 8}px ${p.color}60`,
            }}
          />
        )
      })}

      {/* Radial vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 120% 120% at 50% 50%, transparent 30%, rgba(2,6,23,0.7) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Bottom darkening gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(2,6,23,0.5) 0%, transparent 30%, transparent 60%, rgba(2,6,23,0.9) 100%)',
        pointerEvents: 'none',
      }} />
    </AbsoluteFill>
  )
}
