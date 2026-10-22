import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BENCHMARK_INDICATORS } from '@/lib/data/cityData'
import { DEMO_COMPARISONS, DEMO_PROFILE } from '@/lib/data/demoData'
import { evaluateCityCriteria, SCORING_MODEL_VERSION } from '@/lib/scoring/fitScore'
import type {
  StartupProfile,
  Competitor,
  MarketIndicator,
  CityComparison,
} from '@/types/database'
import type { CityWhatIfInput } from '@/lib/scoring/whatIfScoring'
import { ComparisonDetailClient } from './ComparisonDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'City Recommendation & What-If Comparison — CityPilot',
  description: 'Deterministic city ranking with adjustable priority weights, transparent missingness handling, and driver explanations.',
}

export default async function ComparisonDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch comparison
  let comparison: CityComparison | null = null
  let isDemo = false

  try {
    const { data } = await supabase
      .from('city_comparisons')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    comparison = data
  } catch {
    comparison = null
  }

  // Fallback demo comparison if ID not found in database
  if (!comparison) {
    const demoFound = DEMO_COMPARISONS.find((c) => c.id === id)
    if (demoFound) {
      comparison = demoFound
      isDemo = true
    } else {
      comparison = {
        id,
        user_id: 'demo-user-001',
        startup_id: 'demo-profile-001',
        title: 'Bengaluru vs Mumbai Expansion Fit Comparison',
        cities: ['Bengaluru', 'Mumbai'],
        status: 'complete' as const,
        scoring_model_version: SCORING_MODEL_VERSION,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      isDemo = true
    }
  }

  // 2. Fetch startup profile if linked
  let startupProfile: StartupProfile | null = null
  if (comparison.startup_id) {
    try {
      const { data: profile } = await supabase
        .from('startup_profiles')
        .select('*')
        .eq('id', comparison.startup_id)
        .maybeSingle()
      if (profile) startupProfile = profile
    } catch {
      startupProfile = null
    }
  }
  if (!startupProfile && isDemo) {
    startupProfile = DEMO_PROFILE
  }

  // 3. Fetch market indicators
  let indicators: MarketIndicator[] = []
  try {
    const { data } = await supabase
      .from('market_indicators')
      .select('*')
      .eq('comparison_id', id)
    if (data && data.length > 0) indicators = data
  } catch {
    indicators = []
  }

  const cities: string[] = comparison.cities || []
