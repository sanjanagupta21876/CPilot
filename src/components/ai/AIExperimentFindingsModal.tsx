'use client'

import React, { useState } from 'react'
import { Sparkles, Loader2, AlertCircle, X, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { summarizeExperimentFindingsAction } from '@/lib/ai/actions'
import type { ExperimentFindingsSummary } from '@/lib/ai/types'

interface AIExperimentFindingsModalProps {
  experimentId: string
  experimentTitle: string
}

export function AIExperimentFindingsModal({
  experimentId,
  experimentTitle,
}: AIExperimentFindingsModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ExperimentFindingsSummary | null>(null)

  const handleFetchSummary = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await summarizeExperimentFindingsAction({ experimentId })
      if (!res.success || !res.data) {
        setError(res.message || 'Failed to summarize experiment findings.')
        return
      }
      setSummary(res.data)
    } catch {
      setError('An error occurred contacting the AI service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setIsOpen(true)
          if (!summary) handleFetchSummary()
        }}
        className="gap-1.5 border-[#252729] bg-[#151719] text-[#F5B94C] hover:bg-[#1A1D20] text-xs font-medium"
      >
        <Sparkles className="h-3.5 w-3.5 text-[#F5B94C]" />
        AI Findings Summary
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#252729] bg-[#101314] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#252729] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F5B94C]" />
                <h3 className="text-sm font-semibold text-[#F5F5F2]">
                  Findings Summary: {experimentTitle}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded text-[#858783] hover:text-[#F5F5F2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#858783]">
              Plain-language synthesis of recorded observation notes and signal tiers. The outcome interpretation below is calculated deterministically by application logic and cannot be altered by the AI.
            </p>

            {loading && (
              <div className="flex flex-col items-center justify-center py-8 text-[#858783] space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#F5B94C]" />
                <p className="text-xs">Analyzing recorded responses and commercial signal tiers...</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-[#4E1821] bg-[#280D11]/40 p-3 text-xs text-[#FB7185]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FB7185]" />
                <span>{error}</span>
              </div>
            )}

            {summary && !loading && (
              <div className="space-y-4 pt-1">
                {/* Deterministic Outcome Lock */}
                <div className="flex items-center justify-between rounded-xl border border-[#252729] bg-[#151719] p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#F5B94C]" />
                    <span className="text-xs text-[#B4B5B2]">Authoritative Metric Status:</span>
                  </div>
                  <span className="rounded-md border border-[#252729] bg-[#101314] px-2 py-0.5 text-xs font-semibold text-[#F5B94C] uppercase font-mono">
                    {summary.deterministicOutcome.replace('_', ' ')}
                  </span>
                </div>

                {/* Narrative Summary */}
                <p className="text-xs leading-relaxed text-[#F5F5F2]">
                  {summary.narrative}
                </p>

                {/* Threshold Explanation */}
                <div className="rounded-xl border border-[#252729] bg-[#151719]/50 p-3 text-xs space-y-1">
                  <p className="font-semibold text-[#F5F5F2]">Success Threshold Analysis</p>
                  <p className="text-[#858783] leading-relaxed">{summary.thresholdComparisonExplanation}</p>
                </div>

                {/* Signal Quality Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-[#252729] bg-[#151719] p-2.5">
                    <p className="text-sm font-bold font-mono text-[#F5B94C]">
                      {summary.signalQualityAssessment.commercialSignalsCount}
                    </p>
                    <p className="text-[10px] text-[#858783]">Paid / Commercial</p>
                  </div>
                  <div className="rounded-lg border border-[#252729] bg-[#151719] p-2.5">
                    <p className="text-sm font-bold font-mono text-[#38BDF8]">
                      {summary.signalQualityAssessment.verbalInterestCount}
                    </p>
                    <p className="text-[10px] text-[#858783]">Verbal Interest</p>
                  </div>
                  <div className="rounded-lg border border-[#252729] bg-[#151719] p-2.5">
                    <p className="text-sm font-bold font-mono text-[#F5B94C]">
                      {summary.signalQualityAssessment.objectionsCount}
                    </p>
                    <p className="text-[10px] text-[#858783]">Objections</p>
                  </div>
                </div>

                <p className="text-[11px] text-[#858783] italic">
                  {summary.signalQualityAssessment.analysis}
                </p>

                {/* Key Objections */}
                {summary.keyObjections.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#F5B94C]">Documented Objections</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-[#858783]">
                      {summary.keyObjections.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Next Steps */}
                {summary.recommendedNextSteps.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#F5B94C]">Recommended Next Steps</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-[#858783]">
                      {summary.recommendedNextSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
