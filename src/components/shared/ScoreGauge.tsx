import React from 'react'
import { cn } from '@/lib/utils'

interface ScoreGaugeProps {
  score: number // 0-100
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showRating?: boolean
  className?: string
  accessibleLabel?: string
}

export function ScoreGauge({
  score,
  size = 'md',
  label = 'Fit Score',
  showRating = true,
  className,
  accessibleLabel,
}: ScoreGaugeProps) {
  // Clamped 0-100
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)))

  // SVG parameters
  const dimension = size === 'sm' ? 64 : size === 'lg' ? 120 : 88
  const strokeWidth = size === 'sm' ? 6 : size === 'lg' ? 10 : 8
  const radius = (dimension - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  // Arc angle (270 degrees)
  const arcLength = circumference * 0.75
  const strokeDashoffset = arcLength - (arcLength * clampedScore) / 100

  // CityPilot Colors & rating
  let strokeColor = '#0D9488' // teal-600
  let ratingText = 'High Opportunity'
  let textColor = 'text-teal-700'

  if (clampedScore < 50) {
    strokeColor = '#EF4444' // rose-500
    ratingText = 'Challenging'
    textColor = 'text-rose-600'
  } else if (clampedScore < 70) {
    strokeColor = '#D97706' // amber-600
    ratingText = 'Moderate'
    textColor = 'text-amber-700'
  } else if (clampedScore >= 80) {
    strokeColor = '#0D9488' // teal-600
    ratingText = 'Top Fit'
    textColor = 'text-teal-700'
  }

  const ariaDescription = accessibleLabel ?? `${label}: ${clampedScore} out of 100 (${ratingText})`

  return (
    <div
      role="img"
      aria-label={ariaDescription}
      className={cn('inline-flex flex-col items-center justify-center', className)}
    >
      <div className="relative flex items-center justify-center" style={{ width: dimension, height: dimension }}>
        <svg
          width={dimension}
          height={dimension}
          viewBox={`0 0 ${dimension} ${dimension}`}
          className="-rotate-135 transform"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Active progress */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span
            className={cn(
              'font-extrabold tracking-tight text-slate-900 font-mono',
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg'
            )}
          >
            {clampedScore}
          </span>
          {size !== 'sm' && (
            <span className="text-[10px] text-slate-400 leading-none mt-0.5">/100</span>
          )}
        </div>
      </div>

      {label && size !== 'sm' && (
        <span className="mt-1 text-xs font-medium text-slate-500">{label}</span>
      )}

      {showRating && (
        <span
          className={cn(
            'mt-0.5 font-semibold text-center leading-tight',
            textColor,
            size === 'sm' ? 'text-[10px]' : 'text-xs'
          )}
        >
          {ratingText}
        </span>
      )}
    </div>
  )
}
