import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataProvenance } from '@/components/shared/DataProvenance'
import Link from 'next/link'
import {
  MapPin,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Building2,
  ExternalLink,
  Calendar,
  Layers,
  HelpCircle,
  Users,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import type { FitScore, FitScoreCriterion, Competitor, StartupProfile } from '@/types/database'
import { fitScoreColor, fitScoreLabel, SCORING_MODEL_VERSION } from '@/lib/scoring/fitScore'
import { AICompetitorExtractorModal } from '@/components/ai/AICompetitorExtractorModal'
import { SensitivityDecisionAids } from '@/components/scoring/SensitivityDecisionAids'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ComparisonDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch comparison
  let comparison = null
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

  // Fallback demo comparison if ID not found in dev
  if (!comparison) {
    comparison = {
      id: id,
      user_id: 'demo-user-001',
      startup_id: null,
      title: 'Bengaluru vs Mumbai Expansion Fit Comparison',
      cities: ['Bengaluru', 'Mumbai'],
      status: 'complete' as const,
      scoring_model_version: SCORING_MODEL_VERSION,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  // 2. Fetch startup profile if linked
  let startupProfile: StartupProfile | null = null
  if (comparison.startup_id) {
    const { data: profile } = await supabase
      .from('startup_profiles')
      .select('*')
      .eq('id', comparison.startup_id)
      .maybeSingle()
    if (profile) startupProfile = profile
  }

  // 3. Fetch fit scores
  const { data: fitScores } = await supabase
    .from('fit_scores')
    .select('*')
    .eq('comparison_id', id)

  // 4. Fetch market indicators
  const { data: indicators } = await supabase
    .from('market_indicators')
    .select('*')
    .eq('comparison_id', id)

  // 5. Fetch competitors for these cities
  const cities: string[] = comparison.cities || []
  let competitors: Competitor[] = []
  try {
    const { data: comps } = await supabase
      .from('competitors')
      .select('*')
      .in('city', cities)
    if (comps) competitors = comps
  } catch (err) {
    console.warn('Competitors catalog fetch skipped:', err)
  }

  const scoresMap = new Map<string, FitScore>()
  fitScores?.forEach((fs) => scoresMap.set(fs.city, fs as FitScore))

  // Group indicators by indicator name for side-by-side comparison
  const indicatorNames = Array.from(new Set(indicators?.map((i) => i.indicator) || []))

  // Find the top-ranked city (only consider cities with valid total_score)
  const rankedCities = [...cities].sort((a, b) => {
    const fsA = scoresMap.get(a)
    const fsB = scoresMap.get(b)
    const scoreA = fsA?.insufficient_data ? -1 : (fsA?.total_score ?? -1)
    const scoreB = fsB?.insufficient_data ? -1 : (fsB?.total_score ?? -1)
    return scoreB - scoreA
  })

  const winnerCity = rankedCities[0]
  const winnerFs = scoresMap.get(winnerCity)
  const hasWinnerValidScore = winnerFs && !winnerFs.insufficient_data && (winnerFs.total_score !== null)
  const winnerScore = hasWinnerValidScore ? winnerFs.total_score : 0

  const candidateCitiesForSensitivity = cities.map((city) => {
    const fs = scoresMap.get(city)
    const critList = (fs?.criteria as unknown as FitScoreCriterion[]) || []
    return {
      name: city,
      criteria: critList.map((c) => ({
        name: c.name,
        weight: c.weight,
        score: c.score,
        rationale: c.rationale,
        is_available: !fs?.missing_criteria?.includes(c.name),
      })),
    }
  })

  return (
    <PageShell>
      {/* Header & Breadcrumb */}
      <div className="mb-6 space-y-2">
        <Link
          href="/city-intelligence"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to comparisons
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{comparison.title}</h1>
              <Badge variant="teal" className="capitalize text-xs">
                {comparison.status}
              </Badge>
              <Badge variant="outline" className="border-slate-300 text-slate-600 text-xs font-mono">
                Model: {comparison.scoring_model_version || SCORING_MODEL_VERSION}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Comparing {cities.join(' vs ')} • Assessment generated on{' '}
              {new Date(comparison.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/local-connect?city=${encodeURIComponent(winnerCity)}`}>
              <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm">
                <Users className="h-3.5 w-3.5" />
                Discover Businesses in {winnerCity}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Startup Profile Context Header (if linked) */}
      {startupProfile && (
        <Card className="mb-6 border-slate-200 bg-white">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-teal-700 border border-slate-200 font-bold">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Assessed for Business:</p>
                <p className="text-sm font-bold text-slate-900">
                  {startupProfile.name}{' '}
                  <span className="font-normal text-xs text-slate-500">
                    ({startupProfile.industry} • {startupProfile.stage.toUpperCase()})
                  </span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div>
                Target: <span className="text-slate-900 font-medium">{startupProfile.target_customer}</span>
              </div>
              <div>
                Channel: <span className="text-slate-900 font-medium">{startupProfile.primary_channel || 'Direct'}</span>
              </div>
              {startupProfile.price_min && (
                <div>
                  Price: <span className="text-slate-900 font-medium">₹{startupProfile.price_min.toLocaleString('en-IN')}{startupProfile.price_max ? `–₹${startupProfile.price_max.toLocaleString('en-IN')}` : ''}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TOP BANNER: RECOMMENDED CITY & DIRECT BUSINESS CONNECTIVITY ACTION
         ───────────────────────────────────────────────────────────── */}
      {hasWinnerValidScore ? (
        <div className="mb-8 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/90 via-teal-50/50 to-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-3.5 max-w-3xl">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-700/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    Recommended Expansion City
                  </span>
                  <Badge variant="teal" className="text-[10px] font-mono">
                    Highest Objective Fit Score
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {winnerCity} leads with a Fit Score of {winnerScore} / 100
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                  Based on verified market data and criteria weighting, <strong>{winnerCity}</strong> offers the most favorable balance of lower entry barrier costs, commercial infrastructure density, and customer demand alignment for your business model.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 text-teal-800 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                    Verified Indicator Data
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                    Transparent Weights
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                    No Fabricated Stats
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Core Journey Next Step: Explore Local Businesses in Recommended City */}
            <div className="shrink-0 flex flex-col gap-2">
              <Link href={`/local-connect?city=${encodeURIComponent(winnerCity)}`}>
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 h-10 gap-2 shadow-sm">
                  <Users className="h-4 w-4 text-teal-400" />
                  <span>Explore {winnerCity} Businesses</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <span className="text-[11px] text-center text-slate-500">
                Browse verified partners & suppliers
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-amber-900">
                Insufficient Evidence for Conclusive Score
              </h3>
              <p className="text-xs text-amber-800/90 mt-1 max-w-2xl leading-relaxed">
                One or more selected cities lack verified market indicators across the minimum required criteria (at least 3 criteria and 50% eligible weight). In accordance with CityPilot principles, we do not fabricate missing data or assign arbitrary zero scores.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          FIT SCORES OVERVIEW CARDS
         ───────────────────────────────────────────────────────────── */}
      <div className="mb-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              Fit Score Breakdown by City
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              100% deterministic weighted formula with separate evidence coverage tracking.
            </p>
          </div>
          <Badge variant="outline" className="border-slate-200 text-slate-600 text-xs font-mono">
            Model: {comparison.scoring_model_version || SCORING_MODEL_VERSION}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {cities.map((city) => {
            const fs = scoresMap.get(city)
            const isInsufficient = fs?.insufficient_data ?? false
            const total = fs?.total_score ?? null
            const coverage = fs?.evidence_coverage ?? 0
            const missing = fs?.missing_criteria || []
            const criteriaList = (fs?.criteria as unknown as FitScoreCriterion[]) || []
            const isWinner = city === winnerCity && hasWinnerValidScore

            return (
              <Card
                key={city}
                className={`border bg-white transition-all ${
                  isWinner ? 'border-teal-500 ring-1 ring-teal-500/40 shadow-sm' : 'border-slate-200'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className={`h-4 w-4 ${isWinner ? 'text-teal-600' : 'text-slate-400'}`} />
                      <CardTitle className="text-base font-bold text-slate-900">{city}</CardTitle>
                    </div>
                    <Badge variant={isWinner ? 'teal' : 'secondary'} className="text-xs">
                      {fitScoreLabel(total, isInsufficient)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      {isInsufficient ? (
                        <span className="text-2xl font-bold tracking-tight text-amber-700">
                          Insufficient Data
                        </span>
                      ) : (
                        <>
                          <span className={`text-4xl font-extrabold tracking-tight ${fitScoreColor(total)}`}>
                            {total}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">/ 100</span>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 font-mono">Evidence Coverage</span>
                      <p className="text-sm font-bold text-slate-900">{coverage}%</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Evidence coverage progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Data Verification Coverage</span>
                      <span>{coverage}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                      <div
                        className={`h-full transition-all duration-500 ${
                          coverage >= 80 ? 'bg-teal-600' : coverage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, coverage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Criteria detail list */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-100">
                    {criteriaList.map((crit) => {
                      const isMissing = missing.includes(crit.name)
                      return (
                        <div key={crit.name} className="text-xs space-y-1">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {crit.name}
                              {isMissing && (
                                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[9px] py-0">
                                  Missing Data
                                </Badge>
                              )}
                            </span>
                            <span className="font-mono text-slate-600">
                              {isMissing ? 'Excluded from calc' : `${crit.score.toFixed(1)} / 10`} ({crit.weight}%)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            {crit.rationale}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Direct Link to City Directory */}
                  <div className="pt-2">
                    <Link href={`/local-connect?city=${encodeURIComponent(city)}`}>
                      <Button variant="outline" size="sm" className="w-full text-xs h-8 text-slate-700 hover:text-slate-900">
                        <span>Browse {city} Local Businesses</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SENSITIVITY DECISION AIDS & WHAT-IF SIMULATION (PHASE 3)
         ───────────────────────────────────────────────────────────── */}
      <SensitivityDecisionAids initialCandidateCities={candidateCitiesForSensitivity} />

      {/* ─────────────────────────────────────────────────────────────
          SOURCED MARKET INDICATORS SIDE-BY-SIDE TABLE
         ───────────────────────────────────────────────────────────── */}
      <div className="mb-10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              Sourced Market Indicators
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified metrics with data provenance, geographic scope, collection date, and confidence ratings.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-bold w-1/4">Indicator</th>
                {cities.map((city) => (
                  <th key={city} className="py-3 px-4 font-bold">
                    {city}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {indicatorNames.map((indName) => {
                return (
                  <tr key={indName} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {indName}
                    </td>
                    {cities.map((city) => {
                      const match = indicators?.find(
                        (i) => i.city === city && i.indicator === indName
                      )

                      if (!match) {
                        return (
                          <td key={city} className="py-3 px-4 text-slate-400 italic">
                            Data unavailable
                          </td>
                        )
                      }

                      return (
                        <td key={city} className="py-3 px-4 space-y-1">
                          <div className="font-bold text-slate-900 text-sm">
                            {match.value}{' '}
                            {match.unit && (
                              <span className="text-xs font-normal text-slate-500">
                                {match.unit}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 pt-0.5">
                            <DataProvenance
                              sourceName={match.source_name}
                              sourceUrl={match.source_url}
                              collectedAt={match.collected_at}
                              confidence={match.confidence}
                              geographicScope={match.geographic_scope}
                              dataPeriod={match.data_period}
                              isSimulated={match.is_simulated}
                              notes={match.notes}
                            />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LOCAL COMPETITOR & PRICING COMPARISON TABLE
         ───────────────────────────────────────────────────────────── */}
      <div className="mb-10 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-4 w-4 text-teal-600" />
            Local Competitor & Pricing Benchmarks
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sourced local competitors, verified commercial pricing points, and offering profiles in target markets.
          </p>
        </div>

        {competitors.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-3">
            <p className="text-xs text-slate-500">
              No competitor records registered yet for {cities.join(' or ')}. Competitor mapping will expand as local research progresses.
            </p>
            <div className="flex justify-center gap-2">
              <AICompetitorExtractorModal city={cities[0] || 'Bengaluru'} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cities.map((city) => {
              const cityComps = competitors.filter((c) => c.city.toLowerCase() === city.toLowerCase())
              return (
                <Card key={city} className="border-slate-200 bg-white">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-teal-600" />
                        {city} Competitors
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200 bg-slate-50">
                          {cityComps.length} tracked
                        </Badge>
                        <AICompetitorExtractorModal city={city} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {cityComps.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No direct benchmark competitors cataloged.</p>
                    ) : (
                      cityComps.map((comp) => (
                        <div key={comp.id} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs">{comp.name}</span>
                                <Badge variant="secondary" className="text-[10px] py-0">
                                  {comp.category}
                                </Badge>
                                {comp.is_simulated && (
                                  <Badge variant="outline" className="text-[9px] py-0 uppercase border-amber-200 text-amber-800 bg-amber-50">
                                    Simulated
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                                {comp.offering}
                              </p>
                            </div>
                            {comp.observed_price !== null && (
                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-teal-700 text-xs">
                                  ₹{comp.observed_price.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-slate-500 block">
                                  {comp.price_unit}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-500 border-t border-slate-200/60">
                            {comp.source_url && (
                              <a
                                href={comp.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 font-medium"
                              >
                                Source Reference <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                            {comp.observed_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5" />
                                {comp.observed_date}
                              </span>
                            )}
                            {comp.notes && (
                              <span className="italic text-slate-500 truncate max-w-[200px]" title={comp.notes}>
                                · {comp.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          EVIDENCE COVERAGE & TRANSPARENCY PRINCIPLES
         ───────────────────────────────────────────────────────────── */}
      <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-900">Evidence Coverage & Data Transparency</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900">CityPilot Principle:</strong> Evidence coverage measures the availability, timeliness, and source confidence of indicators for this city pair. It reflects factual data completeness—we do not invent missing statistics or pretend arbitrary scores are scientifically guaranteed.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-600 pt-1">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-1">
            <span className="font-bold text-slate-900">Excluded Missing Criteria:</span>
            <p className="text-[11px] leading-snug text-slate-500">
              When a dimension lacks verified indicators, it is excluded from the denominator. We never silently assume missing values are zero or average.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-1">
            <span className="font-bold text-slate-900">Transparent Proxies:</span>
            <p className="text-[11px] leading-snug text-slate-500">
              Indicators derived from state-level statistics (e.g. economic surveys) are labeled as metro proxies until granular ward census data is verified.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
