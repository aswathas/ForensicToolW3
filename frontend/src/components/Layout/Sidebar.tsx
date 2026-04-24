import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export const Sidebar: React.FC = () => {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <aside className="w-64 bg-bg-secondary border-r border-bg-tertiary p-4">
      <div className="space-y-2">
        <SidebarLink to="/" label="Landing" active={isActive('/')} />
        <SidebarLink to="/dashboard" label="Dashboard" active={isActive('/dashboard')} />
        <SidebarLink to="/investigation" label="Investigation" active={isActive('/investigation')} />
        <SidebarLink to="/signals" label="Signals Catalog" active={isActive('/signals')} />
        <SidebarLink to="/entity-profile" label="Entity Profile" active={isActive('/entity-profile')} />
        <SidebarLink to="/report" label="Report Builder" active={isActive('/report')} />
      </div>
    </aside>
  )
}

interface SidebarLinkProps {
  to: string
  label: string
  active: boolean
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, label, active }) => (
  <Link
    to={to}
    className={`block px-4 py-2 rounded transition ${
      active ? 'bg-accent-primary text-white' : 'text-text-secondary hover:bg-bg-tertiary'
    }`}
  >
    {label}
  </Link>
)
