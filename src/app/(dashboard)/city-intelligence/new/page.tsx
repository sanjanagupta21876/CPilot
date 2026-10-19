'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageShell, PageHeader } from '@/components/layout/PageShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { SUPPORTED_CITIES, BENCHMARK_INDICATORS } from '@/lib/data/cityData'
import {
  DEFAULT_CRITERIA,
  computeFitScore,
  evaluateCityCriteria,
  SCORING_MODEL_VERSION,
} from '@/lib/scoring/fitScore'
import type { StartupProfile, CityRecord, Competitor, MarketIndicator } from '@/types/database'
import {
  MapPin,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Building2,
  ShieldCheck,
  Info,
} from 'lucide-react'

export default function NewComparisonPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [availableCities, setAvailableCities] = useState<{ name: string; state: string; tier: string }[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>(['Bengaluru', 'Mumbai'])
  const [title, setTitle] = useState('Bengaluru vs Mumbai Expansion Fit Comparison')
  const [profile, setProfile] = useState<StartupProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  // Business expansion parameters
  const [expansionBudget, setExpansionBudget] = useState('1000000')
  const [targetCustomer, setTargetCustomer] = useState('Urban consumers & modern retail shoppers')
  const [businessCategory, setBusinessCategory] = useState('D2C Consumer Goods')

  const [criteria, setCriteria] = useState(
    DEFAULT_CRITERIA.map((c) => ({
      name: c.name,
      weight: c.weight,
      description: c.description,
    }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. Load active profile & supported cities from database
  useEffect(() => {
    async function loadInitialData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Fetch startup profile
          const { data: profileData } = await supabase
            .from('startup_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()

          if (profileData) {
            setProfile(profileData)
            if (profileData.target_customer) setTargetCustomer(profileData.target_customer)
            if (profileData.industry) setBusinessCategory(profileData.industry)
            // Pre-select expansion cities if defined
            if (profileData.expansion_cities && profileData.expansion_cities.length >= 2) {
              const preselected = profileData.expansion_cities.slice(0, 2)
              setSelectedCities(preselected)
              setTitle(`${preselected.join(' vs ')} Expansion Fit Comparison`)
            }
          }

          // Fetch supported cities from catalog
          const { data: dbCities } = await supabase
            .from('cities')
            .select('*')
            .eq('is_active', true)
            .order('name')

          if (dbCities && dbCities.length > 0) {
            setAvailableCities(dbCities.map((c: CityRecord) => ({ name: c.name, state: c.state, tier: c.tier })))
          } else {
            setAvailableCities(SUPPORTED_CITIES.map((c) => ({ name: c.name, state: c.state, tier: c.tier })))
          }
        }
      } catch (err) {
        console.error('Error loading initial comparison data:', err)
        setAvailableCities(SUPPORTED_CITIES.map((c) => ({ name: c.name, state: c.state, tier: c.tier })))
      } finally {
        setProfileLoading(false)
      }
    }

    loadInitialData()
  }, [supabase])

  const toggleCity = (cityName: string) => {
    let next: string[]
    if (selectedCities.includes(cityName)) {
      if (selectedCities.length <= 2) {
        setError('At least 2 cities must be selected for a side-by-side comparison.')
        return
      }
      next = selectedCities.filter((c) => c !== cityName)
    } else {
      if (selectedCities.length >= 2) {
        // Swap second city if already 2 selected for crisp 2-city comparison
        next = [selectedCities[0], cityName]
      } else {
        next = [...selectedCities, cityName]
      }
    }
    setError(null)
    setSelectedCities(next)
    setTitle(`${next.join(' vs ')} Expansion Fit Comparison`)
  }

  const handleWeightChange = (index: number, val: number) => {
    const updated = [...criteria]
    updated[index].weight = Math.max(0, Math.min(100, val))
    setCriteria(updated)
  }

  const resetWeights = () => {
    setCriteria(
      DEFAULT_CRITERIA.map((c) => ({
        name: c.name,
        weight: c.weight,
        description: c.description,
      }))
    )
  }

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedCities.length < 2) {
      setError('Please select at least 2 cities to compare.')
      return
    }

    if (!title.trim()) {
      setError('Please provide a title for this comparison.')
      return
    }

    if (totalWeight === 0) {
      setError('Total weight must be greater than 0.')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Session expired. Please sign in again.')
        setLoading(false)
        return
      }

      // 1. Create city_comparison record with startup link and scoring model version
      const { data: comparison, error: compError } = await supabase
        .from('city_comparisons')
        .insert({
          user_id: user.id,
          startup_id: profile?.id || null,
          title: title.trim(),
          cities: selectedCities,
          status: 'complete',
          scoring_model_version: SCORING_MODEL_VERSION,
        })
        .select()
        .single()

      if (compError || !comparison) {
        throw new Error(compError?.message || 'Failed to create comparison record.')
      }

      // 2. Fetch or prepare benchmark indicators with enhanced provenance
      const indicatorsToInsert = BENCHMARK_INDICATORS.filter((ind) =>
        selectedCities.includes(ind.city)
      ).map((ind) => ({
        comparison_id: comparison.id,
        city: ind.city,
        indicator: ind.indicator,
        value: ind.value,
        unit: ind.unit,
        source_name: ind.source_name,
        source_url: ind.source_url,
        collected_at: ind.collected_at,
        confidence: ind.confidence,
        notes: ind.notes,
        geographic_scope: 'metro',
        data_period: '2023-2024',
        is_simulated: false,
      }))

      if (indicatorsToInsert.length > 0) {
        const { error: indError } = await supabase
          .from('market_indicators')
          .insert(indicatorsToInsert)
        if (indError) console.error('Error inserting indicators:', indError)
      }

      // 3. Fetch competitors for selected cities
      let dbCompetitors: Competitor[] = []
      try {
        const { data: comps } = await supabase
          .from('competitors')
          .select('*')
          .in('city', selectedCities)
        if (comps) dbCompetitors = comps
      } catch (err) {
        console.warn('Competitors catalog fetch skipped:', err)
      }

      // Build weights map
      const weightsMap: Record<string, number> = {}
      criteria.forEach((c) => {
        weightsMap[c.name] = c.weight
      })

      // 4. Compute and insert Fit Scores for each city deterministically
      const cityScoresToInsert = selectedCities.map((cityName) => {
        const evaluatedCriteria = evaluateCityCriteria(
          cityName,
          indicatorsToInsert as unknown as MarketIndicator[],
          dbCompetitors,
          weightsMap
        )

        const scoringResult = computeFitScore({
          criteria: evaluatedCriteria,
          startupContext: profile ? {
            industry: businessCategory || profile.industry,
            stage: profile.stage,
            primary_channel: profile.primary_channel,
            target_customer: targetCustomer || profile.target_customer,
            price_min: profile.price_min,
            price_max: profile.price_max,
          } : undefined,
        })

        return {
          comparison_id: comparison.id,
          city: cityName,
          criteria: scoringResult.criteria,
          total_score: scoringResult.total_score || 0,
          max_score: 100,
          scoring_model_version: scoringResult.scoring_model_version,
          evidence_coverage: scoringResult.evidence_coverage,
          missing_criteria: scoringResult.missing_criteria,
          insufficient_data: scoringResult.insufficient_data,
        }
      })

      const { error: scoreError } = await supabase
        .from('fit_scores')
        .insert(cityScoresToInsert)

      if (scoreError) {
        console.error('Error inserting fit scores:', scoreError)
      }

      router.push(`/city-intelligence/${comparison.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while generating the comparison.'
      setError(message)
      setLoading(false)
    }
  }

  const citiesList = availableCities.length > 0 ? availableCities : SUPPORTED_CITIES

  return (
    <PageShell>
      <div className="mb-6">
        <Link
          href="/city-intelligence"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to comparisons
        </Link>
        <PageHeader
          title="Compare Expansion Cities"
          description="Evaluate candidate expansion cities using verifiable market indicators, operating costs, competitive density, and transparent scoring."
          badge={
            <Badge variant="teal" className="text-xs gap-1 font-mono">
              <ShieldCheck className="h-3 w-3" />
              Scoring Model {SCORING_MODEL_VERSION}
            </Badge>
          }
        />
      </div>

      {/* Startup Profile Context Banner */}
      {!profileLoading && (
        profile ? (
          <Card className="mb-6 border-slate-200 bg-white">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-teal-700 border border-slate-200 font-bold">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                      Active Business Profile
                    </span>
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                      {profile.stage}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    {profile.name} <span className="font-normal text-slate-500">({profile.industry})</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Target: <span className="text-slate-900 font-medium">{profile.target_customer}</span> • Channel: <span className="text-slate-900 font-medium">{profile.primary_channel || 'Direct'}</span>
                    {profile.price_min && (
                      <> • Price: <span className="text-slate-900 font-medium">₹{profile.price_min.toLocaleString('en-IN')}{profile.price_max ? `–₹${profile.price_max.toLocaleString('en-IN')}` : ''}</span></>
                    )}
                  </p>
                </div>
              </div>
              <Link href="/settings">
                <Button size="sm" variant="outline" className="shrink-0 text-xs">
                  Edit Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-amber-200 bg-amber-50/60">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Configure Business Parameters</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    You can set your expansion budget, industry, and target customer below to tune your city recommendation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-6">
        {/* Step 1: Expansion Parameters & Details */}
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold font-mono">
                1
              </span>
              Expansion Parameters & Business Details
            </CardTitle>
            <CardDescription>
              Specify your expansion requirements to tailor operating cost calculations and customer fit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs">Assessment Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bengaluru vs Mumbai Expansion Fit Comparison"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs">Business Category / Industry</Label>
                <Input
                  id="category"
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  placeholder="e.g. D2C Consumer Goods, Retail, SaaS, F&B"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget" className="text-xs">Target Expansion Budget</Label>
                <Select
                  id="budget"
                  value={expansionBudget}
                  onChange={(e) => setExpansionBudget(e.target.value)}
                >
                  <option value="500000">₹5 Lakhs (Early pilot / pop-up)</option>
                  <option value="1000000">₹10 Lakhs (Lean city launch)</option>
                  <option value="2500000">₹25 Lakhs (Full operational footprint)</option>
                  <option value="5000000">₹50+ Lakhs (Multi-location expansion)</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="targetCustomer" className="text-xs">Primary Target Customer</Label>
                <Input
                  id="targetCustomer"
                  value={targetCustomer}
                  onChange={(e) => setTargetCustomer(e.target.value)}
                  placeholder="e.g. Middle-income families, young professionals, Tier-1 shoppers"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Choose 2 Supported Cities */}
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold font-mono">
                    2
                  </span>
                  Select Target Cities for Side-by-Side Comparison
                </CardTitle>
                <CardDescription>
                  Choose two supported cities from the catalog to evaluate across costs, demand, and competitive density.
                </CardDescription>
              </div>
              <Badge variant="teal" className="text-xs font-mono">
                {selectedCities.length} selected
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {citiesList.map((city) => {
                const isSelected = selectedCities.includes(city.name)
                return (
                  <div
                    key={city.name}
                    onClick={() => toggleCity(city.name)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-500 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <MapPin className={`h-4 w-4 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{city.name}</p>
                          <p className="text-xs text-slate-500">{city.state}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200">
                          {city.tier}
                        </Badge>
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isSelected
                              ? 'border-teal-600 bg-teal-600 text-white'
                              : 'border-slate-300 bg-transparent text-transparent'
                          }`}
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Fit Score Weight Configuration */}
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold font-mono">
                    3
                  </span>
                  Transparent Factor Weighting
                </CardTitle>
                <CardDescription>
                  Adjust the relative weight of each factor according to your business expansion priorities.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={totalWeight === 100 ? 'teal' : 'warning'}
                  className="text-xs font-mono"
                >
                  Total Weight: {totalWeight}%
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetWeights}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Reset Defaults
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 text-xs text-slate-700 flex items-start gap-2">
              <Info className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-900">Deterministic Methodology:</strong> Recommendations are calculated strictly from verifiable market indicators and active business profile constraints. We do not invent arbitrary statistics or black-box predictive scores.
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {criteria.map((c, idx) => (
                <div key={c.name} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {c.name}
                        <span className="text-xs font-normal text-slate-500 font-mono">
                          ({c.weight}%)
                        </span>
                      </Label>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                        {c.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={c.weight}
                        onChange={(e) => handleWeightChange(idx, parseInt(e.target.value) || 0)}
                        className="w-20 text-center font-mono text-sm bg-white border-slate-200"
                      />
                      <span className="text-xs text-slate-500 font-mono">%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (c.weight / (totalWeight || 100)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/city-intelligence">
            <Button type="button" variant="ghost" disabled={loading} className="text-slate-500 hover:text-slate-900">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading || selectedCities.length < 2}
            className="gap-2 bg-slate-900 text-white hover:bg-slate-800 font-semibold min-w-[220px]"
            id="btn-run-comparison"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Calculating City Fit...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-teal-400" />
                Generate City Recommendation
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
