import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageShellProps {
  children: React.ReactNode
  className?: string
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <main className={cn('min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8 text-slate-900', className)}>
      <div className="mx-auto max-w-7xl space-y-6">{children}</div>
    </main>
  )
}

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  badge?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={crumb.label}>
                  {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden="true" />}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="text-slate-500 hover:text-teal-700 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={cn(isLast ? 'text-slate-900 font-semibold' : 'text-slate-500')}>
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}

