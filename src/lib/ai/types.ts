import type { z } from 'zod'
import type {
  ContactCategory,
  ExperimentMethod,
  ThresholdOperator,
  ThresholdUnit,
  OutcomeInterpretation,
} from '@/types/database'

// ─── Provider Configuration & Errors ──────────────────────────

export type AIErrorCode =
  | 'AI_NOT_CONFIGURED'
  | 'AI_RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'AI_MALFORMED_OUTPUT'
  | 'AI_INVALID_INPUT'
  | 'AI_PROVIDER_ERROR'
  | 'AI_UNAUTHORIZED'

export interface AIResult<T> {
  success: boolean
  data?: T
  error?: AIErrorCode
  message?: string
  isAiAssisted?: boolean
  model?: string
  timestamp?: string
}

export interface GenerateOptions {
  temperature?: number
  maxOutputTokens?: number
  timeoutMs?: number
  userId?: string
}

export interface AIProvider {
  name: string
  isConfigured(): boolean
  generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options?: GenerateOptions
  ): Promise<AIResult<T>>
  generateText(prompt: string, options?: GenerateOptions): Promise<AIResult<string>>
}

// ─── Use Case A: Evidence Summary ─────────────────────────────

export interface EvidenceSourceReference {
  sourceId: string
  title: string
  sourceType: 'market_indicator' | 'fit_score' | 'hypothesis' | 'experiment' | 'intro_request'
  sourceUrl?: string | null
  confidence?: string
  collectedAt?: string | null
  city?: string
}

export interface KeyFindingItem {
  point: string
  direction: 'supporting' | 'challenging' | 'neutral'
  sourceIds: string[]
}

export interface EvidenceSummaryData {
  summary: string
  keyFindings: KeyFindingItem[]
  limitations: string[]
  suggestions: string[]
  sourcesUsed: string[]
  isSufficientEvidence: boolean
}

// ─── Use Case B: Competitor Extraction ────────────────────────

export interface CompetitorExtractionData {
  name: string
  category: string
  offering: string
  target_audience: string | null
  observed_price: number | null
  price_unit: string | null
  currency: string
  geographic_scope: string | null
  differentiation_claims: string[]
  supporting_excerpt: string
  confidence: 'high' | 'medium' | 'low' | 'unverified'
  notes: string | null
}

// ─── Use Case C: Local Connect Filter Proposal ────────────────

export interface LocalConnectFilterProposal {
  category?: ContactCategory
  city?: string
  industry?: string
  query?: string
  verification_status?: 'all' | 'unverified' | 'source_checked' | 'directly_confirmed'
  rationale: string
  unmatchedCriteria: string[]
}

// ─── Use Case D: Hypothesis & Experiment Drafter ──────────────

export interface DraftHypothesis {
  statement: string
  target_audience: string
  problem_statement: string
  expected_behavior: string
  strategic_rationale: string
  gap_addressed: string
}

export interface DraftExperiment {
  title: string
  hypothesis_statement: string
  method: ExperimentMethod
  sample_size_target: number
  target_metric: string
  success_threshold: string
  threshold_metric: string
  threshold_operator: ThresholdOperator
  threshold_target: number
  threshold_unit: ThresholdUnit
  threshold_min_sample: number
  threshold_rationale: string
}

export interface HypothesisExperimentDrafts {
  hypotheses: DraftHypothesis[]
  experiments: DraftExperiment[]
  discovery_questions: string[]
}

// ─── Use Case E: Experiment Findings Summary ──────────────────

export interface ExperimentFindingsSummary {
  narrative: string
  deterministicOutcome: OutcomeInterpretation
  thresholdComparisonExplanation: string
  signalQualityAssessment: {
    commercialSignalsCount: number
    verbalInterestCount: number
    objectionsCount: number
    analysis: string
  }
  keyObjections: string[]
  limitations: string[]
  recommendedNextSteps: string[]
}
