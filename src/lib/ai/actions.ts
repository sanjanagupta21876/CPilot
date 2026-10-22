'use server'

import { createClient } from '@/lib/supabase/server'
import {
  getAIProvider,
  wrapUntrustedData,
  SYSTEM_SECURITY_PREAMBLE,
  validateSourceCitations,
  MAX_INPUT_CHARS,
} from './provider'
import {
  evidenceSummarySchema,
  competitorExtractionSchema,
  filterProposalSchema,
  hypothesisExperimentDraftsSchema,
  experimentFindingsSummarySchema,
} from './schemas'
import type {
  AIResult,
  EvidenceSummaryData,
  EvidenceSourceReference,
  CompetitorExtractionData,
  LocalConnectFilterProposal,
  HypothesisExperimentDrafts,
  ExperimentFindingsSummary,
} from './types'
import { calculateExperimentMetrics } from '@/lib/scoring/marketValidationMetrics'
import {
  DEMO_HYPOTHESES,
  DEMO_EXPERIMENTS,
  DEMO_EXPERIMENT_RESPONSES,
  DEMO_PROFILE,
} from '@/lib/data/demoData'
import type {
  MarketIndicator,
  Hypothesis,
  Experiment,
  ExperimentResponse,
  StartupProfile,
} from '@/types/database'

const FALLBACK_DEMO_INDICATORS: MarketIndicator[] = [
  {
    id: 'demo-ind-001',
    comparison_id: 'comp-001',
    city: 'Pune',
    indicator: 'Commercial Office / Warehouse Rent',
    value: '₹45/sq.ft/month',
    unit: 'INR/sq.ft',
    source_name: 'Maharashtra Industrial Development Corp (MIDC)',
    source_url: 'https://midcindia.org',
    confidence: 'high',
    notes: 'Average for Chakan & Bhosari logistics belts.',
    collected_at: '2026-09-01T00:00:00Z',
    created_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'demo-ind-002',
    comparison_id: 'comp-001',
    city: 'Pune',
    indicator: 'Cold Storage Mandi Capacity',
    value: '42,000 MT',
    unit: 'MT',
    source_name: 'National Horticulture Board',
    source_url: 'https://nhb.gov.in',
    confidence: 'high',
    notes: 'Capacity across Pune district APMC yards.',
    collected_at: '2026-09-01T00:00:00Z',
    created_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'demo-ind-003',
    comparison_id: 'comp-001',
    city: 'Bengaluru',
    indicator: 'AgriTech Capital Density',
    value: '₹340 Cr invested in FY25',
    unit: 'INR Cr',
    source_name: 'Tracxn India AgriTech Report',
    source_url: 'https://tracxn.com',
    confidence: 'medium',
    notes: 'High concentration of seed and Series A funds.',
    collected_at: '2026-09-01T00:00:00Z',
    created_at: '2026-09-01T00:00:00Z',
  },
]

// ─────────────────────────────────────────────────────────────
// USE CASE A: SUMMARIZE SUPPLIED MARKET EVIDENCE
// ─────────────────────────────────────────────────────────────

export interface SummarizeEvidenceParams {
  city: string
  comparisonId?: string
}

export interface SummarizeEvidenceResult {
  summaryData: EvidenceSummaryData
  sourceReferences: EvidenceSourceReference[]
}

export async function summarizeMarketEvidenceAction(
  params: SummarizeEvidenceParams
): Promise<AIResult<SummarizeEvidenceResult>> {
  try {
    const provider = getAIProvider()
    if (!provider.isConfigured()) {
      return {
        success: false,
        error: 'AI_NOT_CONFIGURED',
        message: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.',
        isAiAssisted: false,
      }
    }

    let user = null
    let indicators: MarketIndicator[] = []
    let hypotheses: Hypothesis[] = []

    try {
      const supabase = await createClient()
      const authRes = await supabase.auth.getUser()
      user = authRes.data?.user || null

      if (user) {
        // Fetch indicators for city (user-scoped through city_comparisons)
        const { data: indData } = await supabase
          .from('market_indicators')
          .select('*')
          .eq('city', params.city)

        if (indData && indData.length > 0) {
          indicators = indData as MarketIndicator[]
        }

        // Fetch hypotheses for city
        const { data: hypData } = await supabase
          .from('hypotheses')
          .select('*')
          .eq('user_id', user.id)
          .eq('city', params.city)

        if (hypData && hypData.length > 0) {
          hypotheses = hypData as Hypothesis[]
        }
      }
    } catch {
      // Offline, test environment, or unconfigured Supabase session
    }

    if (!user) {
      // Demo fallback
      indicators = FALLBACK_DEMO_INDICATORS.filter(
        (i) => i.city.toLowerCase() === params.city.toLowerCase()
      )
      hypotheses = DEMO_HYPOTHESES.filter(
        (h) => h.city.toLowerCase() === params.city.toLowerCase()
      )
    }

    // Build allowed sources catalog
    const allowedSourceIds: string[] = []
    const sourceReferences: EvidenceSourceReference[] = []
    const sourceDetailsText: string[] = []

    for (const ind of indicators) {
      const sourceId = `ind-${ind.id}`
      allowedSourceIds.push(sourceId)
      sourceReferences.push({
        sourceId,
        title: `${ind.indicator}: ${ind.value}${ind.unit ? ' ' + ind.unit : ''}`,
        sourceType: 'market_indicator',
        sourceUrl: ind.source_url,
        confidence: ind.confidence,
        collectedAt: ind.collected_at,
        city: ind.city,
      })
      sourceDetailsText.push(
        `[Source ID: ${sourceId}] Indicator: ${ind.indicator} | Value: ${ind.value} ${ind.unit || ''} | Source: ${ind.source_name} | Confidence: ${ind.confidence} | Notes: ${ind.notes || 'None'}`
      )
    }

    for (const hyp of hypotheses) {
      const sourceId = `hyp-${hyp.id}`
      allowedSourceIds.push(sourceId)
      sourceReferences.push({
        sourceId,
        title: `Hypothesis: ${hyp.statement.slice(0, 60)}...`,
        sourceType: 'hypothesis',
        confidence: hyp.status,
        city: hyp.city,
      })
      sourceDetailsText.push(
        `[Source ID: ${sourceId}] Hypothesis: "${hyp.statement}" | Status: ${hyp.status} | Target Audience: ${hyp.target_audience} | Problem: ${hyp.problem_statement}`
      )
    }

    // If insufficient evidence, return transparent limitation without calling model
    if (allowedSourceIds.length === 0) {
      return {
        success: true,
        data: {
          summaryData: {
            summary: `No recorded market indicators or hypotheses exist for ${params.city} yet. Real-world field evidence has not been collected.`,
            keyFindings: [],
            limitations: [`No market indicators recorded for ${params.city}.`, 'No field hypotheses documented.'],
            suggestions: [
              `Create a City Intelligence comparison including ${params.city} to collect baseline indicators.`,
              `Document your initial market hypothesis in Market Validation.`,
            ],
            sourcesUsed: [],
            isSufficientEvidence: false,
          },
          sourceReferences: [],
        },
        isAiAssisted: false,
      }
    }

    const prompt = `${SYSTEM_SECURITY_PREAMBLE}

TASK: Synthesize a concise market evidence summary for ${params.city} based ONLY on the supplied source records.
Do not invent any statistics, citations, or facts. Every key finding MUST cite one or more valid Source IDs from the Allowed Source IDs list below.

ALLOWED SOURCE IDS:
${allowedSourceIds.map((id) => `- ${id}`).join('\n')}

${wrapUntrustedData('Supplied Evidence', sourceDetailsText.join('\n\n'))}

Respond with a JSON object adhering to this schema:
{
  "summary": "2-3 sentences summarizing the state of evidence for ${params.city}",
  "keyFindings": [
    {
      "point": "Specific fact directly supported by source",
      "direction": "supporting" | "challenging" | "neutral",
      "sourceIds": ["valid_source_id_here"]
    }
  ],
  "limitations": ["Notable gaps in data, missing criteria, or small sample"],
  "suggestions": ["Practical next step framed as an actionable recommendation, not a guaranteed outcome"],
  "sourcesUsed": ["list of sourceIds cited"],
  "isSufficientEvidence": true
}`

    const result = await provider.generateStructured(prompt, evidenceSummarySchema, {
      userId: user?.id || 'demo-user',
    })

    if (!result.success || !result.data) {
      return result as unknown as AIResult<SummarizeEvidenceResult>
    }

    // Validate that citations map strictly to pre-authorized source IDs
    const validation = validateSourceCitations(result.data.sourcesUsed, allowedSourceIds)
    const sanitizedSourcesUsed = validation.valid

    const sanitizedKeyFindings = result.data.keyFindings.map((kf) => ({
      ...kf,
      sourceIds: kf.sourceIds.filter((id) => allowedSourceIds.includes(id)),
    }))

    return {
      success: true,
      data: {
        summaryData: {
          ...result.data,
          sourcesUsed: sanitizedSourcesUsed,
          keyFindings: sanitizedKeyFindings,
        },
        sourceReferences,
      },
      isAiAssisted: true,
      model: result.model,
      timestamp: result.timestamp,
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: 'AI_PROVIDER_ERROR',
      message: err instanceof Error ? err.message : 'Failed to generate market evidence summary.',
      isAiAssisted: false,
    }
  }
}

// ─────────────────────────────────────────────────────────────
// USE CASE B: EXTRACT COMPETITOR INFORMATION FROM SOURCES
// ─────────────────────────────────────────────────────────────

export interface ExtractCompetitorParams {
  sourceText: string
  city?: string
  sourceUrl?: string
}

export async function extractCompetitorInfoAction(
  params: ExtractCompetitorParams
): Promise<AIResult<CompetitorExtractionData>> {
  try {
    const provider = getAIProvider()
    if (!provider.isConfigured()) {
      return {
        success: false,
        error: 'AI_NOT_CONFIGURED',
        message: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.',
        isAiAssisted: false,
      }
    }

    const trimmed = (params.sourceText || '').trim()
    if (trimmed.length < 10) {
      return {
        success: false,
        error: 'AI_INVALID_INPUT',
        message: 'Please provide at least 10 characters of source text to extract competitor information.',
        isAiAssisted: false,
      }
    }

    if (trimmed.length > MAX_INPUT_CHARS) {
      return {
        success: false,
        error: 'AI_INVALID_INPUT',
        message: `Input text exceeds the maximum limit of ${MAX_INPUT_CHARS} characters.`,
        isAiAssisted: false,
      }
    }

    const prompt = `${SYSTEM_SECURITY_PREAMBLE}

TASK: Extract structured competitor information from the supplied source text.
RULES:
1. Extract ONLY facts explicitly stated in the source text.
2. If a field (e.g. price, target audience, geographic scope) is not mentioned in the source, set it to null. NEVER invent a price or competitor.
3. Treat all extracted fields as unverified. Include a short supporting excerpt from the text justifying the extraction.

${wrapUntrustedData('Competitor Source Text', trimmed)}

Respond with a JSON object adhering to this schema:
{
  "name": "Competitor company name",
  "category": "e.g. Quick Commerce, Wholesale B2B, SaaS, Logistics",
  "offering": "1-2 sentence description of what they sell",
  "target_audience": "stated customer segment or null",
  "observed_price": number or null,
  "price_unit": "e.g. per month, per kg, per order, or null",
  "currency": "INR",
  "geographic_scope": "${params.city || 'target city'} or stated region, or null",
  "differentiation_claims": ["claim 1", "claim 2"],
  "supporting_excerpt": "Exact sentence or snippet from source text",
  "confidence": "unverified",
  "notes": "Any caveats, limitations, or missing information"
}`

    const result = await provider.generateStructured(prompt, competitorExtractionSchema)
    return result
  } catch (err: unknown) {
    return {
      success: false,
      error: 'AI_PROVIDER_ERROR',
      message: err instanceof Error ? err.message : 'Failed to extract competitor information.',
      isAiAssisted: false,
    }
  }
}

// ─────────────────────────────────────────────────────────────
// USE CASE C: TURN FOUNDER NOTES INTO LOCAL CONNECT FILTERS
// ─────────────────────────────────────────────────────────────

export interface ProposeFiltersParams {
  notes: string
  city?: string
}

export async function proposeLocalConnectFiltersAction(
  params: ProposeFiltersParams
): Promise<AIResult<LocalConnectFilterProposal>> {
  try {
    const provider = getAIProvider()
    if (!provider.isConfigured()) {
      return {
        success: false,
        error: 'AI_NOT_CONFIGURED',
        message: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.',
        isAiAssisted: false,
      }
    }

    const trimmed = (params.notes || '').trim()
    if (trimmed.length < 5) {
      return {
        success: false,
        error: 'AI_INVALID_INPUT',
        message: 'Please describe the type of partner or business you are looking for (at least 5 characters).',
        isAiAssisted: false,
      }
    }

    const validCategories = [
      'retailer',
      'distributor',
      'mentor',
      'institution',
      'supplier',
      'pilot-customer',
      'logistics',
      'service-provider',
    ]

    const prompt = `${SYSTEM_SECURITY_PREAMBLE}

TASK: Convert the founder's unstructured partner requirement into a typed, constrained Local Connect search filter.
RULES:
1. If the requirement aligns with one of our valid categories, set "category" to EXACTLY one of: ${validCategories.join(', ')}. Otherwise omit category.
2. If a specific city is mentioned in notes or context, extract it. (Context city: ${params.city || 'None'}).
3. Suggest a concise search "query" keyword or "industry" tag (e.g. "FMCG", "Cold Storage", "Fintech").
4. List any parts of the requirement that cannot be filtered by our database under "unmatchedCriteria".
5. Do NOT invent partners, names, phone numbers, or fake contacts.

${wrapUntrustedData('Founder Notes', trimmed)}

Respond with a JSON object adhering to this schema:
{
  "category": "valid category from list above or omit",
  "city": "extracted city name or omit",
  "industry": "short industry tag or omit",
  "query": "primary keyword string",
  "verification_status": "all",
  "rationale": "1-2 sentences explaining why these filters were suggested",
  "unmatchedCriteria": ["any specific requirement not capturable by the 4 standard filters"]
}`

    const result = await provider.generateStructured(prompt, filterProposalSchema)
    return result
  } catch (err: unknown) {
    return {
      success: false,
      error: 'AI_PROVIDER_ERROR',
      message: err instanceof Error ? err.message : 'Failed to propose Local Connect filters.',
      isAiAssisted: false,
    }
  }
}

// ─────────────────────────────────────────────────────────────
// USE CASE D: SUGGEST HYPOTHESES AND EXPERIMENTS
// ─────────────────────────────────────────────────────────────

export interface SuggestHypothesesParams {
  city: string
  startupId?: string
  gapType?: string
}

export async function suggestHypothesesAndExperimentsAction(
  params: SuggestHypothesesParams
): Promise<AIResult<HypothesisExperimentDrafts>> {
  try {
    const provider = getAIProvider()
    if (!provider.isConfigured()) {
      return {
        success: false,
        error: 'AI_NOT_CONFIGURED',
        message: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.',
        isAiAssisted: false,
      }
    }

    let user = null
    let profile: StartupProfile | null = null

    try {
      const supabase = await createClient()
      const authRes = await supabase.auth.getUser()
      user = authRes.data?.user || null

      if (user) {
        const { data } = await supabase
          .from('startup_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        if (data) profile = data as StartupProfile
      }
    } catch {
      // Offline or test environment
    }

    if (!user || !profile) {
      profile = DEMO_PROFILE
    }

    const startupContext = profile
      ? `Startup: ${profile.name} | Industry: ${profile.industry} | Stage: ${profile.stage} | Target Customer: ${profile.target_customer} | Product: ${profile.product_desc}`
      : 'General early-stage tech startup expanding into Indian tier-1/tier-2 hubs.'

    const prompt = `${SYSTEM_SECURITY_PREAMBLE}

TASK: Suggest 1-2 falsifiable market hypotheses and 1-2 small, structured field validation experiments for expanding to ${params.city}.
RULES:
1. Hypotheses must be specific, testable, and falsifiable propositions about customer behavior, distribution friction, or willingness-to-pay.
2. Predefine success thresholds IN ADVANCE. Use standard metric names like "problem_confirmation_rate", "paid_conversion_rate", or "qualified_lead_rate".
3. Use only valid experiment methods: 'interview', 'survey', 'retailer-outreach', 'distributor-outreach', 'landing-page', 'pilot', 'paid-trial'.
4. Do NOT mark anything as verified or confirmed. These are editable drafts for founder review.

${wrapUntrustedData('Startup Profile', startupContext)}
Target City: ${params.city}
Focus Gap: ${params.gapType || 'General initial city expansion demand validation'}

Respond with a JSON object adhering to this schema:
{
  "hypotheses": [
    {
      "statement": "Clear, falsifiable belief (at least 10 chars)",
      "target_audience": "Specific customer segment",
      "problem_statement": "Pain point or friction experienced",
      "expected_behavior": "Observable action proving demand",
      "strategic_rationale": "Why this belief matters to city expansion",
      "gap_addressed": "Which unknown or risk this tests"
    }
  ],
  "experiments": [
    {
      "title": "Short experiment title",
      "hypothesis_statement": "The hypothesis being tested",
      "method": "interview" | "survey" | "retailer-outreach" | "distributor-outreach" | "landing-page" | "pilot" | "paid-trial",
      "sample_size_target": 10,
      "target_metric": "problem_confirmation_rate",
      "success_threshold": "At least 60% confirm acute weekly problem",
      "threshold_metric": "problem_confirmation_rate",
      "threshold_operator": ">=",
      "threshold_target": 60,
      "threshold_unit": "%",
      "threshold_min_sample": 5,
      "threshold_rationale": "Prevents false confidence on low sample"
    }
  ],
  "discovery_questions": [
    "Open-ended interview question 1",
    "Open-ended interview question 2",
    "Open-ended interview question 3"
  ]
}`

    const result = await provider.generateStructured(prompt, hypothesisExperimentDraftsSchema, {
      userId: user?.id || 'demo-user',
    })

    return result
  } catch (err: unknown) {
    return {
      success: false,
      error: 'AI_PROVIDER_ERROR',
      message: err instanceof Error ? err.message : 'Failed to suggest hypotheses and experiments.',
      isAiAssisted: false,
    }
  }
}

// ─────────────────────────────────────────────────────────────
// USE CASE E: SUMMARIZE RECORDED EXPERIMENT FINDINGS
// ─────────────────────────────────────────────────────────────

export interface SummarizeExperimentParams {
  experimentId: string
}

export async function summarizeExperimentFindingsAction(
  params: SummarizeExperimentParams
): Promise<AIResult<ExperimentFindingsSummary>> {
  try {
    const provider = getAIProvider()
    if (!provider.isConfigured()) {
      return {
        success: false,
        error: 'AI_NOT_CONFIGURED',
        message: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.',
        isAiAssisted: false,
      }
    }

    let user = null
    let experiment: Experiment | null = null
    let responses: ExperimentResponse[] = []

    try {
      const supabase = await createClient()
      const authRes = await supabase.auth.getUser()
      user = authRes.data?.user || null

      if (user) {
        // Cross-user authorization check: user_id = auth.uid()
        const { data: expData, error: expError } = await supabase
          .from('experiments')
          .select('*')
          .eq('id', params.experimentId)
          .eq('user_id', user.id)
          .single()

        if (expError || !expData) {
          return {
            success: false,
            error: 'AI_UNAUTHORIZED',
            message: 'Experiment not found or access denied.',
            isAiAssisted: false,
          }
        }

        experiment = expData as Experiment

        const { data: respData } = await supabase
          .from('experiment_responses')
          .select('*')
          .eq('experiment_id', params.experimentId)

        responses = (respData || []) as ExperimentResponse[]
      }
    } catch {
      // Offline or test environment
    }

    if (!user) {
      // Demo fallback
      const found = DEMO_EXPERIMENTS.find((e) => e.id === params.experimentId)
      if (!found) {
        return {
          success: false,
          error: 'AI_UNAUTHORIZED',
          message: 'Experiment not found in demo records.',
          isAiAssisted: false,
        }
      }
      experiment = found
      responses = DEMO_EXPERIMENT_RESPONSES.filter((r) => r.experiment_id === params.experimentId)
    }

    if (!experiment) {
      return {
        success: false,
        error: 'AI_UNAUTHORIZED',
        message: 'Experiment record not accessible or found.',
        isAiAssisted: false,
      }
    }

    // Compute authoritative deterministic metrics
    const metrics = calculateExperimentMetrics(experiment, responses)

    // Format observations summary for the model
    const observationsText = responses.map((r, i) => {
      const parts = [
        `Observation #${i + 1}: [Label: ${r.respondent_label}]`,
        `Type: ${r.response_type}`,
        `Outcome: ${r.outcome}`,
        `Signal Tier: ${r.signal_tier || 'reported_interest'}`,
      ]
      if (r.financial_value) parts.push(`Value: INR ${r.financial_value}`)
      if (r.rejection_reason) parts.push(`Rejection: "${r.rejection_reason}"`)
      if (r.notes) parts.push(`Notes: "${r.notes}"`)
      return parts.join(' | ')
    })

    const deterministicSummary = `DETERMINISTIC APPLICATION METRICS:
- Sample Target: ${metrics.sampleTarget}
- Total Recorded Observations: ${metrics.totalRecorded}
- Valid Responses (n): ${metrics.validResponses}
- Predefined Threshold Target: ${experiment.success_threshold} (${experiment.threshold_operator || '>='} ${experiment.threshold_target || 50}${experiment.threshold_unit || '%'})
- Minimum Sample Required: ${experiment.threshold_min_sample || 5}
- Sample Size Sufficient: ${metrics.sampleSufficient ? 'YES' : 'NO'}
- AUTHORITATIVE OUTCOME INTERPRETATION: ${metrics.outcomeInterpretation}
- Commercial Signals (Paid Orders + Repeat Purchases): ${metrics.paidOrdersCount + metrics.repeatPurchasesCount}
- Verbal Interest Only: ${metrics.reportedInterestCount}
- Objections / Rejections: ${metrics.objectionsCount}`

    const prompt = `${SYSTEM_SECURITY_PREAMBLE}

TASK: Provide a plain-language summary of the recorded experiment findings.
CRITICAL CONSTRAINT: The application has deterministically computed the outcome as "${metrics.outcomeInterpretation}".
You MUST NOT recalculate, alter, or contradict this outcome. Your role is only to explain what the evidence shows in clear language.

EXPERIMENT DETAILS:
Title: ${experiment.title}
Method: ${experiment.method}
City: ${experiment.city}
Hypothesis: ${experiment.hypothesis}

${deterministicSummary}

${wrapUntrustedData('Recorded Observations', observationsText.join('\n'))}

Respond with a JSON object adhering to this schema:
{
  "narrative": "2-3 paragraphs describing what was tested, who was reached, and what happened",
  "deterministicOutcome": "${metrics.outcomeInterpretation}",
  "thresholdComparisonExplanation": "Clear explanation of how actual numbers compare to original threshold",
  "signalQualityAssessment": {
    "commercialSignalsCount": ${metrics.paidOrdersCount + metrics.repeatPurchasesCount},
    "verbalInterestCount": ${metrics.reportedInterestCount},
    "objectionsCount": ${metrics.objectionsCount},
    "analysis": "Analysis distinguishing strong commercial actions from polite verbal encouragement"
  },
  "keyObjections": ["Documented friction points or reasons for rejection"],
  "limitations": ["Sample size limitations, geographical scope limits, or unverified claims"],
  "recommendedNextSteps": ["1-2 concrete follow-up experiments or adjustments"]
}`

    const result = await provider.generateStructured(prompt, experimentFindingsSummarySchema, {
      userId: user?.id || 'demo-user',
    })

    return result
  } catch (err: unknown) {
    return {
      success: false,
      error: 'AI_PROVIDER_ERROR',
      message: err instanceof Error ? err.message : 'Failed to summarize experiment findings.',
      isAiAssisted: false,
    }
  }
}

// ─────────────────────────────────────────────────────────────
// USE CASE F: EXPLAIN WITH PRUNE (PHASE 3 WHAT-IF NARRATION)
// ─────────────────────────────────────────────────────────────

import {
  explainWithPrune,
  type ScenarioData,
  type PruneExplanationResult,
} from './prune'

export async function explainWithPruneAction(
  scenario: ScenarioData
): Promise<AIResult<PruneExplanationResult>> {
  try {
    const result = await explainWithPrune(scenario)
    return {
      success: true,
      data: result,
      isAiAssisted: result.isAiGenerated,
      model: result.isAiGenerated ? (process.env.PRUNE_MODEL || 'gpt-4o-mini') : 'deterministic-template',
      timestamp: new Date().toISOString(),
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: 'AI_PROVIDER_ERROR',
      message: err instanceof Error ? err.message : 'Failed to generate scenario explanation.',
      isAiAssisted: false,
    }
  }
}
