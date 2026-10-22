'use client'

import React, { useState, useMemo, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  computeMarginToFlip,
  computeRankRobustness,
  ROBUSTNESS_DISCLAIMER,
  type CandidateCityInput,
  type RankRobustnessReport,
} from '@/lib/scoring/sensitivity'
import { computeFitScore, fitScoreColor, fitScoreLabel } from '@/lib/scoring/fitScore'
import { explainWithPruneAction } from '@/lib/ai/actions'
import type { ScenarioData, PruneExplanationResult } from '@/lib/ai/prune'
import {
  Sparkles,
  Sliders,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Cpu,
  ArrowRight,
  Info,
} from 'lucide-react'

interface SensitivityDecisionAidsProps {
  initialCandidateCities: CandidateCityInput[]
}

export function SensitivityDecisionAids({
  initialCandidateCities,
}: SensitivityDecisionAidsProps) {
  // ─── What-If Criteria Weights State ─────────────────────────────
  // Extract initial baseline criteria weights
  const baselineWeights = useMemo(() => {
    const weights: Record<string, number> = {}
    if (initialCandidateCities.length > 0 && initialCandidateCities[0].criteria) {
      initialCandidateCities[0].criteria.forEach((c) => {
        weights[c.name] = c.weight
      })
    }
    return weights
  }, [initialCandidateCities])

  const [currentWeights, setCurrentWeights] = useState<Record<string, number>>(baselineWeights)
  const [activeTab, setActiveTab] = useState<'decision-aids' | 'what-if'>('decision-aids')

  // Candidate cities with active what-if weights applied
  const evaluatedCandidateCities: CandidateCityInput[] = useMemo(() => {
    return initialCandidateCities.map((city) => ({
      name: city.name,
      criteria: city.criteria.map((c) => ({
        ...c,
        weight: currentWeights[c.name] ?? c.weight,
      })),
    }))
  }, [initialCandidateCities, currentWeights])

  // Evaluated scores under current weights
  const evaluatedScores = useMemo(() => {
    return evaluatedCandidateCities.map((city) => {
      const res = computeFitScore({ criteria: city.criteria })
      return {
        cityName: city.name,
        score: res.total_score,
        insufficientData: res.insufficient_data,
        evidenceCoverage: res.evidence_coverage,
      }
    })
  }, [evaluatedCandidateCities])

  // Sort cities descending by evaluated score
  const rankedCities = useMemo(() => {
    return [...evaluatedScores].sort((a, b) => {
      const sA = a.insufficientData ? -1 : (a.score ?? -1)
      const sB = b.insufficientData ? -1 : (b.score ?? -1)
      return sB - sA
    })
  }, [evaluatedScores])

  const currentLeader = rankedCities[0]
  const currentRunnerUp = rankedCities[1]

  // Has weights changed from baseline?
  const hasWeightChanged = useMemo(() => {
    return Object.keys(baselineWeights).some(
      (key) => baselineWeights[key] !== currentWeights[key]
    )
  }, [baselineWeights, currentWeights])

  // ─── A. Margin to Flip ──────────────────────────────────────────
  const marginToFlipResult = useMemo(() => {
    return computeMarginToFlip(evaluatedCandidateCities)
  }, [evaluatedCandidateCities])

  // ─── B. Rank Robustness (Lazy / On-Demand) ───────────────────────
  const [robustnessReport, setRobustnessReport] = useState<RankRobustnessReport | null>(null)
  const [isRobustnessRunning, setIsRobustnessRunning] = useState(false)
  const [seed] = useState(42)

  const handleRunRobustness = () => {
    setIsRobustnessRunning(true)
    // Run asynchronously to keep UI snappy
    setTimeout(() => {
      const report = computeRankRobustness(evaluatedCandidateCities, {
        sampleCount: 1000,
        seed,
      })
      setRobustnessReport(report)
      setIsRobustnessRunning(false)
    }, 20)
  }

  // ─── C. Prune Narration ─────────────────────────────────────────
  const [pruneResult, setPruneResult] = useState<PruneExplanationResult | null>(null)
  const [isExplaining, startExplainTransition] = useTransition()
  const [explainError, setExplainError] = useState<string | null>(null)

  const handleExplainWithPrune = () => {
    setExplainError(null)

    // Build scenario data strictly from already-computed numbers (zero account PII)
    const scoresMap: Record<string, number> = {}
    evaluatedScores.forEach((s) => {
      if (s.score !== null) scoresMap[s.cityName] = s.score
    })

    const changedWeightsMap: Record<string, { oldWeight: number; newWeight: number }> = {}
    Object.keys(baselineWeights).forEach((key) => {
      if (baselineWeights[key] !== currentWeights[key]) {
        changedWeightsMap[key] = {
          oldWeight: baselineWeights[key],
          newWeight: currentWeights[key],
        }
      }
    })

    const scenario: ScenarioData = {
      cityLabels: evaluatedCandidateCities.map((c) => c.name),
      winnerCity: currentLeader?.cityName || 'Unknown',
      runnerUpCity: currentRunnerUp?.cityName,
      scores: scoresMap,
      changedFactorWeights: Object.keys(changedWeightsMap).length > 0 ? changedWeightsMap : undefined,
      driverNames: initialCandidateCities[0]?.criteria
        ? initialCandidateCities[0].criteria.slice(0, 2).map((c) => c.name)
        : [],
      marginToFlipExplanation: marginToFlipResult.explanation,
      robustnessPercentage: robustnessReport?.topCity?.winPercentage,
    }

    startExplainTransition(async () => {
      try {
        const actionRes = await explainWithPruneAction(scenario)
        if (actionRes.success && actionRes.data) {
          setPruneResult(actionRes.data)
        } else {
          setExplainError(actionRes.message || 'Failed to generate explanation.')
        }
      } catch (err: unknown) {
        setExplainError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      }
    })
  }

  const handleSliderChange = (criterionName: string, value: number) => {
    setCurrentWeights((prev) => ({
      ...prev,
      [criterionName]: Math.max(0, Math.min(100, value)),
    }))
    // Clear previous AI wording when inputs change
    setPruneResult(null)
  }

  const handleResetWeights = () => {
    setCurrentWeights(baselineWeights)
    setPruneResult(null)
  }

  const handleApplyThreshold = (criterionName: string, thresholdWeight: number) => {
    setCurrentWeights((prev) => ({
      ...prev,
      [criterionName]: thresholdWeight,
    }))
    setPruneResult(null)
    setActiveTab('what-if')
  }

  const criteriaList = initialCandidateCities[0]?.criteria || []

  return (
    <div className="mb-10 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              Sensitivity Decision Aids & What-If Simulation
            </h2>
            <Badge variant="teal" className="text-[10px] font-mono">
              Deterministic + Optional Prune AI
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate how weight adjustments alter city rankings, verify threshold crossing points, and sample 1,000 weightings.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('decision-aids')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'decision-aids'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Decision Aids
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('what-if')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'what-if'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Interactive What-If {hasWeightChanged && '•'}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: SENSITIVITY DECISION AIDS (Margin to Flip + Robustness)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'decision-aids' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* A. Margin to Flip Card */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                      Decision Aid A
                    </span>
                    <Badge variant="outline" className="text-[10px] border-slate-200">
                      Exact Scorer Crossing
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Margin to Flip Leader
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Identifies if adjusting any single factor within 0–100% can reverse #1 and #2.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {marginToFlipResult.insufficientData ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Insufficient Evidence:</span>
                    <p className="mt-0.5 leading-relaxed text-amber-800">
                      {marginToFlipResult.explanation}
                    </p>
                  </div>
                </div>
              ) : marginToFlipResult.isTied ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-800 flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Scores Currently Tied:</span>
                    <p className="mt-0.5 leading-relaxed text-slate-600">
                      {marginToFlipResult.explanation}
                    </p>
                  </div>
                </div>
              ) : marginToFlipResult.canFlip && marginToFlipResult.primaryFactor ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-teal-600" />
                        Single-Factor Flip Possible
                      </span>
                      <Badge variant="teal" className="text-[10px] font-mono capitalize">
                        {marginToFlipResult.primaryFactor.direction} to {marginToFlipResult.primaryFactor.thresholdWeight}%
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {marginToFlipResult.explanation}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-600 border-t border-teal-200/60">
                      <span>
                        Current Weight: <strong>{marginToFlipResult.primaryFactor.currentWeight}%</strong>
                      </span>
                      <span>
                        Required Change: <strong>{marginToFlipResult.primaryFactor.deltaWeight > 0 ? `±${marginToFlipResult.primaryFactor.deltaWeight}%` : '0%'}</strong>
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleApplyThreshold(
                            marginToFlipResult.primaryFactor!.criterionName,
                            marginToFlipResult.primaryFactor!.thresholdWeight
                          )
                        }
                        className="text-[11px] h-7 text-teal-700 hover:text-teal-900 hover:bg-teal-100/60 p-1"
                      >
                        Simulate in What-If <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  {marginToFlipResult.flippableFactors.length > 1 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Other Flippable Factors:
                      </span>
                      <div className="space-y-1">
                        {marginToFlipResult.flippableFactors.slice(1).map((f) => (
                          <div
                            key={f.criterionName}
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-1.5 text-xs"
                          >
                            <span className="font-medium text-slate-800">{f.criterionName}</span>
                            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
                              <span>{f.direction === 'increase' ? '↑' : '↓'} {f.thresholdWeight}%</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApplyThreshold(f.criterionName, f.thresholdWeight)}
                                className="h-6 text-[10px] text-teal-700 px-1"
                              >
                                Try
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-800">
                    No single weight change flips #1 within the supported range.
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Even adjusting any individual factor to its extreme boundaries (0% or 100%) does not overcome {marginToFlipResult.city1Name || 'the leading city'}&apos;s overall score advantage.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* B. Rank Robustness Card */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                      Decision Aid B
                    </span>
                    <Badge variant="outline" className="text-[10px] border-slate-200">
                      1,000 Seeded Samples
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Rank Robustness Sensitivity
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Monte Carlo evaluation across 1,000 normalized weight vectors with fractional tie sharing.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {!robustnessReport ? (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-6 text-center space-y-3">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-teal-700 border border-slate-200">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900">
                      On-Demand Sensitivity Analysis
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                      Evaluates ranking resilience under 1,000 pseudo-random positive weight vectors (sum = 100).
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleRunRobustness}
                    disabled={isRobustnessRunning}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 font-semibold shadow-xs"
                  >
                    {isRobustnessRunning ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin mr-1.5" />
                        Sampling 1,000 vectors...
                      </>
                    ) : (
                      <>
                        <Cpu className="h-3.5 w-3.5 mr-1.5 text-teal-400" />
                        Run Rank Robustness (1,000 samples)
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {robustnessReport.topCity && (
                    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                        Top Robustness Result
                      </span>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {robustnessReport.topCity.cityName} is {robustnessReport.topCity.displayLabel}
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                        Across 1,000 randomly drawn weight combinations, {robustnessReport.topCity.cityName} finished in 1st place in {robustnessReport.topCity.winPercentage}% of trials.
                      </p>
                    </div>
                  )}

                  {/* Distribution breakdown */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Simulated #1 Placement Rate:</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRunRobustness}
                        disabled={isRobustnessRunning}
                        className="text-[11px] h-6 text-slate-500 hover:text-slate-900 p-1"
                      >
                        <RefreshCw className="h-2.5 w-2.5 mr-1" /> Re-sample
                      </Button>
                    </div>
                    {robustnessReport.results.map((r) => (
                      <div key={r.cityName} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-900">{r.cityName}</span>
                          <span className="font-mono text-slate-600">
                            {r.winPercentage}% ({r.winCount.toFixed(1)} wins)
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                          <div
                            className="h-full bg-teal-600 transition-all duration-300"
                            style={{ width: `${r.winPercentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mandatory Explicit Sensitivity Disclaimer */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-[11px] text-slate-600 leading-snug space-y-1">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
                      Transparency & Modeling Notice
                    </p>
                    <p className="text-slate-500">
                      <strong>Notice:</strong> {ROBUSTNESS_DISCLAIMER}
                    </p>
                    <p className="text-[10px] text-slate-400 pt-0.5">
                      Identical scoring cities share sample credit fractionally (50/50). Factors missing for all candidate cities ({robustnessReport.ignoredCriteria.join(', ') || 'none'}) are excluded from the 100% normalized vector.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: INTERACTIVE WHAT-IF SLIDERS & EXPLAIN WITH PRUNE
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'what-if' && (
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-teal-600" />
                  What-If Sensitivity Simulator
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Dynamically adjust criteria weights to immediately see live recalculated Fit Scores and rank changes.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasWeightChanged && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetWeights}
                    className="text-xs h-8 text-slate-600 hover:text-slate-900 border-slate-200"
                  >
                    Reset Baseline Weights
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleExplainWithPrune}
                  disabled={isExplaining}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-8 gap-1.5 shadow-xs"
                >
                  {isExplaining ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Explaining scenario...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Explain with Prune
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-6">
            {/* Live Comparison Scores Bar */}
            <div className="grid gap-3 sm:grid-cols-2">
              {rankedCities.map((c, idx) => (
                <div
                  key={c.cityName}
                  className={`rounded-xl border p-4 transition-all ${
                    idx === 0
                      ? 'border-teal-500 bg-teal-50/30 ring-1 ring-teal-500/30'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      #{idx + 1} {c.cityName}
                      {idx === 0 && (
                        <Badge variant="teal" className="text-[9px] py-0">
                          Leader
                        </Badge>
                      )}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {fitScoreLabel(c.score, c.insufficientData)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-2xl font-black ${fitScoreColor(c.score)}`}>
                      {c.score !== null ? c.score.toFixed(2) : 'N/A'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">/ 100</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Criteria Weight Sliders */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Adjust Factor Weights (Supported Range: 0–100%):
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {criteriaList.map((crit) => {
                  const weightVal = currentWeights[crit.name] ?? crit.weight
                  const baselineVal = baselineWeights[crit.name] ?? crit.weight
                  const isModified = weightVal !== baselineVal

                  return (
                    <div
                      key={crit.name}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <Label className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {crit.name}
                          {isModified && (
                            <span className="text-[10px] text-teal-700 font-mono">
                              (was {baselineVal}%)
                            </span>
                          )}
                        </Label>
                        <span className="font-mono font-bold text-slate-900">
                          {weightVal}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={weightVal}
                        onChange={(e) =>
                          handleSliderChange(crit.name, parseInt(e.target.value) || 0)
                        }
                        className="w-full accent-teal-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Explain with Prune Result Area */}
            {explainError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Explanation Request Notice:</span>
                  <p className="mt-0.5">{explainError}</p>
                </div>
              </div>
            )}

            {pruneResult && (
              <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/70 to-white p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Scenario Explanation
                    </span>
                    <Badge variant={pruneResult.isAiGenerated ? 'teal' : 'outline'} className="text-[10px]">
                      {pruneResult.isAiGenerated ? 'Prune AI Gateway' : 'Deterministic Template'}
                    </Badge>
                  </div>
                  {pruneResult.pruneMetadata?.cache_hit && (
                    <Badge variant="teal" className="text-[9px] font-mono">
                      Prune Cache: HIT
                    </Badge>
                  )}
                </div>

                {/* Natural Language Narrative */}
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {pruneResult.text}
                </p>

                {/* Required System Disclaimer */}
                <div className="pt-2 text-[11px] text-slate-500 italic border-t border-teal-100 flex items-center justify-between">
                  <span>{pruneResult.disclaimer}</span>
                  {pruneResult.fallbackReason && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      mode: {pruneResult.fallbackReason}
                    </span>
                  )}
                </div>

                {/* Defensive Prune Metadata Receipt Card */}
                {pruneResult.pruneMetadata && (
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span className="flex items-center gap-1 text-slate-900 font-mono text-[10px]">
                        <Cpu className="h-3 w-3 text-teal-600" />
                        Prune Signed Gateway Receipt
                      </span>
                      {pruneResult.pruneMetadata.receipt_signature && (
                        <span className="text-[9px] font-mono text-slate-400 truncate max-w-[180px]" title={pruneResult.pruneMetadata.receipt_signature}>
                          {pruneResult.pruneMetadata.receipt_signature}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-slate-600 font-mono text-[10px] pt-1">
                      {pruneResult.pruneMetadata.cost_usd !== undefined && (
                        <span>Cost: ${pruneResult.pruneMetadata.cost_usd.toFixed(6)}</span>
                      )}
                      {pruneResult.pruneMetadata.tokens_prompt !== undefined && (
                        <span>
                          Tokens: {pruneResult.pruneMetadata.tokens_prompt} prompt / {pruneResult.pruneMetadata.tokens_completion ?? 0} comp
                        </span>
                      )}
                      {pruneResult.pruneMetadata.savings_usd !== undefined && pruneResult.pruneMetadata.savings_usd > 0 && (
                        <span className="text-emerald-700 font-bold">
                          Savings: ${pruneResult.pruneMetadata.savings_usd.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
