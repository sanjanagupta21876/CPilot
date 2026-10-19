import { z } from 'zod'

// ─── Use Case A: Evidence Summary Schema ──────────────────────

export const keyFindingItemSchema = z.object({
  point: z.string().min(5),
  direction: z.enum(['supporting', 'challenging', 'neutral']),
  sourceIds: z.array(z.string()).default([]),
})

export const evidenceSummarySchema = z.object({
  summary: z.string().min(10),
  keyFindings: z.array(keyFindingItemSchema).default([]),
  limitations: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  sourcesUsed: z.array(z.string()).default([]),
  isSufficientEvidence: z.boolean().default(true),
})

// ─── Use Case B: Competitor Extraction Schema ─────────────────

export const competitorExtractionSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  offering: z.string().min(2),
  target_audience: z.string().nullable().optional().default(null),
  observed_price: z.number().nullable().optional().default(null),
  price_unit: z.string().nullable().optional().default(null),
  currency: z.string().default('INR'),
  geographic_scope: z.string().nullable().optional().default(null),
  differentiation_claims: z.array(z.string()).default([]),
  supporting_excerpt: z.string().min(5),
  confidence: z.enum(['high', 'medium', 'low', 'unverified']).default('unverified'),
  notes: z.string().nullable().optional().default(null),
})

// ─── Use Case C: Local Connect Filter Proposal Schema ─────────

const validContactCategories = [
  'retailer',
  'distributor',
  'mentor',
  'institution',
  'supplier',
  'pilot-customer',
  'logistics',
  'service-provider',
] as const

export const filterProposalSchema = z.object({
  category: z.enum(validContactCategories).optional(),
  city: z.string().optional(),
  industry: z.string().optional(),
  query: z.string().optional(),
  verification_status: z
    .enum(['all', 'unverified', 'source_checked', 'directly_confirmed'])
    .optional(),
  rationale: z.string().min(5),
  unmatchedCriteria: z.array(z.string()).default([]),
})

// ─── Use Case D: Hypothesis & Experiment Drafter Schema ───────

export const draftHypothesisSchema = z.object({
  statement: z.string().min(10),
  target_audience: z.string().min(3),
  problem_statement: z.string().min(10),
  expected_behavior: z.string().min(10),
  strategic_rationale: z.string().min(10),
  gap_addressed: z.string().min(5),
})

const validExperimentMethods = [
  'interview',
  'survey',
  'retailer-outreach',
  'distributor-outreach',
  'landing-page',
  'pilot',
  'paid-trial',
  'other',
] as const

export const draftExperimentSchema = z.object({
  title: z.string().min(3),
  hypothesis_statement: z.string().min(10),
  method: z.enum(validExperimentMethods),
  sample_size_target: z.number().int().min(1).default(10),
  target_metric: z.string().min(2),
  success_threshold: z.string().min(3),
  threshold_metric: z.string().default('problem_confirmation_rate'),
  threshold_operator: z.enum(['>=', '>', '<=', '<', '=']).default('>='),
  threshold_target: z.number().default(50),
  threshold_unit: z.enum(['%', 'count', 'INR', 'ratio']).default('%'),
  threshold_min_sample: z.number().int().min(1).default(5),
  threshold_rationale: z.string().min(5),
})

export const hypothesisExperimentDraftsSchema = z.object({
  hypotheses: z.array(draftHypothesisSchema).min(1),
  experiments: z.array(draftExperimentSchema).min(1),
  discovery_questions: z.array(z.string()).min(1),
})

// ─── Use Case E: Experiment Findings Summary Schema ───────────

export const experimentFindingsSummarySchema = z.object({
  narrative: z.string().min(10),
  deterministicOutcome: z.enum([
    'threshold_met',
    'threshold_not_met',
    'insufficient_sample',
    'inconclusive',
    'not_evaluated',
  ]),
  thresholdComparisonExplanation: z.string().min(5),
  signalQualityAssessment: z.object({
    commercialSignalsCount: z.number().int().min(0),
    verbalInterestCount: z.number().int().min(0),
    objectionsCount: z.number().int().min(0),
    analysis: z.string().min(5),
  }),
  keyObjections: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  recommendedNextSteps: z.array(z.string()).default([]),
})
