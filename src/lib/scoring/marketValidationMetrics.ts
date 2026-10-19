import type {
  Experiment,
  ExperimentResponse,
  OutcomeInterpretation,
  SignalTier,
  ThresholdOperator,
} from '@/types/database'

export interface CalculatedMetric {
  name: string
  label: string
  value: number | null
  formattedValue: string
  unit: string
  numerator: number
  denominator: number | null
  numeratorLabel: string
  denominatorLabel: string
  description: string
}

export interface ExperimentMetricsSummary {
  sampleTarget: number
  totalRecorded: number
  validResponses: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  inconclusiveCount: number

  // Signal Tiers
  reportedInterestCount: number
  qualifiedLeadsCount: number
  signupsCount: number
  paidOrdersCount: number
  repeatPurchasesCount: number
  objectionsCount: number
  totalFinancialValue: number

  // Calculated Metrics
  responseRate: CalculatedMetric
  problemConfirmationRate: CalculatedMetric
  qualifiedLeadRate: CalculatedMetric
  paidConversionRate: CalculatedMetric

  // Threshold Evaluation
  targetMetricName: string
  targetMetricValue: number | null
  thresholdTarget: number
  thresholdOperator: ThresholdOperator
  thresholdUnit: string
  minSampleRequired: number
  sampleSufficient: boolean
  thresholdMet: boolean | null
  outcomeInterpretation: OutcomeInterpretation
  interpretationReason: string
}

/**
 * Evaluates whether actual metric satisfies threshold with given operator.
 */
export function evaluateOperator(
  actual: number,
  operator: ThresholdOperator,
  target: number
): boolean {
  switch (operator) {
    case '>=':
      return actual >= target
    case '>':
      return actual > target
    case '<=':
      return actual <= target
    case '<':
      return actual < target
    case '=':
      return Math.abs(actual - target) < 0.0001
    default:
      return actual >= target
  }
}

/**
 * Safely computes division and returns null if denominator is zero or invalid.
 */
export function safeRate(
  numerator: number,
  denominator: number | null | undefined
): number | null {
  if (denominator === null || denominator === undefined || denominator <= 0) {
    return null
  }
  return Number(((numerator / denominator) * 100).toFixed(1))
}

/**
 * Computes deterministic market validation metrics from responses and planned threshold.
 */
export function calculateExperimentMetrics(
  experiment: Partial<Experiment>,
  responses: ExperimentResponse[]
): ExperimentMetricsSummary {
  const sampleTarget = Math.max(1, experiment.sample_size_target ?? 10)
  const totalRecorded = responses.length

  let validResponses = 0
  let positiveCount = 0
  let negativeCount = 0
  let neutralCount = 0
  let inconclusiveCount = 0

  let reportedInterestCount = 0
  let qualifiedLeadsCount = 0
  let signupsCount = 0
  let paidOrdersCount = 0
  let repeatPurchasesCount = 0
  let objectionsCount = 0
  let totalFinancialValue = 0

  for (const resp of responses) {
    validResponses++

    // Outcome counts
    if (resp.outcome === 'positive') positiveCount++
    else if (resp.outcome === 'negative') negativeCount++
    else if (resp.outcome === 'neutral') neutralCount++
    else if (resp.outcome === 'inconclusive') inconclusiveCount++

    // Signal tier counts
    const tier: SignalTier = resp.signal_tier || 'reported_interest'
    if (tier === 'reported_interest') reportedInterestCount++
    else if (tier === 'qualified_lead') qualifiedLeadsCount++
    else if (tier === 'signup') signupsCount++
    else if (tier === 'paid_order') paidOrdersCount++
    else if (tier === 'repeat_purchase') repeatPurchasesCount++
    else if (tier === 'objection') objectionsCount++

    if (resp.financial_value && !isNaN(Number(resp.financial_value))) {
      totalFinancialValue += Number(resp.financial_value)
    }
  }

  // 1. Response Rate vs Sample Target
  const responseRateVal = safeRate(validResponses, sampleTarget)
  const responseRate: CalculatedMetric = {
    name: 'response_rate',
    label: 'Response Rate',
    value: responseRateVal,
    formattedValue: responseRateVal !== null ? `${responseRateVal}%` : 'N/A (No target)',
    unit: '%',
    numerator: validResponses,
    denominator: sampleTarget,
    numeratorLabel: 'Recorded Responses',
    denominatorLabel: 'Target Sample Size',
    description: 'Percentage of planned sample size successfully reached and completed.',
  }

  // 2. Problem Confirmation Rate (positive / valid responses)
  const problemConfVal = safeRate(positiveCount, validResponses)
  const problemConfirmationRate: CalculatedMetric = {
    name: 'problem_confirmation_rate',
    label: 'Problem Confirmation Rate',
    value: problemConfVal,
    formattedValue: problemConfVal !== null ? `${problemConfVal}%` : 'N/A (No responses)',
    unit: '%',
    numerator: positiveCount,
    denominator: validResponses > 0 ? validResponses : null,
    numeratorLabel: 'Confirmed Problem (Positive)',
    denominatorLabel: 'Valid Responses',
    description: 'Percentage of respondents independently validating the core target problem.',
  }

  // 3. Qualified Lead Rate
  const leadVal = safeRate(qualifiedLeadsCount, validResponses)
  const qualifiedLeadRate: CalculatedMetric = {
    name: 'qualified_lead_rate',
    label: 'Qualified Lead Rate',
    value: leadVal,
    formattedValue: leadVal !== null ? `${leadVal}%` : 'N/A (No responses)',
    unit: '%',
    numerator: qualifiedLeadsCount,
    denominator: validResponses > 0 ? validResponses : null,
    numeratorLabel: 'Qualified Leads',
    denominatorLabel: 'Valid Responses',
    description: 'Proportion of respondents meeting target buyer criteria with direct interest.',
  }

  // 4. Paid Conversion Rate (paid orders / valid responses)
  const totalPaidSignals = paidOrdersCount + repeatPurchasesCount
  const paidVal = safeRate(totalPaidSignals, validResponses)
  const paidConversionRate: CalculatedMetric = {
    name: 'paid_conversion_rate',
    label: 'Paid Commitment Rate',
    value: paidVal,
    formattedValue: paidVal !== null ? `${paidVal}%` : 'N/A (No responses)',
    unit: '%',
    numerator: totalPaidSignals,
    denominator: validResponses > 0 ? validResponses : null,
    numeratorLabel: 'Paid Orders / Trials',
    denominatorLabel: 'Valid Responses',
    description: 'Percentage of respondents executing a commercial transaction or pilot payment.',
  }

  // ─── Predefined Threshold Evaluation ─────────────────────────
  const targetMetricName = experiment.threshold_metric || 'problem_confirmation_rate'
  const thresholdOperator = experiment.threshold_operator || '>='
  const thresholdTarget = Number(experiment.threshold_target ?? 50)
  const thresholdUnit = experiment.threshold_unit || '%'
  const minSampleRequired = Math.max(1, experiment.threshold_min_sample ?? 5)

  // Map metric to actual value
  let actualMetricValue: number | null = null
  if (targetMetricName === 'problem_confirmation_rate') {
    actualMetricValue = problemConfVal
  } else if (targetMetricName === 'response_rate') {
    actualMetricValue = responseRateVal
  } else if (targetMetricName === 'qualified_lead_rate') {
    actualMetricValue = leadVal
  } else if (targetMetricName === 'paid_conversion_rate') {
    actualMetricValue = paidVal
  } else if (targetMetricName === 'paid_orders') {
    actualMetricValue = totalPaidSignals
  } else if (targetMetricName === 'total_revenue') {
    actualMetricValue = totalFinancialValue
  } else if (targetMetricName === 'positive_responses') {
    actualMetricValue = positiveCount
  } else {
    // Default fallback to problem confirmation rate
    actualMetricValue = problemConfVal
  }

  const sampleSufficient = validResponses >= minSampleRequired

  let outcomeInterpretation: OutcomeInterpretation = 'not_evaluated'
  let thresholdMet: boolean | null = null
  let interpretationReason = 'No observations have been recorded yet.'

  if (validResponses === 0) {
    outcomeInterpretation = 'not_evaluated'
    thresholdMet = null
    interpretationReason = 'Experiment has not recorded any observations yet.'
  } else if (!sampleSufficient) {
    outcomeInterpretation = 'insufficient_sample'
    thresholdMet = null
    interpretationReason = `Sample size (${validResponses}) is below predefined minimum threshold requirement (${minSampleRequired}). Results are exploratory.`
  } else if (actualMetricValue === null) {
    outcomeInterpretation = 'inconclusive'
    thresholdMet = null
    interpretationReason = 'Insufficient data to compute the declared threshold metric.'
  } else {
    const isMet = evaluateOperator(actualMetricValue, thresholdOperator, thresholdTarget)
    thresholdMet = isMet

    if (isMet) {
      outcomeInterpretation = 'threshold_met'
      interpretationReason = `Observed metric (${actualMetricValue}${thresholdUnit}) meets predefined success threshold (${thresholdOperator} ${thresholdTarget}${thresholdUnit}) with sufficient sample size (${validResponses} responses).`
    } else {
      outcomeInterpretation = 'threshold_not_met'
      interpretationReason = `Observed metric (${actualMetricValue}${thresholdUnit}) does not satisfy predefined success threshold (${thresholdOperator} ${thresholdTarget}${thresholdUnit}) with ${validResponses} responses.`
    }
  }

  return {
    sampleTarget,
    totalRecorded,
    validResponses,
    positiveCount,
    negativeCount,
    neutralCount,
    inconclusiveCount,
    reportedInterestCount,
    qualifiedLeadsCount,
    signupsCount,
    paidOrdersCount,
    repeatPurchasesCount,
    objectionsCount,
    totalFinancialValue,
    responseRate,
    problemConfirmationRate,
    qualifiedLeadRate,
    paidConversionRate,
    targetMetricName,
    targetMetricValue: actualMetricValue,
    thresholdTarget,
    thresholdOperator,
    thresholdUnit,
    minSampleRequired,
    sampleSufficient,
    thresholdMet,
    outcomeInterpretation,
    interpretationReason,
  }
}
