import React from 'react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: React.ReactNode
  render?: (item: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T, index: number) => string | number
  emptyState?: React.ReactNode
  className?: string
  caption?: string
  onRowClick?: (item: T) => void
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  className,
  caption,
  onRowClick,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm', className)}>
      <table className="w-full text-left text-sm text-slate-300">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="border-b border-slate-800 bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn('px-4 py-3.5 font-semibold text-slate-400', col.headerClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {data.map((item, index) => {
            const key = keyExtractor(item, index)
            const isClickable = Boolean(onRowClick)

            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'transition-colors hover:bg-slate-800/40',
                  isClickable && 'cursor-pointer'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-slate-300', col.className)}>
                    {col.render
                      ? col.render(item, index)
                      : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
