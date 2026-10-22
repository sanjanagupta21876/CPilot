/**
 * Deterministic Sensitivity Decision Aids — Version 1.0.0
 *
 * CITYPILOT — PHASE 3: SENSITIVITY DECISION AIDS & ROBUSTNESS ENGINE
 *
 * Core principles:
 * 1. 100% deterministic calculations — zero random black-boxes or uncontrolled LLM scores.
 * 2. Uses the existing scoring engine (computeFitScore) to evaluate exact normalized scores,
 *    correctly respecting differing missingness per city and denominator exclusions.
 * 3. Never offers a missing factor for margin-to-flip.
 * 4. Transparent fractional tie-break sharing for rank robustness.
 */

import { computeFitScore, type ScoringCriterionInput } from './fitScore'

// ─── Types & Interfaces ──────────────────────────────────────────

export interface CandidateCityInput {
  name: string
  criteria: ScoringCriterionInput[]
}

export interface FlippableFactor {
  criterionName: string
  currentWeight: number
  thresholdWeight: number
  direction: 'increase' | 'decrease'
  deltaWeight: number
  originalCity1Score: number
  originalCity2Score: number
  newCity1Score: number
  newCity2Score: number
}

export interface MarginToFlipResult {
  canFlip: boolean
  explanation: string
  isTied: boolean
  insufficientData: boolean
  city1Name?: string
  city2Name?: string
  originalCity1Score?: number
  originalCity2Score?: number
  primaryFactor?: FlippableFactor
  flippableFactors: FlippableFactor[]
}

export interface CityRobustnessResult {
  cityName: string
  winCount: number
  winPercentage: number
  displayLabel: string
}

export interface RankRobustnessReport {
  sampleCount: number
  seed: number
  results: CityRobustnessResult[]
  topCity: CityRobustnessResult | null
  disclaimer: string
  ignoredCriteria: string[]
  activeCriteria: string[]
}

// ─── Seeded PRNG (Mulberry32) ────────────────────────────────────

/**
 * High-performance deterministic 32-bit pseudo-random number generator.
 * Produces uniform random floats in [0, 1) from an integer seed.
 */
export function createSeededRandom(seed: number = 42): () => number {
  let s = Math.floor(Math.abs(seed)) >>> 0
  if (s === 0) s = 1

  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── A. Margin to Flip ───────────────────────────────────────────

/**
 * Computes the Margin to Flip for the current first- and second-ranked cities.
 *
 * Evaluates candidate weights within the supported UI range [0, 100] through
 * computeFitScore, properly accounting for criteria eligibility and per-city missingness.
 */
export function computeMarginToFlip(
  candidateCities: CandidateCityInput[]
): MarginToFlipResult {
  if (!candidateCities || candidateCities.length < 2) {
    return {
      canFlip: false,
      explanation: 'At least 2 cities are required to evaluate margin to flip.',
      isTied: false,
      insufficientData: true,
      flippableFactors: [],
    }
  }

  // 1. Evaluate baseline fit scores for all candidate cities
  const baselineScores = candidateCities.map((city) => ({
    city,
    result: computeFitScore({ criteria: city.criteria }),
  }))

  // Check for sufficient evidence
  const validCities = baselineScores.filter(
    (b) => !b.result.insufficient_data && b.result.total_score !== null
  )

  if (validCities.length < 2) {
    return {
      canFlip: false,
      explanation: 'Insufficient data to calculate margin to flip: one or more top cities lack the minimum verified indicators.',
      isTied: false,
      insufficientData: true,
      flippableFactors: [],
    }
  }

  // Sort by total_score descending
  validCities.sort((a, b) => (b.result.total_score ?? 0) - (a.result.total_score ?? 0))

  const top1 = validCities[0]
  const top2 = validCities[1]
  const score1 = top1.result.total_score!
  const score2 = top2.result.total_score!

  // Check if scores are tied
  if (Math.abs(score1 - score2) < 0.001) {
    return {
      canFlip: false,
      explanation: `Scores are currently tied between ${top1.city.name} and ${top2.city.name} (${score1.toFixed(2)} / 100).`,
      isTied: true,
      insufficientData: false,
      city1Name: top1.city.name,
      city2Name: top2.city.name,
      originalCity1Score: score1,
      originalCity2Score: score2,
      flippableFactors: [],
    }
  }

  // 2. Evaluate available factors common to both top cities
  // Rule: "Offer a factor only if sufficient data exists for both top cities for that factor and the calculation is valid."
  const flippableFactors: FlippableFactor[] = []

  for (const crit1 of top1.city.criteria) {
    const crit2 = top2.city.criteria.find((c) => c.name === crit1.name)

    // Ensure factor is eligible and available in BOTH cities
    const isAvailableInBoth =
      crit1.is_available !== false &&
      crit1.score !== null &&
      crit1.score !== undefined &&
      crit2 !== undefined &&
      crit2.is_available !== false &&
      crit2.score !== null &&
      crit2.score !== undefined

    if (!isAvailableInBoth) {
      continue // Missing factor is never offered
    }

    const currentWeight = Math.max(0, Math.min(100, crit1.weight))

    // Search for the closest integer threshold weight in [0, 100] where City 2 strictly overtakes City 1
    // Evaluate candidate weights from 0 to 100
    let bestThreshold: {
      weight: number
      direction: 'increase' | 'decrease'
      delta: number
      newScore1: number
      newScore2: number
    } | null = null

    // Determine likely direction
    // If City 2 has higher factor score, increasing weight helps City 2
    // If City 1 has higher factor score, decreasing weight reduces City 1's lead
    for (let candidateWeight = 0; candidateWeight <= 100; candidateWeight++) {
      if (candidateWeight === currentWeight) continue

      const updatedCrit1 = top1.city.criteria.map((c) =>
        c.name === crit1.name ? { ...c, weight: candidateWeight } : c
      )
      const updatedCrit2 = top2.city.criteria.map((c) =>
        c.name === crit1.name ? { ...c, weight: candidateWeight } : c
      )

      const eval1 = computeFitScore({ criteria: updatedCrit1 })
      const eval2 = computeFitScore({ criteria: updatedCrit2 })

      if (
        !eval1.insufficient_data &&
        eval1.total_score !== null &&
        !eval2.insufficient_data &&
        eval2.total_score !== null &&
        eval2.total_score > eval1.total_score
      ) {
        const delta = Math.abs(candidateWeight - currentWeight)
        const direction: 'increase' | 'decrease' =
          candidateWeight > currentWeight ? 'increase' : 'decrease'

        if (!bestThreshold || delta < bestThreshold.delta) {
          bestThreshold = {
            weight: candidateWeight,
            direction,
            delta,
            newScore1: eval1.total_score,
            newScore2: eval2.total_score,
          }
        }
      }
    }

    if (bestThreshold) {
      flippableFactors.push({
        criterionName: crit1.name,
        currentWeight,
        thresholdWeight: bestThreshold.weight,
        direction: bestThreshold.direction,
        deltaWeight: bestThreshold.delta,
        originalCity1Score: score1,
        originalCity2Score: score2,
        newCity1Score: bestThreshold.newScore1,
        newCity2Score: bestThreshold.newScore2,
      })
    }
  }

  // 3. Formulate outcome
  if (flippableFactors.length === 0) {
    return {
      canFlip: false,
      explanation: 'No single weight change flips #1 within the supported range.',
      isTied: false,
      insufficientData: false,
      city1Name: top1.city.name,
      city2Name: top2.city.name,
      originalCity1Score: score1,
      originalCity2Score: score2,
      flippableFactors: [],
    }
  }

  // Sort by smallest weight change required
  flippableFactors.sort((a, b) => a.deltaWeight - b.deltaWeight)
  const primary = flippableFactors[0]

  const actionWord = primary.direction === 'increase' ? 'Increasing' : 'Decreasing'
  const explanation = `${actionWord} ${primary.criterionName} weight to ${primary.thresholdWeight}% (currently ${primary.currentWeight}%) flips #1 from ${top1.city.name} to ${top2.city.name} (${top2.city.name}: ${primary.newCity2Score.toFixed(2)} vs ${top1.city.name}: ${primary.newCity1Score.toFixed(2)}).`

  return {
    canFlip: true,
    explanation,
    isTied: false,
    insufficientData: false,
    city1Name: top1.city.name,
    city2Name: top2.city.name,
    originalCity1Score: score1,
    originalCity2Score: score2,
    primaryFactor: primary,
    flippableFactors,
  }
}

// ─── B. Rank Robustness ──────────────────────────────────────────

export const ROBUSTNESS_DISCLAIMER =
  'Sensitivity check under simulated weights, not a probability of real-world business success or a prediction.'

export interface RobustnessOptions {
  sampleCount?: number
  seed?: number
}

/**
 * Evaluates ranking sensitivity across reproducible pseudo-random weight vectors.
 *
 * Principles:
 * - Generates positive random values using a seeded PRNG.
 * - Normalizes the vector to sum to 100.
 * - Ignores factors missing for all candidate cities.
 * - Shares top-win credit fractionally across tied winners (e.g. 50/50 for identical cities).
 * - All samples remain finite.
 */
export function computeRankRobustness(
  candidateCities: CandidateCityInput[],
  options: RobustnessOptions = {}
): RankRobustnessReport {
  const sampleCount = Math.max(1, options.sampleCount ?? 1000)
  const seed = options.seed ?? 42
  const rng = createSeededRandom(seed)

  if (!candidateCities || candidateCities.length === 0) {
    return {
      sampleCount,
      seed,
      results: [],
      topCity: null,
      disclaimer: ROBUSTNESS_DISCLAIMER,
      ignoredCriteria: [],
      activeCriteria: [],
    }
  }

  // Identify all unique criteria names across candidate cities
  const allCriteriaNames = Array.from(
    new Set(candidateCities.flatMap((c) => c.criteria.map((cr) => cr.name)))
  )

  // Identify factors missing for ALL candidate cities
  const ignoredCriteria: string[] = []
  const activeCriteria: string[] = []

  for (const name of allCriteriaNames) {
    const isAvailableInAny = candidateCities.some((city) => {
      const match = city.criteria.find((c) => c.name === name)
      return match && match.is_available !== false && match.score !== null && match.score !== undefined
    })

    if (isAvailableInAny) {
      activeCriteria.push(name)
    } else {
      ignoredCriteria.push(name)
    }
  }

  // If no active criteria exist, return early
  if (activeCriteria.length === 0) {
    return {
      sampleCount,
      seed,
      results: candidateCities.map((c) => ({
        cityName: c.name,
        winCount: 0,
        winPercentage: 0,
        displayLabel: `#1 in 0.0% of ${sampleCount.toLocaleString()} sampled weightings`,
      })),
      topCity: null,
      disclaimer: ROBUSTNESS_DISCLAIMER,
      ignoredCriteria,
      activeCriteria: [],
    }
  }

  // Track fractional win credits for each city
  const winCredits: Record<string, number> = {}
  candidateCities.forEach((c) => {
    winCredits[c.name] = 0
  })

  // Run Monte Carlo simulation across sampleCount weight vectors
  for (let s = 0; s < sampleCount; s++) {
    // 1. Generate positive random values for active criteria
    const rawWeights: number[] = []
    for (let i = 0; i < activeCriteria.length; i++) {
      // Positive random value in [1, 100]
      const r = rng() * 99 + 1
      rawWeights.push(r)
    }

    const sumRaw = rawWeights.reduce((sum, w) => sum + w, 0)

    // 2. Normalize vector to sum to 100
    const sampledWeights: Record<string, number> = {}
    activeCriteria.forEach((name, idx) => {
      sampledWeights[name] = (rawWeights[idx] / sumRaw) * 100
    })

    // 3. Evaluate each city with the sampled weights
    let maxScore = -Infinity
    const cityScores: Array<{ name: string; score: number | null }> = []

    for (const city of candidateCities) {
      const criteriaWithWeights = city.criteria.map((c) => {
        if (activeCriteria.includes(c.name)) {
          return { ...c, weight: sampledWeights[c.name] ?? 0 }
        }
        // Ignored criteria get weight 0
        return { ...c, weight: 0 }
      })

      const evalResult = computeFitScore({ criteria: criteriaWithWeights })
      const score = evalResult.insufficient_data ? null : evalResult.total_score

      cityScores.push({ name: city.name, score })

      if (score !== null && score > maxScore) {
        maxScore = score
      }
    }

    // 4. Handle ties fractionally
    if (maxScore > -Infinity) {
      // Identify all cities achieving maxScore within 0.0001 precision
      const tiedWinners = cityScores.filter(
        (cs) => cs.score !== null && Math.abs(cs.score - maxScore) < 0.0001
      )

      if (tiedWinners.length > 0) {
        const creditPerWinner = 1 / tiedWinners.length
        for (const winner of tiedWinners) {
          winCredits[winner.name] = (winCredits[winner.name] || 0) + creditPerWinner
        }
      }
    }
  }

  // 5. Compile results
  const results: CityRobustnessResult[] = candidateCities.map((c) => {
    const count = winCredits[c.name] || 0
    const winPercentage = parseFloat(((count / sampleCount) * 100).toFixed(1))
    return {
      cityName: c.name,
      winCount: parseFloat(count.toFixed(2)),
      winPercentage,
      displayLabel: `#1 in ${winPercentage}% of ${sampleCount.toLocaleString()} sampled weightings`,
    }
  })

  // Sort descending by win percentage
  results.sort((a, b) => b.winCount - a.winCount)
  const topCity = results.length > 0 ? results[0] : null

  return {
    sampleCount,
    seed,
    results,
    topCity,
    disclaimer: ROBUSTNESS_DISCLAIMER,
    ignoredCriteria,
    activeCriteria,
  }
}
