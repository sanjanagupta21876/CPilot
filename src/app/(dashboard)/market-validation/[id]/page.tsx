import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { getExperimentDetails } from '@/lib/actions/marketValidation'
import { ExperimentDetailClient } from './ExperimentDetailClient'

export const metadata: Metadata = {
  title: 'Experiment Details — CityPilot',
  description:
    'Field experiment details, deterministic threshold metrics, and audited customer observations.',
}

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const res = await getExperimentDetails(id)

  if (!res.success || !res.experiment || !res.metrics) {
    return (
      <PageShell>
        <div className="text-center py-12 space-y-4">
          <AlertTriangle className="h-12 w-12 text-rose-400 mx-auto" />
          <h2 className="text-lg font-semibold text-white">Experiment Not Found</h2>
          <p className="text-xs text-slate-400">
            {res.error || 'The requested validation experiment could not be loaded.'}
          </p>
          <Link href="/market-validation">
            <Button size="sm">Return to Market Validation</Button>
          </Link>
        </div>
      </PageShell>
    )
  }

  return (
    <ExperimentDetailClient
      initialExperiment={res.experiment}
      initialResponses={res.responses || []}
      initialThresholdHistory={res.thresholdHistory || []}
      initialMetrics={res.metrics}
      initialHypothesis={res.linkedHypothesis || null}
      isDemo={res.isDemo}
    />
  )
}
