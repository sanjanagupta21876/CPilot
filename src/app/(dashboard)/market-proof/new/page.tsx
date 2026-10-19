'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageShell, PageHeader } from '@/components/layout/PageShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { assumptionSchema } from '@/lib/validations/schemas'
import type { AssumptionStatus, AssumptionSourceType } from '@/types/database'
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'

export default function NewAssumptionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [statement, setStatement] = useState('')
  const [sourceType, setSourceType] = useState<AssumptionSourceType>('manual')
  const [status, setStatus] = useState<AssumptionStatus>('untested')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const payload = {
      statement: statement.trim(),
      source_type: sourceType,
      status,
    }

    const result = assumptionSchema.safeParse(payload)
    if (!result.success) {
      setError(result.error.issues[0]?.message || 'Please provide a valid statement.')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Session expired. Please sign in again.')
        setLoading(false)
        return
      }

      const { error: insError } = await supabase.from('assumptions').insert({
        user_id: user.id,
        statement: payload.statement,
        source_type: payload.source_type,
        status: payload.status,
      })

      if (insError) throw insError

      router.push('/market-proof')
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to save assumption.')
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <div className="mb-6">
        <Link
          href="/market-proof"
          className="inline-flex items-center gap-1.5 text-xs text-[#858783] hover:text-[#F5B94C] transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Market Proof
        </Link>
        <PageHeader
          title="Track New Market Assumption"
          description="Log key commercial or customer behavior assumptions to test through field validation."
        />
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-[#4E1821] bg-[#280D11]/40 p-4 text-sm text-[#FB7185]">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#FB7185]" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card className="border-[#252729] bg-[#101314] shadow-xl">
          <CardHeader>
            <CardTitle className="text-base text-[#F5F5F2]">Assumption Details</CardTitle>
            <CardDescription className="text-xs text-[#858783]">
              What belief about your market, customer, or distribution channel needs to be proven?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="statement" className="text-xs text-[#B4B5B2]">
                Assumption Statement *
              </Label>
              <textarea
                id="statement"
                rows={4}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="e.g. Retailers in South Bengaluru prefer weekly credit settlements over upfront instant UPI discounts."
                required
                className="w-full rounded-lg border border-[#252729] bg-[#151719] p-3 text-sm text-[#F5F5F2] placeholder:text-[#858783] focus:border-[#F5B94C] focus:outline-none focus:ring-1 focus:ring-[#F5B94C] transition-colors"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="source_type" className="text-xs text-[#B4B5B2]">
                  Origin Source
                </Label>
                <select
                  id="source_type"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as AssumptionSourceType)}
                  className="w-full rounded-lg border border-[#252729] bg-[#151719] px-3 py-2 text-xs text-[#F5F5F2] focus:border-[#F5B94C] focus:outline-none"
                >
                  <option value="manual">Manual Founder Assumption</option>
                  <option value="city-intelligence">Synthesized from City Intelligence</option>
                  <option value="llm-synthesis">Market Research Synthesis</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs text-[#B4B5B2]">
                  Initial Status
                </Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AssumptionStatus)}
                  className="w-full rounded-lg border border-[#252729] bg-[#151719] px-3 py-2 text-xs text-[#F5F5F2] focus:border-[#F5B94C] focus:outline-none"
                >
                  <option value="untested">Untested (No evidence yet)</option>
                  <option value="supported">Supported (Prior proof exists)</option>
                  <option value="challenged">Challenged (Mixed initial signals)</option>
                  <option value="invalidated">Invalidated (Refuted)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-2">
          <Link href="/market-proof">
            <Button type="button" variant="ghost" className="text-[#858783] hover:text-[#F5F5F2]">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#F5B94C] hover:bg-[#FFD27A] text-[#080A0B] font-semibold gap-2 text-xs shadow-lg shadow-[#F5B94C]/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                Save Assumption
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
