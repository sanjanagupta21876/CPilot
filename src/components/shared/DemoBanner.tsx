import React from 'react'
import { Info, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DemoBannerProps {
  message?: string
  className?: string
  compact?: boolean
}

export function DemoBanner({
  message = 'Demonstration prototype active. Sourced indicators and simulated benchmarks are displayed for verification.',
  className = '',
  compact = false,
}: DemoBannerProps) {
  if (compact) {
    return (
      <div
        role="status"
        aria-label="Demonstration data notice"
        className={`flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs text-teal-900 ${className}`}
      >
        <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-teal-600" />
        <span className="font-semibold uppercase tracking-wider text-[10px] text-teal-700">Demo</span>
        <span className="text-teal-400">·</span>
        <span className="text-slate-700 text-xs">{message}</span>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-label="Demonstration environment notice"
      className={`mb-6 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 border border-teal-200 text-teal-700">
          <Info className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="demo">Curated Benchmark Data</Badge>
            <span className="text-xs font-semibold text-slate-900">Demo Mode</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{message}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-start text-[11px] font-medium text-slate-500 sm:self-center">
        <span>Verified Sources & Benchmarks</span>
      </div>
    </div>
  )
}
