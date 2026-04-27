import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Player } from '@remotion/player'
import { ArrowRight, Zap } from 'lucide-react'
import { AmbientLoop } from '../components/animations/AmbientLoop'
import { AttackViz } from '../components/animations/AttackViz'
import { UpcomingTeaser } from '../components/animations/UpcomingTeaser'
import { Navbar } from '../components/Layout/Navbar'

// ── Roadmap data ──────────────────────────────────────────────────────────────
const ROADMAP = [
  {
    quarter: 'Q3 2026',
    title: 'MULTI-CHAIN EXPANSION',
    status: 'current',
    features: [
      'Multi-chain tracing (Ethereum + Arbitrum + Base + Polygon)',
      'Cross-chain fund flow visualization',
      'Unified address namespace across chains',
    ],
  },
  {
    quarter: 'Q4 2026',
    title: 'ENTITY INTELLIGENCE',
    status: 'upcoming',
    features: [
      'Entity attribution engine (address clustering, ownership inference)',
      'Exchange deposit address detection',
      'Cross-protocol entity graph',
    ],
  },
  {
    quarter: 'Q1 2026',
    title: 'REALTIME SURVEILLANCE',
    status: 'upcoming',
    features: [
      'Live mempool monitoring & alerting',
      'Instant signal dispatch to Slack / PagerDuty',
      'On-chain anomaly streaming',
    ],
  },
  {
    quarter: 'Q2 2026',
    title: 'ENTERPRISE INTEGRATIONS',
    status: 'upcoming',
    features: [
      'REST API + webhook endpoints',
      'Splunk / Elastic integration',
      'SOC playbook generator',
    ],
  },
]

// ── Quarter badge colours ─────────────────────────────────────────────────────
const QUARTER_BADGES: Record<string, string> = {
  'Q3 2026': 'bg-ferrari-600/20 text-ferrari-400 border-ferrari-600/40',
  'Q4 2026': 'bg-ferrari-600/10 text-ferrari-500 border-ferrari-600/30',
  'Q1 2026': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  'Q2 2026': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
}

// ── Noise overlay ─────────────────────────────────────────────────────────────
const NoiseOverlay: React.FC = () => (
  <div
    style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
      opacity: 0.4,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat',
      mixBlendMode: 'overlay',
    }}
  />
)

// ── Timeline entry with scroll-triggered animation ────────────────────────────
interface TimelineEntryProps {
  quarter: string
  title: string
  status: string
  features: string[]
  index: number
}

const TimelineEntry: React.FC<TimelineEntryProps> = ({ quarter, title, features, index }) => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.25 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -24 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="relative pl-10"
    >
      {/* Timeline dot */}
      <div
        className="absolute left-0 top-1 w-3 h-3 rounded-full border-2 border-ferrari-500 bg-bg-void"
        style={{ boxShadow: '0 0 8px rgba(220,20,60,0.6)', transform: 'translateX(-6px)' }}
      />

      {/* Quarter badge */}
      <span
        className={`inline-block text-[10px] font-mono border px-2 py-0.5 rounded-full mb-3 ${QUARTER_BADGES[quarter] ?? 'bg-border-dim text-text-muted border-border-dim'}`}
      >
        {quarter}
      </span>

      {/* Section heading */}
      <h3
        className="text-2xl md:text-3xl text-text-primary mb-5 leading-none"
        style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.04em' }}
      >
        {title}
      </h3>

      {/* Feature bullets */}
      <ul className="space-y-3 mb-2">
        {features.map((feature, fi) => (
          <motion.li
            key={fi}
            initial={{ opacity: 0, x: -12 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: index * 0.1 + fi * 0.07 + 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-start gap-3"
          >
            {/* Bullet dot */}
            <span
              className="mt-1.5 w-1.5 h-1.5 rounded-full bg-ferrari-500 shrink-0"
              style={{ boxShadow: '0 0 4px rgba(220,20,60,0.5)' }}
            />
            <span className="font-mono text-sm text-text-secondary leading-relaxed">{feature}</span>

            {/* "Coming soon" badge */}
            <span className="ml-auto shrink-0 text-[10px] font-mono bg-ferrari-600/20 text-ferrari-400 px-2 py-0.5 rounded-full border border-ferrari-600/30 whitespace-nowrap">
              coming soon
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  )
}

// ── Timeline section ──────────────────────────────────────────────────────────
const TimelineSection: React.FC = () => {
  const headingRef = useRef<HTMLDivElement>(null)
  const headingInView = useInView(headingRef, { once: true, amount: 0.3 })

  return (
    <section className="relative py-32 px-8 md:px-16 bg-bg-void border-t border-border-dim">
      <div className="max-w-4xl mx-auto">
        {/* Section label + heading */}
        <div ref={headingRef} className="mb-20">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={headingInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-[11px] font-mono text-text-muted tracking-[4px] uppercase">Product Roadmap</span>
            <h2
              className="text-6xl md:text-7xl text-text-primary mt-4 leading-none"
              style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.02em' }}
            >
              WHAT&apos;S<br />
              <span className="text-ferrari-500">NEXT</span>
            </h2>
          </motion.div>
        </div>

        {/* Vertical timeline */}
        <div className="relative">
          {/* Vertical red line */}
          <div className="absolute left-0 top-0 bottom-0 border-l-2 border-ferrari-600" style={{ opacity: 0.35 }} />

          <div className="space-y-20">
            {ROADMAP.map((entry, i) => (
              <TimelineEntry
                key={entry.quarter}
                quarter={entry.quarter}
                title={entry.title}
                status={entry.status}
                features={entry.features}
                index={i}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Teaser video placeholder section ─────────────────────────────────────────
const TeaserSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section ref={ref} className="relative py-24 px-8 md:px-16 bg-bg-void border-t border-border-dim">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          <span className="text-[11px] font-mono text-text-muted tracking-[4px] uppercase">Sneak Preview</span>
          <h2
            className="text-5xl md:text-6xl text-text-primary mt-4 leading-none"
            style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.02em' }}
          >
            TEASER <span className="text-ferrari-500">REEL</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative aspect-video max-w-4xl mx-auto overflow-hidden border border-border-dim rounded-sm"
               style={{ background: '#020617' }}>
            <Player
              component={UpcomingTeaser}
              durationInFrames={900}
              fps={30}
              compositionWidth={1920}
              compositionHeight={1080}
              style={{ width: '100%', height: '100%' }}
              controls={true}
              autoPlay={false}
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── CTA section ───────────────────────────────────────────────────────────────
const CTASection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <section ref={ref} className="relative py-32 px-8 md:px-16 overflow-hidden border-t border-border-dim">
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 55% at 50% 100%, rgba(220,20,60,0.09) 0%, transparent 70%)' }}
      />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-[11px] font-mono text-text-muted tracking-[4px] uppercase">Early Access</span>

          <h2
            className="text-6xl md:text-8xl text-text-primary mt-4 mb-6 leading-none"
            style={{ fontFamily: "'Bebas Neue', monospace", letterSpacing: '0.03em' }}
          >
            WANT EARLY<br />
            <span className="text-ferrari-500">ACCESS?</span>
          </h2>

          <p className="text-sm md:text-base text-text-secondary font-mono mb-10 max-w-lg mx-auto leading-relaxed">
            The next generation of blockchain forensics is being built right now.
            Enterprise teams get priority access to every feature before public release.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-4"
        >
          {/* Ferrari-style CTA button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-ferrari-600 hover:bg-ferrari-500 transition-colors duration-200 text-white font-mono text-sm uppercase tracking-[1.28px]"
            style={{ borderRadius: '2px' }}
          >
            <Zap size={14} />
            Join Waitlist
            <ArrowRight size={14} />
          </motion.button>

          <p className="text-[11px] font-mono text-text-dim tracking-[0.5px]">
            Enterprise teams only.{' '}
            <a
              href="mailto:aswathas20@gmail.com"
              className="text-ferrari-400 hover:text-ferrari-300 transition-colors duration-200 underline underline-offset-2"
            >
              Contact aswathas20@gmail.com
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  )
}

// ── Main Upcoming page ────────────────────────────────────────────────────────
export const Upcoming: React.FC = () => {
  return (
    <div className="bg-bg-void text-text-primary">

      <Navbar />

      {/* ── HERO SECTION ── */}
      <section className="relative h-screen w-full overflow-hidden">

        {/* Remotion ambient background — AmbientLoop */}
        <div className="absolute inset-0 z-0">
          <Player
            component={AmbientLoop}
            durationInFrames={600}
            fps={30}
            compositionWidth={1920}
            compositionHeight={1080}
            style={{ width: '100%', height: '100%' }}
            loop
            autoPlay
            controls={false}
            showPosterWhenUnplayed={false}
            initiallyShowControls={false}
            clickToPlay={false}
            doubleClickToFullscreen={false}
            spaceKeyToPlayOrPause={false}
            moveToBeginningWhenEnded={false}
          />
        </div>

        {/* AttackViz ambient overlay */}
        <div className="absolute inset-0 z-0">
          <Player
            component={AttackViz}
            durationInFrames={600}
            fps={30}
            compositionWidth={1920}
            compositionHeight={1080}
            style={{ width: '100%', height: '100%' }}
            loop
            autoPlay
            controls={false}
            showPosterWhenUnplayed={false}
            initiallyShowControls={false}
            clickToPlay={false}
            doubleClickToFullscreen={false}
            spaceKeyToPlayOrPause={false}
            moveToBeginningWhenEnded={false}
          />
          {/* Low-opacity overlay to keep AttackViz subtle */}
          <div className="absolute inset-0 bg-bg-void/80" />
        </div>

        {/* Noise */}
        <NoiseOverlay />

        {/* Gradient vignette */}
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(2,6,23,0.45) 0%, transparent 25%, transparent 55%, rgba(2,6,23,0.97) 100%)',
          }}
        />
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(2,6,23,0.25) 0%, transparent 40%)' }}
        />

        {/* ── Hero content (centred) ── */}
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-8">

          {/* Quarter badges */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 mb-10"
          >
            {['Q3 2026', 'Q4 2026', '2027'].map((badge) => (
              <span
                key={badge}
                className="text-[10px] font-mono border border-ferrari-600/40 bg-ferrari-600/10 text-ferrari-400 px-3 py-1 rounded-full tracking-[1px]"
              >
                {badge}
              </span>
            ))}
          </motion.div>

          {/* Giant headline */}
          <div className="overflow-hidden">
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1
                className="leading-none tracking-[0.02em]"
                style={{
                  fontFamily: "'Bebas Neue', monospace",
                  fontSize: 'clamp(80px, 18vw, 220px)',
                  color: '#f1f5f9',
                }}
              >
                COMING
              </h1>
            </motion.div>
          </div>

          <div className="overflow-hidden">
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1
                className="leading-none tracking-[0.02em]"
                style={{
                  fontFamily: "'Bebas Neue', monospace",
                  fontSize: 'clamp(80px, 18vw, 220px)',
                  color: '#dc143c',
                  filter: 'drop-shadow(0 0 40px rgba(220,20,60,0.4))',
                }}
              >
                NEXT
              </h1>
            </motion.div>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm md:text-base text-text-secondary font-mono max-w-md mt-8 leading-relaxed"
          >
            The next generation of blockchain forensics.{' '}
            <span className="text-text-primary">Built for enterprise.</span>
          </motion.p>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute bottom-10 flex flex-col items-center gap-2"
          >
            <span className="text-[10px] font-mono text-text-dim tracking-[2px] uppercase">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-px h-8 bg-gradient-to-b from-ferrari-500/60 to-transparent"
            />
          </motion.div>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <TimelineSection />

      {/* ── TEASER VIDEO PLACEHOLDER ── */}
      <TeaserSection />

      {/* ── CTA ── */}
      <CTASection />

      {/* ── Bottom bar ── */}
      <div className="border-t border-border-dim px-8 md:px-16 py-6 flex items-center justify-between text-xs font-mono text-text-dim">
        <span>EVM.Forensics — Enterprise Edition</span>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>System Nominal</span>
        </div>
      </div>
    </div>
  )
}
