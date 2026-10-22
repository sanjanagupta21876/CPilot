/**
 * Prune AI Gateway Integration — Version 1.0.0
 *
 * CITYPILOT — PHASE 3: PRUNE NARRATIVE & SENSITIVITY DECISION AIDS
 *
 * Core principles:
 * 1. Server-only execution — PRUNE_API_KEY is never exposed to the client bundle.
 * 2. Purely explanatory — does not compute ranks, scores, or mutate weights.
 * 3. Graceful fallback — feature flag (NARRATION_ENABLED=false), timeouts (~3s),
 *    missing keys, or gateway errors fall back to deterministic template wording without breaking the UI.
 * 4. Defensive metadata parsing — only displays metadata fields returned by Prune;
 *    never claims savings unless the receipt explicitly reports them.
 * 5. Transparent disclaimer:
 *    "AI-generated wording; scores and ranks are computed deterministically by CityPilot"
 */

import { z } from 'zod'

// ─── Constants & Disclaimers ─────────────────────────────────────

export const PRUNE_DISCLAIMER_AI =
  'AI-generated wording; scores and ranks are computed deterministically by CityPilot'

export const PRUNE_DISCLAIMER_TEMPLATE =
  'Scores and ranks are computed deterministically by CityPilot'

export const DEFAULT_PRUNE_TIMEOUT_MS = 3000 // 3 seconds timeout

// ─── Schemas & Types ─────────────────────────────────────────────

export const scenarioDataSchema = z.object({
  cityLabels: z.array(z.string().min(1)).min(1),
  winnerCity: z.string().min(1),
  runnerUpCity: z.string().optional(),
  scores: z.record(z.string(), z.number()),
  oldRanks: z.record(z.string(), z.number()).optional(),
  newRanks: z.record(z.string(), z.number()).optional(),
  changedFactorWeights: z
    .record(
      z.string(),
      z.object({
        oldWeight: z.number().min(0).max(100),
        newWeight: z.number().min(0).max(100),
      })
    )
    .optional(),
  driverNames: z.array(z.string()).optional(),
  excludedFactors: z.array(z.string()).optional(),
  marginToFlipExplanation: z.string().optional(),
  robustnessPercentage: z.number().optional(),
})

export type ScenarioData = z.infer<typeof scenarioDataSchema>

export interface PruneMetadata {
  cache_hit?: boolean
  cost_usd?: number
  tokens_prompt?: number
  tokens_completion?: number
  receipt_signature?: string
  model_routed?: string
  savings_usd?: number
  latency_ms?: number
  [key: string]: unknown
}

export type FallbackReason =
  | 'flag_disabled'
  | 'missing_key'
  | 'timeout'
  | 'gateway_error'
  | 'malformed_output'
  | 'invalid_input'

export interface PruneExplanationResult {
  text: string
  isAiGenerated: boolean
  disclaimer: string
  pruneMetadata: PruneMetadata | null
  fallbackReason?: FallbackReason
}

// ─── Deterministic Template Generator ────────────────────────────

/**
 * Deterministically constructs a 2–3 sentence factual explanation
 * strictly from already-computed scenario numbers.
 */
export function generateDeterministicExplanation(scenario: ScenarioData): string {
  const {
    winnerCity,
    runnerUpCity,
    scores,
    changedFactorWeights,
    driverNames,
    excludedFactors,
    marginToFlipExplanation,
    robustnessPercentage,
  } = scenario

  const winScore = scores[winnerCity] !== undefined ? scores[winnerCity].toFixed(2) : null
  const runnerScore =
    runnerUpCity && scores[runnerUpCity] !== undefined
      ? scores[runnerUpCity].toFixed(2)
      : null

  const sentences: string[] = []

  // Sentence 1: Recommended city & score ranking
  if (runnerUpCity && runnerScore !== null && winScore !== null) {
    sentences.push(
      `Under the evaluated weighting, ${winnerCity} ranks #1 with an objective Fit Score of ${winScore} / 100, leading ${runnerUpCity} (${runnerScore} / 100).`
    )
  } else if (winScore !== null) {
    sentences.push(
      `Under the evaluated weighting, ${winnerCity} leads as the top expansion recommendation with a Fit Score of ${winScore} / 100.`
    )
  } else {
    sentences.push(
      `Under the evaluated weighting, ${winnerCity} ranks #1 among evaluated candidate cities.`
    )
  }

  // Sentence 2: What-if adjustments, drivers, or sensitivity
  const changedList = changedFactorWeights ? Object.entries(changedFactorWeights) : []
  if (changedList.length > 0) {
    const changesDesc = changedList
      .slice(0, 2)
      .map(([name, { oldWeight, newWeight }]) => `${name} (${oldWeight}% → ${newWeight}%)`)
      .join(', ')
    sentences.push(`Primary sensitivity driver: adjustment to ${changesDesc}.`)
  } else if (driverNames && driverNames.length > 0) {
    sentences.push(
      `Key factors driving this recommendation are ${driverNames.slice(0, 2).join(' and ')}.`
    )
  } else if (marginToFlipExplanation) {
    sentences.push(marginToFlipExplanation)
  }

  // Sentence 3: Robustness summary or data limitations
  if (robustnessPercentage !== undefined) {
    sentences.push(
      `${winnerCity} placed #1 in ${robustnessPercentage.toFixed(1)}% of 1,000 simulated weightings.`
    )
  } else if (excludedFactors && excludedFactors.length > 0) {
    sentences.push(
      `Excluded criteria due to missing verified data: ${excludedFactors.join(', ')}.`
    )
  }

  return sentences.join(' ')
}

// ─── Defensive Metadata Parser ───────────────────────────────────

/**
 * Extracts and sanitizes prune_metadata from Prune gateway responses.
 * Only surfaces fields present in the response; never assumes or fabricates savings.
 */
export function parsePruneMetadataDefensively(raw: unknown): PruneMetadata | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const obj = raw as Record<string, unknown>
  const result: PruneMetadata = {}
  let hasFields = false

  if (typeof obj.cache_hit === 'boolean') {
    result.cache_hit = obj.cache_hit
    hasFields = true
  }

  if (typeof obj.cost_usd === 'number' && Number.isFinite(obj.cost_usd)) {
    result.cost_usd = obj.cost_usd
    hasFields = true
  }

  if (typeof obj.tokens_prompt === 'number' && Number.isFinite(obj.tokens_prompt)) {
    result.tokens_prompt = obj.tokens_prompt
    hasFields = true
  }

  if (typeof obj.tokens_completion === 'number' && Number.isFinite(obj.tokens_completion)) {
    result.tokens_completion = obj.tokens_completion
    hasFields = true
  }

  if (typeof obj.receipt_signature === 'string' && obj.receipt_signature.trim().length > 0) {
    result.receipt_signature = obj.receipt_signature.trim()
    hasFields = true
  }

  if (typeof obj.model_routed === 'string' && obj.model_routed.trim().length > 0) {
    result.model_routed = obj.model_routed.trim()
    hasFields = true
  }

  // Only claim savings if explicitly reported by Prune receipt
  if (
    typeof obj.savings_usd === 'number' &&
    Number.isFinite(obj.savings_usd) &&
    obj.savings_usd > 0
  ) {
    result.savings_usd = obj.savings_usd
    hasFields = true
  }

  if (typeof obj.latency_ms === 'number' && Number.isFinite(obj.latency_ms)) {
    result.latency_ms = obj.latency_ms
    hasFields = true
  }

  return hasFields ? result : null
}

// ─── Mock Injection for Automated Tests ─────────────────────────

type PruneMockHandler = (
  scenario: ScenarioData,
  endpoint: string
) => Promise<{
  status: number
  body: unknown
  delayMs?: number
}>

let mockPruneHandler: PruneMockHandler | null = null

export function setMockPruneHandler(handler: PruneMockHandler | null): void {
  mockPruneHandler = handler
}

export function resetMockPruneHandler(): void {
  mockPruneHandler = null
}

// ─── Core Explain with Prune Implementation ──────────────────────

/**
 * Generates an executive explanation for a what-if scenario.
 *
 * If Prune is enabled (NARRATION_ENABLED=true) and configured, queries the
 * Prune AI Gateway. Otherwise, immediately returns the deterministic template.
 * Never throws; never mutates numeric scores or ranks.
 */
export async function explainWithPrune(
  scenarioInput: unknown,
  timeoutMs: number = DEFAULT_PRUNE_TIMEOUT_MS
): Promise<PruneExplanationResult> {
  // 1. Validate scenario data input (purely numeric & factual; zero account PII)
  const validation = scenarioDataSchema.safeParse(scenarioInput)
  if (!validation.success) {
    return {
      text: 'Unable to generate explanation: scenario data did not conform to schema.',
      isAiGenerated: false,
      disclaimer: PRUNE_DISCLAIMER_TEMPLATE,
      pruneMetadata: null,
      fallbackReason: 'invalid_input',
    }
  }

  const scenario = validation.data
  const deterministicFallback = generateDeterministicExplanation(scenario)

  // 2. Feature flag check (default: false)
  const isNarrationEnabled = process.env.NARRATION_ENABLED === 'true'
  if (!isNarrationEnabled) {
    return {
      text: deterministicFallback,
      isAiGenerated: false,
      disclaimer: PRUNE_DISCLAIMER_TEMPLATE,
      pruneMetadata: null,
      fallbackReason: 'flag_disabled',
    }
  }

  // 3. Key presence check (server-only)
  const apiKey = process.env.PRUNE_API_KEY
  if (!apiKey || apiKey.trim().length === 0 || apiKey.includes('your-prune-api-key')) {
    return {
      text: deterministicFallback,
      isAiGenerated: false,
      disclaimer: PRUNE_DISCLAIMER_TEMPLATE,
      pruneMetadata: null,
      fallbackReason: 'missing_key',
    }
  }

  // 4. Endpoint & configuration setup
  const baseUrl = (process.env.PRUNE_BASE_URL || 'https://api.withprune.com/v1').replace(/\/+$/, '')
  const endpoint = `${baseUrl}/chat/completions`
  const modelName = process.env.PRUNE_MODEL || 'gpt-4o-mini'

  // Construct prompt strictly limiting the LLM to supplied results
  const systemPrompt = `You are a concise decision-support assistant for CityPilot.
Summarize ONLY the supplied scenario results in exactly 2 to 3 sentences.
CRITICAL RULES:
1. Do NOT make new market claims or invent external statistics.
2. Base every statement strictly on the provided scores, ranks, and weight changes.
3. Keep the tone executive, objective, and clear.`

  const userPrompt = `Here is the verified scenario data:
${JSON.stringify(scenario, null, 2)}

Provide a concise 2-3 sentence summary explaining why ${scenario.winnerCity} won and what drove the ranking.`

  // 5. If test mock is active, execute test mock
  if (mockPruneHandler) {
    try {
      const mockResponse = await mockPruneHandler(scenario, endpoint)
      if (mockResponse.delayMs && mockResponse.delayMs > timeoutMs) {
        return {
          text: deterministicFallback,
          isAiGenerated: false,
          disclaimer: PRUNE_DISCLAIMER_TEMPLATE,
          pruneMetadata: null,
          fallbackReason: 'timeout',
        }
      }

      if (mockResponse.status !== 200) {
        return {
          text: deterministicFallback,
          isAiGenerated: false,
          disclaimer: PRUNE_DISCLAIMER_TEMPLATE,
          pruneMetadata: null,
          fallbackReason: 'gateway_error',
        }
      }

      const rawBody = mockResponse.body as {
        choices?: Array<{ message?: { content?: string } }>
        prune_metadata?: unknown
      }

      const content = rawBody.choices?.[0]?.message?.content?.trim()
      if (!content) {
        return {
          text: deterministicFallback,
          isAiGenerated: false,
          disclaimer: PRUNE_DISCLAIMER_TEMPLATE,
          pruneMetadata: null,
          fallbackReason: 'malformed_output',
        }
      }

      return {
        text: content,
        isAiGenerated: true,
        disclaimer: PRUNE_DISCLAIMER_AI,
        pruneMetadata: parsePruneMetadataDefensively(rawBody.prune_metadata),
      }
    } catch {
      return {
        text: deterministicFallback,
        isAiGenerated: false,
        disclaimer: PRUNE_DISCLAIMER_TEMPLATE,
        pruneMetadata: null,
        fallbackReason: 'gateway_error',
      }
    }
  }

  // 6. Live HTTP call with timeout and cancellation
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
        'X-Prune-Feature-Id': 'citypilot-what-if-narration',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 150,
      }),
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!response.ok) {
      // Do not log secret keys or sensitive payloads
      console.warn(`[Prune Gateway] Non-OK response: ${response.status} ${response.statusText}`)
      return {
        text: deterministicFallback,
        isAiGenerated: false,
        disclaimer: PRUNE_DISCLAIMER_TEMPLATE,
        pruneMetadata: null,
        fallbackReason: 'gateway_error',
      }
    }

    const json = await response.json()
    const content = json.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return {
        text: deterministicFallback,
        isAiGenerated: false,
        disclaimer: PRUNE_DISCLAIMER_TEMPLATE,
        pruneMetadata: null,
        fallbackReason: 'malformed_output',
      }
    }

    const pruneMetadata = parsePruneMetadataDefensively(json.prune_metadata)

    return {
      text: content,
      isAiGenerated: true,
      disclaimer: PRUNE_DISCLAIMER_AI,
      pruneMetadata,
    }
  } catch (err: unknown) {
    clearTimeout(timer)

    const isAbort =
      err instanceof Error &&
      (err.name === 'AbortError' || err.message.toLowerCase().includes('aborted'))

    if (isAbort) {
      return {
        text: deterministicFallback,
        isAiGenerated: false,
        disclaimer: PRUNE_DISCLAIMER_TEMPLATE,
        pruneMetadata: null,
        fallbackReason: 'timeout',
      }
    }

    console.warn('[Prune Gateway] Request encountered network error.')
    return {
      text: deterministicFallback,
      isAiGenerated: false,
      disclaimer: PRUNE_DISCLAIMER_TEMPLATE,
      pruneMetadata: null,
      fallbackReason: 'gateway_error',
    }
  }
}
