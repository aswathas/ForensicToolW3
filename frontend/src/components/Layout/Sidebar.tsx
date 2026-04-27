import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Zap, User, FileText, BarChart2,
} from 'lucide-react'

const LINKS = [
  { to: '/dashboard',      label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/graphs',         label: 'Graphs',           icon: BarChart2 },
  { to: '/signals',        label: 'Signals Catalog',  icon: Zap },
  { to: '/entity-profile', label: 'Entity Profile',   icon: User },
  { to: '/report',         label: 'Report Builder',   icon: FileText },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-56 shrink-0 border-r border-border-dim flex flex-col py-6 gap-0.5"
      style={{ backgroundColor: '#030a1a' }}
    >
      {/* Section heading — Ferrari editorial uppercase label */}
      <div className="px-5 mb-4">
        <span
          className="text-[10px] font-mono text-text-muted uppercase"
          style={{ letterSpacing: '2px' }}
        >
          Navigation
        </span>
      </div>

      {LINKS.map(({ to, label, icon: Icon }) => {
        const active = location.pathname === to || location.pathname.startsWith(to + '/')
        return (
          <Link
            key={to}
            to={to}
            className={`
              relative flex items-center gap-3 mx-3 px-3 py-2.5 text-sm font-medium
              transition-colors duration-200 group
              ${active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'}
            `}
            style={{ borderRadius: '2px' }}
          >
            {/* Ferrari active indicator — sharp 2px, left accent line */}
            {active && (
              <motion.div
                layoutId="sidebar-indicator"
                className="absolute inset-0 bg-bg-tertiary border border-border-neon"
                style={{ zIndex: 0, borderRadius: '2px' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            {/* Ferrari red icon — active only */}
            <Icon
              size={15}
              className={`relative z-10 flex-shrink-0 ${
                active
                  ? 'text-ferrari-500'
                  : 'text-text-muted group-hover:text-text-secondary'
              }`}
            />
            {/* Label — uppercase with slight tracking for active items */}
            <span
              className="relative z-10 flex-1 text-[12px]"
              style={{ letterSpacing: active ? '0.5px' : undefined, textTransform: 'uppercase' }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </motion.aside>
  )
}
