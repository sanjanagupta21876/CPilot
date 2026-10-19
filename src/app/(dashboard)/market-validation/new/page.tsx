'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageShell, PageHeader } from '@/components/layout/PageShell'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SUPPORTED_CITIES } from '@/lib/data/cityData'
import { experimentSchema } from '@/lib/validations/schemas'
import type {
  ExperimentMethod,
  Hypothesis,
  ThresholdOperator,
  ThresholdUnit,
} from '@/types/database'
import {
  FlaskConical,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Target,
  Sparkles,
} from 'lucide-react'
import { createExperiment, getHypotheses } from '@/lib/actions/marketValidation'
import { AIHypothesisDrafterModal } from '@/components/ai/AIHypothesisDrafterModal'

const methodOptions: { value: ExperimentMethod; label: string; desc: string; icon: string }[] = [
  {
    value: 'survey',
    label: 'Structured Survey',
    desc: 'Quantitative questionnaire assessing problem severity and price sensitivity.',
    icon: '📋',
  },
  {
    value: 'interview',
    label: 'Customer / Stakeholder Interview',
    desc: 'In-depth 1-on-1 interviews with target buyers or operational gatekeepers.',
    icon: '🎙️',
  },
  {
    value: 'retailer-outreach',
    label: 'Retailer / Merchant Outreach',
    desc: 'Direct pitch or inquiry visits to retail outlets, supermarkets, and local shops.',
    icon: '🏬',
  },
  {
    value: 'distributor-outreach',
    label: 'Distributor / Dealer Outreach',
    desc: 'B2B discussions with regional wholesalers and distribution partners.',
    icon: '🚚',
  },
  {
    value: 'paid-trial',
    label: 'Paid Pilot / Advance Order Test',
    desc: 'The highest signal tier: requiring customer financial commitment or advance deposit.',
    icon: '💳',
  },
  {
    value: 'pilot',
    label: 'Operational Field Pilot',
    desc: 'Live deployment or telemetry test in an active warehouse, mandi, or transit route.',
    icon: '🧪',
  },
  {
    value: 'landing-page',
    label: 'Landing Page Intent Test',
    desc: 'Online demand smoke-test with click-to-waitlist or pre-registration conversion.',
    icon: '🌐',
  },
]

const predefinedMetrics = [
  {
    id: 'problem_confirmation_rate',
    label: 'Problem Confirmation Rate',
    desc: '% of respondents confirming critical pain point and active interest',
    defaultUnit: '%' as ThresholdUnit,
    defaultTarget: 50,
  },
  {
    id: 'paid_conversion_rate',
    label: 'Paid Conversion Rate',
    desc: '% of respondents placing a paid deposit or commercial order',
    defaultUnit: '%' as ThresholdUnit,
    defaultTarget: 15,
  },
  {
    id: 'qualified_lead_rate',
    label: 'Qualified Lead Rate',
    desc: '% of respondents advancing to active pilot evaluation or procurement review',
    defaultUnit: '%' as ThresholdUnit,
    defaultTarget: 40,
  },
  {
    id: 'response_rate',
    label: 'Response / Engagement Rate',
    desc: '% of outreach contacts agreeing to participate in full interview',
    defaultUnit: '%' as ThresholdUnit,
    defaultTarget: 30,
  },
  {
    id: 'custom',
    label: 'Custom Specific Metric',
    desc: 'Define your own quantified unit (e.g. Daily hours, INR volume)',
    defaultUnit: 'count' as ThresholdUnit,
    defaultTarget: 10,
  },
]

function NewExperimentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedHypothesisId = searchParams.get('hypothesis_id')
  const defaultCity = searchParams.get('city') || 'Pune'

  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string>(
    preselectedHypothesisId || ''
  )

  const [form, setForm] = useState({
    title: '',
    hypothesis: '',
    method: 'survey' as ExperimentMethod,
    city: defaultCity,
    target_audience: '',
    sample_size_target: 20,
    target_metric: 'Problem Confirmation Rate',
    threshold_metric: 'problem_confirmation_rate',
    threshold_operator: '>=' as ThresholdOperator,
    threshold_target: 50,
    threshold_unit: '%' as ThresholdUnit,
    threshold_min_sample: 10,
    threshold_rationale: '',
    start_date: '',
    end_date: '',
    notes: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing hypotheses
  useEffect(() => {
    async function load() {
      const res = await getHypotheses()
      if (res.data) {
        setHypotheses(res.data)
        if (preselectedHypothesisId) {
          const match = res.data.find((h) => h.id === preselectedHypothesisId)
          if (match) {
            setSelectedHypothesisId(match.id)
            setForm((prev) => ({
              ...prev,
              city: match.city,
              target_audience: match.target_audience,
              hypothesis: match.statement,
              title: `${match.city}: Testing ${match.target_audience.slice(0, 30)}`,
            }))
          }
        }
      }
    }
    load()
  }, [preselectedHypothesisId])

  // Handle hypothesis selection change
  const handleHypothesisSelect = (hypId: string) => {
    setSelectedHypothesisId(hypId)
    if (hypId) {
      const match = hypotheses.find((h) => h.id === hypId)
      if (match) {
        setForm((prev) => ({
          ...prev,
          city: match.city,
          target_audience: match.target_audience,
          hypothesis: match.statement,
          title: prev.title || `${match.city}: Testing ${match.target_audience.slice(0, 30)}`,
        }))
      }
    }
  }

  // Handle predefined metric change
  const handleMetricTypeChange = (metricId: string) => {
    const found = predefinedMetrics.find((m) => m.id === metricId)
    if (found) {
      setForm((prev) => ({
        ...prev,
        threshold_metric: found.id,
        target_metric: found.label,
        threshold_unit: found.defaultUnit,
        threshold_target: found.defaultTarget,
      }))
    }
  }

  // Generate success threshold string
  const computedSuccessThreshold = `${form.threshold_operator} ${form.threshold_target}${form.threshold_unit} ${form.target_metric} (min sample: ${form.threshold_min_sample})`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const payload = {
      title: form.title.trim(),
      hypothesis: form.hypothesis.trim(),
      hypothesis_id: selectedHypothesisId || null,
      method: form.method,
      city: form.city,
      target_audience: form.target_audience.trim() || undefined,
      sample_size_target: Number(form.sample_size_target),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      target_metric: form.target_metric.trim(),
      success_threshold: computedSuccessThreshold,
      threshold_metric: form.threshold_metric,
      threshold_operator: form.threshold_operator,
      threshold_target: Number(form.threshold_target),
      threshold_unit: form.threshold_unit,
      threshold_min_sample: Number(form.threshold_min_sample),
      threshold_rationale: form.threshold_rationale.trim() || undefined,
      status: 'planned' as const,
      notes: form.notes.trim() || undefined,
    }

    const validation = experimentSchema.safeParse(payload)
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please review your input.')
      return
    }

    setLoading(true)
    const res = await createExperiment(validation.data)
    setLoading(false)

    if (res.success && res.data) {
      router.push(`/market-validation/${res.data.id}`)
    } else {
      setError(res.error || 'Failed to create experiment.')
    }
  }

  return (
    <PageShell>
      <div className="mb-4">
        <Link
          href="/market-validation"
          className="inline-flex items-center text-xs text-[#858783] hover:text-[#F5B94C] transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Market Validation
        </Link>
      </div>

      <PageHeader
        title="Design Market Validation Experiment"
        description="Establish clear success thresholds, sample targets, and testing methods before gathering field evidence."
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {error && (
          <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-sm text-rose-300 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── SECTION 1: HYPOTHESIS LINKAGE ─── */}
        <Card className="border-[#252729] bg-[#101314]/90">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F5B94C]" />
                <CardTitle className="text-base text-[#F5F5F2]">1. Link Market Hypothesis</CardTitle>
              </div>
              <AIHypothesisDrafterModal
                city={form.city}
                onSelectHypothesis={(draft) => {
                  setForm((prev) => ({
                    ...prev,
                    target_audience: draft.target_audience || prev.target_audience,
                    hypothesis: draft.statement,
                    title: prev.title || `${prev.city}: Testing ${draft.target_audience.slice(0, 30)}`,
                  }))
                }}
                onSelectExperiment={(draft) => {
                  setForm((prev) => ({
                    ...prev,
                    title: draft.title,
                    method: draft.method,
                    hypothesis: draft.hypothesis_statement || prev.hypothesis,
                    sample_size_target: draft.sample_size_target,
                    threshold_metric: draft.threshold_metric,
                    target_metric: draft.target_metric,
                    threshold_operator: draft.threshold_operator,
                    threshold_target: draft.threshold_target,
                    threshold_unit: draft.threshold_unit,
                    threshold_min_sample: draft.threshold_min_sample,
                    threshold_rationale: draft.threshold_rationale,
                  }))
                }}
              />
            </div>
            <CardDescription className="text-xs text-[#858783]">
              Anchor this experiment to a falsifiable hypothesis so findings inform your expansion strategy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#F5F5F2] font-medium">Select Existing Hypothesis</Label>
              <Select
                value={selectedHypothesisId}
                onChange={(e) => handleHypothesisSelect(e.target.value)}
                className="bg-[#151719] border-[#252729] text-[#F5F5F2] text-sm focus:border-[#F5B94C]"
              >
                <option value="">-- Enter Custom Hypothesis or Select --</option>
                {hypotheses.map((h) => (
                  <option key={h.id} value={h.id}>
                    [{h.city}] {h.statement.slice(0, 80)}... ({h.status})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-hypothesis" className="text-xs text-[#F5F5F2] font-medium">
                Hypothesis Description *
              </Label>
              <Textarea
                id="exp-hypothesis"
                rows={3}
                placeholder="State the underlying customer behavior or willingness-to-pay assumption you are testing..."
                value={form.hypothesis}
                onChange={(e) => setForm({ ...form, hypothesis: e.target.value })}
                className="bg-[#151719] border-[#252729] text-[#F5F5F2] text-sm focus:border-[#F5B94C]"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── SECTION 2: EXPERIMENT METHOD & AUDIENCE ─── */}
        <Card className="border-[#252729] bg-[#101314]/90">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-[#F5B94C]" />
              <CardTitle className="text-base text-[#F5F5F2]">2. Testing Method & Location</CardTitle>
            </div>
            <CardDescription className="text-xs text-[#858783]">
              Select the appropriate validation instrument and target audience segment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs text-[#F5F5F2] font-medium">Method *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {methodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, method: opt.value })}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      form.method === opt.value
                        ? 'border-[#F5B94C] bg-[#151719] text-white shadow-sm shadow-[#F5B94C]/10'
                        : 'border-[#252729] bg-[#151719] text-[#858783] hover:border-[#F5B94C]/40 hover:bg-[#151719]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{opt.icon}</span>
                      <span className="text-xs font-semibold text-[#F5F5F2]">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-[#858783] leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-title" className="text-xs text-[#F5F5F2] font-medium">
                  Experiment Title *
                </Label>
                <Input
                  id="exp-title"
                  placeholder="e.g. Pune FPO Willingness-to-Pay Survey"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-[#151719] border-[#252729] text-[#F5F5F2] text-sm focus:border-[#F5B94C]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-city" className="text-xs text-[#F5F5F2] font-medium">
                  Target City *
                </Label>
                <Select
                  id="exp-city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-[#151719] border-[#252729] text-[#F5F5F2] text-sm focus:border-[#F5B94C]"
                >
                  {SUPPORTED_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-audience" className="text-xs text-[#F5F5F2] font-medium">
                  Target Audience / Cohort
                </Label>
                <Input
                  id="exp-audience"
                  placeholder="e.g. Horticulture FPO Directors, APMC Cold Store Managers"
                  value={form.target_audience}
                  onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                  className="bg-[#151719] border-[#252729] text-[#F5F5F2] text-sm focus:border-[#F5B94C]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-sample" className="text-xs text-[#F5F5F2] font-medium">
                  Sample Size Target (Interviews / Respondents) *
                </Label>
                <Input
                  id="exp-sample"
                  type="number"
                  min={1}
                  max={1000}
                  value={form.sample_size_target}
                  onChange={(e) => setForm({ ...form, sample_size_target: Number(e.target.value) })}
                  className="bg-[#151719] border-[#252729] text-[#F5F5F2] text-sm focus:border-[#F5B94C]"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── SECTION 3: STRUCTURED SUCCESS THRESHOLD ─── */}
        <Card className="border-[#3A3D40] bg-[#101314]/90">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[#F5B94C]" />
              <CardTitle className="text-base text-[#F5F5F2]">3. Structured Success Threshold</CardTitle>
            </div>
            <CardDescription className="text-xs text-[#858783]">
              Define explicit numerical criteria in advance so goalposts cannot be shifted later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#F5F5F2] font-medium">Predefined Success Metric</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {predefinedMetrics.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMetricTypeChange(m.id)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      form.threshold_metric === m.id
                        ? 'border-[#F5B94C] bg-[#151719] text-[#F5B94C]'
                        : 'border-[#252729] bg-[#151719] text-[#858783] hover:border-[#F5B94C]/40 hover:bg-[#151719]/40'
                    }`}
                  >
                    <p className="font-semibold text-[#F5F5F2]">{m.label}</p>
                    <p className="text-[11px] text-[#858783] mt-0.5 line-clamp-1">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#F5F5F2] font-medium">Operator</Label>
                <Select
                  value={form.threshold_operator}
                  onChange={(e) =>
                    setForm({ ...form, threshold_operator: e.target.value as ThresholdOperator })
                  }
                  className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] font-mono focus:border-[#F5B94C]"
                >
                  <option value=">=">&gt;= (At least)</option>
                  <option value=">">&gt; (Strictly greater)</option>
                  <option value="<=">&lt;= (At most)</option>
                  <option value="<">&lt; (Strictly less)</option>
                  <option value="=">= (Exactly)</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#F5F5F2] font-medium">Target Value *</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.threshold_target}
                  onChange={(e) => setForm({ ...form, threshold_target: Number(e.target.value) })}
                  className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] font-mono focus:border-[#F5B94C]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#F5F5F2] font-medium">Unit</Label>
                <Select
                  value={form.threshold_unit}
                  onChange={(e) =>
                    setForm({ ...form, threshold_unit: e.target.value as ThresholdUnit })
                  }
                  className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] focus:border-[#F5B94C]"
                >
                  <option value="%">% (Percentage)</option>
                  <option value="count">Count (Units / People)</option>
                  <option value="INR">INR (₹ Value)</option>
                  <option value="ratio">Ratio</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#F5F5F2] font-medium">
                  Min. Sample Guard *
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={form.threshold_min_sample}
                  onChange={(e) =>
                    setForm({ ...form, threshold_min_sample: Number(e.target.value) })
                  }
                  className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] font-mono focus:border-[#F5B94C]"
                  required
                />
              </div>
            </div>

            {/* Live Computed Threshold Preview */}
            <div className="p-3.5 rounded-xl border border-[#3A3D40] bg-[#151719]/60 flex items-center justify-between gap-3 shadow-lg shadow-[#F5B94C]/5">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F5B94C]">
                  Threshold Preview
                </span>
                <p className="text-sm font-bold text-[#F5F5F2] font-mono">
                  {computedSuccessThreshold}
                </p>
              </div>
              <Badge variant="outline" className="text-xs border-[#3A3D40] bg-[#151719] text-[#FFD27A]">
                Deterministic
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-rationale" className="text-xs text-[#F5F5F2] font-medium">
                Threshold Rationale / Justification
              </Label>
              <Input
                id="exp-rationale"
                placeholder="Why is this specific threshold the bar for viability? (e.g. Unit economics requires 50%+ customer adoption)"
                value={form.threshold_rationale}
                onChange={(e) => setForm({ ...form, threshold_rationale: e.target.value })}
                className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] focus:border-[#F5B94C]"
              />
              <p className="text-[11px] text-[#858783]">
                Any future change to this threshold will be permanently logged in the threshold audit history.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ─── SECTION 4: TIMELINE & NOTES ─── */}
        <Card className="border-[#252729] bg-[#101314]/90">
          <CardHeader>
            <CardTitle className="text-base text-[#F5F5F2]">4. Schedule & Execution Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-start" className="text-xs text-[#F5F5F2] font-medium">
                  Start Date (Optional)
                </Label>
                <Input
                  id="exp-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] focus:border-[#F5B94C]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-end" className="text-xs text-[#F5F5F2] font-medium">
                  End Date (Optional)
                </Label>
                <Input
                  id="exp-end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] focus:border-[#F5B94C]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-notes" className="text-xs text-[#F5F5F2] font-medium">
                Execution Notes & Methodology
              </Label>
              <Textarea
                id="exp-notes"
                rows={2}
                placeholder="Interview questionnaire link, recruitment channels, or logistics details..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-[#151719] border-[#252729] text-sm text-[#F5F5F2] focus:border-[#F5B94C]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/market-validation">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              className="text-[#858783] hover:text-[#F5F5F2]"
            >
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            size="sm"
            disabled={loading}
            className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold min-w-[160px] shadow-lg shadow-[#F5B94C]/20"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Experiment...
              </>
            ) : (
              <>
                <FlaskConical className="mr-1.5 h-4 w-4" />
                Launch Experiment
              </>
            )}
          </Button>
        </div>
      </form>
    </PageShell>
  )
}

export default function NewExperimentPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading experiment builder..." />}>
      <NewExperimentContent />
    </Suspense>
  )
}
