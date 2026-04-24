import React from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'

interface LayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
}

export const Layout: React.FC<LayoutProps> = ({ children, showSidebar = false }) => {
  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <Footer />
    </div>
  )
}
