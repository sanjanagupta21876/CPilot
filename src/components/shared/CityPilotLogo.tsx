import React from 'react'
import { cn } from '@/lib/utils'

interface CityPilotLogoProps {
  className?: string
  iconSize?: number
  variant?: 'light' | 'dark' | 'auto'
  showTagline?: boolean
}

export function CityPilotLogo({
  className,
  iconSize = 28,
  variant = 'auto',
  showTagline = false,
}: CityPilotLogoProps) {
  // Variant 'light' is for dark backgrounds (white text)
  // Variant 'dark' is for light backgrounds (navy text)
  const isLight = variant === 'light'

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      {/* CityPilot Icon Mark: Connected Navigation Waypoint */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 shadow-sm',
          isLight
            ? 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-teal-900/30'
            : 'bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-teal-400 shadow-slate-900/10'
        )}
        style={{ width: iconSize + 8, height: iconSize + 8 }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Compass / Navigation Waypoint Pin */}
          <circle cx="12" cy="12" r="9" className="stroke-teal-400/40" strokeWidth="1.5" strokeDasharray="2 2" />
          <polygon points="12 3 15 11 12 9 9 11 12 3" fill="currentColor" className={isLight ? 'fill-white' : 'fill-teal-400'} />
          <polygon points="12 21 9 13 12 15 15 13 12 21" fill="currentColor" opacity="0.6" className={isLight ? 'fill-teal-200' : 'fill-teal-600'} />
          {/* Central connectivity node */}
          <circle cx="12" cy="12" r="2.2" fill={isLight ? '#0F172A' : '#FFFFFF'} className="stroke-teal-400" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center tracking-tight">
          <span
            className={cn(
              'font-extrabold text-lg tracking-tight',
              isLight ? 'text-white' : 'text-slate-900'
            )}
          >
            City<span className="text-teal-500">Pilot</span>
          </span>
        </div>
        {showTagline && (
          <span
            className={cn(
              'text-[10px] tracking-normal font-medium leading-tight',
              isLight ? 'text-slate-400' : 'text-slate-500'
            )}
          >
            Find the right city. Connect with the right people.
          </span>
        )}
      </div>
    </div>
  )
}
