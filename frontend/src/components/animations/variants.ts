import type { Variants } from 'framer-motion'

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: 'easeIn' } },
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.2 } },
}

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.22 } },
}

export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

export const staggerFast: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.28, ease: 'easeIn' } },
}

export const glowPulse = {
  animate: {
    opacity: [0.3, 0.6, 0.3],
    scale: [1, 1.08, 1],
    transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
  },
}

export const counterTransition = { type: 'spring', stiffness: 100, damping: 20 }
