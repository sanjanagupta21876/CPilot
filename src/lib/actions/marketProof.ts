'use server'

import { createClient } from '@/lib/supabase/server'
import { classifyHypothesisEvidence } from '@/lib/scoring/marketProofClassifier'
import {
  DEMO_HYPOTHESES,
  DEMO_EXPERIMENTS,
  DEMO_EXPERIMENT_RESPONSES,
} from '@/lib/data/demoData'
import type {
  Hypothesis,
  Experiment,
  ExperimentResponse,
  IntroductionRequest,
  CityComparison,
  FitScore,
  HypothesisIntroLink,
  ProofEvent,
  ProofEventType,
  StartupProfile,
} from '@/types/database'
import type { HypothesisEvidenceClassification } from '@/lib/scoring/marketProofClassifier'

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface HypothesisProofView {
  hypothesis: Hypothesis
  classification: HypothesisEvidenceClassification
  linkedComparison: CityComparison | null
  linkedFitScore: FitScore | null
  linkedIntroRequests: IntroductionRequest[]
  experiments: Experiment[]
}

export interface MarketProofPageData {
  startup: StartupProfile | null
  hypotheses: HypothesisProofView[]
  proofEvents: ProofEvent[]
  isDemo: boolean
  error: string | null
}

// ─────────────────────────────────────────────────────────────
// LOAD FULL MARKET PROOF VIEW
// ─────────────────────────────────────────────────────────────

/**
 * Loads the complete Market Proof page data for the authenticated user.
 * Aggregates hypotheses, experiments, responses, intro requests and
 * city assessment data, then classifies evidence deterministically.
 *
 * Ownership is enforced via RLS + explicit user_id filters.
 * All joins are validated — no cross-user data leakage.
 */
export async function getMarketProofData(city?: string): Promise<MarketProofPageData> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return getDemoMarketProofData()
    }

    // Load startup profile (needed for city context)
    const { data: startup } = await supabase
      .from('startup_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    // Load hypotheses
    let hypQuery = supabase
      .from('hypotheses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (city && city !== 'All') {
      hypQuery = hypQuery.eq('city', city)
    }

    const { data: hypothesesData, error: hypError } = await hypQuery

    if (hypError) {
      return { startup: null, hypotheses: [], proofEvents: [], isDemo: false, error: hypError.message }
    }

    const hypotheses = (hypothesesData || []) as Hypothesis[]

    if (hypotheses.length === 0) {
      // No hypotheses — return empty state with proof events
      const { data: eventsData } = await supabase
        .from('proof_events')
        .select('*')
        .eq('user_id', user.id)
        .order('occurred_at', { ascending: false })
        .limit(50)

      return {
        startup: startup as StartupProfile | null,
        hypotheses: [],
        proofEvents: (eventsData || []) as ProofEvent[],
        isDemo: false,
        error: null,
      }
    }

    const hypothesisIds = hypotheses.map((h) => h.id)
    const comparisonIds = hypotheses.map((h) => h.comparison_id).filter(Boolean) as string[]

    // Load all experiments linked to these hypotheses
    const { data: experimentsData } = await supabase
      .from('experiments')
      .select('*, hypothesis_rel:hypotheses(*)')
      .eq('user_id', user.id)
      .in('hypothesis_id', hypothesisIds)
      .order('created_at', { ascending: false })

    const experiments = (experimentsData || []) as Experiment[]
    const experimentIds = experiments.map((e) => e.id)

    // Load all responses for those experiments
    const { data: responsesData } = experimentIds.length > 0
      ? await supabase
          .from('experiment_responses')
          .select('*')
          .in('experiment_id', experimentIds)
          .order('recorded_at', { ascending: false })
      : { data: [] }

    const responses = (responsesData || []) as ExperimentResponse[]

    // Group responses by experiment
    const responsesByExperiment: Record<string, ExperimentResponse[]> = {}
    for (const resp of responses) {
      if (!responsesByExperiment[resp.experiment_id]) {
        responsesByExperiment[resp.experiment_id] = []
      }
      responsesByExperiment[resp.experiment_id].push(resp)
    }

    // Load hypothesis ↔ intro request links for these hypotheses
    const { data: linksData } = hypothesisIds.length > 0
      ? await supabase
          .from('hypothesis_intro_links')
          .select('*')
          .in('hypothesis_id', hypothesisIds)
          .eq('user_id', user.id)
      : { data: [] }

    const links = (linksData || []) as HypothesisIntroLink[]
    const introRequestIds = links.map((l) => l.intro_request_id)

    // Load intro requests associated with these hypotheses
    const { data: introData } = introRequestIds.length > 0
      ? await supabase
          .from('introduction_requests')
          .select('*, contact:contacts(*)')
          .in('id', introRequestIds)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      : { data: [] }

    const allIntroRequests = (introData || []) as unknown as IntroductionRequest[]

    // Build a map: hypothesis_id → linked intro requests
    const introsByHypothesis: Record<string, IntroductionRequest[]> = {}
    for (const link of links) {
      if (!introsByHypothesis[link.hypothesis_id]) {
        introsByHypothesis[link.hypothesis_id] = []
      }
      const req = allIntroRequests.find((r) => r.id === link.intro_request_id)
      if (req) introsByHypothesis[link.hypothesis_id].push(req)
    }

    // Load city comparisons + fit scores linked to hypotheses
    const { data: comparisonsData } = comparisonIds.length > 0
      ? await supabase
          .from('city_comparisons')
          .select('*')
          .eq('user_id', user.id)
          .in('id', comparisonIds)
      : { data: [] }

    const comparisons = (comparisonsData || []) as CityComparison[]

    const { data: fitScoresData } = comparisonIds.length > 0
      ? await supabase
          .from('fit_scores')
          .select('*')
          .in('comparison_id', comparisonIds)
      : { data: [] }

    const fitScores = (fitScoresData || []) as FitScore[]

    // Load proof events timeline
    const { data: eventsData } = await supabase
      .from('proof_events')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false })
      .limit(100)

    const proofEvents = (eventsData || []) as ProofEvent[]

    // Build per-hypothesis proof views
    const hypothesisViews: HypothesisProofView[] = hypotheses.map((hyp) => {
      const hypExperiments = experiments.filter((e) => e.hypothesis_id === hyp.id)
      const hypIntros = introsByHypothesis[hyp.id] || []
      const linkedComparison = hyp.comparison_id
        ? comparisons.find((c) => c.id === hyp.comparison_id) || null
        : null
      const linkedFitScore = linkedComparison
        ? fitScores.find(
            (fs) => fs.comparison_id === linkedComparison.id && fs.city === hyp.city
          ) || null
        : null

      const classification = classifyHypothesisEvidence(
        hyp,
        hypExperiments,
        responsesByExperiment,
        hypIntros
      )

      return {
        hypothesis: hyp,
        classification,
        linkedComparison,
        linkedFitScore,
        linkedIntroRequests: hypIntros,
        experiments: hypExperiments,
      }
    })

    return {
      startup: startup as StartupProfile | null,
      hypotheses: hypothesisViews,
      proofEvents,
      isDemo: false,
      error: null,
    }
  } catch (err: unknown) {
    return {
      startup: null,
      hypotheses: [],
      proofEvents: [],
      isDemo: false,
      error: err instanceof Error ? err.message : 'Failed to load Market Proof data.',
    }
  }
}

// ─────────────────────────────────────────────────────────────
// LINK INTRO REQUEST TO HYPOTHESIS
// ─────────────────────────────────────────────────────────────

/**
 * Associates an introduction request with a hypothesis for the
 * Market Proof evidence view. Validates ownership of both records.
 */
export async function linkIntroRequestToHypothesis(
  hypothesisId: string,
  introRequestId: string
): Promise<{ success: boolean; error?: string }> {
  if (!hypothesisId || !introRequestId) {
    return { success: false, error: 'Hypothesis ID and Introduction Request ID are required.' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Authentication required.' }
    }

    // Verify user owns both records
    const [hypRes, reqRes] = await Promise.all([
      supabase
        .from('hypotheses')
        .select('id')
        .eq('id', hypothesisId)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('introduction_requests')
        .select('id')
        .eq('id', introRequestId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    if (!hypRes.data) {
      return { success: false, error: 'Hypothesis not found or access denied.' }
    }
    if (!reqRes.data) {
      return { success: false, error: 'Introduction request not found or access denied.' }
    }

    const { error } = await supabase.from('hypothesis_intro_links').insert({
      hypothesis_id: hypothesisId,
      intro_request_id: introRequestId,
      user_id: user.id,
    })

    if (error && error.code !== '23505') {
      // 23505 = unique_violation (already linked — acceptable)
      return { success: false, error: error.message }
    }

    // Record event
    await recordProofEvent({
      hypothesis_id: hypothesisId,
      event_type: 'evidence_linked',
      event_label: 'Introduction request linked to hypothesis',
      related_record_type: 'intro_request',
      related_record_id: introRequestId,
    })

    return { success: true }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to link records.',
    }
  }
}

// ─────────────────────────────────────────────────────────────
// RECORD PROOF EVENT (internal helper)
// ─────────────────────────────────────────────────────────────

/**
 * Appends an immutable event to the proof_events timeline.
 * Silently fails — the event log is supplementary, not critical.
 */
export async function recordProofEvent(params: {
  hypothesis_id?: string | null
  startup_id?: string | null
  city?: string | null
  event_type: ProofEventType
  event_label: string
  related_record_type?: string | null
  related_record_id?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('proof_events').insert({
      user_id: user.id,
      hypothesis_id: params.hypothesis_id || null,
      startup_id: params.startup_id || null,
      city: params.city || null,
      event_type: params.event_type,
      event_label: params.event_label,
      related_record_type: params.related_record_type || null,
      related_record_id: params.related_record_id || null,
      metadata: params.metadata || {},
    })
  } catch {
    // Silently swallow — event logging must not break the main workflow
  }
}

// ─────────────────────────────────────────────────────────────
// DEMO FALLBACK
// ─────────────────────────────────────────────────────────────

function getDemoMarketProofData(): MarketProofPageData {
  const responsesByExp: Record<string, ExperimentResponse[]> = {}
  for (const resp of DEMO_EXPERIMENT_RESPONSES) {
    if (!responsesByExp[resp.experiment_id]) responsesByExp[resp.experiment_id] = []
    responsesByExp[resp.experiment_id].push(resp)
  }

  const views: HypothesisProofView[] = DEMO_HYPOTHESES.map((hyp) => {
    const exps = DEMO_EXPERIMENTS.filter((e) => e.hypothesis_id === hyp.id)
    const classification = classifyHypothesisEvidence(hyp, exps, responsesByExp, [])
    return {
      hypothesis: hyp,
      classification,
      linkedComparison: null,
      linkedFitScore: null,
      linkedIntroRequests: [],
      experiments: exps,
    }
  })

  return {
    startup: null,
    hypotheses: views,
    proofEvents: [],
    isDemo: true,
    error: null,
  }
}

// ─────────────────────────────────────────────────────────────
// LOAD INTRO REQUESTS FOR LINKING UI
// ─────────────────────────────────────────────────────────────

/**
 * Returns the user's introduction requests available for linking to hypotheses.
 * Only returns requests that are not already linked to the given hypothesis.
 */
export async function getAvailableIntroRequestsForHypothesis(
  hypothesisId: string
): Promise<{ data: IntroductionRequest[]; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { data: [] }

    // Get already-linked request IDs
    const { data: existingLinks } = await supabase
      .from('hypothesis_intro_links')
      .select('intro_request_id')
      .eq('hypothesis_id', hypothesisId)
      .eq('user_id', user.id)

    const alreadyLinked = (existingLinks || []).map((l) => l.intro_request_id)

    // Load all user intro requests not already linked
    const query = supabase
      .from('introduction_requests')
      .select('*, contact:contacts(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) return { data: [], error: error.message }

    const available = ((data || []) as unknown as IntroductionRequest[]).filter(
      (r) => !alreadyLinked.includes(r.id)
    )

    return { data: available }
  } catch (err: unknown) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to load introduction requests.',
    }
  }
}
