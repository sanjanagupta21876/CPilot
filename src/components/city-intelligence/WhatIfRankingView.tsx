'use client'

import React, { useState, useId } from 'react'
import {
  DEFAULT_CRITERIA,
  DEFAULT_WEIGHTS,
} from '@/lib/scoring/fitScore'
import {
  type CityWhatIfInput,
  type WhatIfRankingOutput,
  type PresetName,
} from '@/lib/scoring/whatIfScoring'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  SlidersHorizontal,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from 'lucide-react'

interface WhatIfRankingViewProps {
  citiesData: CityWhatIfInput[]
  rankingOutput: WhatIfRankingOutput
  validWeights: Record<string, number>
  rawInputs: Record<string, string>
  fieldErrors: Record<string, string | null>
  formError: string | null
  onWeightInputChange: (factorName: string, rawValue: string) => void
  onSliderChange: (factorName: string, numValue: number) => void
  onSelectPreset: (presetName: PresetName) => void
  onReset: () => void
}

export function WhatIfRankingView({
  citiesData,
  rankingOutput,
  validWeights,
  rawInputs,
  fieldErrors,
  formError,
  onWeightInputChange,
  onSliderChange,
  onSelectPreset,
  onReset,
}: WhatIfRankingViewProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const baseId = useId()

  const { results, rankedCount, unrankedCount, hasRankChanges, liveAnnouncement } = rankingOutput

  // Identify which candidate cities have missing data for each criterion
  const factorMissingMap: Record<string, string[]> = {}
  DEFAULT_CRITERIA.forEach((c) => {
    factorMissingMap[c.name] = []
  })

  citiesData.forEach((cityItem) => {
    cityItem.criteria.forEach((crit) => {
      const isMissing = crit.is_available === false || crit.score === null || crit.score === undefined
      if (isMissing && factorMissingMap[crit.name]) {
        factorMissingMap[crit.name].push(cityItem.city)
      }
    })
  })

  const totalCurrentWeight = Object.values(validWeights).reduce((a, b) => a + b, 0)

  return (
    <div className="mb-10 space-y-6" id="what-if-section">
      {/* Accessible Screen Reader Live Announcement */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        id="what-if-aria-live"
      >
        {liveAnnouncement}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. COLLAPSIBLE ADJUST PRIORITIES PANEL
         ───────────────────────────────────────────────────────────── */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-teal-600" />
                <CardTitle className="text-base font-bold text-slate-900">
                  Adjust priorities (What-If Analysis)
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-slate-300 text-slate-600">
                  Total Weight: {totalCurrentWeight}
                </Badge>
                {hasRankChanges && (
                  <Badge variant="teal" className="text-[10px] font-mono animate-pulse">
                    Rank Changes Active
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-slate-500">
                Weights are relative. Missing-data factors are excluded and never assigned a score.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Preset Buttons */}
              <div className="flex items-center gap-1.5" role="group" aria-label="Priority Presets">
                <span className="text-[11px] font-medium text-slate-400 mr-0.5">Presets:</span>
                {(['Cost-first', 'Demand-first', 'Balanced'] as PresetName[]).map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectPreset(preset)}
                    className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200"
                    id={`btn-preset-${preset.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  >
                    {preset}
                  </Button>
                ))}
              </div>

              {/* Reset to Default */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-7 px-2.5 text-xs text-slate-500 hover:text-slate-900 gap-1.5"
                id="btn-reset-default"
                title="Restore exact baseline weights and original ranks"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                Reset to default
              </Button>

              {/* Collapse/Expand Toggle */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="h-7 px-2 text-xs border-slate-200 text-slate-600"
                aria-expanded={isPanelOpen}
                aria-controls="adjust-priorities-content"
                id="btn-toggle-adjust-priorities"
              >
                {isPanelOpen ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                    Expand Controls
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isPanelOpen && (
          <CardContent className="pt-4 space-y-4" id="adjust-priorities-content">
            {/* Explanatory note */}
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-xs text-slate-700 flex items-start gap-2">
              <Info className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-900">
                  Weights are relative. Missing-data factors are excluded and never assigned a score.
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Rankings recalculate instantly in your browser without changing saved database records.
                  If a city lacks verified data for a factor, that factor is excluded for that city only,
                  while remaining active for cities where verified data is present.
                </p>
              </div>
            </div>

            {/* Global Form-level Error if all-zero or schema failure */}
            {formError && (
              <div
                className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2"
                role="alert"
                id="what-if-form-error"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Invalid Weight Configuration</p>
                  <p className="text-[11px] mt-0.5">{formError}</p>
                </div>
              </div>
            )}

            {/* 5 Scoring Factors Controls */}
            <div className="space-y-3 pt-1">
              {DEFAULT_CRITERIA.map((criterion) => {
                const factorName = criterion.name
                const slug = factorName.toLowerCase().replace(/[^a-z0-9]/g, '-')
                const inputId = `${baseId}-input-${slug}`
                const sliderId = `${baseId}-slider-${slug}`
                const errorId = `${baseId}-error-${slug}`
                const descId = `${baseId}-desc-${slug}`

                const rawVal = rawInputs[factorName] ?? String(validWeights[factorName] ?? criterion.weight)
                const numVal = validWeights[factorName] ?? criterion.weight
                const sliderVal = Math.max(0, Math.min(100, Number.isNaN(Number(rawVal)) ? numVal : Number(rawVal)))
                const fieldErr = fieldErrors[factorName]

                const missingCities = factorMissingMap[factorName] || []
                const hasMissingCities = missingCities.length > 0

                return (
                  <div
                    key={factorName}
                    className={`rounded-xl border p-3.5 transition-colors ${
                      fieldErr
                        ? 'border-rose-300 bg-rose-50/30'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Factor Label & Status Labels */}
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <label
                            htmlFor={inputId}
                            className="text-xs font-bold text-slate-900 cursor-pointer"
                          >
                            {factorName}
                          </label>

                          {/* Existing Status Label: Estimate */}
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono py-0 text-slate-600"
                            title="Derived from verified government or industry research estimates"
                          >
                            Estimate
                          </Badge>

                          {/* Default Weight Indicator */}
                          <span className="text-[10px] text-slate-400 font-mono">
                            (Default: {DEFAULT_WEIGHTS[factorName]}%)
                          </span>

                          {/* Per-city Missing Data Notice */}
                          {hasMissingCities && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono py-0 border-amber-300 bg-amber-50 text-amber-800"
                              title={`Missing indicators for: ${missingCities.join(', ')}. Excluded for these cities only.`}
                            >
                              Missing for {missingCities.join(', ')}
                            </Badge>
                          )}
                        </div>

                        <p id={descId} className="text-[11px] text-slate-500 leading-tight max-w-2xl">
                          {criterion.description}
                        </p>
                      </div>

                      {/* Slider & Numeric Text Input Controls */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* 0-100 Range Slider */}
                        <div className="flex items-center gap-2">
                          <input
                            id={sliderId}
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={sliderVal}
                            onChange={(e) => onSliderChange(factorName, parseInt(e.target.value, 10))}
                            aria-label={`${factorName} priority weight slider`}
                            aria-valuenow={sliderVal}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="w-28 sm:w-36 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                          />
                        </div>

                        {/* Synced Editable Numeric/Text Input */}
                        <div className="flex items-center gap-1">
                          <Input
                            id={inputId}
                            type="text"
                            inputMode="numeric"
                            value={rawVal}
                            onChange={(e) => onWeightInputChange(factorName, e.target.value)}
                            aria-label={`${factorName} priority weight`}
                            aria-describedby={fieldErr ? errorId : descId}
                            aria-invalid={!!fieldErr}
                            className={`w-16 h-8 text-center font-mono text-xs bg-white ${
                              fieldErr
                                ? 'border-rose-400 focus-visible:ring-rose-400 text-rose-700'
                                : 'border-slate-300'
                            }`}
                          />
                          <span className="text-xs text-slate-400 font-mono">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Inline Field Error Message */}
                    {fieldErr && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600" id={errorId} role="alert">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span className="font-medium text-[11px]">{fieldErr}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          2. WHAT-IF CANDIDATE RANKING RESULTS TABLE
         ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600" />
              What-If Ranking Results & Explanations
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparative analysis showing rank movement, score evolution, and largest modeled factor drivers under your scenario.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono text-slate-600 border-slate-200 bg-white">
              {rankedCount} Ranked • {unrankedCount} Insufficient Evidence
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs" aria-label="City What-If Rankings">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="py-3 px-4 font-bold">Candidate City</th>
                <th scope="col" className="py-3 px-3 font-bold text-center">Previous Rank</th>
                <th scope="col" className="py-3 px-3 font-bold text-center">New Rank</th>
                <th scope="col" className="py-3 px-3 font-bold text-center">Rank Movement</th>
                <th scope="col" className="py-3 px-3 font-bold text-right">Previous Score</th>
                <th scope="col" className="py-3 px-3 font-bold text-right">New Score</th>
                <th scope="col" className="py-3 px-4 font-bold">Main Factor Driver</th>
                <th scope="col" className="py-3 px-4 font-bold">Excluded / Missing Factors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((r) => {
                const isChanged = r.rankMovement !== null && r.rankMovement !== 0
                const isImproved = r.rankMovement !== null && r.rankMovement > 0
                const isDropped = r.rankMovement !== null && r.rankMovement < 0
                const isUnranked = r.insufficientData || r.newRank === null

                return (
                  <tr
                    key={r.city}
                    className={`transition-colors ${
                      isUnranked
                        ? 'bg-amber-50/30 hover:bg-amber-50/50'
                        : isChanged
                        ? isImproved
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/60 border-l-4 border-l-emerald-500'
                          : 'bg-rose-50/30 hover:bg-rose-50/50 border-l-4 border-l-rose-400'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Candidate City */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{r.city}</span>
                        {isUnranked ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 border-amber-300 text-amber-800 bg-amber-50"
                          >
                            Insufficient Evidence
                          </Badge>
                        ) : (
                          r.newRank === 1 && (
                            <Badge variant="teal" className="text-[10px] py-0 font-mono">
                              Top Recommendation
                            </Badge>
                          )
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Evidence Coverage: {r.evidenceCoverage}%
                      </div>
                    </td>

                    {/* Previous Rank */}
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-600">
                      {r.previousRank !== null ? (
                        <span className="text-xs">#{r.previousRank}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unranked</span>
                      )}
                    </td>

                    {/* New Rank */}
                    <td className="py-3 px-3 text-center font-mono">
                      {r.newRank !== null ? (
                        <span
                          className={`text-sm font-extrabold ${
                            r.newRank === 1
                              ? 'text-teal-700'
                              : isChanged
                              ? 'text-slate-900 font-black'
                              : 'text-slate-800'
                          }`}
                        >
                          #{r.newRank}
                        </span>
                      ) : (
                        <span className="text-amber-800 font-semibold text-xs">Unranked</span>
                      )}
                    </td>

                    {/* Rank Movement (Not relying solely on color) */}
                    <td className="py-3 px-3 text-center">
                      {isUnranked ? (
                        <span className="text-slate-400">—</span>
                      ) : isImproved ? (
                        <div className="inline-flex items-center gap-1 text-emerald-800 font-bold text-xs bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full">
                          <TrendingUp className="h-3 w-3 text-emerald-700 stroke-[2.5]" />
                          <span>{r.rankMovementLabel} (Up)</span>
                        </div>
                      ) : isDropped ? (
                        <div className="inline-flex items-center gap-1 text-rose-800 font-bold text-xs bg-rose-100/70 border border-rose-300 px-2 py-0.5 rounded-full">
                          <TrendingDown className="h-3 w-3 text-rose-700 stroke-[2.5]" />
                          <span>{r.rankMovementLabel} (Down)</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-slate-500 font-medium text-xs">
                          <Minus className="h-3 w-3 text-slate-400" />
                          <span>No change</span>
                        </div>
                      )}
                    </td>

                    {/* Previous Score */}
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {r.previousScore !== null ? (
                        <span>{r.previousScore.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* New Score */}
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {r.newScore !== null ? (
                        <span
                          className={
                            r.newScore >= 75
                              ? 'text-emerald-700'
                              : r.newScore >= 50
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }
                        >
                          {r.newScore.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-amber-700 italic font-sans text-xs">Insufficient Data</span>
                      )}
                    </td>

                    {/* Main Factor Driver */}
                    <td className="py-3 px-4">
                      {isUnranked ? (
                        <span className="text-slate-400 italic">Insufficient evidence</span>
                      ) : r.mainDriver === 'No change' ? (
                        <span className="text-slate-400 font-mono text-xs">No change</span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-teal-600" />
                            {r.mainDriver}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Largest modeled driver (Reversal impact: ±{r.mainDriverImpact} pts)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Excluded / Missing Factors */}
                    <td className="py-3 px-4">
                      {r.missingCriteria.length === 0 ? (
                        <span className="text-emerald-700 font-medium text-[11px]">
                          None (All verified)
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide">
                            Excluded from calculation:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {r.missingCriteria.map((m) => (
                              <Badge
                                key={m}
                                variant="outline"
                                className="text-[9px] py-0 border-amber-300 text-amber-900 bg-amber-50 font-mono"
                              >
                                {m}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-slate-400 italic text-right">
          Note: Drivers represent the largest factor impact modeled under the scenario using counterfactual sensitivity testing, not a causal market claim.
        </p>
      </div>
    </div>
  )
}
