import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  id?: string
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  badge?: string
  isDemo?: boolean
  className?: string
  onClick?: () => void
}

export function StatCard({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-[#F5B94C]',
  iconBg = 'bg-[#151719] border border-[#252729]',
  trend,
  badge,
  isDemo = false,
  className,
  onClick,
}: StatCardProps) {
  return (
    <Card
      id={id}
      className={cn(
        'relative overflow-hidden transition-all duration-200 border-[#252729] bg-[#101314] hover:border-[#3A3D40] hover:shadow-lg hover:shadow-black/60',
        onClick && 'cursor-pointer hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#858783]">
              {title}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#F5F5F2] font-mono">{value}</span>
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center text-xs font-medium font-mono',
                    trend.direction === 'up' && 'text-[#F5B94C]',
                    trend.direction === 'down' && 'text-rose-400',
                    trend.direction === 'neutral' && 'text-[#858783]'
                  )}
                >
                  {trend.direction === 'up' && <ArrowUpRight className="mr-0.5 h-3 w-3" />}
                  {trend.direction === 'down' && <ArrowDownRight className="mr-0.5 h-3 w-3" />}
                  {trend.direction === 'neutral' && <Minus className="mr-0.5 h-3 w-3" />}
                  {trend.value}
                </span>
              )}
            </div>
            {subtitle && <p className="mt-1 text-xs text-[#858783]">{subtitle}</p>}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shadow-inner', iconBg)}>
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
            {badge && (
              <Badge variant="secondary" className="text-[10px]">
                {badge}
              </Badge>
            )}
            {isDemo && (
              <Badge variant="demo" className="text-[9px]">
                Demo
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
