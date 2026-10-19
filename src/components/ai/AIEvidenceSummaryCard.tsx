'use client'

import React, { useState } from 'react'
import { Sparkles, Loader2, AlertCircle, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { summarizeMarketEvidenceAction, type SummarizeEvidenceResult } from '@/lib/ai/actions'
import type { AIResult } from '@/lib/ai/types'

interface AIEvidenceSummaryCardProps {
  initialCity?: string
  availableCities?: string[]
}

export function AIEvidenceSummaryCard({
  initialCity = 'Pune',
  availableCities = ['Pune', 'Bengaluru', 'Indore', 'Ahmedabad'],
}: AIEvidenceSummaryCardProps) {
  const [selectedCity, setSelectedCity] = useState(initialCity)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIResult<SummarizeEvidenceResult> | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await summarizeMarketEvidenceAction({ city: selectedCity })
      setResult(res)
    } catch {
      setResult({
        success: false,
        error: 'AI_PROVIDER_ERROR',
        message: 'Failed to contact AI service.',
      })
    } finally {
      setLoading(false)
    }
  }

  const summaryData = result?.data?.summaryData
  const sources = result?.data?.sourceReferences || []

  return (
    <Card className="border-[#252729] bg-[#101314] shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#252729] bg-[#151719] text-[#F5B94C] shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-[#F5F5F2]">
                AI Evidence Synthesis
              </CardTitle>
              <CardDescription className="text-xs text-[#858783]">
                Grounded summary derived strictly from stored market indicators & hypotheses
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value)
                setResult(null)
              }}
              className="rounded-lg border border-[#252729] bg-[#151719] px-2.5 py-1.5 text-xs text-[#F5F5F2] focus:border-[#F5B94C] focus:outline-none"
            >
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold text-xs h-8 gap-1.5 shadow-md shadow-[#F5B94C]/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#080A0B]" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  {result ? 'Refresh Summary' : 'Generate Summary'}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Not Configured State */}
        {result && !result.success && result.error === 'AI_NOT_CONFIGURED' && (
          <div className="rounded-lg border border-[#4E3516] bg-[#2A1D0B]/40 p-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#F5B94C]" />
              <div>
                <p className="text-xs font-semibold text-[#F5B94C]">AI Integration Not Configured</p>
                <p className="mt-1 text-xs text-[#B4B5B2] leading-relaxed">
                  To enable live market evidence synthesis, add <code className="bg-[#101314] border border-[#252729] px-1.5 py-0.5 rounded text-[#F5B94C] font-mono text-[11px]">GEMINI_API_KEY</code> to your server environment variables. Manual deterministic validation workflows remain fully active.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Generic Error */}
        {result && !result.success && result.error !== 'AI_NOT_CONFIGURED' && (
          <div className="rounded-lg border border-[#4E1821] bg-[#280D11]/40 p-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FB7185]" />
              <div>
                <p className="text-xs font-semibold text-[#FB7185]">Synthesis Unavailable</p>
                <p className="mt-1 text-xs text-[#FB7185]/90 leading-relaxed">{result.message || 'An error occurred while contacting the AI provider.'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Initial Prompt State */}
        {!result && !loading && (
          <p className="text-xs text-[#858783] italic">
            Click &quot;Generate Summary&quot; to synthesize recorded market indicators, competitive signals, and hypothesis progress for {selectedCity}.
          </p>
        )}

        {/* Successful Summary View */}
        {summaryData && (
          <div className="space-y-4">
            {/* Disclaimer Banner */}
            <div className="flex items-start gap-2 rounded-lg border border-[#252729] bg-[#151719]/60 px-3 py-2 text-[11px] text-[#858783]">
              <span className="font-semibold text-[#F5B94C]">AI-Assisted Derivative:</span>
              <span>This synthesis is derived strictly from stored sources and is not an independent source of market truth.</span>
            </div>

            {/* Narrative Summary */}
            <p className="text-xs leading-relaxed text-[#F5F5F2]">
              {summaryData.summary}
            </p>

            {/* Key Findings with Grounded Citations */}
            {summaryData.keyFindings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#F5F5F2]">Key Evidence Points</p>
                <div className="space-y-1.5">
                  {summaryData.keyFindings.map((kf, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg border border-[#252729] bg-[#151719]/50 p-2.5 text-xs"
                    >
                      {kf.direction === 'supporting' ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F5B94C]" />
                      ) : kf.direction === 'challenging' ? (
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F5B94C]" />
                      ) : (
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#858783]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[#F5F5F2] leading-relaxed">{kf.point}</span>
                        {kf.sourceIds.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {kf.sourceIds.map((srcId) => {
                              const ref = sources.find((s) => s.sourceId === srcId)
                              return (
                                <span
                                  key={srcId}
                                  className="inline-flex items-center gap-1 rounded-md bg-[#151719] border border-[#252729] px-1.5 py-0.5 text-[10px] text-[#F5B94C]"
                                >
                                  {ref ? ref.title : srcId}
                                  {ref?.sourceUrl && (
                                    <a
                                      href={ref.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#F5B94C] hover:text-[#FFD27A]"
                                    >
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  )}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Limitations & Missing Evidence */}
            {summaryData.limitations.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#FBBF24]">Gaps & Limitations</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-[#858783]">
                  {summaryData.limitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Practical Suggestions */}
            {summaryData.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#F5F5F2]">Suggested Next Experiments</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-[#858783]">
                  {summaryData.suggestions.map((sug, i) => (
                    <li key={i}>{sug}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
