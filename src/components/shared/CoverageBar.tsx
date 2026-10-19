import React from 'react'
import { cn } from '@/lib/utils'
import { ShieldCheck, ShieldAlert } from 'lucide-react'

interface CoverageBarProps {
  coverage: number // 0-100%
  label?: string
  showPercentage?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export function CoverageBar({
  coverage,
  label = 'Evidence Coverage',
  showPercentage = true,
  className,
  size = 'md',
}: CoverageBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(coverage)))

  // Visual cues
  const isHigh = clamped >= 80
  const isMedium = clamped >= 60 && clamped < 80
  const barColor = isHigh
    ? 'bg-teal-600'
    : isMedium
      ? 'bg-teal-500'
      : 'bg-amber-500'

  const statusLabel = isHigh
    ? 'High verification'
    : isMedium
      ? 'Moderate coverage'
      : 'Sparse evidence'

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${clamped}%, ${statusLabel}`}
      className={cn('flex flex-col gap-1.5', className)}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-slate-600">
          {isHigh ? (
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
          )}
          {label}
        </span>
        {showPercentage && (
          <span className="font-semibold text-slate-900 font-mono text-xs">
            {clamped}% <span className="text-[10px] text-slate-500 font-normal">({statusLabel})</span>
          </span>
        )}
      </div>

      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200',
          size === 'sm' ? 'h-1.5' : 'h-2'
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
