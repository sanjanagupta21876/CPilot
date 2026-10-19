'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DemoBanner } from '@/components/shared/DemoBanner'
import type {
  Experiment,
  ExperimentResponse,
  ExperimentStatus,
  Hypothesis,
  OutcomeInterpretation,
  OutcomeType,
  ResponseType,
  SignalTier,
  ThresholdHistory,
} from '@/types/database'
import type { ExperimentMetricsSummary } from '@/lib/scoring/marketValidationMetrics'
import {
  getExperimentDetails,
  recordExperimentResponse,
  deleteExperimentResponse,
  updateExperimentStatus,
  updateExperimentThreshold,
} from '@/lib/actions/marketValidation'
import { formatDate } from '@/lib/utils'
import { AIExperimentFindingsModal } from '@/components/ai/AIExperimentFindingsModal'
import {
  FlaskConical,
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  PlayCircle,
  XCircle,
  MapPin,
  Users,
  Target,
  ShieldCheck,
  ShieldAlert,
  Coins,
  History,
  Trash2,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react'

interface ExperimentDetailClientProps {
  initialExperiment: Experiment
  initialResponses: ExperimentResponse[]
  initialThresholdHistory: ThresholdHistory[]
  initialMetrics: ExperimentMetricsSummary
  initialHypothesis: Hypothesis | null
  isDemo: boolean
}

const outcomeConfig: Record<
  OutcomeType,
  { label: string; variant: 'success' | 'destructive' | 'secondary' | 'warning' }
> = {
  positive: { label: 'Positive', variant: 'success' },
  negative: { label: 'Negative', variant: 'destructive' },
  neutral: { label: 'Neutral', variant: 'secondary' },
  inconclusive: { label: 'Inconclusive', variant: 'warning' },
}

const signalTierConfig: Record<
  SignalTier,
  { label: string; className: string }
> = {
  reported_interest: {
    label: 'Reported Interest',
    className: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  qualified_lead: {
    label: 'Qualified Lead',
    className: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  signup: {
    label: 'Waitlist / Signup',
    className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  paid_order: {
    label: 'Paid Order / Deposit',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold',
  },
  repeat_purchase: {
    label: 'Repeat Purchase',
    className: 'bg-teal-500/15 text-teal-300 border-teal-500/30 font-semibold',
  },
  objection: {
    label: 'Commercial Objection',
    className: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
}

const statusBadgeConfig: Record<
  ExperimentStatus,
  { label: string; variant: 'secondary' | 'warning' | 'success' | 'destructive'; icon: typeof Clock }
> = {
  planned: { label: 'Planned', variant: 'secondary', icon: Clock },
  active: { label: 'Active (Testing)', variant: 'warning', icon: PlayCircle },
  running: { label: 'Running', variant: 'warning', icon: PlayCircle },
  complete: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
  completed: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
  draft: { label: 'Draft', variant: 'secondary', icon: Clock },
}

const interpretationConfig: Record<
  OutcomeInterpretation,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  threshold_met: {
    label: 'Success Threshold Met',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    icon: CheckCircle2,
  },
  threshold_not_met: {
    label: 'Below Success Threshold',
    className: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    icon: AlertTriangle,
  },
  insufficient_sample: {
    label: 'Insufficient Sample Size',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    icon: Clock,
  },
  inconclusive: {
    label: 'Inconclusive Evidence',
    className: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    icon: HelpCircle,
  },
  not_evaluated: {
    label: 'Not Evaluated',
    className: 'border-slate-700 bg-slate-800 text-slate-400',
    icon: Clock,
  },
}

export function ExperimentDetailClient({
  initialExperiment,
  initialResponses,
  initialThresholdHistory,
  initialMetrics,
  initialHypothesis,
  isDemo,
}: ExperimentDetailClientProps) {
  const [experiment, setExperiment] = useState<Experiment>(initialExperiment)
  const [responses, setResponses] = useState<ExperimentResponse[]>(initialResponses)
  const [thresholdHistory, setThresholdHistory] = useState<ThresholdHistory[]>(initialThresholdHistory)
  const [metrics, setMetrics] = useState<ExperimentMetricsSummary>(initialMetrics)
  const [linkedHypothesis] = useState<Hypothesis | null>(initialHypothesis)
  const [actionError, setActionError] = useState<string | null>(null)

  // Observation Modal state
  const [isObsModalOpen, setIsObsModalOpen] = useState(false)
  const [obsSubmitting, setObsSubmitting] = useState(false)
  const [obsError, setObsError] = useState<string | null>(null)
  const [obsForm, setObsForm] = useState({
    respondent_label: '',
    response_type: 'interview' as ResponseType,
    outcome: 'positive' as OutcomeType,
    signal_tier: 'reported_interest' as SignalTier,
    units_count: 1,
    financial_value: '',
    notes: '',
    rejection_reason: '',
    evidence_url: '',
  })

  // Threshold Update Modal state
  const [isThreshModalOpen, setIsThreshModalOpen] = useState(false)
  const [threshSubmitting, setThreshSubmitting] = useState(false)
  const [threshError, setThreshError] = useState<string | null>(null)
  const [threshForm, setThreshForm] = useState({
    new_threshold: initialExperiment.success_threshold,
    change_reason: '',
  })

  // Refreshes data after a mutation
  const refreshData = async () => {
    const res = await getExperimentDetails(experiment.id)
    if (res.success && res.experiment && res.metrics) {
      setExperiment(res.experiment)
      setResponses(res.responses || [])
      setThresholdHistory(res.thresholdHistory || [])
      setMetrics(res.metrics)
      setThreshForm((prev) => ({
        ...prev,
        new_threshold: res.experiment?.success_threshold || '',
      }))
    }
  }

  // Lifecycle status change
  const handleStatusChange = async (newStatus: ExperimentStatus) => {
    const res = await updateExperimentStatus(experiment.id, newStatus)
    if (res.success) {
      await refreshData()
    } else {
      setActionError(res.error || 'Failed to update status.')
    }
  }

  // Record observation response
  const handleRecordObservation = async (e: React.FormEvent) => {
    e.preventDefault()
    setObsError(null)

    if (!obsForm.respondent_label.trim()) {
      setObsError('Anonymised respondent label is required (e.g. "Retailer A" or "FPO 3").')
      return
    }

    setObsSubmitting(true)
    const res = await recordExperimentResponse({
      experiment_id: experiment.id,
      respondent_label: obsForm.respondent_label.trim(),
      response_type: obsForm.response_type,
      outcome: obsForm.outcome,
      signal_tier: obsForm.signal_tier,
      units_count: Number(obsForm.units_count) || 1,
      financial_value: obsForm.financial_value ? Number(obsForm.financial_value) : undefined,
      notes: obsForm.notes.trim() || undefined,
      rejection_reason: obsForm.rejection_reason.trim() || undefined,
      evidence_url: obsForm.evidence_url.trim() || undefined,
    })
    setObsSubmitting(false)

    if (res.success) {
      setIsObsModalOpen(false)
      setObsForm({
        respondent_label: '',
        response_type: 'interview',
        outcome: 'positive',
        signal_tier: 'reported_interest',
        units_count: 1,
        financial_value: '',
        notes: '',
        rejection_reason: '',
        evidence_url: '',
      })
      await refreshData()
    } else {
      setObsError(res.error || 'Failed to record observation.')
    }
  }

  // Delete observation response
  const handleDeleteResponse = async (respId: string) => {
    const res = await deleteExperimentResponse(respId, experiment.id)
    if (res.success) {
      await refreshData()
    } else {
      setActionError(res.error || 'Failed to delete response.')
    }
  }

  // Update success threshold
  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault()
    setThreshError(null)

    if (!threshForm.new_threshold.trim()) {
      setThreshError('Please provide a new success threshold.')
      return
    }
    if (!threshForm.change_reason.trim() || threshForm.change_reason.trim().length < 5) {
      setThreshError('A documented rationale of at least 5 characters is mandatory.')
      return
    }

    setThreshSubmitting(true)
    const res = await updateExperimentThreshold({
      experiment_id: experiment.id,
      previous_threshold: experiment.success_threshold,
      new_threshold: threshForm.new_threshold.trim(),
      change_reason: threshForm.change_reason.trim(),
    })
    setThreshSubmitting(false)

    if (res.success) {
      setIsThreshModalOpen(false)
      setThreshForm({
        new_threshold: '',
        change_reason: '',
      })
      await refreshData()
    } else {
      setThreshError(res.error || 'Failed to update threshold.')
    }
  }

  const statusCfg = statusBadgeConfig[experiment.status] || statusBadgeConfig.planned
  const StatusIcon = statusCfg.icon
  const interpCfg =
    interpretationConfig[metrics.outcomeInterpretation || 'not_evaluated'] ||
    interpretationConfig.not_evaluated
  const InterpIcon = interpCfg.icon

  const samplePercent = Math.min(
    100,
    Math.round((metrics.validResponses / Math.max(1, metrics.sampleTarget)) * 100)
  )

  return (
    <PageShell>
      {isDemo && (
        <DemoBanner message="Demonstration Mode — Real-time deterministic metrics, sample size guards, and audited threshold change logs." />
      )}

      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/market-validation"
          className="inline-flex items-center text-xs text-[#858783] hover:text-[#F5B94C] transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Market Validation
        </Link>
      </div>

      {actionError && (
        <div className="mb-4 p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* ─── HEADER SECTION ─── */}
      <div className="space-y-3 pb-6 border-b border-[#252729]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusCfg.variant} className="flex items-center gap-1 text-xs">
                <StatusIcon className="h-3.5 w-3.5" />
                <span>{statusCfg.label}</span>
              </Badge>

              <Badge variant="outline" className="text-xs border-[#252729] bg-[#151719] text-[#858783]">
                <MapPin className="mr-1 h-3 w-3 text-[#F5B94C]" />
                {experiment.city}
              </Badge>

              <Badge variant="secondary" className="text-xs bg-[#151719] text-[#858783] border border-[#252729] capitalize">
                {experiment.method.replace('-', ' ')}
              </Badge>

              <Badge className={`border text-xs px-2.5 py-0.5 ${interpCfg.className}`}>
                <InterpIcon className="mr-1 h-3.5 w-3.5" />
                {interpCfg.label}
              </Badge>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[#F5F5F2] tracking-tight">
              {experiment.title}
            </h1>

            {experiment.target_audience && (
              <p className="text-xs text-[#858783] flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#F5B94C]" />
                <span>Audience: {experiment.target_audience}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <AIExperimentFindingsModal
              experimentId={experiment.id}
              experimentTitle={experiment.title}
            />
            {experiment.status === 'planned' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('active')}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs"
              >
                <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                Start Testing
              </Button>
            )}

            {experiment.status === 'active' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('complete')}
                className="bg-[#151719] hover:bg-[#1A2E22] text-[#F5B94C] border border-[#3A3D40] text-xs"
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Complete Experiment
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => setIsObsModalOpen(true)}
              className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold text-xs shadow-lg shadow-[#F5B94C]/20"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Log Observation
            </Button>
          </div>
        </div>

        {/* Experiment Hypothesis Callout */}
        <div className="rounded-xl border border-[#252729] bg-[#101314]/90 p-3.5 text-xs text-[#858783]">
          <span className="font-semibold text-[#F5F5F2]">Hypothesis Statement: </span>
          <span className="text-[#858783]">{experiment.hypothesis}</span>
        </div>
      </div>

      <div className="space-y-6 pt-6">
        {/* ─── LINKED HYPOTHESIS ACCORDION/CARD ─── */}
        {linkedHypothesis && (
          <Card className="border-[#252729] bg-[#101314]/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#F5B94C]" />
                  <CardTitle className="text-sm font-semibold text-[#F5F5F2]">
                    Linked Market Hypothesis
                  </CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className="text-[11px] border-[#3A3D40] bg-[#151719] text-[#F5B94C] capitalize"
                >
                  Status: {linkedHypothesis.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <p className="font-medium text-[#F5F5F2] leading-snug">
                {linkedHypothesis.statement}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 rounded-lg bg-[#151719] border border-[#252729]">
                  <span className="font-semibold text-rose-400">Pain Point / Unmet Need: </span>
                  <span className="text-[#858783]">{linkedHypothesis.problem_statement}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#151719] border border-[#252729]">
                  <span className="font-semibold text-[#F5B94C]">Expected Customer Action: </span>
                  <span className="text-[#858783]">{linkedHypothesis.expected_behavior}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── METRIC DASHBOARD: PROGRESS & RATES ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1 & 2: Calculated Metrics Grid */}
          <div className="lg:col-span-2 space-y-4">
            {/* Progress to Sample Target */}
            <Card className="border-[#252729] bg-[#101314]/90">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#F5F5F2] flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#F5B94C]" />
                    Sample Progress
                  </span>
                  <span className="text-[#858783] font-mono">
                    <strong className="text-[#F5F5F2]">{metrics.validResponses}</strong> /{' '}
                    {metrics.sampleTarget} Target Interviews ({samplePercent}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-[#151719] rounded-full overflow-hidden border border-[#252729]">
                  <div
                    className="h-full bg-[#F5B94C] transition-all duration-300 rounded-full"
                    style={{ width: `${samplePercent}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Deterministic Rate Calculations */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Metric A: Problem Confirmation Rate */}
              <div className="p-3.5 rounded-xl border border-[#252729] bg-[#101314] space-y-1">
                <span className="text-[11px] text-[#858783] font-medium line-clamp-1">
                  Problem Confirmation
                </span>
                <p className="text-lg font-bold text-[#F5F5F2] font-mono">
                  {metrics.problemConfirmationRate.formattedValue}
                </p>
                <p className="text-[10px] text-[#858783]/70">
                  {metrics.problemConfirmationRate.numerator} of{' '}
                  {metrics.problemConfirmationRate.denominator ?? '0'} respondents
                </p>
              </div>

              {/* Metric B: Qualified Lead Rate */}
              <div className="p-3.5 rounded-xl border border-[#252729] bg-[#101314] space-y-1">
                <span className="text-[11px] text-[#858783] font-medium line-clamp-1">
                  Qualified Lead Rate
                </span>
                <p className="text-lg font-bold text-[#F5F5F2] font-mono">
                  {metrics.qualifiedLeadRate.formattedValue}
                </p>
                <p className="text-[10px] text-[#858783]/70">
                  {metrics.qualifiedLeadRate.numerator} of{' '}
                  {metrics.qualifiedLeadRate.denominator ?? '0'} respondents
                </p>
              </div>

              {/* Metric C: Paid Conversion Rate */}
              <div className="p-3.5 rounded-xl border border-[#252729] bg-[#101314] space-y-1">
                <span className="text-[11px] text-[#F5B94C] font-medium line-clamp-1">
                  Paid Conversion
                </span>
                <p className="text-lg font-bold text-[#F5B94C] font-mono">
                  {metrics.paidConversionRate.formattedValue}
                </p>
                <p className="text-[10px] text-[#858783]/70">
                  {metrics.paidConversionRate.numerator} of{' '}
                  {metrics.paidConversionRate.denominator ?? '0'} respondents
                </p>
              </div>

              {/* Metric D: Response Rate */}
              <div className="p-3.5 rounded-xl border border-[#252729] bg-[#101314] space-y-1">
                <span className="text-[11px] text-[#858783] font-medium line-clamp-1">
                  Response Outreach
                </span>
                <p className="text-lg font-bold text-[#F5F5F2] font-mono">
                  {metrics.responseRate.formattedValue}
                </p>
                <p className="text-[10px] text-[#858783]/70">
                  {metrics.responseRate.numerator} of{' '}
                  {metrics.responseRate.denominator ?? '0'} target sample
                </p>
              </div>
            </div>

            {/* Signal Tiers Breakdown Strip */}
            <Card className="border-[#252729] bg-[#101314]/90">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#F5F5F2] flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#F5B94C]" />
                    Commercial Signal Tiers
                  </span>
                  {metrics.totalFinancialValue > 0 && (
                    <span className="text-[#F5B94C] font-mono font-semibold flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" />
                      ₹{metrics.totalFinancialValue.toLocaleString('en-IN')} Committed Value
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="px-2.5 py-1 rounded-lg border border-[#252729] bg-[#151719] flex items-center gap-1.5">
                    <span className="text-[#858783]">Paid Orders:</span>
                    <strong className="text-[#F5B94C] font-mono">
                      {metrics.paidOrdersCount}
                    </strong>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg border border-[#252729] bg-[#151719] flex items-center gap-1.5">
                    <span className="text-[#858783]">Qualified Leads:</span>
                    <strong className="text-[#FFD27A] font-mono">
                      {metrics.qualifiedLeadsCount}
                    </strong>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg border border-[#252729] bg-[#151719] flex items-center gap-1.5">
                    <span className="text-[#858783]">Signups / Waitlist:</span>
                    <strong className="text-[#F5F5F2] font-mono">
                      {metrics.signupsCount}
                    </strong>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg border border-[#252729] bg-[#151719] flex items-center gap-1.5">
                    <span className="text-[#858783]">Reported Interest:</span>
                    <strong className="text-[#858783] font-mono">
                      {metrics.reportedInterestCount}
                    </strong>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg border border-[#252729] bg-[#151719] flex items-center gap-1.5">
                    <span className="text-[#858783]">Objections:</span>
                    <strong className="text-rose-400 font-mono">
                      {metrics.objectionsCount}
                    </strong>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Threshold Evaluation Gauge Card */}
          <div className="space-y-4">
            <Card className="border-[#252729] bg-[#101314] h-full flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-[#F5B94C]" />
                    <CardTitle className="text-sm font-semibold text-[#F5F5F2]">
                      Threshold Evaluation
                    </CardTitle>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsThreshModalOpen(true)}
                    className="text-[11px] text-[#858783] hover:text-[#F5B94C] h-7 px-2"
                  >
                    Edit Threshold
                  </Button>
                </div>
                <CardDescription className="text-xs text-[#858783]">
                  Target: {experiment.success_threshold}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 flex-1">
                {/* Visual Gauge Box */}
                <div className="p-4 rounded-xl border border-[#252729] bg-[#151719] text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <InterpIcon className="h-5 w-5 text-[#F5B94C]" />
                    <span className="text-sm font-bold text-[#F5F5F2] uppercase tracking-wider">
                      {interpCfg.label}
                    </span>
                  </div>

                  <div className="pt-1">
                    <div className="text-2xl font-black text-[#F5F5F2] font-mono">
                      {metrics.targetMetricValue !== null
                        ? `${metrics.targetMetricValue}${metrics.thresholdUnit}`
                        : 'N/A'}
                    </div>
                    <span className="text-[11px] text-[#858783]">
                      Actual Metric vs Target ({metrics.thresholdOperator} {metrics.thresholdTarget}
                      {metrics.thresholdUnit})
                    </span>
                  </div>

                  <p className="text-[11px] text-[#858783] leading-snug pt-2 border-t border-[#252729]">
                    {metrics.interpretationReason}
                  </p>
                </div>

                {/* Sample Guard Badge */}
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg border border-[#252729] bg-[#151719]">
                  <span className="text-[#858783]">Minimum Sample Guard:</span>
                  <span className="font-mono text-[#F5F5F2]">
                    {metrics.validResponses} / {metrics.minSampleRequired}{' '}
                    {metrics.sampleSufficient ? (
                      <span className="text-[#F5B94C] font-semibold">(Guarded)</span>
                    ) : (
                      <span className="text-amber-400 font-semibold">(Insufficient)</span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── THRESHOLD HISTORY AUDIT LOG ─── */}
        {thresholdHistory.length > 0 && (
          <Card className="border-[#252729] bg-[#101314]/90">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#F5B94C]" />
                <CardTitle className="text-sm font-semibold text-[#F5F5F2]">
                  Threshold Change History (Audit Log)
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-[#858783]">
                To guarantee statistical integrity, all modifications to success criteria require documented rationale.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-[#252729] text-xs">
                {thresholdHistory.map((h) => (
                  <div key={h.id} className="py-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono text-[#F5F5F2]">
                        <span className="line-through text-[#858783]/60">{h.previous_threshold}</span>
                        <span className="text-[#858783]">→</span>
                        <strong className="text-[#F5B94C] font-semibold">{h.new_threshold}</strong>
                      </div>
                      <p className="text-[#858783] italic">
                        <span className="font-semibold text-[#858783]/70">Reason: </span>
                        {h.change_reason}
                      </p>
                    </div>
                    <span className="text-[10px] text-[#858783]/60 whitespace-nowrap">
                      {formatDate(h.changed_at)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── OBSERVATIONS & RESPONSES TABLE ─── */}
        <Card className="border-[#252729] bg-[#101314]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base text-[#F5F5F2]">
                Recorded Observations ({responses.length})
              </CardTitle>
              <CardDescription className="text-xs text-[#858783]">
                Ground-truth customer responses, interview transcripts, and paid pilot commitments.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setIsObsModalOpen(true)}
              className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold text-xs shadow-lg shadow-[#F5B94C]/20"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Log Observation
            </Button>
          </CardHeader>

          <CardContent>
            {responses.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <FlaskConical className="h-8 w-8 text-[#858783]/50 mx-auto" />
                <p className="text-xs text-[#858783]">
                  No responses recorded yet. Conduct your first customer interview or survey to start evaluating the hypothesis.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsObsModalOpen(true)}
                  className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold text-xs"
                >
                  Log First Response
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#858783]">
                  <thead className="bg-[#151719] text-[#858783] uppercase text-[10px] tracking-wider border-b border-[#252729]">
                    <tr>
                      <th className="py-2.5 px-3">Respondent Label</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Outcome</th>
                      <th className="py-2.5 px-3">Signal Tier</th>
                      <th className="py-2.5 px-3">Value</th>
                      <th className="py-2.5 px-3">Notes / Objections</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252729]">
                    {responses.map((r) => {
                      const outCfg = outcomeConfig[r.outcome] || outcomeConfig.neutral
                      const tierCfg =
                        signalTierConfig[r.signal_tier || 'reported_interest'] ||
                        signalTierConfig.reported_interest

                      return (
                        <tr key={r.id} className="hover:bg-[#151719]/50 transition-colors">
                          <td className="py-3 px-3 font-medium text-[#F5F5F2]">
                            {r.respondent_label}
                          </td>
                          <td className="py-3 px-3 capitalize text-[#858783]">
                            {r.response_type.replace('-', ' ')}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={outCfg.variant} className="text-[10px] capitalize">
                              {outCfg.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] border ${tierCfg.className}`}
                            >
                              {tierCfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[#F5B94C] font-medium">
                            {r.financial_value ? `₹${Number(r.financial_value).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate text-[#858783]">
                            {r.rejection_reason ? (
                              <span className="text-rose-400 font-medium">
                                Objection: {r.rejection_reason}
                              </span>
                            ) : (
                              r.notes || '—'
                            )}
                          </td>
                          <td className="py-3 px-3 text-[#858783]/60 whitespace-nowrap">
                            {formatDate(r.recorded_at)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteResponse(r.id)}
                              className="text-[#858783] hover:text-rose-400 p-1 transition-colors"
                              title="Delete response"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── MODAL: LOG OBSERVATION / RESPONSE ─── */}
      {isObsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#3A3D40] bg-[#101314] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#252729] px-6 py-4 bg-[#151719]">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#F5B94C]" />
                <h3 className="text-base font-semibold text-[#F5F5F2]">Log Field Observation</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsObsModalOpen(false)}
                className="text-[#858783] hover:text-[#F5F5F2] p-1 rounded-lg hover:bg-[#151719]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordObservation} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {obsError && (
                <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{obsError}</span>
                </div>
              )}

              {/* Privacy Warning */}
              <div className="p-3 rounded-lg border border-[#3A3D40] bg-[#151719]/60 text-xs text-[#858783] flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#F5B94C]" />
                <span>
                  <strong className="text-[#F5F5F2]">Privacy Rule:</strong> Do not enter personally identifiable phone numbers or email addresses. Use anonymised cohort labels (e.g. &ldquo;FPO Baramati 02&rdquo; or &ldquo;Retailer Indiranagar 01&rdquo;).
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="obs-label" className="text-xs text-[#F5F5F2] font-medium">
                    Respondent Label *
                  </Label>
                  <Input
                    id="obs-label"
                    placeholder="e.g. Retailer A, FPO Nashik 4"
                    value={obsForm.respondent_label}
                    onChange={(e) => setObsForm({ ...obsForm, respondent_label: e.target.value })}
                    className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] focus:border-[#F5B94C]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="obs-type" className="text-xs text-[#F5F5F2] font-medium">
                    Interaction Type
                  </Label>
                  <Select
                    id="obs-type"
                    value={obsForm.response_type}
                    onChange={(e) =>
                      setObsForm({ ...obsForm, response_type: e.target.value as ResponseType })
                    }
                    className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] capitalize focus:border-[#F5B94C]"
                  >
                    <option value="interview">1-on-1 Interview</option>
                    <option value="survey-submission">Survey Submission</option>
                    <option value="observation">On-site Observation</option>
                    <option value="purchase">Purchase / Order</option>
                    <option value="signup">Waitlist Signup</option>
                    <option value="lead">Qualified Lead</option>
                    <option value="inquiry">Inquiry</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="obs-outcome" className="text-xs text-[#F5F5F2] font-medium">
                    Outcome
                  </Label>
                  <Select
                    id="obs-outcome"
                    value={obsForm.outcome}
                    onChange={(e) =>
                      setObsForm({ ...obsForm, outcome: e.target.value as OutcomeType })
                    }
                    className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] focus:border-[#F5B94C]"
                  >
                    <option value="positive">Positive (Problem confirmed / Demand shown)</option>
                    <option value="negative">Negative (Problem unconfirmed / Objection)</option>
                    <option value="neutral">Neutral (Indifferent / Undecided)</option>
                    <option value="inconclusive">Inconclusive</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="obs-signal" className="text-xs text-[#F5F5F2] font-medium">
                    Signal Tier *
                  </Label>
                  <Select
                    id="obs-signal"
                    value={obsForm.signal_tier}
                    onChange={(e) =>
                      setObsForm({ ...obsForm, signal_tier: e.target.value as SignalTier })
                    }
                    className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] focus:border-[#F5B94C]"
                  >
                    <option value="paid_order">Paid Order / Deposit (Highest Signal)</option>
                    <option value="repeat_purchase">Repeat Purchase</option>
                    <option value="qualified_lead">Qualified Lead (Procurement Review)</option>
                    <option value="signup">Waitlist / Pre-registration</option>
                    <option value="reported_interest">Reported Interest (Verbal Agreement)</option>
                    <option value="objection">Commercial Objection</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="obs-val" className="text-xs text-[#F5F5F2] font-medium">
                    Financial Commitment (₹ Value, Optional)
                  </Label>
                  <Input
                    id="obs-val"
                    type="number"
                    min={0}
                    placeholder="e.g. 5400"
                    value={obsForm.financial_value}
                    onChange={(e) => setObsForm({ ...obsForm, financial_value: e.target.value })}
                    className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] font-mono focus:border-[#F5B94C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="obs-units" className="text-xs text-[#F5F5F2] font-medium">
                    Units / Quantity
                  </Label>
                  <Input
                    id="obs-units"
                    type="number"
                    min={1}
                    value={obsForm.units_count}
                    onChange={(e) => setObsForm({ ...obsForm, units_count: Number(e.target.value) })}
                    className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] focus:border-[#F5B94C]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="obs-notes" className="text-xs text-[#F5F5F2] font-medium">
                  Observations / Evidence Notes
                </Label>
                <Textarea
                  id="obs-notes"
                  rows={3}
                  placeholder="Summarize key quotes, specific pain points mentioned, or trial requirements..."
                  value={obsForm.notes}
                  onChange={(e) => setObsForm({ ...obsForm, notes: e.target.value })}
                  className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] focus:border-[#F5B94C]"
                />
              </div>

              {obsForm.outcome === 'negative' && (
                <div className="space-y-1.5">
                  <Label htmlFor="obs-rejection" className="text-xs text-rose-300 font-medium">
                    Rejection / Objection Rationale
                  </Label>
                  <Input
                    id="obs-rejection"
                    placeholder="e.g. Price too high, legacy vendor contract, lack of budget"
                    value={obsForm.rejection_reason}
                    onChange={(e) => setObsForm({ ...obsForm, rejection_reason: e.target.value })}
                    className="bg-[#151719] border-rose-500/40 text-[#F5F5F2] text-sm focus:border-rose-400"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-[#252729] pt-4 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsObsModalOpen(false)}
                  disabled={obsSubmitting}
                  className="text-[#858783] hover:text-[#F5F5F2]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={obsSubmitting}
                  className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold min-w-[140px] shadow-lg shadow-[#F5B94C]/20"
                >
                  {obsSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Record Observation'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: UPDATE SUCCESS THRESHOLD ─── */}
      {isThreshModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#3A3D40] bg-[#101314] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#252729] px-6 py-4 bg-[#151719]">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#F5B94C]" />
                <h3 className="text-base font-semibold text-[#F5F5F2]">Adjust Success Threshold</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsThreshModalOpen(false)}
                className="text-[#858783] hover:text-[#F5F5F2] p-1 rounded-lg hover:bg-[#151719]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateThreshold} className="p-6 space-y-4">
              {threshError && (
                <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{threshError}</span>
                </div>
              )}

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong>Threshold Audit Integrity:</strong> To prevent moving the goalposts post-hoc, this modification and your rationale will be recorded in the threshold audit log.
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-[#858783]">Current Threshold:</span>
                <p className="font-mono text-[#F5F5F2] bg-[#151719] p-2 rounded border border-[#252729]">
                  {experiment.success_threshold}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-threshold" className="text-xs text-[#F5F5F2] font-medium">
                  New Success Threshold *
                </Label>
                <Input
                  id="new-threshold"
                  value={threshForm.new_threshold}
                  onChange={(e) => setThreshForm({ ...threshForm, new_threshold: e.target.value })}
                  placeholder="e.g. >= 60% qualified lead rate (min sample: 15)"
                  className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] font-mono focus:border-[#F5B94C]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="change-reason" className="text-xs text-[#F5F5F2] font-medium">
                  Mandatory Change Rationale *
                </Label>
                <Textarea
                  id="change-reason"
                  rows={3}
                  value={threshForm.change_reason}
                  onChange={(e) => setThreshForm({ ...threshForm, change_reason: e.target.value })}
                  placeholder="Explain why the threshold is being updated (e.g. Advisory board raised commercial hurdle rate; revised sample target)..."
                  className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] focus:border-[#F5B94C]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#252729] pt-4 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsThreshModalOpen(false)}
                  disabled={threshSubmitting}
                  className="text-[#858783] hover:text-[#F5F5F2]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={threshSubmitting}
                  className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold min-w-[140px] shadow-lg shadow-[#F5B94C]/20"
                >
                  {threshSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Record Threshold'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}
