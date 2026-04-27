import React from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, onClick }) => {
  const base = 'bg-bg-card border border-border-dim rounded-lg p-6 transition-all duration-300'
  const hoverStyle = hover ? 'cursor-pointer hover:border-border-neon' : ''

  if (hover || onClick) {
    return (
      <motion.div
        className={`${base} ${hoverStyle} ${className}`}
        onClick={onClick}
        whileHover={{ y: -1, boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 20px rgba(220,20,60,0.1)' }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={`${base} ${className}`} style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
      {children}
    </div>
  )
}
