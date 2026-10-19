'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { PageShell, PageHeader } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DemoBanner } from '@/components/shared/DemoBanner'
import type {
  Experiment,
  ExperimentStatus,
  Hypothesis,
  HypothesisStatus,
  OutcomeInterpretation,
} from '@/types/database'
import {
  FlaskConical,
  Plus,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  AlertTriangle,
  MapPin,
  Users,
  Target,
  ArrowRight,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react'
import { createHypothesis, updateHypothesisStatus } from '@/lib/actions/marketValidation'
import { formatDate } from '@/lib/utils'
import { AIHypothesisDrafterModal } from '@/components/ai/AIHypothesisDrafterModal'

interface MarketValidationClientProps {
  initialExperiments: Experiment[]
  initialHypotheses: Hypothesis[]
  isDemo: boolean
}

const experimentStatusConfig: Record<
  ExperimentStatus,
  { label: string; variant: 'secondary' | 'warning' | 'success' | 'destructive'; icon: typeof Clock }
> = {
  planned: { label: 'Planned', variant: 'secondary', icon: Clock },
  active: { label: 'Active', variant: 'warning', icon: PlayCircle },
  running: { label: 'Running', variant: 'warning', icon: PlayCircle },
  complete: { label: 'Complete', variant: 'success', icon: CheckCircle2 },
  completed: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
  draft: { label: 'Draft', variant: 'secondary', icon: Clock },
}

const hypothesisStatusConfig: Record<
  HypothesisStatus,
  { label: string; className: string; bgClass: string; icon: typeof CheckCircle2 }
> = {
  untested: {
    label: 'Untested',
    className: 'text-slate-400 border-slate-700 bg-slate-800/60',
    bgClass: 'bg-slate-500/10 text-slate-400',
    icon: Clock,
  },
  testing: {
    label: 'Testing Active',
    className: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
    bgClass: 'bg-amber-500/10 text-amber-400',
    icon: PlayCircle,
  },
  supported: {
    label: 'Supported',
    className: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
    bgClass: 'bg-emerald-500/10 text-emerald-400',
    icon: CheckCircle2,
  },
  challenged: {
    label: 'Challenged',
    className: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
    bgClass: 'bg-rose-500/10 text-rose-400',
    icon: AlertTriangle,
  },
  inconclusive: {
    label: 'Inconclusive',
    className: 'text-purple-300 border-purple-500/40 bg-purple-500/10',
    bgClass: 'bg-purple-500/10 text-purple-400',
    icon: HelpCircle,
  },
}

const outcomeConfig: Record<
  OutcomeInterpretation,
  { label: string; className: string }
> = {
  threshold_met: {
    label: 'Threshold Met',
    className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40',
  },
  threshold_not_met: {
    label: 'Below Threshold',
    className: 'bg-rose-500/15 text-rose-300 border border-rose-500/40',
  },
  insufficient_sample: {
    label: 'Sample In Progress',
    className: 'bg-amber-500/15 text-amber-300 border border-amber-500/40',
  },
  inconclusive: {
    label: 'Inconclusive',
    className: 'bg-purple-500/15 text-purple-300 border border-purple-500/40',
  },
  not_evaluated: {
    label: 'Not Evaluated',
    className: 'bg-slate-800 text-slate-400 border border-slate-700',
  },
}

const methodLabels: Record<string, string> = {
  interview: 'Stakeholder Interview',
  survey: 'Structured Survey',
  'retailer-outreach': 'Retailer Outreach',
  'distributor-outreach': 'Distributor Outreach',
  'landing-page': 'Landing Page Intent',
  pilot: 'Field Pilot Trial',
  'paid-trial': 'Paid Pilot Trial',
  other: 'Validation Experiment',
}

export function MarketValidationClient({
  initialExperiments,
  initialHypotheses,
  isDemo,
}: MarketValidationClientProps) {
  const [activeTab, setActiveTab] = useState<'experiments' | 'hypotheses'>('experiments')
  const [cityFilter, setCityFilter] = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  const [experiments] = useState<Experiment[]>(initialExperiments)
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>(initialHypotheses)

  // Hypothesis modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [hypForm, setHypForm] = useState({
    city: 'Pune',
    target_audience: '',
    statement: '',
    problem_statement: '',
    expected_behavior: '',
    strategic_rationale: '',
  })

  // Cities extracted from items
  const allCities = Array.from(
    new Set([
      'Pune',
      'Bengaluru',
      'Indore',
      'Hyderabad',
      ...experiments.map((e) => e.city),
      ...hypotheses.map((h) => h.city),
    ])
  ).filter(Boolean)

  // Filtered lists
  const filteredExperiments = experiments.filter((e) => {
    const matchCity = cityFilter === 'All' || e.city.toLowerCase() === cityFilter.toLowerCase()
    const matchStatus = statusFilter === 'All' || e.status === statusFilter
    return matchCity && matchStatus
  })

  const filteredHypotheses = hypotheses.filter((h) => {
    const matchCity = cityFilter === 'All' || h.city.toLowerCase() === cityFilter.toLowerCase()
    const matchStatus = statusFilter === 'All' || h.status === statusFilter
    return matchCity && matchStatus
  })

  const handleCreateHypothesis = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    if (!hypForm.statement.trim() || hypForm.statement.trim().length < 10) {
      setModalError('Hypothesis statement must be at least 10 characters.')
      return
    }
    if (!hypForm.target_audience.trim()) {
      setModalError('Target customer segment is required.')
      return
    }
    if (!hypForm.problem_statement.trim() || hypForm.problem_statement.trim().length < 10) {
      setModalError('Problem statement must be at least 10 characters.')
      return
    }
    if (!hypForm.expected_behavior.trim() || hypForm.expected_behavior.trim().length < 10) {
      setModalError('Expected customer behavior must be at least 10 characters.')
      return
    }

    setModalLoading(true)
    const res = await createHypothesis({
      city: hypForm.city,
      target_audience: hypForm.target_audience.trim(),
      statement: hypForm.statement.trim(),
      problem_statement: hypForm.problem_statement.trim(),
      expected_behavior: hypForm.expected_behavior.trim(),
      strategic_rationale: hypForm.strategic_rationale.trim() || undefined,
      status: 'untested',
    })

    setModalLoading(false)

    if (res.success && res.data) {
      setHypotheses([res.data, ...hypotheses])
      setIsModalOpen(false)
      setHypForm({
        city: 'Pune',
        target_audience: '',
        statement: '',
        problem_statement: '',
        expected_behavior: '',
        strategic_rationale: '',
      })
      setActiveTab('hypotheses')
    } else {
      setModalError(res.error || 'Failed to create hypothesis.')
    }
  }

  const handleStatusChange = async (hypId: string, newStatus: HypothesisStatus) => {
    const res = await updateHypothesisStatus(hypId, newStatus)
    if (res.success && res.data) {
      setHypotheses((prev) => prev.map((h) => (h.id === hypId ? res.data! : h)))
    }
  }

  return (
    <PageShell>
      {isDemo && (
        <DemoBanner message="Demonstration Mode — Displaying structured market validation experiments, deterministic threshold metrics, and audited hypotheses." />
      )}

      <PageHeader
        title="Local Market Validation"
        description="Falsifiable market hypotheses and structured field experiments with deterministic success thresholds to prove commercial demand before expanding."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <AIHypothesisDrafterModal
              city={cityFilter !== 'All' ? cityFilter : 'Pune'}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="border-[#252729] bg-[#101314] hover:bg-[#151719] hover:border-[#F5B94C]/50 text-[#F5F5F2]"
            >
              <Plus className="mr-1.5 h-4 w-4 text-[#F5B94C]" />
              New Hypothesis
            </Button>
            <Link href="/market-validation/new">
              <Button size="sm" className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold shadow-lg shadow-[#F5B94C]/20">
                <FlaskConical className="mr-1.5 h-4 w-4" />
                New Experiment
              </Button>
            </Link>
          </div>
        }
      />

      {/* Tabs and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#252729] pb-3">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#101314] rounded-xl border border-[#252729] max-w-fit">
            <button
              type="button"
              onClick={() => {
                setActiveTab('experiments')
                setStatusFilter('All')
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'experiments'
                  ? 'bg-[#151719] text-[#F5B94C] border border-[#3A3D40] shadow-sm'
                  : 'text-[#858783] hover:text-[#F5F5F2] hover:bg-[#151719]'
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Experiments</span>
              <span className="ml-1 rounded-full bg-[#151719] px-1.5 py-0.2 text-[10px] text-[#858783] border border-[#252729]">
                {experiments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('hypotheses')
                setStatusFilter('All')
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'hypotheses'
                  ? 'bg-[#151719] text-[#F5B94C] border border-[#3A3D40] shadow-sm'
                  : 'text-[#858783] hover:text-[#F5F5F2] hover:bg-[#151719]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Market Hypotheses</span>
              <span className="ml-1 rounded-full bg-[#151719] px-1.5 py-0.2 text-[10px] text-[#858783] border border-[#252729]">
                {hypotheses.length}
              </span>
            </button>
          </div>

          {/* City & Status Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#858783]">City:</span>
              <Select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="h-8 w-36 text-xs bg-[#151719] border-[#252729] text-[#F5F5F2]"
              >
                <option value="All">All Cities</option>
                {allCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#858783]">Status:</span>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 w-36 text-xs bg-[#151719] border-[#252729] text-[#F5F5F2]"
              >
                <option value="All">All Statuses</option>
                {activeTab === 'experiments' ? (
                  <>
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="complete">Complete</option>
                    <option value="cancelled">Cancelled</option>
                  </>
                ) : (
                  <>
                    <option value="untested">Untested</option>
                    <option value="testing">Testing Active</option>
                    <option value="supported">Supported</option>
                    <option value="challenged">Challenged</option>
                    <option value="inconclusive">Inconclusive</option>
                  </>
                )}
              </Select>
            </div>
          </div>
        </div>

        {/* ─── TAB A: EXPERIMENTS ─── */}
        {activeTab === 'experiments' && (
          <div>
            {filteredExperiments.length === 0 ? (
              <EmptyState
                icon={FlaskConical}
                title="No experiments match your criteria"
                description="Create a structured field experiment with defined success thresholds to test willingness-to-pay and procurement hurdles."
                action={
                  <Link href="/market-validation/new">
                    <Button size="sm" className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold">
                      Create First Experiment
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4">
                {filteredExperiments.map((exp) => {
                  const cfg = experimentStatusConfig[exp.status] || experimentStatusConfig.planned
                  const StatusIcon = cfg.icon
                  const outcome =
                    outcomeConfig[exp.outcome_interpretation || 'not_evaluated'] ||
                    outcomeConfig.not_evaluated

                  return (
                    <Card
                      key={exp.id}
                      className="group relative border-[#252729] bg-[#101314] transition-all duration-200 hover:border-[#F5B94C]/40 hover:shadow-[0_0_15px_rgba(101,240,120,0.06)]"
                    >
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          {/* Left Column: Details */}
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={cfg.variant} className="flex items-center gap-1 text-[11px]">
                                <StatusIcon className="h-3 w-3" />
                                <span>{cfg.label}</span>
                              </Badge>

                              <Badge variant="outline" className="text-[11px] border-[#252729] bg-[#151719] text-[#858783]">
                                <MapPin className="mr-1 h-3 w-3 text-[#F5B94C]" />
                                {exp.city}
                              </Badge>

                              <Badge variant="secondary" className="text-[11px] bg-[#151719] text-[#858783] border border-[#252729]">
                                {methodLabels[exp.method] || exp.method}
                              </Badge>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${outcome.className}`}>
                                {outcome.label}
                              </span>
                            </div>

                            <Link href={`/market-validation/${exp.id}`}>
                              <h3 className="text-base font-semibold text-[#F5F5F2] group-hover:text-[#F5B94C] transition-colors cursor-pointer mt-1">
                                {exp.title}
                              </h3>
                            </Link>

                            <p className="text-xs text-[#858783] leading-relaxed bg-[#151719] p-2.5 rounded-lg border border-[#252729]">
                              <span className="font-semibold text-[#F5F5F2]">Hypothesis: </span>
                              {exp.hypothesis}
                            </p>

                            {/* Structured Threshold Criteria Box */}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-[#858783] pt-1">
                              <div className="flex items-center gap-1.5">
                                <Target className="h-3.5 w-3.5 text-[#F5B94C]" />
                                <span>
                                  Success Threshold:{' '}
                                  <strong className="text-[#F5F5F2] font-medium">
                                    {exp.success_threshold}
                                  </strong>
                                </span>
                              </div>

                              {exp.sample_size_target && (
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5 text-[#F5B94C]" />
                                  <span>
                                    Target Sample:{' '}
                                    <strong className="text-[#F5F5F2] font-medium">
                                      {exp.sample_size_target} interviews / responses
                                    </strong>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Column: Actions & Timestamps */}
                          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 border-t md:border-t-0 border-[#252729] pt-3 md:pt-0">
                            <span className="text-[11px] text-[#858783] whitespace-nowrap">
                              Updated {formatDate(exp.updated_at || exp.created_at)}
                            </span>

                            <Link href={`/market-validation/${exp.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#252729] bg-[#151719] hover:bg-[#151719] hover:border-[#F5B94C]/50 hover:text-[#F5B94C] text-[#F5F5F2] text-xs"
                              >
                                View Details & Data
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB B: MARKET HYPOTHESES ─── */}
        {activeTab === 'hypotheses' && (
          <div>
            {filteredHypotheses.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No market hypotheses found"
                description="Formulate clear, falsifiable assumptions about target customer willingness to pay and behavior before running expensive trials."
                action={
                  <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold">
                    Create First Hypothesis
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4">
                {filteredHypotheses.map((hyp) => {
                  const cfg = hypothesisStatusConfig[hyp.status] || hypothesisStatusConfig.untested
                  const StatusIcon = cfg.icon

                  return (
                    <Card
                      key={hyp.id}
                      className="border-[#252729] bg-[#101314] transition-all duration-200 hover:border-[#F5B94C]/40 hover:shadow-[0_0_15px_rgba(101,240,120,0.06)]"
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={`border text-xs px-2.5 py-0.5 ${cfg.className}`}>
                                <StatusIcon className="mr-1 h-3.5 w-3.5" />
                                {cfg.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-[#252729] bg-[#151719] text-[#858783]">
                                <MapPin className="mr-1 h-3 w-3 text-[#F5B94C]" />
                                {hyp.city}
                              </Badge>
                              <Badge variant="secondary" className="text-xs bg-[#151719] text-[#858783] border border-[#252729]">
                                <Users className="mr-1 h-3 w-3 text-[#F5B94C]" />
                                {hyp.target_audience}
                              </Badge>
                            </div>

                            <h3 className="text-base font-semibold text-[#F5F5F2] leading-snug pt-1">
                              {hyp.statement}
                            </h3>
                          </div>

                          {/* Quick Lifecycle Status Switcher */}
                          <div className="flex items-center gap-2 self-start">
                            <span className="text-[11px] text-[#858783] whitespace-nowrap">Status:</span>
                            <Select
                              value={hyp.status}
                              onChange={(e) => handleStatusChange(hyp.id, e.target.value as HypothesisStatus)}
                              className="h-8 w-32 text-xs bg-[#151719] border-[#252729] text-[#F5F5F2]"
                            >
                              <option value="untested">Untested</option>
                              <option value="testing">Testing Active</option>
                              <option value="supported">Supported</option>
                              <option value="challenged">Challenged</option>
                              <option value="inconclusive">Inconclusive</option>
                            </Select>
                          </div>
                        </div>

                        {/* Problem & Expected Behavior breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="rounded-lg border border-[#252729] bg-[#151719] p-3">
                            <span className="font-semibold text-rose-400 flex items-center gap-1.5 mb-1">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Problem / Unmet Need
                            </span>
                            <p className="text-[#858783] leading-relaxed">{hyp.problem_statement}</p>
                          </div>

                          <div className="rounded-lg border border-[#252729] bg-[#151719] p-3">
                            <span className="font-semibold text-[#F5B94C] flex items-center gap-1.5 mb-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Expected Customer Behavior
                            </span>
                            <p className="text-[#858783] leading-relaxed">{hyp.expected_behavior}</p>
                          </div>
                        </div>

                        {hyp.strategic_rationale && (
                          <p className="text-xs text-[#858783] italic">
                            <span className="font-medium text-[#858783]/70">Rationale: </span>
                            {hyp.strategic_rationale}
                          </p>
                        )}

                        <div className="flex items-center justify-between border-t border-[#252729] pt-3">
                          <span className="text-[11px] text-[#858783]">
                            Created {formatDate(hyp.created_at)}
                          </span>

                          <Link
                            href={`/market-validation/new?hypothesis_id=${hyp.id}&city=${encodeURIComponent(
                              hyp.city
                            )}`}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-[#F5B94C] hover:text-[#FFD27A] hover:bg-[#151719]"
                            >
                              Launch Experiment for this Hypothesis →
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODAL: CREATE HYPOTHESIS ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[#3A3D40] bg-[#101314] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#252729] px-6 py-4 bg-[#151719]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#151719] text-[#F5B94C] border border-[#3A3D40]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#F5F5F2]">New Market Hypothesis</h3>
                  <p className="text-xs text-[#858783]">
                    Define a clear, falsifiable demand assumption before spending budget on field trials.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#858783] hover:text-[#F5F5F2] p-1 rounded-lg hover:bg-[#151719]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHypothesis} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {modalError && (
                <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="hyp-city" className="text-xs text-[#F5F5F2] font-medium">
                    Target City *
                  </Label>
                  <Select
                    id="hyp-city"
                    value={hypForm.city}
                    onChange={(e) => setHypForm({ ...hypForm, city: e.target.value })}
                    className="bg-[#151719] border-[#252729] text-[#F5F5F2] text-sm focus:border-[#F5B94C]"
                  >
                    {allCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hyp-audience" className="text-xs text-[#F5F5F2] font-medium">
                    Target Customer Segment / Audience *
                  </Label>
                  <Input
                    id="hyp-audience"
                    placeholder="e.g. FPO Directors, Supermarket Category Heads"
                    value={hypForm.target_audience}
                    onChange={(e) => setHypForm({ ...hypForm, target_audience: e.target.value })}
                    className="bg-[#151719] border-[#252729] text-[#F5F5F2] text-sm focus:border-[#F5B94C]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hyp-statement" className="text-xs text-[#F5F5F2] font-medium">
                  Hypothesis Statement *
                </Label>
                <Textarea
                  id="hyp-statement"
                  rows={2}
                  placeholder="e.g. FPO directors in Pune will commit ₹450/month per storage pod for mobile temperature telemetry."
                  value={hypForm.statement}
                  onChange={(e) => setHypForm({ ...hypForm, statement: e.target.value })}
                  className="bg-[#151719] border-[#252729] text-[#F5F5F2] text-sm focus:border-[#F5B94C]"
                  required
                />
                <p className="text-[11px] text-[#858783]">
                  State the assumption clearly so it can be proven true or false with field data.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="hyp-problem" className="text-xs text-[#F5F5F2] font-medium">
                    Problem / Pain Point *
                  </Label>
                  <Textarea
                    id="hyp-problem"
                    rows={3}
                    placeholder="Describe the current loss, expense, or operational friction the customer experiences..."
                    value={hypForm.problem_statement}
                    onChange={(e) => setHypForm({ ...hypForm, problem_statement: e.target.value })}
                    className="bg-[#151719] border-[#252729] text-[#F5F5F2] text-sm focus:border-[#F5B94C]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hyp-behavior" className="text-xs text-[#F5F5F2] font-medium">
                    Expected Behavior *
                  </Label>
                  <Textarea
                    id="hyp-behavior"
                    rows={3}
                    placeholder="What specific action will prove they need and will pay for your solution? (e.g. sign paid pilot, prepay subscription)..."
                    value={hypForm.expected_behavior}
                    onChange={(e) => setHypForm({ ...hypForm, expected_behavior: e.target.value })}
                    className="bg-[#151719] border-[#252729] text-[#F5F5F2] text-sm focus:border-[#F5B94C]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hyp-rationale" className="text-xs text-[#F5F5F2] font-medium">
                  Strategic Rationale (Optional)
                </Label>
                <Input
                  id="hyp-rationale"
                  placeholder="Why is proving this hypothesis critical to your city expansion roadmap?"
                  value={hypForm.strategic_rationale}
                  onChange={(e) => setHypForm({ ...hypForm, strategic_rationale: e.target.value })}
                  className="bg-[#151719] border-[#252729] text-[#F5F5F2] text-sm focus:border-[#F5B94C]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#252729] pt-4 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalLoading}
                  className="text-[#858783] hover:text-[#F5F5F2]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={modalLoading}
                  className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold min-w-[140px] shadow-lg shadow-[#F5B94C]/20"
                >
                  {modalLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Hypothesis'
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
