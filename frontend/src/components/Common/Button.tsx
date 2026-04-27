import React from 'react'
import { motion } from 'framer-motion'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  onClick,
  ...rest
}) => {
  const base = 'inline-flex items-center gap-2 rounded font-semibold transition-all duration-200 cursor-pointer'

  const variants = {
    primary:   'bg-gradient-to-r from-ferrari-600 to-ferrari-700 text-white hover:from-ferrari-500 hover:to-ferrari-600 shadow-neon-sm hover:shadow-neon',
    secondary: 'bg-bg-tertiary border border-border-subtle text-gold-400 hover:border-border-neon hover:text-text-primary',
    danger:    'bg-gradient-to-r from-ferrari-700 to-ferrari-800 text-white hover:from-ferrari-600 hover:to-ferrari-700 shadow-neon-sm',
    ghost:     'border border-border-subtle text-text-secondary hover:border-border-neon hover:text-text-primary bg-transparent',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  )
}
