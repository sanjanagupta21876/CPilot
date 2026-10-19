import {
  hypothesisSchema,
  experimentSchema,
  thresholdUpdateSchema,
  experimentResponseSchema,
} from '../schemas'

export function runMarketValidationSchemaTests() {
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

  console.log('\n--- Running Market Validation Schema Validation Tests ---')

  // 1. Hypothesis validation
  const validHyp = {
    statement: 'FPO directors in Pune will pay ₹450/month per storage pod for mobile telemetry.',
    city: 'Pune',
    target_audience: 'FPO Directors',
    problem_statement: 'High post-harvest transit spoilage without cold-chain visibility.',
    expected_behavior: 'Will sign up for paid pilot trial during upcoming harvest.',
    strategic_rationale: 'Validates unit economics in Maharashtra.',
    status: 'untested' as const,
  }
  const hypRes1 = hypothesisSchema.safeParse(validHyp)
  assert(hypRes1.success, 'Valid hypothesis passes schema validation')

  const shortHypStatement = {
    ...validHyp,
    statement: 'Too short',
  }
  const hypRes2 = hypothesisSchema.safeParse(shortHypStatement)
  assert(!hypRes2.success, 'Hypothesis statement < 10 chars fails validation')

  const missingHypCity = {
    ...validHyp,
    city: '',
  }
  const hypRes3 = hypothesisSchema.safeParse(missingHypCity)
  assert(!hypRes3.success, 'Missing city fails hypothesis validation')

  const invalidHypStatus = {
    ...validHyp,
    status: 'invalid_status',
  }
  const hypRes4 = hypothesisSchema.safeParse(invalidHypStatus)
  assert(!hypRes4.success, 'Invalid status enum fails hypothesis validation')

  // 2. Experiment validation
  const validExp = {
    title: 'Pune FPO Willingness-to-Pay Survey',
    hypothesis: 'FPO directors will commit ₹450/month per storage pod for alerts.',
    method: 'survey' as const,
    city: 'Pune',
    sample_size_target: 30,
    target_metric: 'Willingness to pay',
    success_threshold: '>= 50% positive willingness to pay (min sample: 20)',
    threshold_metric: 'problem_confirmation_rate',
    threshold_operator: '>=' as const,
    threshold_target: 50,
    threshold_unit: '%' as const,
    threshold_min_sample: 20,
    status: 'planned' as const,
  }
  const expRes1 = experimentSchema.safeParse(validExp)
  assert(expRes1.success, 'Valid experiment with structured threshold passes validation')

  const invalidExpMethod = {
    ...validExp,
    method: 'telepathy_test',
  }
  const expRes2 = experimentSchema.safeParse(invalidExpMethod)
  assert(!expRes2.success, 'Invalid experiment method fails validation')

  const shortExpTitle = {
    ...validExp,
    title: 'No',
  }
  const expRes3 = experimentSchema.safeParse(shortExpTitle)
  assert(!expRes3.success, 'Experiment title < 3 chars fails validation')

  // 3. Threshold Update validation (anti-goalpost-shifting integrity)
  const validThreshUpdate = {
    experiment_id: 'exp-001',
    previous_threshold: '>= 40% willingness to pay',
    new_threshold: '>= 50% willingness to pay (n=30)',
    change_reason: 'Higher statistical rigor requested by investment board.',
  }
  const thRes1 = thresholdUpdateSchema.safeParse(validThreshUpdate)
  assert(thRes1.success, 'Threshold update with documented change_reason passes validation')

  const missingReasonUpdate = {
    experiment_id: 'exp-001',
    previous_threshold: '>= 40% willingness to pay',
    new_threshold: '>= 50% willingness to pay (n=30)',
    change_reason: '',
  }
  const thRes2 = thresholdUpdateSchema.safeParse(missingReasonUpdate)
  assert(!thRes2.success, 'Threshold update with empty change_reason is blocked (prevents silent goalpost shifts)')

  const shortReasonUpdate = {
    ...validThreshUpdate,
    change_reason: 'test',
  }
  const thRes3 = thresholdUpdateSchema.safeParse(shortReasonUpdate)
  assert(!thRes3.success, 'Threshold update with change_reason < 5 chars fails validation')

  // 4. Experiment Response validation
  const validResp = {
    experiment_id: 'exp-001',
    respondent_label: 'FPO Baramati 01',
    response_type: 'interview' as const,
    outcome: 'positive' as const,
    signal_tier: 'paid_order' as const,
    financial_value: 5400,
    notes: 'Paid upfront for annual pod monitoring.',
  }
  const respRes1 = experimentResponseSchema.safeParse(validResp)
  assert(respRes1.success, 'Valid experiment response with signal tier and financial value passes')

  const missingLabelResp = {
    ...validResp,
    respondent_label: '',
  }
  const respRes2 = experimentResponseSchema.safeParse(missingLabelResp)
  assert(!respRes2.success, 'Empty respondent_label fails validation')

  const negativeFinancialResp = {
    ...validResp,
    financial_value: -500,
  }
  const respRes3 = experimentResponseSchema.safeParse(negativeFinancialResp)
  assert(!respRes3.success, 'Negative financial value fails validation')

  console.log(`\nMarket Validation Schemas: ${passed} passed, ${failed} failed`)
  if (failed > 0) throw new Error(`${failed} market validation schema tests failed`)
}
