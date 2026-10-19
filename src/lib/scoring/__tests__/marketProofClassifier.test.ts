/**
 * Unit tests for the Market Proof Loop evidence classification engine.
 *
 * Uses the project's custom assert-based test runner (see scripts/run-tests.ts).
 * Tests deterministic classification rules — no mocks, no LLM calls.
 */

import {
  classifyHypothesisEvidence,
  suggestNextAction,
  summariseExperimentEvidence,
  MIN_VALID_RESPONSES_FOR_CONCLUSION,
  SUPPORTED_THRESHOLD_RATE,
  CHALLENGED_THRESHOLD_RATE,
} from '../marketProofClassifier'
import type { Hypothesis, Experiment, ExperimentResponse, IntroductionRequest } from '@/types/database'

// ─── Test fixtures ────────────────────────────────────────────────

const BASE_HYP: Hypothesis = {
  id: 'hyp-test-001',
  user_id: 'user-001',
  startup_id: 'startup-001',
  city: 'Pune',
  statement: 'FPOs will pay ₹450/month for temperature alerts.',
  target_audience: 'FPO Directors',
  problem_statement: 'Post-harvest spoilage due to lack of telemetry.',
  expected_behavior: '50% of surveyed FPOs confirm willingness to pay.',
  status: 'untested',
  comparison_id: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
}

const BASE_EXP: Experiment = {
  id: 'exp-test-001',
  user_id: 'user-001',
  startup_id: 'startup-001',
  hypothesis_id: 'hyp-test-001',
  title: 'FPO Survey',
  hypothesis: 'FPOs will pay',
  method: 'survey',
  city: 'Pune',
  target_audience: 'FPO Directors',
  sample_size_target: 10,
  target_metric: 'problem_confirmation_rate',
  success_threshold: '≥50% (n=5)',
  threshold_metric: 'problem_confirmation_rate',
  threshold_operator: '>=',
  threshold_target: 50,
  threshold_unit: '%',
  threshold_min_sample: 5,
  status: 'complete',
  outcome_interpretation: 'not_evaluated',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
}

function makeResp(
  outcome: 'positive' | 'negative' | 'neutral' | 'inconclusive',
  signal_tier: ExperimentResponse['signal_tier'] = 'reported_interest',
  expId = BASE_EXP.id
): ExperimentResponse {
  return {
    id: `resp-${Math.random().toString(36).slice(2, 9)}`,
    experiment_id: expId,
    user_id: 'user-001',
    respondent_label: 'Test-Respondent',
    response_type: 'survey-submission',
    outcome,
    signal_tier,
    units_count: 1,
    financial_value: null,
    recorded_at: '2026-10-05T00:00:00Z',
  }
}

function makeIntro(status: string): IntroductionRequest {
  return {
    id: `intro-${Math.random().toString(36).slice(2, 9)}`,
    user_id: 'user-001',
    contact_id: 'contact-001',
    message: 'Introduction request',
    status: status as IntroductionRequest['status'],
    match_reason: 'Test match',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  }
}

function nPos(n: number, tier: ExperimentResponse['signal_tier'] = 'reported_interest') {
  return Array(n).fill(null).map(() => makeResp('positive', tier))
}
function nNeg(n: number) {
  return Array(n).fill(null).map(() => makeResp('negative', 'objection'))
}

// ─── Test runner ──────────────────────────────────────────────────

export function runMarketProofClassifierTests() {
  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`)
      passed++
    } else {
      console.error(`  ✗ ${testName}${detail ? `: ${detail}` : ''}`)
      failed++
    }
  }

  console.log('\n📋 Market Proof Classifier Tests\n')

  // ─── Rule 1: No experiments → untested
  {
    const r = classifyHypothesisEvidence(BASE_HYP, [], {}, [])
    assert(r.computedStatus === 'untested', 'Rule 1: No experiments → untested')
    assert(r.totalValidResponses === 0, 'Rule 1: Total valid responses = 0')
    assert(r.sampleSufficient === false, 'Rule 1: Sample not sufficient')
  }

  // ─── Rule 2: All planned, no responses → untested
  {
    const planned = { ...BASE_EXP, status: 'planned' as const }
    const r = classifyHypothesisEvidence(BASE_HYP, [planned], {}, [])
    assert(r.computedStatus === 'untested', 'Rule 2: All planned, no responses → untested')
  }

  // ─── Rule 3: Active experiment, no responses → testing
  {
    const active = { ...BASE_EXP, status: 'active' as const }
    const r = classifyHypothesisEvidence(BASE_HYP, [active], {}, [])
    assert(r.computedStatus === 'testing', 'Rule 3: Active experiment, no responses → testing')
  }

  // ─── Rule 4: Insufficient sample → inconclusive
  {
    const responses = [makeResp('positive', 'reported_interest')] // only 1 response, min=3
    const r = classifyHypothesisEvidence(BASE_HYP, [BASE_EXP], { [BASE_EXP.id]: responses }, [])
    assert(
      r.computedStatus === 'inconclusive',
      `Rule 4: ${responses.length} response(s) below min (${MIN_VALID_RESPONSES_FOR_CONCLUSION}) → inconclusive`
    )
    assert(r.sampleSufficient === false, 'Rule 4: Sample not sufficient')
  }

  // ─── Rule 5: Conflicting results → inconclusive
  {
    // 3 positive, 3 negative — exact 50/50 split → conflicting
    const responses = [...nPos(3, 'qualified_lead'), ...nNeg(3)]
    const r = classifyHypothesisEvidence(BASE_HYP, [BASE_EXP], { [BASE_EXP.id]: responses }, [])
    assert(r.hasConflictingResults === true, 'Rule 5: Equal split → conflicting results detected')
    assert(r.computedStatus === 'inconclusive', 'Rule 5: Conflicting results → inconclusive')
  }

  // ─── Rule 6: Threshold met → supported
  {
    // 6 positive out of 6 = 100% confirmation rate ≥ 50% threshold
    const responses = nPos(6, 'qualified_lead')
    const exp = { ...BASE_EXP, id: 'exp-supp', status: 'complete' as const }
    const r = classifyHypothesisEvidence(BASE_HYP, [exp], { 'exp-supp': responses }, [])
    assert(r.computedStatus === 'supported', 'Rule 6: 100% threshold rate ≥ 60% → supported')
    assert(r.thresholdMetRate !== null && r.thresholdMetRate >= SUPPORTED_THRESHOLD_RATE,
      'Rule 6: ThresholdMetRate ≥ SUPPORTED_THRESHOLD_RATE')
  }

  // ─── Rule 7: Threshold not met → challenged
  {
    // 1 positive out of 6 = 16.7% ≠ ≥50%, threshold NOT met
    const responses = [...nPos(1, 'reported_interest'), ...nNeg(5)]
    const exp = { ...BASE_EXP, id: 'exp-chal', status: 'complete' as const }
    const r = classifyHypothesisEvidence(BASE_HYP, [exp], { 'exp-chal': responses }, [])
    assert(r.computedStatus === 'challenged', 'Rule 7: All responses fail threshold → challenged')
    assert(r.thresholdMetRate !== null && (1 - r.thresholdMetRate) >= CHALLENGED_THRESHOLD_RATE,
      'Rule 7: 1 - ThresholdMetRate ≥ CHALLENGED_THRESHOLD_RATE')
  }

  // ─── Paid order = commercial signal; reported interest ≠
  {
    const responses = [
      makeResp('positive', 'paid_order'),
      makeResp('positive', 'repeat_purchase'),
      makeResp('positive', 'reported_interest'),
      makeResp('positive', 'reported_interest'),
      makeResp('positive', 'qualified_lead'),
    ]
    const exp = { ...BASE_EXP, id: 'exp-comm', status: 'complete' as const }
    const r = classifyHypothesisEvidence(BASE_HYP, [exp], { 'exp-comm': responses }, [])
    assert(r.hasCommercialSignal === true, 'Signal tier: paid_order detected as commercial signal')
  }

  // ─── Missing evidence ≠ negative evidence
  {
    const r = classifyHypothesisEvidence(BASE_HYP, [], {}, [])
    assert(r.computedStatus !== 'challenged',
      'Missing evidence: no experiments → not challenged (untested, not negative)')
  }

  // ─── Accepted intro request ≠ hypothesis supported
  {
    const acceptedIntro = makeIntro('accepted')
    const r = classifyHypothesisEvidence(BASE_HYP, [], {}, [acceptedIntro])
    assert(r.computedStatus === 'untested',
      'Intro request accepted ≠ hypothesis supported: still untested without experiments')
    assert(r.introRequestStatuses.includes('accepted'),
      'Accepted intro request is recorded in classification')
  }

  // ─── Single threshold-met experiment should not override mixed evidence
  {
    const expA = { ...BASE_EXP, id: 'exp-ma', status: 'complete' as const }
    const expB = { ...BASE_EXP, id: 'exp-mb', status: 'complete' as const, threshold_target: 70 }
    // expA: 5 positive / 6 → 83% meets ≥50%; expB: 1 positive / 5 → 20% fails ≥70%
    const r = classifyHypothesisEvidence(
      BASE_HYP,
      [expA, expB],
      {
        'exp-ma': [...nPos(5, 'qualified_lead'), makeResp('negative', 'objection')],
        'exp-mb': [...nPos(1, 'reported_interest'), ...nNeg(4)],
      },
      []
    )
    // 50% threshold met rate — not sufficient for 'supported' (requires ≥60%)
    assert(r.computedStatus !== 'supported',
      'Mixed multi-experiment evidence: not supported when <60% threshold met rate')
  }

  // ─── suggestNextAction: untested
  {
    const s = suggestNextAction('untested', 0, false, false, [], [])
    assert(
      /experiment|field|interview|survey/i.test(s),
      'suggestNextAction: untested → recommends starting an experiment'
    )
  }

  // ─── suggestNextAction: supported without commercial signal
  {
    const s = suggestNextAction('supported', 10, false, false, [], [])
    assert(
      /paid|pilot|commercial/i.test(s),
      'suggestNextAction: supported without commercial signal → recommends paid pilot'
    )
  }

  // ─── suggestNextAction: inconclusive with conflicts
  {
    const s = suggestNextAction('inconclusive', 8, true, false, [], [])
    assert(
      /conflict|follow.?up|targeted/i.test(s),
      'suggestNextAction: conflicting results → recommends follow-up experiment'
    )
  }

  // ─── suggestNextAction: insufficient sample shows minimum
  {
    const s = suggestNextAction('inconclusive', 1, false, false, [], [])
    assert(
      s.includes(String(MIN_VALID_RESPONSES_FOR_CONCLUSION)),
      'suggestNextAction: insufficient sample → shows MIN_VALID_RESPONSES_FOR_CONCLUSION'
    )
  }

  // ─── summariseExperimentEvidence: commercial vs weak signals
  {
    const responses = [
      makeResp('positive', 'paid_order'),
      makeResp('positive', 'repeat_purchase'),
      makeResp('positive', 'reported_interest'),
      makeResp('positive', 'qualified_lead'),
    ]
    const s = summariseExperimentEvidence(BASE_EXP, responses)
    assert(s.strongSignalCount === 2, 'summarise: paid_order + repeat_purchase → strongSignalCount=2')
    assert(s.weakSignalCount === 2, 'summarise: reported_interest + qualified_lead → weakSignalCount=2')
  }

  // ─── summariseExperimentEvidence: insufficient sample detection
  {
    const exp = { ...BASE_EXP, threshold_min_sample: 5 }
    const responses = [makeResp('positive'), makeResp('positive')] // 2 < min 5
    const s = summariseExperimentEvidence(exp, responses)
    assert(s.sampleSufficient === false, 'summarise: 2 responses < min 5 → sampleSufficient=false')
    assert(s.outcomeInterpretation === 'insufficient_sample',
      'summarise: insufficient sample → outcomeInterpretation=insufficient_sample')
  }

  // ─── summariseExperimentEvidence: conflicting results
  {
    const responses = [...nPos(2, 'qualified_lead'), ...nNeg(2)] // 50/50 split, n=4
    const s = summariseExperimentEvidence(BASE_EXP, responses)
    assert(s.conflictingResults === true, 'summarise: 50/50 split n=4 → conflictingResults=true')
  }

  // ─── summariseExperimentEvidence: clear majority not conflicting
  {
    const responses = [...nPos(5, 'qualified_lead'), makeResp('negative', 'objection')] // 83% positive
    const s = summariseExperimentEvidence(BASE_EXP, responses)
    assert(s.conflictingResults === false,
      'summarise: 5:1 majority → not conflicting (clear positive trend)')
  }

  // ─── Summary ──────────────────────────────────────────────────────
  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`)
  if (failed > 0) {
    throw new Error(`${failed} test(s) failed in Market Proof Classifier`)
  }
}
