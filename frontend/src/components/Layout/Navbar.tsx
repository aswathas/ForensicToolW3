import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ChevronDown } from 'lucide-react'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/graphs',    label: 'Graphs'    },
  { to: '/signals',   label: 'Signals'   },
  { to: '/report',    label: 'Reports'   },
  { to: '/upcoming',  label: 'Upcoming'  },
  { to: '/about',     label: 'About'     },
  { to: '/pitch',     label: 'Pitch'     },
]

// ── Network definitions ────────────────────────────────────────────────────
type NetworkId = 'anvil' | 'mainnet' | 'goerli' | 'sepolia'

interface Network {
  id: NetworkId
  label: string
  dotColor: string
  dotGlow: string
  pillBorder: string
  pillText: string
  isTestnet: boolean
}

const NETWORKS: Network[] = [
  {
    id: 'anvil',
    label: 'Anvil (Local)',
    dotColor: 'bg-green-500',
    dotGlow: 'shadow-[0_0_6px_rgba(34,197,94,0.8)]',
    pillBorder: 'border-green-500/40',
    pillText: 'text-green-400',
    isTestnet: false,
  },
  {
    id: 'mainnet',
    label: 'Ethereum Mainnet',
    dotColor: 'bg-sky-400',
    dotGlow: 'shadow-[0_0_6px_rgba(56,189,248,0.8)]',
    pillBorder: 'border-sky-500/40',
    pillText: 'text-sky-400',
    isTestnet: false,
  },
  {
    id: 'goerli',
    label: 'Goerli Testnet',
    dotColor: 'bg-yellow-400',
    dotGlow: 'shadow-[0_0_6px_rgba(250,204,21,0.8)]',
    pillBorder: 'border-yellow-500/40',
    pillText: 'text-yellow-400',
    isTestnet: true,
  },
  {
    id: 'sepolia',
    label: 'Sepolia Testnet',
    dotColor: 'bg-yellow-400',
    dotGlow: 'shadow-[0_0_6px_rgba(250,204,21,0.8)]',
    pillBorder: 'border-yellow-500/40',
    pillText: 'text-yellow-400',
    isTestnet: true,
  },
]

// ── NetworkSelector component ──────────────────────────────────────────────
const NetworkSelector: React.FC = () => {
  const [selectedId, setSelectedId] = useState<NetworkId>('anvil')
  const [displayId, setDisplayId] = useState<NetworkId>('anvil')
  const [switching, setSwitching] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const handleSelect = (network: Network) => {
    setOpen(false)
    if (network.id === selectedId) return

    // Start cosmetic "switching" animation
    setSwitching(true)
    setDisplayId(network.id)

    // After a short delay, revert to Anvil (cosmetic only — always stays on Anvil)
    setTimeout(() => {
      setSwitching(false)
      setSelectedId('anvil')
      setDisplayId('anvil')
    }, 1800)
  }

  const current = NETWORKS.find(n => n.id === displayId) ?? NETWORKS[0]

  return (
    <div ref={ref} className="relative">
      {/* Pill trigger */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono
                    transition-colors duration-200 cursor-pointer select-none
                    bg-bg-secondary hover:bg-bg-tertiary
                    ${current.pillBorder} ${current.pillText}`}
        whileTap={{ scale: 0.96 }}
        aria-label="Select network"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* Status dot */}
        <motion.span
          className={`w-2 h-2 rounded-full shrink-0 ${current.dotColor} ${current.dotGlow}`}
          animate={switching ? { opacity: [1, 0.3, 1, 0.3, 1] } : { opacity: 1 }}
          transition={switching ? { duration: 1.4, ease: 'easeInOut' } : {}}
        />

        <AnimatePresence mode="wait">
          <motion.span
            key={displayId + (switching ? '-switching' : '')}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="whitespace-nowrap"
          >
            {switching ? 'Switching...' : current.label}
          </motion.span>
        </AnimatePresence>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={11} className="text-text-muted" />
        </motion.span>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="absolute right-0 top-full mt-1.5 z-50 min-w-[190px] rounded-lg
                       bg-bg-card border border-border-dim overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
          >
            {NETWORKS.map(network => (
              <li key={network.id}>
                <button
                  role="option"
                  aria-selected={selectedId === network.id}
                  onClick={() => handleSelect(network)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-mono
                              hover:bg-bg-tertiary transition-colors duration-150 text-left
                              ${selectedId === network.id ? 'bg-bg-secondary' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${network.dotColor} ${network.dotGlow}`} />
                  <span className={network.pillText}>{network.label}</span>
                  {network.isTestnet && (
                    <span className="ml-auto text-[9px] font-mono text-text-dim border border-border-dim px-1 rounded">
                      testnet
                    </span>
                  )}
                  {selectedId === network.id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                </button>
              </li>
            ))}
            <li className="px-3 py-1.5 border-t border-border-dim">
              <p className="text-[9px] font-mono text-text-dim">
                Only Anvil (local) is active in this build.
              </p>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Navbar ─────────────────────────────────────────────────────────────────
export const Navbar: React.FC = () => {
  const location = useLocation()

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="sticky top-0 z-50"
    >
      <div className="flex items-center justify-between px-8 py-3 bg-black/90 backdrop-blur-md border-b border-border-dim"
           style={{ borderRadius: '0 0 2px 2px' }}>
        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2 group">
          <Shield
            size={16}
            className="text-ferrari-500"
            style={{ filter: 'drop-shadow(0 0 4px rgba(220,20,60,0.8))' }}
          />
          <span className="font-mono font-bold text-sm text-text-primary tracking-[1px]">
            EVM<span className="text-ferrari-500">.</span>Forensics
          </span>
          <span className="text-[10px] font-mono text-text-muted border border-border-dim px-1.5 py-0.5 rounded">
            v2.0
          </span>
        </Link>

        {/* Nav Links + right controls */}
        <div className="flex items-center gap-6">
          {NAV_LINKS.map(({ to, label }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/')
            return (
              <Link
                key={to}
                to={to}
                className={`text-[11px] font-mono uppercase tracking-[1px] transition-colors duration-200
                            ${active ? 'text-ferrari-500' : 'text-text-muted hover:text-text-primary'}`}
              >
                {label}
              </Link>
            )
          })}

          <div className="w-px h-4 bg-border-dim" />

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono text-green-500 tracking-[1px]">LIVE</span>
          </div>

          {/* Network selector */}
          <NetworkSelector />
        </div>
      </div>
    </motion.nav>
  )
}
