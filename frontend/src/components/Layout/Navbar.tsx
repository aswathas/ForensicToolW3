import React from 'react'
import { Link } from 'react-router-dom'

export const Navbar: React.FC = () => {
  return (
    <nav className="bg-gradient-to-r from-bg-primary via-bg-secondary to-bg-primary border-b-2 border-ferrari-600/40 shadow-ferrari px-6 py-5">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="text-2xl font-black bg-gradient-to-r from-ferrari-500 to-gold-400 bg-clip-text text-transparent">
            ⚡ EVM Forensics
          </div>
          <span className="text-gold-400 text-xs font-semibold opacity-75 group-hover:opacity-100 transition">
            Agent
          </span>
        </Link>
        <div className="flex gap-8">
          <Link to="/" className="text-text-secondary hover:text-ferrari-400 font-medium transition-colors duration-200">
            Home
          </Link>
          <Link to="/dashboard" className="text-text-secondary hover:text-ferrari-400 font-medium transition-colors duration-200">
            Dashboard
          </Link>
          <Link to="/signals" className="text-text-secondary hover:text-ferrari-400 font-medium transition-colors duration-200">
            Signals
          </Link>
          <Link to="/report" className="text-text-secondary hover:text-gold-400 font-medium transition-colors duration-200">
            Reports
          </Link>
        </div>
      </div>
    </nav>
  )
}
