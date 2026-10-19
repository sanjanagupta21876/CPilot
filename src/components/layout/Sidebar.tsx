'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  MapPin,
  Users,
  Building2,
  FlaskConical,
  ShieldCheck,
  ArrowRight,
  X,
  Compass,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CityPilotLogo } from '@/components/shared/CityPilotLogo'

export const primaryNavItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: 'City Recommendation',
    href: '/city-intelligence',
    icon: MapPin,
  },
  {
    label: 'Local Businesses',
    href: '/local-connect',
    icon: Users,
  },
  {
    label: 'Business Profile',
    href: '/settings',
    icon: Building2,
  },
]

export const secondaryNavItems = [
  {
    label: 'Market Validation',
    href: '/market-validation',
    icon: FlaskConical,
  },
  {
    label: 'Evidence Proof Loop',
    href: '/market-proof',
    icon: ShieldCheck,
  },
]

interface SidebarProps {
  onCloseMobile?: () => void
  isMobile?: boolean
  className?: string
}

export function Sidebar({ onCloseMobile, isMobile = false, className }: SidebarProps) {
  const pathname = usePathname()

  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile()
    }
  }

  return (
    <aside
      suppressHydrationWarning
      className={cn(
        'flex h-full w-64 flex-col border-r border-slate-800 bg-[#0F172A] text-slate-100 select-none',
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
        <Link
          href="/dashboard"
          onClick={handleLinkClick}
          className="group focus:outline-none"
        >
          <CityPilotLogo variant="light" iconSize={22} />
        </Link>

        {isMobile && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3.5 py-4">
        {/* Main Nav Items */}
        <div className="space-y-6">
          <div>
            <span className="px-3 text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Core Navigation
            </span>
            <nav aria-label="Main Navigation" className="space-y-1 mt-2">
              {primaryNavItems.map(({ label, href, icon: Icon }) => {
                const isActive =
                  label === 'Dashboard'
                    ? pathname === '/dashboard'
                    : label === 'Business Profile'
                    ? pathname === '/settings' || pathname === '/onboarding'
                    : pathname === href || pathname.startsWith(href + '/')

                return (
                  <Link
                    key={label}
                    href={href}
                    suppressHydrationWarning
                    id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={handleLinkClick}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-teal-500/15 text-teal-300 font-bold border border-teal-500/30 shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 flex-shrink-0 transition-colors',
                        isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate">{label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Secondary Items: Market Validation, Evidence Proof Loop */}
          <div>
            <span className="px-3 text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Verification Tools
            </span>
            <div className="space-y-1 mt-2">
              {secondaryNavItems.map(({ label, href, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={label}
                    href={href}
                    onClick={handleLinkClick}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-slate-800 text-teal-300 font-semibold border border-slate-700'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    )}
                  >
                    <Icon className="h-4 w-4 text-slate-400 group-hover:text-slate-200" />
                    <span className="flex-1 truncate">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* CityPilot Journey Helper Card */}
        <div className="pt-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-[#0A1628] p-4 text-xs shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                <Compass className="h-4 w-4" />
              </div>
              <span className="font-bold text-xs text-white">CityPilot Expansion</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Find the right city. Connect with the right people.
            </p>
            <Link href="/city-intelligence/new" onClick={handleLinkClick}>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 py-2 text-xs font-bold text-white transition-all shadow-sm shadow-teal-900/30 active:scale-[0.98] cursor-pointer"
              >
                <span>Compare Cities</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}

