/**
 * Market Proof Loop — Evidence Classification Engine
 *
 * Deterministically classifies hypothesis evidence status based on:
 * - Experiment outcome interpretations (from marketValidationMetrics.ts)
 * - Signal tier composition (reported interest vs paid orders)
 * - Introduction request statuses
 * - Minimum evidence requirements
 *
 * Rules are explicit, documented, and testable.
 * No LLM inference in this module.
 */

import type {
  Hypothesis,
  HypothesisStatus,
  Experiment,
  ExperimentResponse,
  IntroductionRequest,
  OutcomeInterpretation,
  SignalTier,
} from '@/types/database'
import { calculateExperimentMetrics } from './marketValidationMetrics'

// ─── Classification constants ────────────────────────────────────

/**
 * Minimum number of valid responses required to make a
 * "supported" or "challenged" determination.
 * Below this threshold the result is "insufficient_evidence".
 */
export const MIN_VALID_RESPONSES_FOR_CONCLUSION = 3

/**
 * Minimum proportion of threshold-met experiments (among completed ones)
 * needed to classify a hypothesis as "supported".
 */
export const SUPPORTED_THRESHOLD_RATE = 0.6

/**
 * Minimum proportion of threshold-not-met experiments to classify as "challenged".
 */
export const CHALLENGED_THRESHOLD_RATE = 0.6

// ─── Evidence quality levels ──────────────────────────────────────

export type EvidenceQualityLabel = 'none' | 'weak' | 'moderate' | 'strong'

/**
 * Signal tiers ranked by commercial strength (weakest → strongest).
 * Reported interest is NOT equivalent to a paid order.
 */
const SIGNAL_TIER_WEIGHT: Record<SignalTier, number> = {
  reported_interest: 1,
  qualified_lead: 2,
  signup: 3,
  paid_order: 4,
  repeat_purchase: 5,
  objection: 0,
}

// ─── Per-experiment evidence summary ─────────────────────────────

export interface ExperimentEvidenceSummary {
  experimentId: string
  title: string
  method: string
  city: string
  status: string
  outcomeInterpretation: OutcomeInterpretation
  interpretationReason: string
  validResponses: number
  sampleTarget: number
  sampleSufficient: boolean
  thresholdMet: boolean | null
  strongSignalCount: number  // paid_order + repeat_purchase only
  weakSignalCount: number    // reported_interest + qualified_lead
  conflictingResults: boolean
}

export function summariseExperimentEvidence(
  experiment: Experiment,
  responses: ExperimentResponse[]
): ExperimentEvidenceSummary {
  const metrics = calculateExperimentMetrics(experiment, responses)

  const strongSignalCount = responses.filter((r) => {
    const tier: SignalTier = r.signal_tier || 'reported_interest'
    return SIGNAL_TIER_WEIGHT[tier] >= 4
  }).length

  const weakSignalCount = responses.filter((r) => {
    const tier: SignalTier = r.signal_tier || 'reported_interest'
    return SIGNAL_TIER_WEIGHT[tier] >= 1 && SIGNAL_TIER_WEIGHT[tier] <= 2
  }).length

  // Conflicting results: mix of positive and negative responses in adequate samples
  const conflictingResults =
    metrics.validResponses >= 4 &&
    metrics.positiveCount > 0 &&
    metrics.negativeCount > 0 &&
    Math.abs(metrics.positiveCount - metrics.negativeCount) <=
      Math.floor(metrics.validResponses * 0.3)

  return {
    experimentId: experiment.id,
    title: experiment.title,
    method: experiment.method,
    city: experiment.city,
    status: experiment.status,
    outcomeInterpretation: metrics.outcomeInterpretation,
    interpretationReason: metrics.interpretationReason,
    validResponses: metrics.validResponses,
    sampleTarget: metrics.sampleTarget,
    sampleSufficient: metrics.sampleSufficient,
    thresholdMet: metrics.thresholdMet,
    strongSignalCount,
    weakSignalCount,
    conflictingResults,
  }
}

// ─── Hypothesis classification ────────────────────────────────────

export interface HypothesisEvidenceClassification {
  /** The computed evidence status — may differ from DB value if recalculated. */
  computedStatus: HypothesisStatus
  /** Human-readable justification for the status assignment. */
  rationale: string
  /** Total valid responses across all linked experiments. */
  totalValidResponses: number
  /** Whether there is at least one paid/commercial signal. */
  hasCommercialSignal: boolean
  /** Whether there are conflicting results across experiments. */
  hasConflictingResults: boolean
  /** Whether sample sizes are sufficient to draw conclusions. */
  sampleSufficient: boolean
  /** Proportion of completed experiments with threshold met. */
  thresholdMetRate: number | null
  /** Summary of each experiment's evidence. */
  experimentSummaries: ExperimentEvidenceSummary[]
  /** Intro request statuses linked to this hypothesis. */
  introRequestStatuses: string[]
  /** Suggested next action based on evidence gaps. */
  suggestedNextAction: string
}

/**
 * Classifies hypothesis evidence status deterministically.
 *
 * Classification priority (in order):
 * 1. No experiments → untested
 * 2. All experiments are planned/draft → untested
 * 3. Some experiments active, no responses yet → testing
 * 4. Insufficient responses across all → insufficient_evidence → maps to "inconclusive"
 * 5. Conflicting results → inconclusive
 * 6. ≥60% of completed experiments met threshold → supported
 * 7. ≥60% of completed experiments did NOT meet threshold → challenged
 * 8. Mixed or inconclusive → inconclusive
 */
export function classifyHypothesisEvidence(
  hypothesis: Hypothesis,
  experiments: Experiment[],
  responsesByExperiment: Record<string, ExperimentResponse[]>,
  linkedIntroRequests: IntroductionRequest[]
): HypothesisEvidenceClassification {
  const introStatuses = linkedIntroRequests.map((r) => r.status)

  // Summarise each experiment
  const summaries: ExperimentEvidenceSummary[] = experiments.map((exp) =>
    summariseExperimentEvidence(exp, responsesByExperiment[exp.id] || [])
  )

  const totalValidResponses = summaries.reduce((s, e) => s + e.validResponses, 0)
  const hasCommercialSignal = summaries.some((s) => s.strongSignalCount > 0)
  const hasConflictingResults = summaries.some((s) => s.conflictingResults)

  // Completed experiments only (status complete/completed)
  const completedSummaries = summaries.filter(
    (s) => s.status === 'complete' || s.status === 'completed'
  )
  const activeSummaries = summaries.filter(
    (s) => s.status === 'active' || s.status === 'running'
  )

  // ─── Rule 1: No experiments linked
  if (experiments.length === 0) {
    return {
      computedStatus: 'untested',
      rationale: 'No experiments have been linked to this hypothesis.',
      totalValidResponses: 0,
      hasCommercialSignal: false,
      hasConflictingResults: false,
      sampleSufficient: false,
      thresholdMetRate: null,
      experimentSummaries: [],
      introRequestStatuses: introStatuses,
      suggestedNextAction: suggestNextAction('untested', 0, false, false, introStatuses, summaries),
    }
  }

  // ─── Rule 2: All experiments planned/draft, no responses yet
  const allPlanned = experiments.every(
    (e) => e.status === 'planned' || e.status === 'draft'
  )
  if (allPlanned && totalValidResponses === 0) {
    return {
      computedStatus: 'untested',
      rationale: 'All linked experiments are still in planning. No observations recorded.',
      totalValidResponses: 0,
      hasCommercialSignal: false,
      hasConflictingResults: false,
      sampleSufficient: false,
      thresholdMetRate: null,
      experimentSummaries: summaries,
      introRequestStatuses: introStatuses,
      suggestedNextAction: suggestNextAction('untested', 0, false, false, introStatuses, summaries),
    }
  }

  // ─── Rule 3: Some active experiments, no responses yet
  if (activeSummaries.length > 0 && totalValidResponses === 0) {
    return {
      computedStatus: 'testing',
      rationale: `${activeSummaries.length} experiment(s) are active but no observations have been recorded yet.`,
      totalValidResponses: 0,
      hasCommercialSignal: false,
      hasConflictingResults: false,
      sampleSufficient: false,
      thresholdMetRate: null,
      experimentSummaries: summaries,
      introRequestStatuses: introStatuses,
      suggestedNextAction: suggestNextAction('testing', 0, false, false, introStatuses, summaries),
    }
  }

  // ─── Rule 4: Insufficient sample across all experiments
  const sampleSufficient = totalValidResponses >= MIN_VALID_RESPONSES_FOR_CONCLUSION
  if (!sampleSufficient) {
    return {
      computedStatus: 'inconclusive',
      rationale: `Total observations across all experiments (${totalValidResponses}) are below the minimum requirement (${MIN_VALID_RESPONSES_FOR_CONCLUSION}) for a defensible conclusion. Results are exploratory only.`,
      totalValidResponses,
      hasCommercialSignal,
      hasConflictingResults: false,
      sampleSufficient: false,
      thresholdMetRate: null,
      experimentSummaries: summaries,
      introRequestStatuses: introStatuses,
      suggestedNextAction: suggestNextAction('inconclusive', totalValidResponses, false, false, introStatuses, summaries),
    }
  }

  // ─── Rule 5: Conflicting results
  if (hasConflictingResults) {
    return {
      computedStatus: 'inconclusive',
      rationale:
        'Experiment results show conflicting evidence — positive and negative outcomes are too evenly split to draw a defensible conclusion. A targeted follow-up experiment is recommended.',
      totalValidResponses,
      hasCommercialSignal,
      hasConflictingResults: true,
      sampleSufficient: true,
      thresholdMetRate: null,
      experimentSummaries: summaries,
      introRequestStatuses: introStatuses,
      suggestedNextAction: suggestNextAction('inconclusive', totalValidResponses, true, hasCommercialSignal, introStatuses, summaries),
    }
  }

  // ─── Rules 6 & 7: Threshold-based classification (completed experiments)
  if (completedSummaries.length > 0) {
    const evaluated = completedSummaries.filter((s) => s.thresholdMet !== null)
    const metCount = evaluated.filter((s) => s.thresholdMet === true).length
    const notMetCount = evaluated.filter((s) => s.thresholdMet === false).length
    const thresholdMetRate = evaluated.length > 0 ? metCount / evaluated.length : null

    if (thresholdMetRate !== null && thresholdMetRate >= SUPPORTED_THRESHOLD_RATE) {
      return {
        computedStatus: 'supported',
        rationale: `${metCount} of ${evaluated.length} completed experiment(s) met their predefined success threshold with sufficient sample size (${totalValidResponses} total observations).${hasCommercialSignal ? ' Includes commercial-strength signals (paid orders/pilots).' : ' Note: no paid commercial signals recorded yet.'}`,
        totalValidResponses,
        hasCommercialSignal,
        hasConflictingResults,
        sampleSufficient: true,
        thresholdMetRate,
        experimentSummaries: summaries,
        introRequestStatuses: introStatuses,
        suggestedNextAction: suggestNextAction('supported', totalValidResponses, hasConflictingResults, hasCommercialSignal, introStatuses, summaries),
      }
    }

    if (thresholdMetRate !== null && (1 - thresholdMetRate) >= CHALLENGED_THRESHOLD_RATE) {
      return {
        computedStatus: 'challenged',
        rationale: `${notMetCount} of ${evaluated.length} completed experiment(s) did not meet their predefined success threshold (${totalValidResponses} total observations). The hypothesis assumptions are challenged by available evidence.`,
        totalValidResponses,
        hasCommercialSignal,
        hasConflictingResults,
        sampleSufficient: true,
        thresholdMetRate,
        experimentSummaries: summaries,
        introRequestStatuses: introStatuses,
        suggestedNextAction: suggestNextAction('challenged', totalValidResponses, hasConflictingResults, hasCommercialSignal, introStatuses, summaries),
      }
    }
  }

  // ─── Rule 8: Default — mixed / inconclusive
  return {
    computedStatus: 'inconclusive',
    rationale:
      'Available evidence does not clearly support or challenge the hypothesis. Experiments show mixed results, or completed experiments are too few to draw a defensible conclusion.',
    totalValidResponses,
    hasCommercialSignal,
    hasConflictingResults,
    sampleSufficient,
    thresholdMetRate: null,
    experimentSummaries: summaries,
    introRequestStatuses: introStatuses,
    suggestedNextAction: suggestNextAction('inconclusive', totalValidResponses, hasConflictingResults, hasCommercialSignal, introStatuses, summaries),
  }
}

// ─── Deterministic next-step suggestions ────────────────────────

/**
 * Rule-based next-action suggestions based on evidence gaps.
 * These are recommendations, not proven conclusions.
 */
export function suggestNextAction(
  status: HypothesisStatus | 'inconclusive',
  totalResponses: number,
  hasConflicts: boolean,
  hasCommercialSignal: boolean,
  introStatuses: string[],
  experimentSummaries: ExperimentEvidenceSummary[]
): string {
  const hasPendingIntro = introStatuses.some((s) => s === 'pending')
  const hasAcceptedIntro = introStatuses.some((s) => s === 'accepted')
  const allSimulated = experimentSummaries.length > 0 && experimentSummaries.every(
    (s) => s.validResponses === 0
  )

  if (allSimulated) {
    return 'All evidence is from planned/draft experiments. Start the first field experiment to collect real-world observations.'
  }

  switch (status) {
    case 'untested':
      return 'Create and activate a structured field experiment — interview, survey, or retailer-outreach — to begin collecting direct market evidence.'

    case 'testing':
      if (hasPendingIntro) {
        return 'Experiments are active. Review any pending introduction requests rather than claiming a contact has responded.'
      }
      return 'Experiments are active. Begin recording individual observations for each interaction to build a valid sample.'

    case 'supported':
      if (!hasCommercialSignal) {
        return 'Evidence is promising. Advance from reported interest to a paid pilot or proof-of-purchase experiment to strengthen commercial validation.'
      }
      return 'Hypothesis appears supported. Document the commercial evidence and prepare for a larger-scale pilot in the target city.'

    case 'challenged':
      return 'Reconsider the hypothesis scope or pricing assumptions based on the evidence. Consider a narrower target audience or a different channel before pivoting.'

    case 'inconclusive':
      if (hasConflicts) {
        return 'Conflicting results exist. Design a more targeted follow-up experiment with a narrower, more specific respondent profile to resolve the contradiction.'
      }
      if (totalResponses < MIN_VALID_RESPONSES_FOR_CONCLUSION) {
        return `Collect more observations. A minimum of ${MIN_VALID_RESPONSES_FOR_CONCLUSION} valid responses is required before drawing a conclusion.`
      }
      if (hasAcceptedIntro) {
        return 'An introduction request was accepted. Record the outcome of that interaction as an experiment response to turn it into traceable evidence.'
      }
      return 'Results are mixed or insufficient. Run a follow-up experiment with a clearer success threshold and a defined minimum sample size.'

    default:
      return 'Review the evidence and design the next targeted experiment.'
  }
}

// ─── Evidence type labels ────────────────────────────────────────

export const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  interview: 'Customer Interview',
  'survey-submission': 'Survey Response',
  observation: 'Field Observation',
  purchase: 'Purchase / Transaction',
  signup: 'Product Signup',
  lead: 'Qualified Lead',
  inquiry: 'Inbound Inquiry',
}

export const SIGNAL_TIER_LABELS: Record<SignalTier, string> = {
  reported_interest: 'Reported Interest (Weak)',
  qualified_lead: 'Qualified Lead',
  signup: 'Product Signup',
  paid_order: 'Paid Order',
  repeat_purchase: 'Repeat Purchase',
  objection: 'Objection / Rejection',
}
