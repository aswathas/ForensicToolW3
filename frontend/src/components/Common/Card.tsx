import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-bg-secondary border border-ferrari-600/10 hover:border-ferrari-600/30 rounded-lg p-6 shadow-ferrari/10 transition-all duration-300 ${className}`}>
      {children}
    </div>
  )
}
