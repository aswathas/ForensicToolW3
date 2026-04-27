import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Player } from '@remotion/player'
import { IntroAnimation } from '../components/animations/IntroAnimation'

const INTRO_DURATION_S = 20

export const Intro: React.FC = () => {
  const navigate = useNavigate()
  const [elapsed, setElapsed] = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(s => {
        if (s >= INTRO_DURATION_S) {
          clearInterval(t)
          handleEnter()
          return s
        }
        return s + 0.1
      })
    }, 100)
    return () => clearInterval(t)
  }, [])

  const handleEnter = () => {
    if (exiting) return
    setExiting(true)
    sessionStorage.setItem('intro_seen', '1')
    setTimeout(() => navigate('/'), 600)
  }

  const progress = Math.min(elapsed / INTRO_DURATION_S, 1)

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{ position: 'fixed', inset: 0, background: '#020617', zIndex: 9999 }}
        >
          {/* Player fills screen */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <Player
              component={IntroAnimation}
              durationInFrames={600}
              fps={30}
              compositionWidth={1920}
              compositionHeight={1080}
              style={{ width: '100%', height: '100%', display: 'block' }}
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

          {/* Progress bar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 2, background: 'rgba(30,41,59,0.8)',
          }}>
            <motion.div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #7f0000, #dc143c)',
                boxShadow: '0 0 8px rgba(220,20,60,0.6)',
                width: `${progress * 100}%`,
              }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>

          {/* Skip button */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.4 }}
            onClick={handleEnter}
            style={{
              position: 'absolute', bottom: 24, right: 32,
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(30,41,59,0.8)',
              borderRadius: 6, padding: '8px 18px',
              fontFamily: 'monospace', fontSize: 11,
              color: '#64748b', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              letterSpacing: 2,
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
          >
            SKIP
            <span style={{ color: '#334155' }}>→</span>
          </motion.button>

          {/* Time remaining */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.4 }}
            style={{
              position: 'absolute', bottom: 28, left: 32,
              fontFamily: 'monospace', fontSize: 10,
              color: '#1e293b', letterSpacing: 2,
            }}
          >
            {Math.ceil(INTRO_DURATION_S - elapsed)}s
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
