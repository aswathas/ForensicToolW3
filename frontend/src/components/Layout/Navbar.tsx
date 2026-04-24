import React from 'react'
import { Link } from 'react-router-dom'

export const Navbar: React.FC = () => {
  return (
    <nav className="bg-bg-primary border-b border-bg-tertiary px-6 py-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-text-primary font-display">
          🔍 Forensics
        </Link>
        <div className="flex gap-6">
          <Link to="/" className="text-text-secondary hover:text-accent-primary transition">
            Home
          </Link>
          <Link to="/dashboard" className="text-text-secondary hover:text-accent-primary transition">
            Dashboard
          </Link>
          <Link to="/investigation" className="text-text-secondary hover:text-accent-primary transition">
            Investigate
          </Link>
          <Link to="/signals" className="text-text-secondary hover:text-accent-primary transition">
            Signals
          </Link>
        </div>
      </div>
    </nav>
  )
}
