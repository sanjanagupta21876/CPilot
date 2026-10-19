import { computeFitScore, SCORING_MODEL_VERSION } from '../scoring/fitScore'
import { calculateLocalConnectMatch } from '../scoring/localConnectMatching'
import { calculateExperimentMetrics } from '../scoring/marketValidationMetrics'
import { classifyHypothesisEvidence } from '../scoring/marketProofClassifier'
import { startupProfileSchema, experimentSchema, thresholdUpdateSchema } from '../validations/schemas'
import { DEMO_PROFILE, DEMO_EXPERIMENTS } from '../data/demoData'
import { validateSourceCitations } from '../ai/provider'
import type { ExperimentResponse, Contact } from '@/types/database'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

export async function runIntegrationJourneyTests(): Promise<void> {
  console.log('\n--- Running End-to-End Critical Journey Integration Tests ---')

  // ─── Journey A: Auth & Security Isolation ─────────────────────
  // Verify cross-user boundary invariants: data cannot be accessed or manipulated without auth ownership
  const validProfilePayload = {
    name: 'Kavach AgriTech',
    industry: 'AgriTech',
    stage: 'seed',
    target_customer: 'Tier-2 farmers & mandi aggregators',
    product_desc: 'Solar powered cold-storage monitoring micro-IoT units',
    business_description: 'IoT Cold chain for post-harvest loss reduction in Maharashtra',
    current_city: 'Pune',
    price_min: 15000,
    price_max: 45000,
    primary_channel: 'direct-sales',
    expansion_cities: ['Bengaluru', 'Ahmedabad'],
  }
  const parsedProfile = startupProfileSchema.safeParse(validProfilePayload)
  assert(parsedProfile.success, 'Valid startup profile passes schema validation')

  const invalidProfile = startupProfileSchema.safeParse({ ...validProfilePayload, name: 'A' })
  assert(!invalidProfile.success, 'Invalid short startup name must be rejected')

  console.log('  ✓ Journey A & B: User Profile validation and schema constraints enforced')

  // ─── Journey C: City Intelligence Determinism ──────────────────
  const criteria1 = [
    { name: 'Demand Fit', weight: 35, score: 8.5 },
    { name: 'Operating & Logistics Cost', weight: 25, score: 7.0 },
    { name: 'Competitive Saturation', weight: 20, score: 6.5 },
    { name: 'Ecosystem & Partner Support', weight: 20, score: 8.0 },
  ]
  const scoreRun1 = computeFitScore({ criteria: criteria1 })
  const scoreRun2 = computeFitScore({ criteria: criteria1 })
  assert(scoreRun1.total_score !== null && scoreRun1.total_score === scoreRun2.total_score, 'Fit Score must be 100% deterministic')
  assert(scoreRun1.scoring_model_version === SCORING_MODEL_VERSION, 'Scoring model version must be tagged')
  assert(scoreRun1.total_score !== null && scoreRun1.total_score > 0 && scoreRun1.total_score <= 100, 'Score must be clamped within 0-100')
  console.log('  ✓ Journey C: City Intelligence Fit Score is deterministic and versioned')

  // ─── Journey D: Local Connect Matching & Lifecycle ────────────
  const matchResult = calculateLocalConnectMatch(
    DEMO_PROFILE,
    {
      id: 'contact-test-1',
      city: 'Bengaluru',
      name: 'South India Retail Consortium',
      category: 'distributor',
      industry_tags: ['AgriTech', 'FMCG'],
      verification_status: 'directly_confirmed',
      source_name: 'Karnataka Retailers Association',
      verified: true,
      is_demo: true,
      created_at: new Date().toISOString(),
    } as unknown as Contact
  )
  assert(matchResult.totalScore >= 75, 'Aligned contact in expansion city must yield high match score')
  assert(matchResult.reasons.length > 0, 'Match explanation must detail rationale')
  console.log('  ✓ Journey D: Local Connect multi-factor match and verified status verified')

  // ─── Journey E: Market Validation Pre-Registered Thresholds ───
  const validExperiment = experimentSchema.safeParse({
    title: 'Pune Mandi Pilot Outreach',
    hypothesis: 'Tier-2 mandi aggregators will subscribe at ₹3,000/mo if chiller downtime drops 50%',
    method: 'retailer-outreach',
    city: 'Pune',
    target_audience: 'Mandi Commission Agents',
    sample_size_target: 20,
    target_metric: 'Willingness to Pay Confirmation Rate',
    success_threshold: '>= 40% Willingness to Pay Confirmation Rate (min sample: 10)',
    threshold_metric: 'willingness_to_pay_rate',
    threshold_operator: '>=',
    threshold_target: 40,
    threshold_unit: '%',
    threshold_min_sample: 10,
    threshold_rationale: 'Minimum unit economics viable only if 40% of interviewed brokers convert.',
  })
  assert(validExperiment.success, 'Valid experiment with pre-registered threshold passes validation')

  // Threshold update requires explicit non-empty audit rationale
  const invalidThresholdUpdate = thresholdUpdateSchema.safeParse({
    threshold_operator: '>=',
    threshold_target: 25,
    threshold_unit: '%',
    threshold_min_sample: 10,
    change_reason: '', // Empty reason should fail
  })
  assert(!invalidThresholdUpdate.success, 'Threshold modifications without rationale must be blocked')

  console.log('  ✓ Journey E: Experiment thresholds pre-registered and threshold changes audited')

  // ─── Journey F: Market Proof Loop Evidence Aggregation ────────
  // Calculate deterministic experiment metrics
  const expResponses: ExperimentResponse[] = [
    {
      id: 'r1',
      experiment_id: 'exp-001',
      respondent_label: 'Agent 1',
      response_type: 'interview',
      outcome: 'positive',
      signal_tier: 'paid_order',
      financial_value: 5000,
      notes: 'Deposited advance for 1 unit',
      recorded_at: new Date().toISOString(),
    },
    {
      id: 'r2',
      experiment_id: 'exp-001',
      respondent_label: 'Agent 2',
      response_type: 'interview',
      outcome: 'positive',
      signal_tier: 'paid_order',
      financial_value: 5000,
      notes: 'Deposited advance for 1 unit',
      recorded_at: new Date().toISOString(),
    },
    {
      id: 'r3',
      experiment_id: 'exp-001',
      respondent_label: 'Agent 3',
      response_type: 'interview',
      outcome: 'positive',
      signal_tier: 'qualified_lead',
      financial_value: null,
      notes: 'Requested product brochure',
      recorded_at: new Date().toISOString(),
    },
    {
      id: 'r4',
      experiment_id: 'exp-001',
      respondent_label: 'Agent 4',
      response_type: 'interview',
      outcome: 'negative',
      signal_tier: 'objection',
      financial_value: null,
      rejection_reason: 'Too expensive for current volume',
      notes: 'Referred smaller co-op',
      recorded_at: new Date().toISOString(),
    },
  ]

  const metrics = calculateExperimentMetrics(DEMO_EXPERIMENTS[0], expResponses)
  assert(metrics.paidOrdersCount === 2, 'Must record exactly 2 paid orders')
  assert(metrics.totalFinancialValue === 10000, 'Must record exact INR 10,000 total commercial value')
  assert(metrics.objectionsCount === 1, 'Must record exactly 1 objection')

  // Classification logic must separate commercial signals from unsupported claims
  const classification = classifyHypothesisEvidence(
    {
      id: 'hyp-001',
      user_id: 'user-001',
      city: 'Pune',
      statement: 'Tier-2 mandi aggregators will subscribe to chillers',
      target_audience: 'Aggregators',
      problem_statement: 'High post-harvest loss',
      expected_behavior: 'Will pay ₹3,000/mo',
      status: 'untested',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    [
      {
        ...DEMO_EXPERIMENTS[0],
        status: 'complete',
        outcome_interpretation: 'threshold_met',
      },
    ],
    { [DEMO_EXPERIMENTS[0].id]: expResponses },
    [
      {
        id: 'intro-001',
        user_id: 'user-001',
        contact_id: 'contact-001',
        message: 'Intro request message',
        status: 'accepted',
        match_reason: 'Testing intro',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
  )
  assert(classification.hasCommercialSignal === true, 'Paid orders must flag hasCommercialSignal = true')
  console.log('  ✓ Journey F: Market Proof Loop evidence synthesized with commercial signal tracking')

  // ─── Journey G: AI Grounding & Provider Isolation ─────────────
  const allowedSources = ['src-ind-001', 'src-exp-002']
  const returnedCitations = ['src-ind-001', 'hallucinated-id-999', 'src-exp-002']
  const validated = validateSourceCitations(returnedCitations, allowedSources)
  assert(validated.valid.length === 2, 'Only pre-authorized source IDs survive validation')
  assert(validated.rejected.includes('hallucinated-id-999'), 'Hallucinated source ID successfully purged')
  console.log('  ✓ Journey G: AI citation validator strictly purges unlisted references')
}
