'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Menu, Search, ChevronDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface TopbarProps {
  user?: SupabaseUser | null
  onOpenMobileMenu?: () => void
  isDemo?: boolean
  startupName?: string
}

export function Topbar({
  user,
  onOpenMobileMenu,
  isDemo = true,
}: TopbarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // In demo mode or if offline
    }
    router.push('/login')
    router.refresh()
  }

  const displayName = user?.user_metadata?.name ?? (isDemo ? 'Shaurya Verma' : 'Founder')
  const email = user?.email ?? (isDemo ? 'founder@citypilot.io' : 'user@startup.com')

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8 sticky top-0 z-20">
      {/* Left: Mobile hamburger & Global Search bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Open mobile navigation menu"
            id="btn-open-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Global Search Input */}
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-500 w-full max-w-md focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/10 transition-all">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search cities, local businesses, categories..."
            className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="ml-auto hidden sm:flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500 shrink-0">
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Right: Demo status, Notifications, Profile, Sign Out */}
      <div className="flex items-center gap-2 sm:gap-3">
        {isDemo && (
          <Badge variant="teal" className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] px-2.5 py-1">
            <Sparkles className="h-3 w-3 text-teal-600" />
            <span>Interactive Demo</span>
          </Badge>
        )}

        {/* Notification bell */}
        <div className="relative">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-white" />
        </div>

        {/* User profile avatar chip */}
        <Link
          href="/settings"
          title={email}
          className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-1.5 pr-3 hover:border-slate-300 hover:bg-slate-100/60 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white shadow-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {displayName}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight">
              Business Founder
            </span>
          </div>
          <ChevronDown className="h-3 w-3 text-slate-400 hidden sm:block ml-0.5" />
        </Link>

        {/* Sign Out Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          aria-label={isDemo ? 'Exit demo view / sign out' : 'Sign out'}
          id="btn-sign-out"
          title={isDemo ? 'Exit demo view' : 'Sign out'}
          className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-9 w-9 rounded-xl"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

