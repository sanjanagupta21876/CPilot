'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface DashboardShellProps {
  children: React.ReactNode
  user?: SupabaseUser | null
  isDemo?: boolean
  startupName?: string
}

export function DashboardShell({
  children,
  user,
  isDemo = true,
  startupName = "Shaurya's Startup",
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Navigation Drawer & Backdrop */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Off-canvas menu panel */}
          <div className="relative flex w-72 max-w-[85vw] flex-col bg-[#0F172A] border-r border-slate-800 shadow-2xl transition-transform animate-in slide-in-from-left duration-200">
            <Sidebar isMobile onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 bg-slate-50">
        <Topbar
          user={user}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          isDemo={isDemo}
          startupName={startupName}
        />
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </div>
      </div>
    </div>
  )
}
