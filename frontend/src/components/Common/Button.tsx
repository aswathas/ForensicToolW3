import React from 'react'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-ferrari-600 to-ferrari-700 text-white hover:from-ferrari-500 hover:to-ferrari-600 shadow-ferrari hover:shadow-ferrari-lg font-semibold',
    secondary: 'bg-bg-tertiary border-2 border-gold-500/30 text-gold-400 hover:bg-bg-tertiary/50 hover:border-gold-400 font-semibold',
    danger: 'bg-gradient-to-r from-ferrari-700 to-ferrari-800 text-white hover:from-ferrari-600 hover:to-ferrari-700 shadow-ferrari font-semibold',
  }

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded transition font-medium ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}
