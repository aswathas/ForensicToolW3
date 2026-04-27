import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()

  return (
    <div className="flex flex-col min-h-screen bg-bg-void text-text-primary scanline-overlay">
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex-1 overflow-auto"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
