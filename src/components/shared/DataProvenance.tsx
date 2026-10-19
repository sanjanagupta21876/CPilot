import React from 'react'
import { ExternalLink, Calendar, ShieldAlert, ShieldCheck, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { ConfidenceLevel } from '@/types/database'

interface DataProvenanceProps {
  sourceName: string
  sourceUrl?: string | null
  collectedAt?: string | null
  confidence: ConfidenceLevel
  notes?: string | null
  isDemo?: boolean
  isSimulated?: boolean
  geographicScope?: string | null
  dataPeriod?: string | null
}

const confidenceConfig: Record<
  ConfidenceLevel,
  { label: string; variant: 'success' | 'default' | 'warning' | 'unverified'; icon: typeof ShieldCheck }
> = {
  high: { label: 'High confidence', variant: 'success', icon: ShieldCheck },
  medium: { label: 'Medium confidence', variant: 'default', icon: Info },
  low: { label: 'Low confidence', variant: 'warning', icon: ShieldAlert },
  unverified: { label: 'Unverified', variant: 'unverified', icon: ShieldAlert },
}

export function DataProvenance({
  sourceName,
  sourceUrl,
  collectedAt,
  confidence,
  notes,
  isDemo,
  isSimulated,
  geographicScope,
  dataPeriod,
}: DataProvenanceProps) {
  const conf = confidenceConfig[confidence] || confidenceConfig.medium
  const ConfIcon = conf.icon

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
      {(isDemo || isSimulated) && (
        <Badge variant="demo" className="text-[10px] uppercase font-mono">
          Benchmark Data
        </Badge>
      )}

      {geographicScope && (
        <Badge variant="outline" className="text-[10px] uppercase font-mono border-slate-200 text-slate-500">
          Scope: {geographicScope}
        </Badge>
      )}

      {dataPeriod && (
        <Badge variant="outline" className="text-[10px] font-mono border-slate-200 text-slate-500">
          {dataPeriod}
        </Badge>
      )}

      <Badge variant={conf.variant} className="gap-1 text-[10px]">
        <ConfIcon className="h-2.5 w-2.5" />
        {conf.label}
      </Badge>

      <span className="flex items-center gap-1">
        Source:{' '}
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 hover:underline font-medium"
          >
            {sourceName}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        ) : (
          <span className="text-slate-700 font-medium">{sourceName}</span>
        )}
      </span>

      {collectedAt && (
        <span className="flex items-center gap-1">
          <Calendar className="h-2.5 w-2.5" />
          {formatDate(collectedAt)}
        </span>
      )}

      {notes && <span className="italic text-slate-400">· {notes}</span>}
    </div>
  )
}
