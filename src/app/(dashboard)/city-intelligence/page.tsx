import { createClient } from '@/lib/supabase/server'
import { PageShell, PageHeader } from '@/components/layout/PageShell'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DemoBanner } from '@/components/shared/DemoBanner'
import Link from 'next/link'
import { MapPin, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { DEMO_COMPARISONS } from '@/lib/data/demoData'
import type { CityComparison } from '@/types/database'

export const metadata: Metadata = { title: 'City Recommendation — CityPilot' }

const statusConfig = {
  draft: { label: 'Draft', variant: 'secondary' as const, icon: Clock },
  analyzing: { label: 'Analyzing', variant: 'warning' as const, icon: Clock },
  complete: { label: 'Complete', variant: 'success' as const, icon: CheckCircle },
  error: { label: 'Error', variant: 'destructive' as const, icon: AlertCircle },
}

export default async function CityIntelligencePage() {
  let comparisons: CityComparison[] = []
  let isDemo = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data, error } = await supabase
        .from('city_comparisons')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        comparisons = data
      }
    }
  } catch {
    // Supabase offline / unconfigured
  }

  // Fallback to demo comparisons
  if (comparisons.length === 0) {
    comparisons = DEMO_COMPARISONS
    isDemo = true
  }

  return (
    <PageShell>
      <PageHeader
        title="City Recommendation & Comparison"
        description="Compare suitable cities for business expansion using verifiable market indicators across operating costs, market demand, competition, and customer fit."
        badge={
          isDemo ? (
            <Badge variant="teal" className="text-xs">
              Demonstration Assessments
            </Badge>
          ) : undefined
        }
        actions={
          <Link href="/city-intelligence/new">
            <Button id="btn-new-comparison" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs">
              <Plus className="h-4 w-4" />
              New City Comparison
            </Button>
          </Link>
        }
      />

      {isDemo && (
        <DemoBanner
          message="Displaying sample city comparisons. Newly created assessments are calculated deterministically and stored in your profile."
        />
      )}

      {comparisons.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No city comparisons yet"
          description="Create your first city comparison to evaluate which expansion market best fits your business model and target customers."
          action={
            <Link href="/city-intelligence/new">
              <Button id="btn-new-comparison-empty" className="bg-slate-900 hover:bg-slate-800 text-white">
                <Plus className="h-4 w-4" />
                Start a Comparison
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comparisons.map((c) => {
            const status = statusConfig[c.status as keyof typeof statusConfig] ?? statusConfig.complete
            const StatusIcon = status.icon
            return (
              <Link key={c.id} href={`/city-intelligence/${c.id}`} id={`comparison-${c.id}`}>
                <Card className="h-full cursor-pointer transition-all border-slate-200/90 bg-white hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-bold leading-snug text-slate-900">{c.title}</CardTitle>
                      <Badge variant={status.variant} className="flex-shrink-0 gap-1 text-[10px] font-mono">
                        <StatusIcon className="h-2.5 w-2.5" />
                        {status.label}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-500 mt-1 font-medium">
                      Comparing: {c.cities.join(' vs ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>
                        {new Date(c.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {c.scoring_model_version && (
                        <Badge variant="outline" className="border-teal-200 text-teal-800 text-[10px] font-mono bg-teal-50/50">
                          {c.scoring_model_version}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
