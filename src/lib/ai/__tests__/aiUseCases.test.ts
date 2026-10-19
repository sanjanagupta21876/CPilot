import {
  summarizeMarketEvidenceAction,
  extractCompetitorInfoAction,
  proposeLocalConnectFiltersAction,
  suggestHypothesesAndExperimentsAction,
  summarizeExperimentFindingsAction,
} from '../actions'
import { setMockAIProvider, resetMockAIProvider } from '../provider'
import type { AIProvider } from '../types'
import type { z } from 'zod'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

export async function runAIUseCasesTests(): Promise<void> {
  console.log('\n--- Running AI 5 Use Cases Suite ---')

  // Setup mock AI provider for testing use cases offline with 0 cost
  const mockAI: AIProvider = {
    name: 'test-mock-provider',
    isConfigured: () => true,
    generateStructured: async <T>(prompt: string, schema: z.ZodType<T>) => {
      // Mock Use Case A: Evidence Summary
      if (prompt.includes('TASK: Synthesize a concise market evidence summary')) {
        const payload = {
          summary: 'Pune presents strong tech talent but high competitive density in quick commerce.',
          keyFindings: [
            {
              point: 'Software engineering median salaries are 18% lower than Bengaluru.',
              direction: 'supporting',
              sourceIds: ['ind-ind-pune-talent', 'fabricated-ghost-id'], // One genuine, one hallucinated
            },
          ],
          limitations: ['Retail footfall indicators are missing for eastern suburbs.'],
          suggestions: ['Conduct 10 in-person retailer interviews in Kothrud.'],
          sourcesUsed: ['ind-ind-pune-talent', 'fabricated-ghost-id'],
          isSufficientEvidence: true,
        }
        return { success: true, data: schema.parse(payload), isAiAssisted: true }
      }

      // Mock Use Case B: Competitor Extraction
      if (prompt.includes('TASK: Extract structured competitor information')) {
        const payload = {
          name: 'ZippyGrocery Pune',
          category: 'Quick Commerce',
          offering: '15-minute grocery delivery from micro-dark stores',
          target_audience: 'Urban dual-income households',
          observed_price: 199,
          price_unit: 'minimum order value',
          currency: 'INR',
          geographic_scope: 'Pune',
          differentiation_claims: ['Electric scooter fleet', 'Zero surge fees'],
          supporting_excerpt: 'ZippyGrocery operates 12 dark stores across Pune offering 15-min deliveries on orders over 199 INR.',
          confidence: 'unverified',
          notes: 'Price unit refers to minimum delivery threshold, not item price.',
        }
        return { success: true, data: schema.parse(payload), isAiAssisted: true }
      }

      // Mock Use Case C: Local Connect Filter Proposal
      if (prompt.includes('TASK: Convert the founder\'s unstructured partner requirement')) {
        const payload = {
          category: 'distributor',
          city: 'Pune',
          industry: 'FMCG',
          query: 'packaged snacks ambient logistics',
          verification_status: 'all',
          rationale: 'The founder needs regional distributor networks with ambient storage for FMCG snacks in Pune.',
          unmatchedCriteria: ['Minimum 45-day inventory credit terms'],
        }
        return { success: true, data: schema.parse(payload), isAiAssisted: true }
      }

      // Mock Use Case D: Suggest Hypotheses and Experiments
      if (prompt.includes('TASK: Suggest 1-2 falsifiable market hypotheses')) {
        const payload = {
          hypotheses: [
            {
              statement: 'Kirana store owners in Pune will stock healthy millet snacks if 21-day consignment credit is provided.',
              target_audience: 'Independent grocery and kirana shop owners',
              problem_statement: 'High upfront working capital risk prevents stocking emerging organic brands.',
              expected_behavior: 'Kirana owners agree to 5-unit trial stock on consignment.',
              strategic_rationale: 'Establishes suburban distribution without prohibitive slotting allowances.',
              gap_addressed: 'Untested retailer distribution channel in Western India.',
            },
          ],
          experiments: [
            {
              title: 'Consignment Snack Placement Test',
              hypothesis_statement: 'Kiranas stock millet snacks with 21-day credit.',
              method: 'retailer-outreach',
              sample_size_target: 15,
              target_metric: 'qualified_lead_rate',
              success_threshold: 'At least 5 of 15 retailers accept trial stock',
              threshold_metric: 'qualified_lead_rate',
              threshold_operator: '>=',
              threshold_target: 33.3,
              threshold_unit: '%',
              threshold_min_sample: 10,
              threshold_rationale: 'Ensures measurable merchant acceptance before manufacturing inventory.',
            },
          ],
          discovery_questions: [
            'How often do your customers ask for gluten-free or millet alternatives?',
            'What payment terms do your primary FMCG distributors currently give you?',
          ],
        }
        return { success: true, data: schema.parse(payload), isAiAssisted: true }
      }

      // Mock Use Case E: Experiment Findings Summary
      if (prompt.includes('TASK: Provide a plain-language summary of the recorded experiment findings')) {
        const payload = {
          narrative: 'The team completed 12 interviews with organic retailers in Pune. Strong verbal validation was observed.',
          deterministicOutcome: 'threshold_met',
          thresholdComparisonExplanation: 'Actual confirmation rate reached 75.0%, surpassing the pre-registered 60.0% threshold.',
          signalQualityAssessment: {
            commercialSignalsCount: 2,
            verbalInterestCount: 7,
            objectionsCount: 3,
            analysis: 'While 7 respondents voiced general enthusiasm, only 2 committed upfront advance purchase deposits.',
          },
          keyObjections: ['Margin requested (35%) exceeds current unit economics.'],
          limitations: ['Observations concentrated solely in Baner and Aundh.'],
          recommendedNextSteps: ['Advance to paid pilot with the 2 converted accounts.'],
        }
        return { success: true, data: schema.parse(payload), isAiAssisted: true }
      }

      throw new Error(`Unexpected prompt: ${prompt.slice(0, 80)}`)
    },
    generateText: async () => ({ success: true, data: 'Mock text' }),
  }

  setMockAIProvider(mockAI)

  // ─── Test Use Case A: Evidence Summary ─────────────────────────
  // A1: Non-existent city with 0 sources returns transparent insufficient evidence
  const emptyRes = await summarizeMarketEvidenceAction({ city: 'NonExistentCity99' })
  assert(emptyRes.success, 'Empty city should succeed with clean limitation report')
  assert(
    emptyRes.data?.summaryData.isSufficientEvidence === false,
    'Zero evidence must report isSufficientEvidence = false'
  )
  assert(
    emptyRes.data?.sourceReferences.length === 0,
    'Zero evidence must have 0 source references'
  )
  console.log('  ✓ Use Case A: Zero evidence safely produces insufficient-data report without model call')

  // A2: Valid city sources with citation integrity
  const puneRes = await summarizeMarketEvidenceAction({ city: 'Pune' })
  assert(puneRes.success, 'Pune evidence summary should succeed')
  assert((puneRes.data?.sourceReferences.length ?? 0) > 0, 'Should load real Pune source references')
  // Verify hallucinated citation 'fabricated-ghost-id' was purged
  assert(
    !puneRes.data?.summaryData.sourcesUsed.includes('fabricated-ghost-id'),
    'Fabricated source citation must be stripped from sourcesUsed'
  )
  const findingSourceIds = puneRes.data?.summaryData.keyFindings.flatMap((f) => f.sourceIds) || []
  assert(
    !findingSourceIds.includes('fabricated-ghost-id'),
    'Fabricated source citation must be stripped from keyFindings'
  )
  console.log('  ✓ Use Case A: Genuine citations retained, hallucinated source citations stripped')

  // ─── Test Use Case B: Competitor Extraction ───────────────────
  // B1: Input too short
  const shortRes = await extractCompetitorInfoAction({ sourceText: 'Too short' })
  assert(!shortRes.success, 'Short text must fail validation')
  assert(shortRes.error === 'AI_INVALID_INPUT', 'Should return AI_INVALID_INPUT')

  // B2: Valid competitor extraction
  const compRes = await extractCompetitorInfoAction({
    sourceText: 'ZippyGrocery operates 12 dark stores across Pune offering 15-min deliveries on orders over 199 INR.',
    city: 'Pune',
  })
  assert(compRes.success, 'Valid competitor extraction should succeed')
  assert(compRes.data?.name === 'ZippyGrocery Pune', 'Extracted name should match')
  assert(compRes.data?.confidence === 'unverified', 'Extracted competitor must be unverified')
  assert(compRes.data?.observed_price === 199, 'Extracted price should match')
  console.log('  ✓ Use Case B: Competitor extracted as unverified draft with explicit excerpt')

  // ─── Test Use Case C: Local Connect Filter Proposal ───────────
  // C1: Input too short
  const shortNoteRes = await proposeLocalConnectFiltersAction({ notes: 'abc' })
  assert(!shortNoteRes.success, 'Short note must fail validation')

  // C2: Valid proposal
  const filterRes = await proposeLocalConnectFiltersAction({
    notes: 'Need FMCG packaged snack distributors in Pune with ambient storage',
    city: 'Pune',
  })
  assert(filterRes.success, 'Filter proposal should succeed')
  assert(filterRes.data?.category === 'distributor', 'Category must be valid ContactCategory')
  assert(filterRes.data?.city === 'Pune', 'City should match context')
  assert(
    (filterRes.data?.unmatchedCriteria.length ?? 0) > 0,
    'Unfilterable criteria must be preserved for founder awareness'
  )
  console.log('  ✓ Use Case C: Requirements converted into typed ContactCategory with unmatched criteria')

  // ─── Test Use Case D: Suggest Hypotheses and Experiments ──────
  const draftRes = await suggestHypothesesAndExperimentsAction({
    city: 'Pune',
    gapType: 'Untested Kirana retail distribution',
  })
  assert(draftRes.success, 'Draft hypothesis suggestion should succeed')
  assert((draftRes.data?.hypotheses.length ?? 0) > 0, 'Should suggest at least one draft hypothesis')
  assert((draftRes.data?.experiments.length ?? 0) > 0, 'Should suggest at least one structured experiment')
  const firstExp = draftRes.data?.experiments[0]
  assert(firstExp?.threshold_target === 33.3, 'Predefined threshold target must be present')
  assert(firstExp?.threshold_operator === '>=', 'Predefined operator must be present')
  assert((draftRes.data?.discovery_questions.length ?? 0) >= 2, 'Should provide field discovery questions')
  console.log('  ✓ Use Case D: Falsifiable hypothesis and pre-registered experiment thresholds generated')

  // ─── Test Use Case E: Experiment Findings Summary ─────────────
  // E1: Invalid/unauthorized experiment ID
  const invalidExpRes = await summarizeExperimentFindingsAction({
    experimentId: 'non-existent-experiment-id-999',
  })
  assert(!invalidExpRes.success, 'Non-existent experiment ID must fail')
  assert(invalidExpRes.error === 'AI_UNAUTHORIZED', 'Must return AI_UNAUTHORIZED')

  // E2: Valid demo experiment ID
  const expRes = await summarizeExperimentFindingsAction({
    experimentId: 'exp-001',
  })
  assert(expRes.success, 'Valid experiment findings summary should succeed')
  assert(
    expRes.data?.deterministicOutcome === 'threshold_met',
    'Model output must preserve authoritative deterministic outcome'
  )
  assert(
    expRes.data?.signalQualityAssessment.commercialSignalsCount === 2,
    'Should accurately reflect commercial signals count'
  )
  assert(
    expRes.data?.signalQualityAssessment.verbalInterestCount === 7,
    'Should accurately reflect verbal interest count'
  )
  console.log('  ✓ Use Case E: Preserves authoritative deterministic outcome and separates commercial vs verbal signals')

  resetMockAIProvider()
  console.log('AI 5 Use Cases Suite: 9 passed, 0 failed.')
}
