import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500',
  {
    variants: {
      variant: {
        default: 'border-teal-200 bg-teal-50 text-teal-800',
        gold: 'border-amber-200 bg-amber-50 text-amber-800 font-semibold',
        teal: 'border-teal-300 bg-teal-50 text-teal-700 font-semibold',
        secondary: 'border-slate-200 bg-slate-100 text-slate-700',
        success: 'border-teal-200 bg-teal-50 text-teal-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        destructive: 'border-rose-200 bg-rose-50 text-rose-700',
        outline: 'border-slate-300 text-slate-600 bg-white',
        demo: 'border-teal-300 bg-teal-50 text-teal-800 font-mono text-[10px]',
        unverified: 'border-slate-200 bg-slate-50 text-slate-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }

