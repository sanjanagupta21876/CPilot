import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorPanelProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorPanel({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorPanelProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-rose-800/40 bg-rose-950/20 p-8 text-center text-rose-300',
        className
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-900/40 text-rose-400">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h4 className="text-base font-semibold text-rose-200">{title}</h4>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-rose-300/80">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 border-rose-800/60 bg-rose-900/30 text-rose-200 hover:bg-rose-900/50"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  )
}
