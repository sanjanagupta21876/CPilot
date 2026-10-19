import React from 'react'
import { Search, X, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterGroup {
  id: string
  label: string
  options: FilterOption[]
  value: string
}

interface FilterControlsProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  searchPlaceholder?: string
  filterGroups?: {
    id: string
    label: string
    options: FilterOption[]
    value: string
    onChange: (value: string) => void
  }[]
  onReset?: () => void
  className?: string
  hasActiveFilters?: boolean
}

export function FilterControls({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filterGroups = [],
  onReset,
  className,
  hasActiveFilters = false,
}: FilterControlsProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      {/* Search Input */}
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 pr-8"
          aria-label={searchPlaceholder}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Select Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {filterGroups.map((group) => (
          <div key={group.id} className="relative">
            <select
              aria-label={group.label}
              value={group.value}
              onChange={(e) => group.onChange(e.target.value)}
              className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {group.options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {hasActiveFilters && onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 text-xs text-slate-400 hover:text-slate-200"
          >
            <Filter className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
