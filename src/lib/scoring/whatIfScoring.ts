import {
  DEFAULT_CRITERIA,
  DEFAULT_WEIGHTS,
  computeFitScore,
  type ScoringCriterionInput,
  type StartupScoringContext,
  type ScoringResult,
} from './fitScore'
import { weightsSchema } from '../validations/schemas'

/**
 * Predefined What-If preset profiles using actual criterion keys.
 * All presets validate through weightsSchema and sum to 100.
 */
export const PRESET_PROFILES: Record<'Cost-first' | 'Demand-first' | 'Balanced', Record<string, number>> = {
  'Cost-first': {
    'Demand Fit': 15,
    'Competitive Opportunity': 15,
    'Distribution Feasibility': 15,
    'Entry Cost & Unit Economics': 45,
    'Operational Feasibility & Talent': 10,
  },
  'Demand-first': {
    'Demand Fit': 45,
    'Competitive Opportunity': 15,
    'Distribution Feasibility': 15,
    'Entry Cost & Unit Economics': 15,
    'Operational Feasibility & Talent': 10,
  },
  'Balanced': {
    'Demand Fit': 20,
    'Competitive Opportunity': 20,
    'Distribution Feasibility': 20,
    'Entry Cost & Unit Economics': 20,
    'Operational Feasibility & Talent': 20,
  },
}

export type PresetName = keyof typeof PRESET_PROFILES

export interface CityWhatIfInput {
  city: string
  criteria: ScoringCriterionInput[]
  startupContext?: StartupScoringContext
}

export interface CityWhatIfResult {
  city: string
  previousScore: number | null
  newScore: number | null
  previousRank: number | null // 1-based index among ranked cities, or null if unranked
  newRank: number | null      // 1-based index among ranked cities, or null if unranked
  rankMovement: number | null // (previousRank - newRank): positive means improved, negative dropped, 0 no change
  rankMovementLabel: string   // e.g. "+1", "-1", "No change", or "—"
  mainDriver: string          // Factor name, "No change", or "—"
  mainDriverImpact: number    // Absolute score reversal difference
  insufficientData: boolean
  evidenceCoverage: number
  missingCriteria: string[]
  availableCriteria: string[]
  baselineResult: ScoringResult
  newResult: ScoringResult
}

export interface WhatIfRankingOutput {
  results: CityWhatIfResult[]
  rankedCount: number
  unrankedCount: number
  hasRankChanges: boolean
  liveAnnouncement: string
}

/**
 * Validates a single weight field value from raw text input.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateWeightField(value: string): string | null {
  if (value === null || value === undefined || value.trim() === '') {
    return 'Weight is required'
  }
  const trimmed = value.trim()
  const num = Number(trimmed)
  if (Number.isNaN(num)) {
    return 'Must be a valid number'
  }
  if (!Number.isFinite(num)) {
    return 'Must be a finite number'
  }
  if (num < 0) {
    return 'Weight cannot be negative'
  }
  if (num > 100) {
    return 'Weight cannot exceed 100'
  }
  return null
}

/**
 * Validates a complete weights map.
 * Returns { success: true, weights } or { success: false, error, fieldErrors }.
 */
export function validateWeightsObject(
  rawWeights: Record<string, number | string>
): {
  success: boolean
  weights?: Record<string, number>
  error?: string
  fieldErrors?: Record<string, string>
} {
  const numericWeights: Record<string, number> = {}
  const fieldErrors: Record<string, string> = {}
  let hasFieldError = false

  for (const criterion of DEFAULT_CRITERIA) {
    const rawVal = rawWeights[criterion.name]
    const rawStr = rawVal !== undefined ? String(rawVal) : ''
    const err = validateWeightField(rawStr)
    if (err) {
      fieldErrors[criterion.name] = err
      hasFieldError = true
    } else {
      numericWeights[criterion.name] = Number(rawStr)
    }
  }

  if (hasFieldError) {
    return {
      success: false,
      error: 'Please fix the invalid factor weights above.',
      fieldErrors,
    }
  }

  // Check all-zero condition
  const values = Object.values(numericWeights)
  const allZero = values.every((v) => v === 0)
  if (allZero) {
    return {
      success: false,
      error: 'At least one weight must be greater than 0 (all-zero weights are invalid)',
      fieldErrors: {},
    }
  }

  // Validate against Zod schema
  const parsed = weightsSchema.safeParse(numericWeights)
  if (!parsed.success) {
    const primaryError = parsed.error.issues[0]?.message || 'Invalid weights provided'
    return {
      success: false,
      error: primaryError,
      fieldErrors,
    }
  }

  return {
    success: true,
    weights: numericWeights,
  }
}

/**
 * Computes deterministic What-If ranking across candidate cities.
 *
 * Rules:
 * 1. Missing data is handled per city: excluded from denominator, never treated as 0.
 * 2. Cities with insufficient evidence (< 3 criteria or < 50% eligible weight) remain UNRANKED.
 *    They are never given fake ranks (0, 99) or zero scores.
 * 3. Deterministic tie-breaker:
 *    - Primary: higher score
 *    - Secondary: baseline default rank
 *    - Tertiary: alphabetical city name
 * 4. Deterministic driver rule (Preferred counterfactual reversal test):
 *    - If no rank change: driver is "No change"
 *    - If rank changed: for each available changed factor, test resetting it to baseline
 *      while holding other weights, recompute, and measure score and rank reversal effect.
 *      The factor with largest reversal impact is selected.
 */
export function computeWhatIfRanking(
  citiesData: CityWhatIfInput[],
  currentWeights: Record<string, number>,
  baselineWeights: Record<string, number> = DEFAULT_WEIGHTS
): WhatIfRankingOutput {
  // 1. Compute baseline scores for all cities
  const baselineScored = citiesData.map((input) => {
    const res = computeFitScore({
      criteria: input.criteria,
      customWeights: baselineWeights,
      startupContext: input.startupContext,
    })
    return {
      city: input.city,
      input,
      res,
    }
  })

  // 2. Sort baseline ranked cities to establish baseline ranks
  // Filter eligible cities (not insufficient data and has score)
  const baselineRanked = baselineScored
    .filter((item) => !item.res.insufficient_data && item.res.total_score !== null)
    .sort((a, b) => {
      if (b.res.total_score! !== a.res.total_score!) {
        return b.res.total_score! - a.res.total_score!
      }
      return a.city.localeCompare(b.city)
    })

  const baselineRankMap = new Map<string, number>()
  baselineRanked.forEach((item, index) => {
    baselineRankMap.set(item.city, index + 1)
  })

  // 3. Compute new scores with current weights
  const newScored = citiesData.map((input) => {
    const res = computeFitScore({
      criteria: input.criteria,
      customWeights: currentWeights,
      startupContext: input.startupContext,
    })
    return {
      city: input.city,
      input,
      res,
    }
  })

  // 4. Sort new ranked cities with deterministic tie-breaker:
  // Primary: new total_score descending
  // Secondary: baseline default rank (lower rank number = better)
  // Tertiary: stable alphabetical city name
  const newRanked = newScored
    .filter((item) => !item.res.insufficient_data && item.res.total_score !== null)
    .sort((a, b) => {
      if (b.res.total_score! !== a.res.total_score!) {
        return b.res.total_score! - a.res.total_score!
      }
      const baseA = baselineRankMap.get(a.city) ?? Number.MAX_SAFE_INTEGER
      const baseB = baselineRankMap.get(b.city) ?? Number.MAX_SAFE_INTEGER
      if (baseA !== baseB) {
        return baseA - baseB
      }
      return a.city.localeCompare(b.city)
    })

  const newRankMap = new Map<string, number>()
  newRanked.forEach((item, index) => {
    newRankMap.set(item.city, index + 1)
  })

  // 5. Identify changed factors between baseline and current
  const changedFactors = Object.keys(currentWeights).filter(
    (k) => currentWeights[k] !== baselineWeights[k]
  )

  // 6. Build detailed results for each candidate city
  const results: CityWhatIfResult[] = citiesData.map((input) => {
    const baseItem = baselineScored.find((b) => b.city === input.city)!
    const newItem = newScored.find((n) => n.city === input.city)!

    const isInsufficient = newItem.res.insufficient_data || newItem.res.total_score === null
    const prevScore = baseItem.res.insufficient_data ? null : baseItem.res.total_score
    const newScore = isInsufficient ? null : newItem.res.total_score
    const prevRank = baselineRankMap.get(input.city) ?? null
    const newRank = isInsufficient ? null : (newRankMap.get(input.city) ?? null)

    const missingCriteria = newItem.res.missing_criteria || []
    const availableCriteria = input.criteria
      .filter((c) => c.is_available !== false && c.score !== null && c.score !== undefined)
      .map((c) => c.name)

    // Calculate rank movement
    let rankMovement: number | null = null
    let rankMovementLabel = '—'

    if (prevRank !== null && newRank !== null) {
      // previousRank - newRank: if was #2 and now #1: 2 - 1 = +1 (improvement)
      rankMovement = prevRank - newRank
      if (rankMovement > 0) {
        rankMovementLabel = `+${rankMovement}`
      } else if (rankMovement < 0) {
        rankMovementLabel = `${rankMovement}`
      } else {
        rankMovementLabel = 'No change'
      }
    }

    // Deterministic Driver Analysis (Preferred Rule):
    // For each city whose rank changed, test each changed factor one at a time by resetting
    // that factor to baseline while keeping other new weights, recompute with existing scorer,
    // and measure score/rank reversal effect.
    let mainDriver = 'No change'
    let mainDriverImpact = 0

    if (isInsufficient) {
      mainDriver = '—'
      mainDriverImpact = 0
    } else if (rankMovement === null || rankMovement === 0 || changedFactors.length === 0) {
      mainDriver = 'No change'
      mainDriverImpact = 0
    } else {
      // Find changed factors available for this specific city
      const availableChangedFactors = changedFactors.filter((f) => availableCriteria.includes(f))

      if (availableChangedFactors.length === 0) {
        mainDriver = 'No change'
        mainDriverImpact = 0
      } else {
        let bestDriver = availableChangedFactors[0]
        let maxImpact = -1
        let maxRankReversal = -1

        for (const factor of availableChangedFactors) {
          // Counterfactual weight map: reset this factor to baseline, keep other new weights
          const counterfactualWeights: Record<string, number> = {
            ...currentWeights,
            [factor]: baselineWeights[factor] ?? DEFAULT_WEIGHTS[factor] ?? 20,
          }

          // Recompute all candidate cities under counterfactual
          const cfRanked = citiesData
            .map((cityInput) => {
              const cfRes = computeFitScore({
                criteria: cityInput.criteria,
                customWeights: counterfactualWeights,
                startupContext: cityInput.startupContext,
              })
              return { city: cityInput.city, res: cfRes }
            })
            .filter((c) => !c.res.insufficient_data && c.res.total_score !== null)
            .sort((a, b) => {
              if (b.res.total_score! !== a.res.total_score!) {
                return b.res.total_score! - a.res.total_score!
              }
              const baseA = baselineRankMap.get(a.city) ?? Number.MAX_SAFE_INTEGER
              const baseB = baselineRankMap.get(b.city) ?? Number.MAX_SAFE_INTEGER
              if (baseA !== baseB) return baseA - baseB
              return a.city.localeCompare(b.city)
            })

          const cfRank = cfRanked.findIndex((c) => c.city === input.city) + 1
          const cfScoreItem = cfRanked.find((c) => c.city === input.city)
          const cfScore = cfScoreItem?.res.total_score ?? newScore!

          // Reversal effect measures:
          // 1. Rank reversal magnitude: how much resetting this factor pulls the rank back toward baseline
          const rankReversalMagnitude = Math.abs(newRank! - (cfRank > 0 ? cfRank : newRank!))
          // 2. Score reversal magnitude: |newScore - cfScore|
          const scoreReversalMagnitude = Math.abs(newScore! - cfScore)

          // Prioritize direct rank reversal, then largest score impact
          if (
            rankReversalMagnitude > maxRankReversal ||
            (rankReversalMagnitude === maxRankReversal && scoreReversalMagnitude > maxImpact)
          ) {
            maxRankReversal = rankReversalMagnitude
            maxImpact = scoreReversalMagnitude
            bestDriver = factor
          }
        }

        mainDriver = bestDriver
        mainDriverImpact = parseFloat(Math.max(0, maxImpact).toFixed(2))
      }
    }

    return {
      city: input.city,
      previousScore: prevScore,
      newScore,
      previousRank: prevRank,
      newRank,
      rankMovement,
      rankMovementLabel,
      mainDriver,
      mainDriverImpact,
      insufficientData: isInsufficient,
      evidenceCoverage: newItem.res.evidence_coverage,
      missingCriteria,
      availableCriteria,
      baselineResult: baseItem.res,
      newResult: newItem.res,
    }
  })

  // Sort overall results: Ranked cities first (by newRank 1..N), then unranked cities alphabetically
  results.sort((a, b) => {
    if (a.newRank !== null && b.newRank !== null) {
      return a.newRank - b.newRank
    }
    if (a.newRank !== null) return -1
    if (b.newRank !== null) return 1
    return a.city.localeCompare(b.city)
  })

  const rankedCount = results.filter((r) => !r.insufficientData && r.newRank !== null).length
  const unrankedCount = results.length - rankedCount
  const changedResults = results.filter((r) => r.rankMovement !== null && r.rankMovement !== 0)
  const hasRankChanges = changedResults.length > 0

  // Build screen reader live announcement
  let liveAnnouncement = ''
  if (hasRankChanges) {
    const movements = changedResults
      .map(
        (r) =>
          `${r.city} moved ${r.rankMovement! > 0 ? 'up' : 'down'} to rank #${r.newRank} (was #${r.previousRank})`
      )
      .join(', ')
    liveAnnouncement = `Rankings updated: ${movements}.`
  } else {
    liveAnnouncement = `Scoring recalculated for ${rankedCount} candidate cities. Ranks remain unchanged.`
  }

  return {
    results,
    rankedCount,
    unrankedCount,
    hasRankChanges,
    liveAnnouncement,
  }
}
