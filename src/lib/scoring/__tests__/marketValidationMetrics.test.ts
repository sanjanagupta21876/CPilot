import {
  calculateExperimentMetrics,
  evaluateOperator,
  safeRate,
} from '../marketValidationMetrics'
import type { Experiment, ExperimentResponse } from '@/types/database'

export function runMarketValidationMetricsTests() {
  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`)
      passed++
    } else {
      console.error(`  ✗ ${testName}`)
      failed++
    }
  }

  console.log('\n--- Running Market Validation Metrics & Threshold Tests ---')

  // 1. safeRate division-by-zero guards
  assert(safeRate(5, 10) === 50, 'safeRate(5, 10) correctly returns 50.0%')
  assert(safeRate(0, 10) === 0, 'safeRate(0, 10) correctly returns 0.0%')
  assert(safeRate(5, 0) === null, 'safeRate with denominator 0 safely returns null (no division by zero)')
  assert(safeRate(5, null) === null, 'safeRate with null denominator safely returns null')
  assert(safeRate(5, undefined) === null, 'safeRate with undefined denominator safely returns null')
  assert(safeRate(5, -2) === null, 'safeRate with negative denominator safely returns null')

  // 2. evaluateOperator tests
  assert(evaluateOperator(68.4, '>=', 50), 'evaluateOperator: 68.4 >= 50 returns true')
  assert(!evaluateOperator(49.9, '>=', 50), 'evaluateOperator: 49.9 >= 50 returns false')
  assert(evaluateOperator(50.1, '>', 50), 'evaluateOperator: 50.1 > 50 returns true')
  assert(!evaluateOperator(50, '>', 50), 'evaluateOperator: 50 > 50 returns false')
  assert(evaluateOperator(20, '<=', 25), 'evaluateOperator: 20 <= 25 returns true')
  assert(evaluateOperator(25, '<=', 25), 'evaluateOperator: 25 <= 25 returns true')
  assert(!evaluateOperator(26, '<=', 25), 'evaluateOperator: 26 <= 25 returns false')
  assert(evaluateOperator(15, '<', 20), 'evaluateOperator: 15 < 20 returns true')
  assert(!evaluateOperator(20, '<', 20), 'evaluateOperator: 20 < 20 returns false')
  assert(evaluateOperator(50.0, '=', 50.0), 'evaluateOperator: 50.0 = 50.0 returns true')
  assert(!evaluateOperator(50.5, '=', 50.0), 'evaluateOperator: 50.5 = 50.0 returns false')

  // 3. calculateExperimentMetrics with empty responses (division-by-zero prevention in UI metrics)
  const expEmpty: Partial<Experiment> = {
    title: 'Test Empty Exp',
    method: 'survey',
    sample_size_target: 20,
    threshold_metric: 'problem_confirmation_rate',
    threshold_operator: '>=',
    threshold_target: 50,
    threshold_unit: '%',
    threshold_min_sample: 10,
    status: 'planned',
  }
  const summaryEmpty = calculateExperimentMetrics(expEmpty, [])
  assert(summaryEmpty.validResponses === 0, 'Empty responses yields 0 valid responses')
  assert(summaryEmpty.problemConfirmationRate.value === null, 'Empty responses problemConfirmationRate value is null')
  assert(
    summaryEmpty.problemConfirmationRate.formattedValue === 'N/A (No responses)',
    'Empty responses problemConfirmationRate formattedValue is N/A'
  )
  assert(
    summaryEmpty.outcomeInterpretation === 'not_evaluated',
    'Planned experiment with no responses yields not_evaluated'
  )

  // 4. Sample size guard: Rate exceeds target, but sample is below minimum
  const expInsufficient: Partial<Experiment> = {
    title: 'Small Sample Exp',
    method: 'interview',
    sample_size_target: 15,
    threshold_metric: 'problem_confirmation_rate',
    threshold_operator: '>=',
    threshold_target: 50,
    threshold_unit: '%',
    threshold_min_sample: 10,
    status: 'active',
  }
  const responsesSmall: ExperimentResponse[] = [
    {
      id: 'r1',
      experiment_id: 'exp-test',
      respondent_label: 'Lead 1',
      response_type: 'interview',
      outcome: 'positive',
      signal_tier: 'reported_interest',
      recorded_at: new Date().toISOString(),
    },
    {
      id: 'r2',
      experiment_id: 'exp-test',
      respondent_label: 'Lead 2',
      response_type: 'interview',
      outcome: 'positive',
      signal_tier: 'reported_interest',
      recorded_at: new Date().toISOString(),
    },
    {
      id: 'r3',
      experiment_id: 'exp-test',
      respondent_label: 'Lead 3',
      response_type: 'interview',
      outcome: 'positive',
      signal_tier: 'reported_interest',
      recorded_at: new Date().toISOString(),
    },
  ]
  const summaryInsufficient = calculateExperimentMetrics(expInsufficient, responsesSmall)
  assert(
    summaryInsufficient.problemConfirmationRate.value === 100,
    '3 of 3 positive yields 100% confirmation rate'
  )
  assert(
    !summaryInsufficient.sampleSufficient,
    'Sample (n=3) is below threshold_min_sample (10), marked sampleSufficient = false'
  )
  assert(
    summaryInsufficient.outcomeInterpretation === 'insufficient_sample',
    'Sample below min threshold correctly returns outcomeInterpretation: insufficient_sample'
  )

  // 5. Successful threshold met evaluation (n=12 >= min 10, rate = 75% >= 50%)
  const responsesAdequate: ExperimentResponse[] = [
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `pos-${i}`,
      experiment_id: 'exp-test',
      respondent_label: `Resp ${i}`,
      response_type: 'interview' as const,
      outcome: 'positive' as const,
      signal_tier: 'reported_interest' as const,
      recorded_at: new Date().toISOString(),
    })),
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `neg-${i}`,
      experiment_id: 'exp-test',
      respondent_label: `Resp Neg ${i}`,
      response_type: 'interview' as const,
      outcome: 'negative' as const,
      signal_tier: 'objection' as const,
      recorded_at: new Date().toISOString(),
    })),
  ]
  const summaryMet = calculateExperimentMetrics(expInsufficient, responsesAdequate)
  assert(summaryMet.sampleSufficient, 'n=12 >= 10 satisfies sample requirement')
  assert(summaryMet.problemConfirmationRate.value === 75, '9 of 12 yields 75.0%')
  assert(summaryMet.thresholdMet === true, '75% >= 50% satisfies threshold')
  assert(
    summaryMet.outcomeInterpretation === 'threshold_met',
    'Adequate positive sample correctly returns outcomeInterpretation: threshold_met'
  )

  // 6. Threshold not met evaluation (n=12 >= 10, rate = 25% < 50%)
  const responsesFailed: ExperimentResponse[] = [
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `pos-${i}`,
      experiment_id: 'exp-test',
      respondent_label: `Resp ${i}`,
      response_type: 'interview' as const,
      outcome: 'positive' as const,
      signal_tier: 'reported_interest' as const,
      recorded_at: new Date().toISOString(),
    })),
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `neg-${i}`,
      experiment_id: 'exp-test',
      respondent_label: `Resp Neg ${i}`,
      response_type: 'interview' as const,
      outcome: 'negative' as const,
      signal_tier: 'objection' as const,
      recorded_at: new Date().toISOString(),
    })),
  ]
  const summaryNotMet = calculateExperimentMetrics(expInsufficient, responsesFailed)
  assert(summaryNotMet.problemConfirmationRate.value === 25, '3 of 12 yields 25.0%')
  assert(summaryNotMet.thresholdMet === false, '25% < 50% fails threshold')
  assert(
    summaryNotMet.outcomeInterpretation === 'threshold_not_met',
    'Low positive sample correctly returns outcomeInterpretation: threshold_not_met'
  )

  // 7. Commercial signal tiers and financial value calculation
  const responsesCommercial: ExperimentResponse[] = [
    {
      id: 'c1',
      experiment_id: 'exp-test',
      respondent_label: 'Buyer 1',
      response_type: 'purchase',
      outcome: 'positive',
      signal_tier: 'paid_order',
      financial_value: 5400,
      recorded_at: new Date().toISOString(),
    },
    {
      id: 'c2',
      experiment_id: 'exp-test',
      respondent_label: 'Buyer 2',
      response_type: 'purchase',
      outcome: 'positive',
      signal_tier: 'paid_order',
      financial_value: 10800,
      recorded_at: new Date().toISOString(),
    },
    {
      id: 'c3',
      experiment_id: 'exp-test',
      respondent_label: 'Lead 1',
      response_type: 'lead',
      outcome: 'positive',
      signal_tier: 'qualified_lead',
      financial_value: null,
      recorded_at: new Date().toISOString(),
    },
    {
      id: 'c4',
      experiment_id: 'exp-test',
      respondent_label: 'User 1',
      response_type: 'signup',
      outcome: 'positive',
      signal_tier: 'signup',
      financial_value: null,
      recorded_at: new Date().toISOString(),
    },
    {
      id: 'c5',
      experiment_id: 'exp-test',
      respondent_label: 'Objection 1',
      response_type: 'interview',
      outcome: 'negative',
      signal_tier: 'objection',
      rejection_reason: 'Price too high',
      recorded_at: new Date().toISOString(),
    },
  ]
  const summaryComm = calculateExperimentMetrics(
    {
      ...expInsufficient,
      threshold_metric: 'paid_conversion_rate',
      threshold_operator: '>=',
      threshold_target: 20,
      threshold_min_sample: 5,
    },
    responsesCommercial
  )
  assert(summaryComm.paidOrdersCount === 2, 'Accurately counted 2 paid orders')
  assert(summaryComm.qualifiedLeadsCount === 1, 'Accurately counted 1 qualified lead')
  assert(summaryComm.signupsCount === 1, 'Accurately counted 1 signup')
  assert(summaryComm.objectionsCount === 1, 'Accurately counted 1 objection')
  assert(
    summaryComm.totalFinancialValue === 16200,
    'Accurately summed totalFinancialValue (5400 + 10800 = 16200)'
  )
  assert(
    summaryComm.paidConversionRate.value === 40,
    'Paid conversion rate is 2 / 5 = 40.0%'
  )
  assert(
    summaryComm.outcomeInterpretation === 'threshold_met',
    'Paid conversion rate (40%) >= target (20%) with n=5 satisfies threshold'
  )

  console.log(`\nMarket Validation Metrics: ${passed} passed, ${failed} failed`)
  if (failed > 0) throw new Error(`${failed} market validation metrics tests failed`)
}
