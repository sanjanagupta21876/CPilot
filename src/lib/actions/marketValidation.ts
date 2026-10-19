'use server'

import { createClient } from '@/lib/supabase/server'
import {
  hypothesisSchema,
  experimentSchema,
  thresholdUpdateSchema,
  experimentResponseSchema,
  type HypothesisInput,
  type ExperimentInput,
  type ThresholdUpdateInput,
  type ExperimentResponseInput,
} from '@/lib/validations/schemas'
import type {
  Hypothesis,
  HypothesisStatus,
  Experiment,
  ExperimentStatus,
  ExperimentResponse,
  ThresholdHistory,
  Database,
} from '@/types/database'
import {
  DEMO_HYPOTHESES,
  DEMO_EXPERIMENTS,
  DEMO_EXPERIMENT_RESPONSES,
  DEMO_THRESHOLD_HISTORY,
} from '@/lib/data/demoData'
import {
  calculateExperimentMetrics,
  type ExperimentMetricsSummary,
} from '@/lib/scoring/marketValidationMetrics'

// In-memory demo caches for active session mutations when Supabase is disconnected/unconfigured
const sessionHypotheses: Hypothesis[] = [...DEMO_HYPOTHESES]
const sessionExperiments: Experiment[] = [...DEMO_EXPERIMENTS]
const sessionResponses: ExperimentResponse[] = [...DEMO_EXPERIMENT_RESPONSES]
const sessionThresholdHistory: ThresholdHistory[] = [...DEMO_THRESHOLD_HISTORY]

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(val: unknown): val is string {
  return typeof val === 'string' && UUID_REGEX.test(val)
}

// ─────────────────────────────────────────────────────────────
// HYPOTHESES ACTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Retrieves market hypotheses, optionally filtered by city.
 */
export async function getHypotheses(
  city?: string
): Promise<{ success: boolean; data: Hypothesis[]; isDemo: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      let query = supabase
        .from('hypotheses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (city && city !== 'All') {
        query = query.eq('city', city)
      }

      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return { success: true, data: data as Hypothesis[], isDemo: false }
      }
    }

    // Demo fallback
    let filtered = [...sessionHypotheses]
    if (city && city !== 'All') {
      filtered = filtered.filter((h) => h.city.toLowerCase() === city.toLowerCase())
    }
    return { success: true, data: filtered, isDemo: true }
  } catch {
    let filtered = [...sessionHypotheses]
    if (city && city !== 'All') {
      filtered = filtered.filter((h) => h.city.toLowerCase() === city.toLowerCase())
    }
    return { success: true, data: filtered, isDemo: true }
  }
}

/**
 * Creates a new market hypothesis.
 */
export async function createHypothesis(
  rawInput: HypothesisInput
): Promise<{ success: boolean; data?: Hypothesis; error?: string }> {
  try {
    const validated = hypothesisSchema.parse(rawInput)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Demo session fallback
      const newHypothesis: Hypothesis = {
        id: `hyp-demo-${Date.now()}`,
        user_id: 'demo-user-001',
        startup_id: validated.startup_id || 'demo-profile-001',
        city: validated.city,
        statement: validated.statement,
        target_audience: validated.target_audience,
        problem_statement: validated.problem_statement,
        expected_behavior: validated.expected_behavior,
        strategic_rationale: validated.strategic_rationale || null,
        status: validated.status || 'untested',
        comparison_id: validated.comparison_id || null,
        is_demo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      sessionHypotheses.unshift(newHypothesis)
      return { success: true, data: newHypothesis }
    }

    const { data, error } = await supabase
      .from('hypotheses')
      .insert({
        user_id: user.id,
        startup_id: validated.startup_id || null,
        city: validated.city,
        statement: validated.statement,
        target_audience: validated.target_audience,
        problem_statement: validated.problem_statement,
        expected_behavior: validated.expected_behavior,
        strategic_rationale: validated.strategic_rationale || null,
        status: validated.status || 'untested',
        comparison_id: validated.comparison_id || null,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Hypothesis }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create hypothesis.',
    }
  }
}

/**
 * Updates the lifecycle status of a hypothesis.
 */
export async function updateHypothesisStatus(
  id: string,
  status: HypothesisStatus
): Promise<{ success: boolean; data?: Hypothesis; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !isValidUUID(id)) {
      const idx = sessionHypotheses.findIndex((h) => h.id === id)
      if (idx !== -1) {
        sessionHypotheses[idx] = {
          ...sessionHypotheses[idx],
          status,
          updated_at: new Date().toISOString(),
        }
        return { success: true, data: sessionHypotheses[idx] }
      }
      if (!isValidUUID(id)) {
        return { success: false, error: 'Hypothesis not found.' }
      }
    }

    const { data, error } = await supabase
      .from('hypotheses')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Hypothesis }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update hypothesis status.',
    }
  }
}

// ─────────────────────────────────────────────────────────────
// EXPERIMENTS ACTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Retrieves all experiments with their responses count and linked hypothesis.
 */
export async function getExperiments(
  city?: string
): Promise<{ success: boolean; data: Experiment[]; isDemo: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      let query = supabase
        .from('experiments')
        .select('*, hypothesis_rel:hypotheses(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (city && city !== 'All') {
        query = query.eq('city', city)
      }

      const { data, error } = await query
      if (!error && data) {
        const sessionActive = sessionExperiments.filter(
          (e) => e.id.startsWith('exp-session-') || e.id.startsWith('exp-demo-')
        )
        const combined = [...sessionActive, ...(data as Experiment[])]
        if (combined.length > 0) {
          let res = combined
          if (city && city !== 'All') {
            res = res.filter((e) => e.city.toLowerCase() === city.toLowerCase())
          }
          return { success: true, data: res, isDemo: false }
        }
      }
    }

    // Demo fallback
    let filtered = sessionExperiments.map((exp) => {
      const linkedHyp = sessionHypotheses.find((h) => h.id === exp.hypothesis_id) || null
      return {
        ...exp,
        hypothesis_rel: linkedHyp,
      }
    })

    if (city && city !== 'All') {
      filtered = filtered.filter((e) => e.city.toLowerCase() === city.toLowerCase())
    }

    return { success: true, data: filtered, isDemo: true }
  } catch {
    let filtered = sessionExperiments.map((exp) => {
      const linkedHyp = sessionHypotheses.find((h) => h.id === exp.hypothesis_id) || null
      return {
        ...exp,
        hypothesis_rel: linkedHyp,
      }
    })
    if (city && city !== 'All') {
      filtered = filtered.filter((e) => e.city.toLowerCase() === city.toLowerCase())
    }
    return { success: true, data: filtered, isDemo: true }
  }
}

/**
 * Retrieves detailed experiment record, all recorded responses,
 * threshold change history, and computes deterministic metrics.
 */
export async function getExperimentDetails(id: string): Promise<{
  success: boolean
  experiment?: Experiment
  responses?: ExperimentResponse[]
  thresholdHistory?: ThresholdHistory[]
  metrics?: ExperimentMetricsSummary
  linkedHypothesis?: Hypothesis | null
  isDemo: boolean
  error?: string
}> {
  try {
    // If ID is not a UUID (e.g. demo/session ID), serve directly from session storage without database error
    if (!isValidUUID(id)) {
      const exp = sessionExperiments.find((e) => e.id === id)
      if (!exp) {
        return { success: false, error: 'Experiment not found.', isDemo: true }
      }

      const resps = sessionResponses.filter((r) => r.experiment_id === id)
      const hist = sessionThresholdHistory.filter((h) => h.experiment_id === id)
      const linkedHyp = sessionHypotheses.find((h) => h.id === exp.hypothesis_id) || null
      const metrics = calculateExperimentMetrics(exp, resps)

      return {
        success: true,
        experiment: exp,
        responses: resps,
        thresholdHistory: hist,
        metrics,
        linkedHypothesis: linkedHyp,
        isDemo: true,
      }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const [expRes, respRes, histRes] = await Promise.all([
        supabase
          .from('experiments')
          .select('*, hypothesis_rel:hypotheses(*)')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('experiment_responses')
          .select('*')
          .eq('experiment_id', id)
          .order('recorded_at', { ascending: false }),
        supabase
          .from('threshold_history')
          .select('*')
          .eq('experiment_id', id)
          .order('changed_at', { ascending: false }),
      ])

      if (expRes.data) {
        const exp = expRes.data as Experiment
        const resps = (respRes.data as ExperimentResponse[]) || []
        const hist = (histRes.data as ThresholdHistory[]) || []
        const metrics = calculateExperimentMetrics(exp, resps)

        return {
          success: true,
          experiment: exp,
          responses: resps,
          thresholdHistory: hist,
          metrics,
          linkedHypothesis: exp.hypothesis_rel || null,
          isDemo: false,
        }
      }
    }

    // Demo fallback
    const exp = sessionExperiments.find((e) => e.id === id)
    if (!exp) {
      return { success: false, error: 'Experiment not found.', isDemo: true }
    }

    const resps = sessionResponses.filter((r) => r.experiment_id === id)
    const hist = sessionThresholdHistory.filter((h) => h.experiment_id === id)
    const linkedHyp = sessionHypotheses.find((h) => h.id === exp.hypothesis_id) || null
    const metrics = calculateExperimentMetrics(exp, resps)

    return {
      success: true,
      experiment: exp,
      responses: resps,
      thresholdHistory: hist,
      metrics,
      linkedHypothesis: linkedHyp,
      isDemo: true,
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error loading experiment details.',
      isDemo: true,
    }
  }
}

/**
 * Creates a new experiment with structured threshold criteria.
 */
export async function createExperiment(
  rawInput: ExperimentInput
): Promise<{ success: boolean; data?: Experiment; error?: string }> {
  try {
    const validated = experimentSchema.parse(rawInput)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Demo session fallback
      const newExp: Experiment = {
        id: `exp-demo-${Date.now()}`,
        user_id: 'demo-user-001',
        startup_id: validated.startup_id || 'demo-profile-001',
        hypothesis_id: validated.hypothesis_id || null,
        comparison_id: validated.comparison_id || null,
        title: validated.title,
        hypothesis: validated.hypothesis,
        method: validated.method,
        city: validated.city,
        target_audience: validated.target_audience || null,
        sample_size_target: validated.sample_size_target,
        start_date: validated.start_date || null,
        end_date: validated.end_date || null,
        target_metric: validated.target_metric,
        success_threshold: validated.success_threshold,
        threshold_metric: validated.threshold_metric || 'problem_confirmation_rate',
        threshold_operator: validated.threshold_operator || '>=',
        threshold_target: validated.threshold_target ?? 50,
        threshold_unit: validated.threshold_unit || '%',
        threshold_min_sample: validated.threshold_min_sample ?? 5,
        threshold_rationale: validated.threshold_rationale || null,
        status: validated.status || 'planned',
        outcome_interpretation: 'not_evaluated',
        notes: validated.notes || null,
        is_demo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      sessionExperiments.unshift(newExp)

      // Automatically transition linked hypothesis from untested to testing
      if (validated.hypothesis_id) {
        const hypIdx = sessionHypotheses.findIndex((h) => h.id === validated.hypothesis_id)
        if (hypIdx !== -1 && sessionHypotheses[hypIdx].status === 'untested') {
          sessionHypotheses[hypIdx].status = 'testing'
          sessionHypotheses[hypIdx].updated_at = new Date().toISOString()
        }
      }

      return { success: true, data: newExp }
    }

    // Determine safe UUIDs for foreign key relations
    let safeHypothesisId: string | null = null
    let extraNotes = validated.notes || ''

    if (validated.hypothesis_id) {
      if (isValidUUID(validated.hypothesis_id)) {
        safeHypothesisId = validated.hypothesis_id
      } else {
        // Non-UUID ID (e.g. demo hypothesis 'hyp-002')
        // Try to sync this hypothesis into the user's Supabase account so it exists as a real DB row!
        const demoHyp = sessionHypotheses.find((h) => h.id === validated.hypothesis_id)
        if (demoHyp) {
          try {
            const { data: createdHyp } = await supabase
              .from('hypotheses')
              .insert({
                user_id: user.id,
                city: demoHyp.city,
                statement: demoHyp.statement,
                target_audience: demoHyp.target_audience,
                problem_statement: demoHyp.problem_statement,
                expected_behavior: demoHyp.expected_behavior,
                strategic_rationale: demoHyp.strategic_rationale || null,
                status: 'testing',
              })
              .select()
              .single()

            if (createdHyp && isValidUUID(createdHyp.id)) {
              safeHypothesisId = createdHyp.id
            }
          } catch {
            // Ignore DB sync error and proceed with null foreign key
          }

          // Update the in-memory demo hypothesis too
          if (demoHyp.status === 'untested') {
            demoHyp.status = 'testing'
            demoHyp.updated_at = new Date().toISOString()
          }
        }

        if (!safeHypothesisId) {
          extraNotes = extraNotes
            ? `${extraNotes}\n[Linked Hypothesis: ${validated.hypothesis_id}]`
            : `[Linked Hypothesis: ${validated.hypothesis_id}]`
        }
      }
    }

    const safeStartupId = isValidUUID(validated.startup_id) ? validated.startup_id : null
    const safeComparisonId = isValidUUID(validated.comparison_id) ? validated.comparison_id : null

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      startup_id: safeStartupId,
      hypothesis_id: safeHypothesisId,
      comparison_id: safeComparisonId,
      title: validated.title,
      hypothesis: validated.hypothesis,
      method: validated.method,
      city: validated.city,
      target_audience: validated.target_audience || null,
      sample_size_target: validated.sample_size_target,
      start_date: validated.start_date || null,
      end_date: validated.end_date || null,
      target_metric: validated.target_metric,
      success_threshold: validated.success_threshold,
      threshold_metric: validated.threshold_metric,
      threshold_operator: validated.threshold_operator,
      threshold_target: validated.threshold_target,
      threshold_unit: validated.threshold_unit,
      threshold_min_sample: validated.threshold_min_sample,
      threshold_rationale: validated.threshold_rationale || null,
      status: validated.status || 'planned',
      outcome_interpretation: 'not_evaluated',
    }

    if (extraNotes) {
      insertPayload.notes = extraNotes
    }

    let { data: exp, error: insertError } = await supabase
      .from('experiments')
      .insert(insertPayload as never)
      .select()
      .single()

    // Resilient fallback 1: if the database hasn't had the notes column added yet, retry without notes
    if (insertError && insertError.message.includes("'notes'") && insertPayload.notes) {
      delete insertPayload.notes
      const retry = await supabase
        .from('experiments')
        .insert(insertPayload as never)
        .select()
        .single()
      exp = retry.data
      insertError = retry.error
    }

    // Resilient fallback 2: if foreign key constraint on hypothesis_id or startup_id failed
    if (
      insertError &&
      (insertError.message.includes('foreign key') ||
        insertError.message.includes('hypothesis_id') ||
        insertError.message.includes('startup_id'))
    ) {
      insertPayload.hypothesis_id = null
      insertPayload.startup_id = null
      insertPayload.comparison_id = null
      const retry = await supabase
        .from('experiments')
        .insert(insertPayload as never)
        .select()
        .single()
      exp = retry.data
      insertError = retry.error
    }

    // Resilient fallback 3: if Supabase fails for any reason, store in active session experiments
    if (insertError) {
      console.warn('[createExperiment] Supabase insert failed, falling back to session storage:', insertError.message)
      const fallbackExp: Experiment = {
        id: `exp-session-${Date.now()}`,
        user_id: user.id,
        startup_id: validated.startup_id || 'demo-profile-001',
        hypothesis_id: validated.hypothesis_id || null,
        comparison_id: validated.comparison_id || null,
        title: validated.title,
        hypothesis: validated.hypothesis,
        method: validated.method,
        city: validated.city,
        target_audience: validated.target_audience || null,
        sample_size_target: validated.sample_size_target,
        start_date: validated.start_date || null,
        end_date: validated.end_date || null,
        target_metric: validated.target_metric,
        success_threshold: validated.success_threshold,
        threshold_metric: validated.threshold_metric || 'problem_confirmation_rate',
        threshold_operator: validated.threshold_operator || '>=',
        threshold_target: validated.threshold_target ?? 50,
        threshold_unit: validated.threshold_unit || '%',
        threshold_min_sample: validated.threshold_min_sample ?? 5,
        threshold_rationale: validated.threshold_rationale || null,
        status: validated.status || 'planned',
        outcome_interpretation: 'not_evaluated',
        notes: extraNotes || null,
        is_demo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      sessionExperiments.unshift(fallbackExp)
      return { success: true, data: fallbackExp }
    }

    // Auto-update linked hypothesis status if untested in Supabase
    if (safeHypothesisId) {
      await supabase
        .from('hypotheses')
        .update({ status: 'testing', updated_at: new Date().toISOString() })
        .eq('id', safeHypothesisId)
        .eq('status', 'untested')
    }

    return { success: true, data: exp as Experiment }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create experiment.',
    }
  }
}

/**
 * Updates an experiment's success threshold and records an audit log entry.
 * A documented change_reason is mandatory to prevent silent goalpost-shifting.
 */
export async function updateExperimentThreshold(
  rawInput: ThresholdUpdateInput
): Promise<{ success: boolean; data?: Experiment; error?: string }> {
  try {
    const validated = thresholdUpdateSchema.parse(rawInput)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !isValidUUID(validated.experiment_id)) {
      const idx = sessionExperiments.findIndex((e) => e.id === validated.experiment_id)
      if (idx === -1) {
        return { success: false, error: 'Experiment not found.' }
      }

      const prev = sessionExperiments[idx].success_threshold
      sessionExperiments[idx].success_threshold = validated.new_threshold
      sessionExperiments[idx].updated_at = new Date().toISOString()

      const historyEntry: ThresholdHistory = {
        id: `thresh-demo-${Date.now()}`,
        experiment_id: validated.experiment_id,
        user_id: user?.id || 'demo-user-001',
        previous_threshold: prev,
        new_threshold: validated.new_threshold,
        change_reason: validated.change_reason,
        changed_at: new Date().toISOString(),
      }
      sessionThresholdHistory.unshift(historyEntry)

      return { success: true, data: sessionExperiments[idx] }
    }

    // Insert audit history entry
    const { error: histError } = await supabase.from('threshold_history').insert({
      experiment_id: validated.experiment_id,
      user_id: user.id,
      previous_threshold: validated.previous_threshold,
      new_threshold: validated.new_threshold,
      change_reason: validated.change_reason,
    })

    if (histError) {
      return { success: false, error: `Failed to log threshold change: ${histError.message}` }
    }

    // Update experiment
    const { data: updatedExp, error: updateError } = await supabase
      .from('experiments')
      .update({
        success_threshold: validated.new_threshold,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.experiment_id)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, data: updatedExp as Experiment }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update threshold.',
    }
  }
}

/**
 * Updates experiment execution status (e.g., planned -> active -> complete).
 */
export async function updateExperimentStatus(
  id: string,
  status: ExperimentStatus
): Promise<{ success: boolean; data?: Experiment; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const updates: Database['public']['Tables']['experiments']['Update'] = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'active') {
      updates.started_at = new Date().toISOString()
    } else if (status === 'complete' || status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    if (!user || !isValidUUID(id)) {
      const idx = sessionExperiments.findIndex((e) => e.id === id)
      if (idx !== -1) {
        sessionExperiments[idx] = { ...sessionExperiments[idx], ...updates }
        return { success: true, data: sessionExperiments[idx] }
      }
      return { success: false, error: 'Experiment not found.' }
    }

    const { data, error } = await supabase
      .from('experiments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Experiment }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update experiment status.',
    }
  }
}

// ─────────────────────────────────────────────────────────────
// EXPERIMENT RESPONSES ACTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Records an observation or interview response.
 * Sanitizes against PII and updates the experiment's outcome interpretation.
 */
export async function recordExperimentResponse(
  rawInput: ExperimentResponseInput
): Promise<{ success: boolean; data?: ExperimentResponse; error?: string }> {
  try {
    const validated = experimentResponseSchema.parse(rawInput)
    if (!validated.experiment_id) {
      return { success: false, error: 'Experiment ID is required.' }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !isValidUUID(validated.experiment_id)) {
      const newResponse: ExperimentResponse = {
        id: `resp-demo-${Date.now()}`,
        experiment_id: validated.experiment_id,
        user_id: user?.id || 'demo-user-001',
        respondent_label: validated.respondent_label,
        response_type: validated.response_type,
        outcome: validated.outcome,
        signal_tier: validated.signal_tier,
        units_count: validated.units_count,
        financial_value: validated.financial_value ?? null,
        notes: validated.notes || null,
        rejection_reason: validated.rejection_reason || null,
        evidence_url: validated.evidence_url || null,
        recorded_at: new Date().toISOString(),
      }

      sessionResponses.unshift(newResponse)

      // Recalculate interpretation on session experiment
      const expIdx = sessionExperiments.findIndex((e) => e.id === validated.experiment_id)
      if (expIdx !== -1) {
        const curResps = sessionResponses.filter((r) => r.experiment_id === validated.experiment_id)
        const summary = calculateExperimentMetrics(sessionExperiments[expIdx], curResps)
        sessionExperiments[expIdx].outcome_interpretation = summary.outcomeInterpretation
        sessionExperiments[expIdx].updated_at = new Date().toISOString()
      }

      return { success: true, data: newResponse }
    }

    const responsePayload: Record<string, unknown> = {
      experiment_id: validated.experiment_id,
      user_id: user.id,
      respondent_label: validated.respondent_label,
      response_type: validated.response_type,
      outcome: validated.outcome,
      signal_tier: validated.signal_tier,
      units_count: validated.units_count,
      financial_value: validated.financial_value ?? null,
      notes: validated.notes || null,
      rejection_reason: validated.rejection_reason || null,
      evidence_url: validated.evidence_url || null,
    }

    let { data: resp, error: insertError } = await supabase
      .from('experiment_responses')
      .insert(responsePayload as never)
      .select()
      .single()

    // Resilient fallback: if user_id column hasn't been added to experiment_responses yet, retry without user_id
    if (insertError && insertError.message.includes("'user_id'")) {
      delete responsePayload.user_id
      const retry = await supabase
        .from('experiment_responses')
        .insert(responsePayload as never)
        .select()
        .single()
      resp = retry.data
      insertError = retry.error
    }

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    // Refresh experiment outcome interpretation in background
    const [expRes, allRespsRes] = await Promise.all([
      supabase.from('experiments').select('*').eq('id', validated.experiment_id).single(),
      supabase.from('experiment_responses').select('*').eq('experiment_id', validated.experiment_id),
    ])

    if (expRes.data && allRespsRes.data) {
      const summary = calculateExperimentMetrics(
        expRes.data as Experiment,
        allRespsRes.data as ExperimentResponse[]
      )
      await supabase
        .from('experiments')
        .update({
          outcome_interpretation: summary.outcomeInterpretation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', validated.experiment_id)
    }

    return { success: true, data: resp as ExperimentResponse }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to record response.',
    }
  }
}

/**
 * Deletes a recorded response.
 */
export async function deleteExperimentResponse(
  responseId: string,
  experimentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !isValidUUID(responseId) || !isValidUUID(experimentId)) {
      const idx = sessionResponses.findIndex((r) => r.id === responseId)
      if (idx !== -1) {
        sessionResponses.splice(idx, 1)
        const expIdx = sessionExperiments.findIndex((e) => e.id === experimentId)
        if (expIdx !== -1) {
          const curResps = sessionResponses.filter((r) => r.experiment_id === experimentId)
          const summary = calculateExperimentMetrics(sessionExperiments[expIdx], curResps)
          sessionExperiments[expIdx].outcome_interpretation = summary.outcomeInterpretation
        }
        return { success: true }
      }
      return { success: false, error: 'Response not found.' }
    }

    const { error } = await supabase
      .from('experiment_responses')
      .delete()
      .eq('id', responseId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Recompute interpretation
    const [expRes, allRespsRes] = await Promise.all([
      supabase.from('experiments').select('*').eq('id', experimentId).single(),
      supabase.from('experiment_responses').select('*').eq('experiment_id', experimentId),
    ])

    if (expRes.data && allRespsRes.data) {
      const summary = calculateExperimentMetrics(
        expRes.data as Experiment,
        allRespsRes.data as ExperimentResponse[]
      )
      await supabase
        .from('experiments')
        .update({
          outcome_interpretation: summary.outcomeInterpretation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', experimentId)
    }

    return { success: true }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete response.',
    }
  }
}
