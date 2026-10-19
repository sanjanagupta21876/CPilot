/**
 * Deterministic Fit Score Engine — Version 1.0.0
 *
 * CITYPILOT — FEATURE A: CITY RECOMMENDATION & COMPARISON ENGINE
 *
 * Core principles:
 * 1. 100% deterministic calculation — zero LLM generation for numeric scores.
 * 2. Missing indicators are NEVER silently treated as 0 or favorable.
 * 3. Evidence coverage is tracked and displayed separately from Fit Score.
 * 4. Inverse directionality properly handled (e.g., higher commercial rent = lower score;
 *    higher competitive saturation = lower opportunity score).
 * 5. Minimum evidence threshold: If eligible criteria weight < 50% or fewer than 3 criteria
 *    have evidence, flag as insufficient_data = true.
 */

import type { FitScoreCriterion, MarketIndicator, Competitor } from '@/types/database'

export const SCORING_MODEL_VERSION = 'v1.0.0'

export interface StartupScoringContext {
  industry?: string
  stage?: string
  primary_channel?: string | null
  target_customer?: string
  price_min?: number | null
  price_max?: number | null
}

export interface ScoringCriterionInput {
  name: string
  weight: number
  score?: number | null
  rationale?: string
  is_available?: boolean
}

export interface ScoringInput {
  criteria: ScoringCriterionInput[]
  startupContext?: StartupScoringContext
}

export interface ScoringResult {
  criteria: FitScoreCriterion[]
  total_score: number | null
  max_score: number
  percentage: number | null
  scoring_model_version: string
  evidence_coverage: number // 0–100 percentage
  missing_criteria: string[]
  insufficient_data: boolean
  eligible_weight_sum: number
  total_possible_weight: number
  limitations: string[]
}

/**
 * Default criteria definitions and baseline weights for Indian startup city expansion.
 * Total baseline weight = 100.
 */
export const DEFAULT_CRITERIA: Array<{
  name: string
  weight: number
  description: string
  direction: 'higher_is_better' | 'lower_is_better'
}> = [
  {
    name: 'Demand Fit',
    weight: 25,
    description: 'Evaluates urban consumer density and per capita disposable income to assess addressable market scale.',
    direction: 'higher_is_better',
  },
  {
    name: 'Competitive Opportunity',
    weight: 20,
    description: 'Assesses competitor saturation. Higher incumbent density reduces whitespace unless moats exist.',
    direction: 'lower_is_better',
  },
  {
    name: 'Distribution Feasibility',
    weight: 20,
    description: 'Evaluates modern trade outlets, organized retail networks, and logistics fulfillment infrastructure.',
    direction: 'higher_is_better',
  },
  {
    name: 'Entry Cost & Unit Economics',
    weight: 20,
    description: 'Measures commercial real estate and setup burn rate. Lower entry costs produce higher feasibility scores.',
    direction: 'lower_is_better',
  },
  {
    name: 'Operational Feasibility & Talent',
    weight: 15,
    description: 'Assesses digital payment penetration, fintech adoption velocity, and specialized workforce availability.',
    direction: 'higher_is_better',
  },
]

/**
 * Computes a weighted, explainable Fit Score adhering to Phase 5 specification.
 *
 * Formula:
 * total_score = (sum(score_i * weight_i) / sum(weight_i for eligible criteria)) * 10
 *
 * Normalization & Guardrails:
 * - Weights are validated and clamped between 0 and 100.
 * - Missing indicators are excluded from the denominator rather than fabricated or assumed zero.
 * - If eligible criteria count < 3 OR eligible weight < 50% of total possible weight,
 *   insufficient_data is flagged as true and total_score is returned as null.
 */
export function computeFitScore(input: ScoringInput): ScoringResult {
  const { criteria } = input
  const limitations: string[] = []
  const missing_criteria: string[] = []

  if (!criteria || criteria.length === 0) {
    return {
      criteria: [],
      total_score: null,
      max_score: 100,
      percentage: null,
      scoring_model_version: SCORING_MODEL_VERSION,
      evidence_coverage: 0,
      missing_criteria: ['All criteria missing'],
      insufficient_data: true,
      eligible_weight_sum: 0,
      total_possible_weight: 0,
      limitations: ['No criteria provided for scoring.'],
    }
  }

  let totalPossibleWeight = 0
  let eligibleWeightSum = 0
  let weightedSum = 0
  const processedCriteria: FitScoreCriterion[] = []

  for (const c of criteria) {
    const validWeight = Math.max(0, Math.min(100, c.weight))
    totalPossibleWeight += validWeight

    const isAvailable = c.is_available !== false && c.score !== undefined && c.score !== null

    if (!isAvailable) {
      missing_criteria.push(c.name)
      limitations.push(`Criterion "${c.name}" lacked verified indicators and was excluded from calculation.`)
      // Include with score 0 in report with clear missing rationale, but DO NOT include in denominator
      processedCriteria.push({
        name: c.name,
        weight: validWeight,
        score: 0,
        rationale: c.rationale || 'Insufficient data available for this market indicator in target city.',
      })
      continue
    }

    const validScore = Math.max(0, Math.min(10, c.score!))
    weightedSum += validScore * validWeight
    eligibleWeightSum += validWeight

    processedCriteria.push({
      name: c.name,
      weight: validWeight,
      score: parseFloat(validScore.toFixed(2)),
      rationale: c.rationale || 'Evaluated deterministically from sourced city market indicators.',
    })
  }

  // Calculate evidence coverage % (0 to 100)
  const eligibleCriteriaCount = criteria.length - missing_criteria.length
  const evidence_coverage = criteria.length > 0
    ? parseFloat(((eligibleCriteriaCount / criteria.length) * 100).toFixed(1))
    : 0

  // Minimum evidence guardrails:
  // Requires at least 3 eligible criteria and at least 50% of the total possible weight
  const minimumWeightThreshold = totalPossibleWeight * 0.5
  const hasInsufficientData = eligibleCriteriaCount < 3 || eligibleWeightSum < minimumWeightThreshold

  if (hasInsufficientData) {
    limitations.push(
      `Insufficient evidence: only ${eligibleCriteriaCount} of ${criteria.length} criteria evaluated (${eligibleWeightSum}/${totalPossibleWeight} weight). Minimum 3 criteria and 50% weight required.`
    )
    return {
      criteria: processedCriteria,
      total_score: null,
      max_score: 100,
      percentage: null,
      scoring_model_version: SCORING_MODEL_VERSION,
      evidence_coverage,
      missing_criteria,
      insufficient_data: true,
      eligible_weight_sum: eligibleWeightSum,
      total_possible_weight: totalPossibleWeight,
      limitations,
    }
  }

  // Scale: weighted average (0-10) scaled by 10 => 0–100 total score
  const total_score = parseFloat(((weightedSum / eligibleWeightSum) * 10).toFixed(2))

  return {
    criteria: processedCriteria,
    total_score,
    max_score: 100,
    percentage: total_score,
    scoring_model_version: SCORING_MODEL_VERSION,
    evidence_coverage,
    missing_criteria,
    insufficient_data: false,
    eligible_weight_sum: eligibleWeightSum,
    total_possible_weight: totalPossibleWeight,
    limitations,
  }
}

/**
 * Maps raw city market indicators and competitors to criterion scores (0-10) deterministically.
 * Applies directional normalization and generates auditable rationales.
 */
export function evaluateCityCriteria(
  cityName: string,
  indicators: MarketIndicator[],
  competitors: Competitor[] = [],
  weights: Record<string, number> = {}
): ScoringCriterionInput[] {
  const cityIndicators = indicators.filter((i) => i.city.toLowerCase() === cityName.toLowerCase())
  const cityCompetitors = competitors.filter((c) => c.city.toLowerCase() === cityName.toLowerCase())

  return DEFAULT_CRITERIA.map((def) => {
    const weight = weights[def.name] ?? def.weight

    switch (def.name) {
      case 'Demand Fit': {
        const popInd = cityIndicators.find((i) => i.indicator.toLowerCase().includes('population'))
        const incomeInd = cityIndicators.find((i) => i.indicator.toLowerCase().includes('income'))

        if (!popInd && !incomeInd) {
          return {
            name: def.name,
            weight,
            is_available: false,
            score: null,
            rationale: 'No population or per-capita income indicators found for this city.',
          }
        }

        // Population scale (0-5 contribution)
        let popScore = 2.5
        let popDesc = 'Moderate population size'
        if (popInd) {
          const numPop = parseFloat(popInd.value.replace(/,/g, ''))
          if (numPop >= 25) {
            popScore = 5.0
            popDesc = `Massive consumer agglomeration (${popInd.value} ${popInd.unit || ''})`
          } else if (numPop >= 15) {
            popScore = 4.6
            popDesc = `Very high consumer density (${popInd.value} ${popInd.unit || ''})`
          } else if (numPop >= 10) {
            popScore = 4.0
            popDesc = `Large metro population (${popInd.value} ${popInd.unit || ''})`
          } else if (numPop >= 6) {
            popScore = 3.5
            popDesc = `Substantial metro population (${popInd.value} ${popInd.unit || ''})`
          } else {
            popScore = 2.8
            popDesc = `Regional urban center (${popInd.value} ${popInd.unit || ''})`
          }
        }

        // Income scale (0-5 contribution)
        let incomeScore = 2.5
        let incomeDesc = 'Average metro purchasing power'
        if (incomeInd) {
          const numIncome = parseFloat(incomeInd.value.replace(/,/g, ''))
          if (numIncome >= 400000) {
            incomeScore = 5.0
            incomeDesc = `Nation-leading disposable income (${incomeInd.value} ${incomeInd.unit || ''})`
          } else if (numIncome >= 320000) {
            incomeScore = 4.5
            incomeDesc = `High purchasing power segment (${incomeInd.value} ${incomeInd.unit || ''})`
          } else if (numIncome >= 280000) {
            incomeScore = 3.8
            incomeDesc = `Moderate-high purchasing power (${incomeInd.value} ${incomeInd.unit || ''})`
          } else {
            incomeScore = 3.0
            incomeDesc = `Standard urban income baseline (${incomeInd.value} ${incomeInd.unit || ''})`
          }
        }

        const score = parseFloat((popScore + incomeScore).toFixed(1))
        return {
          name: def.name,
          weight,
          is_available: true,
          score,
          rationale: `${popDesc} combined with ${incomeDesc.toLowerCase()}.`,
        }
      }

      case 'Competitive Opportunity': {
        const startupInd = cityIndicators.find((i) => i.indicator.toLowerCase().includes('startup'))
        if (!startupInd && cityCompetitors.length === 0) {
          return {
            name: def.name,
            weight,
            is_available: false,
            score: null,
            rationale: 'No startup density or competitor records found for this market.',
          }
        }

        // Inverse directionality: High incumbent density = saturated CAC = lower opportunity score
        let score = 7.0
        let rationale = 'Balanced competitive density with accessible market share.'

        let count = 0
        if (startupInd) {
          count = parseInt(startupInd.value.replace(/[^\d]/g, ''), 10) || 0
        }

        if (count >= 13000) {
          score = 5.2
          rationale = `High incumbent saturation (${count.toLocaleString('en-IN')} recognized startups); high CAC for direct market entry.`
        } else if (count >= 9000) {
          score = 5.8
          rationale = `Dense brand presence (${count.toLocaleString('en-IN')} startups); established category leaders present.`
        } else if (count >= 5000) {
          score = 7.8
          rationale = `Fast-growing ecosystem (${count.toLocaleString('en-IN')} startups) with significant underserved whitespace.`
        } else if (count > 0) {
          score = 8.5
          rationale = `Emerging startup ecosystem (${count.toLocaleString('en-IN')} startups); prime opportunity to capture early category leadership.`
        } else if (cityCompetitors.length > 0) {
          score = 7.2
          rationale = `${cityCompetitors.length} benchmark competitors observed; market shows moderate competitive activity.`
        }

        return {
          name: def.name,
          weight,
          is_available: true,
          score,
          rationale,
        }
      }

      case 'Distribution Feasibility': {
        const retailInd = cityIndicators.find(
          (i) => i.indicator.toLowerCase().includes('retail') || i.indicator.toLowerCase().includes('trade') || i.indicator.toLowerCase().includes('supermarket')
        )

        if (!retailInd) {
          return {
            name: def.name,
            weight,
            is_available: false,
            score: null,
            rationale: 'No modern trade or supermarket distribution density indicators available.',
          }
        }

        const density = parseFloat(retailInd.value) || 0
        let score = 7.0
        let rationale = 'Standard modern trade and retail distributor availability.'

        if (density >= 21) {
          score = 9.4
          rationale = `Premier modern retail network (${retailInd.value} ${retailInd.unit || ''}) with dense supermarket and distributor presence.`
        } else if (density >= 18) {
          score = 8.6
          rationale = `Strong modern retail density (${retailInd.value} ${retailInd.unit || ''}) and mature quick-commerce fulfillment nodes.`
        } else if (density >= 14) {
          score = 7.6
          rationale = `Solid organized retail footprint (${retailInd.value} ${retailInd.unit || ''}) across major suburban corridors.`
        } else {
          score = 6.8
          rationale = `Developing modern trade density (${retailInd.value} ${retailInd.unit || ''}); traditional distributor channels predominate.`
        }

        return {
          name: def.name,
          weight,
          is_available: true,
          score,
          rationale,
        }
      }

      case 'Entry Cost & Unit Economics': {
        const rentInd = cityIndicators.find(
          (i) => i.indicator.toLowerCase().includes('rent') || i.indicator.toLowerCase().includes('office')
        )

        if (!rentInd) {
          return {
            name: def.name,
            weight,
            is_available: false,
            score: null,
            rationale: 'No commercial rent or workspace cost indicators available for this market.',
          }
        }

        // Inverted directionality: Lower commercial real estate costs = higher score (longer runway)
        // Extract lower or mid bound from string like "140 - 240" or "85 - 110"
        const matches = rentInd.value.match(/\d+/g)
        const avgRent = matches && matches.length >= 2
          ? (parseFloat(matches[0]) + parseFloat(matches[1])) / 2
          : matches ? parseFloat(matches[0]) : 100

        let score = 7.0
        let rationale = 'Average commercial rent benchmark.'

        if (avgRent > 150) {
          score = 4.8
          rationale = `High commercial overhead (${rentInd.value} ${rentInd.unit || ''}); increases initial operating and office burn rate.`
        } else if (avgRent > 90) {
          score = 6.6
          rationale = `Moderate-to-high commercial overhead (${rentInd.value} ${rentInd.unit || ''}) across primary business corridors.`
        } else if (avgRent > 70) {
          score = 8.2
          rationale = `Cost-effective commercial rent (${rentInd.value} ${rentInd.unit || ''}); enables capital-efficient regional setup.`
        } else {
          score = 9.0
          rationale = `Very favorable entry costs (${rentInd.value} ${rentInd.unit || ''}); preserves startup cash runway during initial launch.`
        }

        return {
          name: def.name,
          weight,
          is_available: true,
          score,
          rationale,
        }
      }

      case 'Operational Feasibility & Talent': {
        const upiInd = cityIndicators.find((i) => i.indicator.toLowerCase().includes('upi'))

        if (!upiInd) {
          return {
            name: def.name,
            weight,
            is_available: false,
            score: null,
            rationale: 'No digital transaction density or infrastructure indicators available.',
          }
        }

        const txPerCapita = parseFloat(upiInd.value.replace(/,/g, '')) || 0
        let score = 7.5
        let rationale = 'Solid digital payment and operational readiness.'

        if (txPerCapita >= 800) {
          score = 9.6
          rationale = `Exceptional digital commerce readiness (${upiInd.value} ${upiInd.unit || ''}); top national digital transaction frequency.`
        } else if (txPerCapita >= 750) {
          score = 8.9
          rationale = `Very high digital transaction volume (${upiInd.value} ${upiInd.unit || ''}) with widespread QR scan adoption.`
        } else if (txPerCapita >= 680) {
          score = 8.0
          rationale = `Strong digital adoption (${upiInd.value} ${upiInd.unit || ''}) among young consumer and merchant demographics.`
        } else {
          score = 7.2
          rationale = `Healthy digital transaction adoption (${upiInd.value} ${upiInd.unit || ''}) with expanding digital payment infrastructure.`
        }

        return {
          name: def.name,
          weight,
          is_available: true,
          score,
          rationale,
        }
      }

      default:
        return {
          name: def.name,
          weight,
          is_available: false,
          score: null,
          rationale: 'Custom or unmapped criterion.',
        }
    }
  })
}

/**
 * Computes deterministic evidence coverage breakdown.
 */
export function computeEvidenceCoverage(
  criteria: ScoringCriterionInput[],
  indicators: MarketIndicator[]
) {
  const totalCriteria = criteria.length
  const availableCriteria = criteria.filter((c) => c.is_available !== false && c.score != null)
  const missingCriteria = criteria.filter((c) => c.is_available === false || c.score == null)

  const coveragePercentage = totalCriteria > 0
    ? parseFloat(((availableCriteria.length / totalCriteria) * 100).toFixed(1))
    : 0

  const verifiedCount = indicators.filter((i) => !i.is_simulated && i.confidence === 'high').length
  const simulatedCount = indicators.filter((i) => i.is_simulated).length
  const mediumOrLowConfidenceCount = indicators.filter((i) => i.confidence === 'medium' || i.confidence === 'low').length

  const limitations: string[] = []
  if (missingCriteria.length > 0) {
    limitations.push(`Missing verified data for: ${missingCriteria.map((c) => c.name).join(', ')}.`)
  }
  if (simulatedCount > 0) {
    limitations.push(`${simulatedCount} indicators are benchmark/simulated records and should not be treated as empirical survey findings.`)
  }
  if (mediumOrLowConfidenceCount > 0) {
    limitations.push(`${mediumOrLowConfidenceCount} indicators rely on secondary trade association estimates rather than census/official statutory reporting.`)
  }

  return {
    coveragePercentage,
    availableCriteriaNames: availableCriteria.map((c) => c.name),
    missingCriteriaNames: missingCriteria.map((c) => c.name),
    verifiedCount,
    simulatedCount,
    mediumOrLowConfidenceCount,
    limitations,
  }
}

/** Returns styling color classes based on score */
export function fitScoreColor(score: number | null): string {
  if (score === null) return 'text-slate-400'
  if (score >= 75) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-rose-400'
}

/** Returns readable label */
export function fitScoreLabel(score: number | null, insufficientData?: boolean): string {
  if (insufficientData || score === null) return 'Insufficient Data'
  if (score >= 75) return 'Strong Fit'
  if (score >= 50) return 'Moderate Fit'
  if (score >= 25) return 'Weak Fit'
  return 'Poor Fit'
}
