import type { Metadata } from 'next'
import { getExperiments, getHypotheses } from '@/lib/actions/marketValidation'
import { MarketValidationClient } from './MarketValidationClient'

export const metadata: Metadata = {
  title: 'Local Market Validation — CityPilot',
  description:
    'Test market demand and pricing assumptions with structured field experiments, deterministic threshold metrics, and audited hypotheses before expanding.',
}

export default async function MarketValidationPage() {
  const [expRes, hypRes] = await Promise.all([
    getExperiments(),
    getHypotheses(),
  ])

  const experiments = expRes.data || []
  const hypotheses = hypRes.data || []
  const isDemo = expRes.isDemo || hypRes.isDemo

  return (
    <MarketValidationClient
      initialExperiments={experiments}
      initialHypotheses={hypotheses}
      isDemo={isDemo}
    />
  )
}
