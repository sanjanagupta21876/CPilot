'use client'

import React, { useState } from 'react'
import { Sparkles, Loader2, AlertCircle, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { extractCompetitorInfoAction } from '@/lib/ai/actions'
import type { CompetitorExtractionData } from '@/lib/ai/types'

interface AICompetitorExtractorModalProps {
  city: string
  onSaveCompetitor?: (comp: CompetitorExtractionData) => void
}

export function AICompetitorExtractorModal({
  city,
  onSaveCompetitor,
}: AICompetitorExtractorModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sourceText, setSourceText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<CompetitorExtractionData | null>(null)

  const handleExtract = async () => {
    if (!sourceText.trim()) {
      setError('Please provide source text.')
      return
    }

    setLoading(true)
    setError(null)
    setExtracted(null)

    try {
      const res = await extractCompetitorInfoAction({
        sourceText,
        city,
      })

      if (!res.success || !res.data) {
        setError(res.message || 'Failed to extract competitor.')
        return
      }

      setExtracted(res.data)
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
        onClick={() => setIsOpen(true)}
        className="gap-1.5 border-[#252729] bg-[#151719] text-[#F5B94C] hover:bg-[#1A1D20] text-xs font-medium"
      >
        <Sparkles className="h-3.5 w-3.5 text-[#F5B94C]" />
        Extract Competitor
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#252729] bg-[#101314] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#252729] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F5B94C]" />
                <h3 className="text-sm font-semibold text-[#F5F5F2]">
                  Extract Competitor from Source — {city}
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
              Paste a news excerpt, pricing page snippet, or market report paragraph. AI will extract observable competitor fields strictly from the supplied text.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-[#B4B5B2]">Source Content Snippet</label>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste news article, press release, or website snippet here..."
                rows={4}
                className="w-full rounded-lg border border-[#252729] bg-[#151719] p-2.5 text-xs text-[#F5F5F2] placeholder:text-[#858783] focus:border-[#F5B94C] focus:outline-none focus:ring-1 focus:ring-[#F5B94C]"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-[#4E1821] bg-[#280D11]/40 p-3 text-xs text-[#FB7185]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FB7185]" />
                <span>{error}</span>
              </div>
            )}

            {!extracted ? (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-[#858783] hover:text-[#F5F5F2]">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleExtract}
                  disabled={loading}
                  className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold gap-1.5 text-xs shadow-md shadow-[#F5B94C]/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#080A0B]" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Extract Structured Competitor
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-[#252729] bg-[#151719] p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F5F5F2] text-sm">{extracted.name}</span>
                  <span className="rounded-md bg-[#252729] border border-[#3A3D40] px-2 py-0.5 text-[10px] text-[#F5B94C] font-mono uppercase">
                    {extracted.confidence} Draft
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[#B4B5B2]">
                  <div>
                    <span className="text-[#858783]">Category:</span> {extracted.category}
                  </div>
                  <div>
                    <span className="text-[#858783]">Observed Price:</span>{' '}
                    {extracted.observed_price ? `${extracted.currency} ${extracted.observed_price} ${extracted.price_unit || ''}` : 'Unknown'}
                  </div>
                  <div>
                    <span className="text-[#858783]">Scope:</span> {extracted.geographic_scope || 'Unknown'}
                  </div>
                  <div>
                    <span className="text-[#858783]">Target Audience:</span> {extracted.target_audience || 'Unknown'}
                  </div>
                </div>

                <div>
                  <span className="text-[#858783]">Offering:</span>
                  <p className="text-[#B4B5B2] mt-0.5 leading-relaxed">{extracted.offering}</p>
                </div>

                {extracted.differentiation_claims.length > 0 && (
                  <div>
                    <span className="text-[#858783]">Differentiation Claims:</span>
                    <ul className="list-disc list-inside text-[#858783] mt-0.5">
                      {extracted.differentiation_claims.map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-lg border border-[#252729] bg-[#101314] p-2.5 text-[11px] text-[#858783]">
                  <span className="font-medium text-[#F5F5F2]">Supporting Excerpt:</span> &quot;{extracted.supporting_excerpt}&quot;
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#252729]">
                  <Button variant="ghost" size="sm" onClick={() => setExtracted(null)} className="text-[#858783] hover:text-[#F5F5F2]">
                    Reset
                  </Button>
                  {onSaveCompetitor && (
                    <Button
                      size="sm"
                      onClick={() => {
                        onSaveCompetitor(extracted)
                        setIsOpen(false)
                      }}
                      className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold gap-1 text-xs shadow-md shadow-[#F5B94C]/20"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save as Draft Competitor
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
