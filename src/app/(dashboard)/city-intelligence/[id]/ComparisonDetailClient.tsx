'use client'

import React, { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataProvenance } from '@/components/shared/DataProvenance'
import { WhatIfRankingView } from '@/components/city-intelligence/WhatIfRankingView'
import { AICompetitorExtractorModal } from '@/components/ai/AICompetitorExtractorModal'
import {
  DEFAULT_WEIGHTS,
  fitScoreColor,
  fitScoreLabel,
  SCORING_MODEL_VERSION,
} from '@/lib/scoring/fitScore'
import {
  computeWhatIfRanking,
  validateWeightField,
  validateWeightsObject,
  PRESET_PROFILES,
  type CityWhatIfInput,
  type PresetName,
} from '@/lib/scoring/whatIfScoring'
import type {
  CityComparison,
  StartupProfile,
  MarketIndicator,
  Competitor,
} from '@/types/database'
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

interface ComparisonDetailClientProps {
  comparison: CityComparison
  startupProfile: StartupProfile | null
  indicators: MarketIndicator[]
  competitors: Competitor[]
  citiesData: CityWhatIfInput[]
  isDemo?: boolean
}

export function ComparisonDetailClient({
  comparison,
  startupProfile,
  indicators,
  competitors,
  citiesData,
  isDemo,
}: ComparisonDetailClientProps) {
  // ─── What-If Priority Weights State ───────────────────────────
  const [validWeights, setValidWeights] = useState<Record<string, number>>(DEFAULT_WEIGHTS)
  const [rawInputs, setRawInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const [k, v] of Object.entries(DEFAULT_WEIGHTS)) {
      initial[k] = String(v)
    }
    return initial
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({})
  const [formError, setFormError] = useState<string | null>(null)

  // ─── Local Immediate Recalculation (No Network / No DB Mutation) ───
  const rankingOutput = useMemo(() => {
    return computeWhatIfRanking(citiesData, validWeights, DEFAULT_WEIGHTS)
  }, [citiesData, validWeights])

  // Identify current top recommended city
  const topRankedResult = rankingOutput.results.find((r) => r.newRank === 1 && !r.insufficientData)
  const winnerCity = topRankedResult ? topRankedResult.city : citiesData[0]?.city || ''
  const hasWinnerValidScore = !!topRankedResult && topRankedResult.newScore !== null
  const winnerScore = topRankedResult?.newScore ?? 0

  // ─── Input Handlers ──────────────────────────────────────────
  const handleWeightInputChange = useCallback(
    (factorName: string, rawValue: string) => {
      // 1. Update text state immediately so user sees what they type
      const nextRaw = { ...rawInputs, [factorName]: rawValue }
      setRawInputs(nextRaw)

      // 2. Validate individual field
      const fieldErr = validateWeightField(rawValue)
      const nextFieldErrors = { ...fieldErrors, [factorName]: fieldErr }
      setFieldErrors(nextFieldErrors)

      // 3. If any field has an error, do NOT update validWeights (preserve last valid ranking on screen)
      const hasAnyFieldError = Object.values(nextFieldErrors).some((err) => err !== null)
      if (hasAnyFieldError || fieldErr !== null) {
        setFormError('Please fix invalid input fields.')
        return
      }

      // 4. Validate complete weights object
      const valResult = validateWeightsObject(nextRaw)
      if (valResult.success && valResult.weights) {
        setFormError(null)
        setValidWeights(valResult.weights)
      } else {
        setFormError(valResult.error || 'Invalid weights configuration')
      }
    },
    [rawInputs, fieldErrors]
  )

  const handleSliderChange = useCallback(
    (factorName: string, numValue: number) => {
      const stringVal = String(numValue)
      const nextRaw = { ...rawInputs, [factorName]: stringVal }
      setRawInputs(nextRaw)

      // Clear field error for this factor
      const nextFieldErrors = { ...fieldErrors, [factorName]: null }
      setFieldErrors(nextFieldErrors)

      // Validate entire object
      const valResult = validateWeightsObject(nextRaw)
      if (valResult.success && valResult.weights) {
        setFormError(null)
        setValidWeights(valResult.weights)
      } else {
        setFormError(valResult.error || 'Invalid weights configuration')
      }
    },
    [rawInputs, fieldErrors]
  )

  const handleSelectPreset = useCallback((presetName: PresetName) => {
    const preset = PRESET_PROFILES[presetName]
    const nextRaw: Record<string, string> = {}
    for (const [k, v] of Object.entries(preset)) {
      nextRaw[k] = String(v)
    }
    setRawInputs(nextRaw)
    setFieldErrors({})
    setFormError(null)
    setValidWeights(preset)
  }, [])

  const handleReset = useCallback(() => {
    const nextRaw: Record<string, string> = {}
    for (const [k, v] of Object.entries(DEFAULT_WEIGHTS)) {
      nextRaw[k] = String(v)
    }
    setRawInputs(nextRaw)
    setFieldErrors({})
    setFormError(null)
    setValidWeights(DEFAULT_WEIGHTS)
  }, [])

  // Sourced market indicators list & groups
  const indicatorNames = Array.from(new Set(indicators.map((i) => i.indicator) || []))
  const cities: string[] = comparison.cities || citiesData.map((c) => c.city)

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
              {isDemo && (
                <Badge variant="secondary" className="text-xs font-mono">
                  Benchmark Demo Assessment
                </Badge>
              )}
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
          TOP BANNER: DYNAMICALLY RECOMMENDED CITY BASED ON WHAT-IF
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
                  {rankingOutput.hasRankChanges && (
                    <Badge variant="outline" className="text-[10px] font-mono border-teal-300 text-teal-800 bg-white">
                      Scenario Leader
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {winnerCity} leads with a Fit Score of {winnerScore} / 100
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                  Under your current priority weights, <strong>{winnerCity}</strong> offers the most favorable balance of lower entry barrier costs, commercial infrastructure density, and customer demand alignment for your business model.
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

            {/* Direct Journey Next Step: Explore Local Businesses in Winner City */}
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
          WHAT-IF RANKING VIEW COMPONENT
          (Collapsible Priorities Panel + Ranking Results Table)
         ───────────────────────────────────────────────────────────── */}
      <WhatIfRankingView
        citiesData={citiesData}
        rankingOutput={rankingOutput}
        validWeights={validWeights}
        rawInputs={rawInputs}
        fieldErrors={fieldErrors}
        formError={formError}
        onWeightInputChange={handleWeightInputChange}
        onSliderChange={handleSliderChange}
        onSelectPreset={handleSelectPreset}
        onReset={handleReset}
      />

      {/* ─────────────────────────────────────────────────────────────
          DYNAMIC FIT SCORES OVERVIEW CARDS
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
          {rankingOutput.results.map((r) => {
            const city = r.city
            const isInsufficient = r.insufficientData
            const total = r.newScore
            const coverage = r.evidenceCoverage
            const missing = r.missingCriteria
            const criteriaList = r.newResult.criteria || []
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
                      {r.newRank !== null && (
                        <Badge variant="outline" className="font-mono text-xs font-bold">
                          Rank #{r.newRank}
                        </Badge>
                      )}
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
                                  Missing Data (Excluded)
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
                      const match = indicators.find(
                        (i) => i.city.toLowerCase() === city.toLowerCase() && i.indicator === indName
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
