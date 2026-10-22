import { z } from 'zod'

// ─── Startup Profile ──────────────────────────────────────────
export const startupProfileSchema = z
  .object({
    name: z.string().min(2, 'Startup name must be at least 2 characters').max(100),
    business_description: z
      .string()
      .min(10, 'Business description must be at least 10 characters')
      .max(500),
    industry: z.string().min(2, 'Industry is required').max(100),
    stage: z.enum(['idea', 'pre-seed', 'seed', 'series-a']),
    product_desc: z
      .string()
      .min(10, 'Describe your product (at least 10 characters)')
      .max(2000),
    target_customer: z
      .string()
      .min(5, 'Describe your target customer (at least 5 characters)')
      .max(500),
    current_city: z.string().min(1, 'Current operating city is required').max(100),
    price_min: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
        z.number().min(0, 'Price must be non-negative').optional()
      ),
    price_max: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
        z.number().min(0, 'Price must be non-negative').optional()
      ),
    primary_channel: z.string().min(2, 'Primary distribution channel is required').max(100),
    website_url: z
      .string()
      .url('Must be a valid URL (e.g. https://yourstartup.com)')
      .optional()
      .or(z.literal('')),
    product_category: z.string().max(100).optional().or(z.literal('')),
    target_geography: z.string().max(200).optional().or(z.literal('')),
    expansion_cities: z.array(z.string()).default([]),
    traction_summary: z.string().max(500).optional().or(z.literal('')),
    expansion_context: z.string().max(1000).optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.price_min !== undefined && data.price_max !== undefined) {
        return data.price_min <= data.price_max
      }
      return true
    },
    {
      message: 'Minimum price cannot exceed maximum price',
      path: ['price_min'],
    }
  )

export type StartupProfileInput = z.infer<typeof startupProfileSchema>

// ─── City Comparison ─────────────────────────────────────────
export const cityComparisonSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  cities: z
    .array(z.string().min(1))
    .min(2, 'Select at least 2 cities')
    .max(5, 'Maximum 5 cities per comparison'),
})
export type CityComparisonInput = z.infer<typeof cityComparisonSchema>

// ─── Market Indicator ────────────────────────────────────────
export const marketIndicatorSchema = z.object({
  city: z.string().min(1, 'City is required'),
  indicator: z.string().min(2, 'Indicator name required').max(100),
  value: z.string().min(1, 'Value is required').max(200),
  unit: z.string().max(50).optional(),
  source_name: z.string().min(2, 'Source name required').max(200),
  source_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  collected_at: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low', 'unverified']),
  notes: z.string().max(1000).optional(),
})
export type MarketIndicatorInput = z.infer<typeof marketIndicatorSchema>

// ─── Introduction Request ────────────────────────────────────
export const introductionRequestSchema = z
  .object({
    contact_id: z.string().uuid('Invalid contact ID'),
    startup_id: z.string().uuid('Invalid startup ID').optional().nullable(),
    purpose: z.string().min(3, 'Purpose must be at least 3 characters').max(200).optional(),
    business_context: z
      .string()
      .min(10, 'Business context must be at least 10 characters')
      .max(1000)
      .optional(),
    desired_outcome: z
      .string()
      .min(5, 'Desired outcome must be at least 5 characters')
      .max(500)
      .optional(),
    message: z.string().max(2000).optional(),
    match_reason: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // Accepts either Phase 6 structured fields (purpose + business_context + desired_outcome) or legacy message
      const hasStructured = Boolean(data.purpose && data.business_context && data.desired_outcome)
      const hasLegacyMessage = Boolean(data.message && data.message.length >= 20)
      return hasStructured || hasLegacyMessage
    },
    {
      message:
        'Please provide introduction purpose, business context, and desired outcome, or a message of at least 20 characters.',
      path: ['business_context'],
    }
  )

export type IntroductionRequestInput = z.infer<typeof introductionRequestSchema>

// ─── Local Connect Discovery Filter ──────────────────────────
export const localConnectFilterSchema = z.object({
  query: z.string().max(100).optional(),
  city: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
  industry: z.string().max(50).optional(),
  verification_status: z.enum(['all', 'unverified', 'source_checked', 'directly_confirmed']).optional(),
})
export type LocalConnectFilterInput = z.infer<typeof localConnectFilterSchema>

// ─── Status Lifecycle Transition Rules ────────────────────────
export type IntroductionStatusType =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
  | 'cancelled'
  | 'completed'

export function isValidStatusTransition(
  currentStatus: IntroductionStatusType,
  newStatus: IntroductionStatusType,
  role: 'founder' | 'recipient' | 'admin' = 'founder'
): { allowed: boolean; reason?: string } {
  if (currentStatus === newStatus) {
    return { allowed: false, reason: 'Request is already in this status' }
  }

  // Founder can only cancel/withdraw a pending request
  if (role === 'founder') {
    if (currentStatus === 'pending' && (newStatus === 'cancelled' || newStatus === 'withdrawn')) {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: `Founders cannot transition a request from '${currentStatus}' to '${newStatus}'. Only pending requests can be cancelled.`,
    }
  }

  // Recipient / Admin transitions
  if (role === 'recipient' || role === 'admin') {
    if (currentStatus === 'pending' && (newStatus === 'accepted' || newStatus === 'declined')) {
      return { allowed: true }
    }
    if (currentStatus === 'accepted' && newStatus === 'completed') {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: `Invalid transition from '${currentStatus}' to '${newStatus}' for ${role}.`,
    }
  }

  return { allowed: false, reason: 'Unauthorized role' }
}

// ─── Hypothesis ──────────────────────────────────────────────
export const hypothesisSchema = z.object({
  statement: z
    .string()
    .min(10, 'Hypothesis statement must be at least 10 characters')
    .max(500),
  city: z.string().min(1, 'Target city is required').max(100),
  target_audience: z
    .string()
    .min(3, 'Target customer segment must be at least 3 characters')
    .max(200),
  problem_statement: z
    .string()
    .min(10, 'Problem/need description must be at least 10 characters')
    .max(1000),
  expected_behavior: z
    .string()
    .min(10, 'Expected customer behavior must be at least 10 characters')
    .max(1000),
  strategic_rationale: z.string().max(1000).optional(),
  status: z
    .enum(['untested', 'testing', 'supported', 'challenged', 'inconclusive'])
    .default('untested'),
  startup_id: z.string().optional().nullable(),
  comparison_id: z.string().optional().nullable(),
})
export type HypothesisInput = z.infer<typeof hypothesisSchema>

// ─── Experiment ──────────────────────────────────────────────
export const experimentSchema = z.object({
  title: z.string().min(3, 'Experiment title must be at least 3 characters').max(200),
  hypothesis: z
    .string()
    .min(10, 'Hypothesis description must be at least 10 characters')
    .max(1000),
  hypothesis_id: z.string().optional().nullable(),
  method: z.enum([
    'interview',
    'survey',
    'retailer-outreach',
    'distributor-outreach',
    'landing-page',
    'pilot',
    'paid-trial',
    'other',
  ]),
  city: z.string().min(1, 'Target city is required'),
  target_audience: z.string().max(200).optional(),
  sample_size_target: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? 10 : Number(val)),
      z.number().int().min(1, 'Sample size target must be at least 1')
    )
    .default(10),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  target_metric: z.string().min(2, 'Target metric name is required').max(200),
  success_threshold: z
    .string()
    .min(3, 'Define a measurable success threshold')
    .max(200),
  threshold_metric: z.string().default('problem_confirmation_rate'),
  threshold_operator: z.enum(['>=', '>', '<=', '<', '=']).default('>='),
  threshold_target: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? 50 : Number(val)),
      z.number()
    )
    .default(50),
  threshold_unit: z.enum(['%', 'count', 'INR', 'ratio']).default('%'),
  threshold_min_sample: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? 5 : Number(val)),
      z.number().int().min(1)
    )
    .default(5),
  threshold_rationale: z.string().max(1000).optional(),
  status: z
    .enum(['draft', 'planned', 'active', 'running', 'complete', 'completed', 'cancelled'])
    .default('planned'),
  notes: z.string().max(2000).optional(),
  comparison_id: z.string().optional().nullable(),
  startup_id: z.string().optional().nullable(),
})
export type ExperimentInput = z.infer<typeof experimentSchema>

// ─── Threshold Update Schema ──────────────────────────────────
export const thresholdUpdateSchema = z.object({
  experiment_id: z.string().min(1, 'Invalid experiment ID'),
  previous_threshold: z.string().min(1),
  new_threshold: z.string().min(3, 'New threshold must be at least 3 characters'),
  change_reason: z
    .string()
    .min(5, 'Please provide an explicit rationale for modifying this success threshold')
    .max(500),
})
export type ThresholdUpdateInput = z.infer<typeof thresholdUpdateSchema>

// ─── Experiment Response ──────────────────────────────────────
export const experimentResponseSchema = z.object({
  experiment_id: z.string().min(1, 'Invalid experiment ID').optional(),
  respondent_label: z
    .string()
    .min(1, 'Label required')
    .max(100)
    .describe('Anonymised label, e.g. "Retailer A" or "Respondent 3"'),
  response_type: z.enum([
    'interview',
    'survey-submission',
    'observation',
    'purchase',
    'signup',
    'lead',
    'inquiry',
  ]),
  outcome: z.enum(['positive', 'negative', 'neutral', 'inconclusive']),
  signal_tier: z
    .enum([
      'reported_interest',
      'qualified_lead',
      'signup',
      'paid_order',
      'repeat_purchase',
      'objection',
    ])
    .default('reported_interest'),
  units_count: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? 1 : Number(val)),
      z.number().int().min(1)
    )
    .default(1),
  financial_value: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
      z.number().min(0).optional()
    ),
  notes: z.string().max(2000).optional(),
  rejection_reason: z.string().max(500).optional(),
  evidence_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})
export type ExperimentResponseInput = z.infer<typeof experimentResponseSchema>

// ─── Assumption ───────────────────────────────────────────────
export const assumptionSchema = z.object({
  statement: z.string().min(10, 'State your assumption clearly').max(500),
  source_type: z.enum(['city-intelligence', 'manual', 'llm-synthesis']),
  comparison_id: z.string().uuid().optional().nullable(),
})
export type AssumptionInput = z.infer<typeof assumptionSchema>

// ─── What-If Weights ──────────────────────────────────────────
export const weightsSchema = z
  .record(
    z.string(),
    z
      .number()
      .min(0, 'Weight cannot be negative')
      .max(100, 'Weight cannot exceed 100')
      .refine((val) => !Number.isNaN(val), 'Weight cannot be NaN')
      .refine((val) => !Number.isFinite(val) || Math.abs(val) < Infinity, 'Weight cannot be Infinity')
  )
  .refine((weights) => {
    const values = Object.values(weights)
    return values.length > 0 && values.some((v) => v > 0)
  }, 'At least one weight must be greater than 0 (all-zero weights are invalid)')
  .refine((weights) => {
    // Validate against known criterion keys
    const validKeys = [
      'Demand Fit',
      'Competitive Opportunity',
      'Distribution Feasibility',
      'Entry Cost & Unit Economics',
      'Operational Feasibility & Talent',
    ]
    const inputKeys = Object.keys(weights)
    return inputKeys.every((key) => validKeys.includes(key))
  }, 'Unknown criterion key provided. Valid keys are: Demand Fit, Competitive Opportunity, Distribution Feasibility, Entry Cost & Unit Economics, Operational Feasibility & Talent')

export type WeightsInput = z.infer<typeof weightsSchema>

