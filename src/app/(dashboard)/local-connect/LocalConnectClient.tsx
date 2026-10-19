'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Users,
  Search,
  X,
  Store,
  Truck,
  GraduationCap,
  Building2,
  Wrench,
  UserCheck,
  Package,
  Briefcase,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Sparkles,
  MapPin,
} from 'lucide-react'
import { PageShell, PageHeader } from '@/components/layout/PageShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { DemoBanner } from '@/components/shared/DemoBanner'
import type { Contact, ContactCategory, IntroductionRequest, StartupProfile } from '@/types/database'
import { rankContacts } from '@/lib/scoring/localConnectMatching'
import { cancelIntroductionRequest } from '@/lib/actions/introductionRequests'
import { formatDate } from '@/lib/utils'
import { AILocalConnectModal } from '@/components/ai/AILocalConnectModal'

interface LocalConnectClientProps {
  initialContacts: Contact[]
  startupProfile: StartupProfile | null
  initialRequests: IntroductionRequest[]
  isDemo: boolean
  hasProfile: boolean
}

const categoryIcons: Record<ContactCategory, typeof Users> = {
  retailer: Store,
  distributor: Truck,
  mentor: GraduationCap,
  institution: Building2,
  supplier: Wrench,
  'pilot-customer': UserCheck,
  logistics: Package,
  'service-provider': Briefcase,
}

const categoryColors: Record<ContactCategory, string> = {
  retailer: 'text-teal-700 bg-teal-50 border-teal-200',
  distributor: 'text-slate-800 bg-slate-100 border-slate-200',
  mentor: 'text-amber-800 bg-amber-50 border-amber-200',
  institution: 'text-teal-800 bg-teal-50 border-teal-200',
  supplier: 'text-blue-800 bg-blue-50 border-blue-200',
  'pilot-customer': 'text-cyan-800 bg-cyan-50 border-cyan-200',
  logistics: 'text-orange-800 bg-orange-50 border-orange-200',
  'service-provider': 'text-indigo-800 bg-indigo-50 border-indigo-200',
}

const categoryLabels: Record<ContactCategory, string> = {
  retailer: 'Retailer & Retail Partner',
  distributor: 'Distributor & Wholesaler',
  mentor: 'Industry Mentor',
  institution: 'Incubator & Trade Org',
  supplier: 'Supplier & Manufacturer',
  'pilot-customer': 'Potential Pilot Customer',
  logistics: 'Logistics & Warehousing',
  'service-provider': 'Specialized Service Provider',
}

const statusConfig = {
  pending: { label: 'Pending Response', variant: 'warning' as const, icon: Clock },
  accepted: { label: 'Introduction Accepted', variant: 'success' as const, icon: CheckCircle },
  declined: { label: 'Declined', variant: 'destructive' as const, icon: XCircle },
  cancelled: { label: 'Cancelled by Founder', variant: 'secondary' as const, icon: XCircle },
  withdrawn: { label: 'Withdrawn', variant: 'secondary' as const, icon: XCircle },
  completed: { label: 'Completed', variant: 'success' as const, icon: CheckCircle },
}

export function LocalConnectClient({
  initialContacts,
  startupProfile,
  initialRequests,
  isDemo,
  hasProfile,
}: LocalConnectClientProps) {
  const searchParams = useSearchParams()
  const cityQuery = searchParams.get('city')

  const [activeTab, setActiveTab] = useState<'directory' | 'requests'>('directory')
  const [searchQuery, setSearchQuery] = useState('')
  const [userCityFilter, setUserCityFilter] = useState<string | null>(null)
  const selectedCity = userCityFilter ?? cityQuery ?? 'all'
  const setSelectedCity = (city: string) => setUserCityFilter(city)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedVerification, setSelectedVerification] = useState<string>('all')
  const [requests, setRequests] = useState<IntroductionRequest[]>(initialRequests)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Rank contacts deterministically against startup profile
  const rankedAllContacts = useMemo(() => {
    return rankContacts(initialContacts, startupProfile)
  }, [initialContacts, startupProfile])

  // Extract unique cities from all contacts and startup expansion cities
  const availableCities = useMemo(() => {
    const set = new Set<string>()
    if (startupProfile?.current_city) set.add(startupProfile.current_city)
    if (startupProfile?.expansion_cities) {
      startupProfile.expansion_cities.forEach((c) => set.add(c))
    }
    initialContacts.forEach((c) => set.add(c.city))
    return Array.from(set).sort()
  }, [initialContacts, startupProfile])

  // Filter contacts based on query, city, category, and verification status
  const filteredContacts = useMemo(() => {
    return rankedAllContacts.filter((contact) => {
      // 1. Text Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = contact.name.toLowerCase().includes(q)
        const matchOrg = (contact.organization || '').toLowerCase().includes(q)
        const matchRole = (contact.role || '').toLowerCase().includes(q)
        const matchDesc = (contact.description || '').toLowerCase().includes(q)
        const matchCity = contact.city.toLowerCase().includes(q)
        const matchArea = (contact.service_area || '').toLowerCase().includes(q)
        const matchTags = (contact.industry_tags || []).some((t) => t.toLowerCase().includes(q))
        const matchCaps = (contact.capabilities || []).some((c) => c.toLowerCase().includes(q))

        if (
          !matchName &&
          !matchOrg &&
          !matchRole &&
          !matchDesc &&
          !matchCity &&
          !matchArea &&
          !matchTags &&
          !matchCaps
        ) {
          return false
        }
      }

      // 2. City Filter
      if (selectedCity !== 'all' && contact.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false
      }

      // 3. Category Filter
      if (selectedCategory !== 'all' && contact.category !== selectedCategory) {
        return false
      }

      // 4. Verification Status Filter
      if (selectedVerification !== 'all') {
        const status = contact.verification_status || (contact.verified ? 'directly_confirmed' : 'unverified')
        if (status !== selectedVerification) {
          return false
        }
      }

      return true
    })
  }, [rankedAllContacts, searchQuery, selectedCity, selectedCategory, selectedVerification])

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCity !== 'all' ||
    selectedCategory !== 'all' ||
    selectedVerification !== 'all'

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCity('all')
    setSelectedCategory('all')
    setSelectedVerification('all')
  }

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this introduction request?')) return
    setCancellingId(requestId)
    setFeedbackMessage(null)

    try {
      const result = await cancelIntroductionRequest(requestId)
      if (result.success && result.data) {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'cancelled', updated_at: new Date().toISOString() } : r))
        )
        setFeedbackMessage({ type: 'success', text: 'Introduction request has been cancelled.' })
      } else {
        setFeedbackMessage({ type: 'error', text: result.error || 'Failed to cancel introduction request.' })
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Network error while cancelling request.' })
    } finally {
      setCancellingId(null)
    }
  }

  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length

  return (
    <PageShell>
      <PageHeader
        title="Local Business Directory"
        description="Discover and connect with verified local retailers, distributors, suppliers, and commercial partners in your target city."
        badge={
          isDemo ? (
            <Badge variant="teal" className="text-xs">
              Verified Partner Directory
            </Badge>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'directory' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('directory')}
              className="text-xs h-9"
              id="tab-directory"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Explore Directory ({filteredContacts.length})
            </Button>
            <Button
              variant={activeTab === 'requests' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('requests')}
              className="text-xs h-9 relative"
              id="tab-my-requests"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Connection Requests ({requests.length})
              {pendingRequestsCount > 0 && (
                <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {pendingRequestsCount}
                </span>
              )}
            </Button>
          </div>
        }
      />

      {isDemo && (
        <DemoBanner message="Displaying verified and cataloged business profiles. Introduction requests, match explanations, and verification badges reflect real deterministic scoring." />
      )}

      {/* Selected City Context Highlight Banner */}
      {selectedCity !== 'all' && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                Target City: {selectedCity}
              </p>
              <p className="text-slate-600">
                Displaying businesses ready for local partnerships, stocking, and expansion operations in {selectedCity}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedCity('all')}
            className="text-xs font-semibold text-teal-800 hover:text-teal-950 underline cursor-pointer"
          >
            Show All Cities
          </button>
        </div>
      )}

      {/* Active Business Context Bar */}
      {hasProfile && startupProfile && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">Matching profile:</span>
            <span className="font-bold text-slate-900">{startupProfile.name}</span>
            <span className="text-slate-300">·</span>
            <Badge variant="outline" className="text-[11px] border-slate-200 text-slate-700 bg-slate-50">
              {startupProfile.industry}
            </Badge>
            {startupProfile.current_city && (
              <span className="text-slate-500">HQ: {startupProfile.current_city}</span>
            )}
            {startupProfile.expansion_cities && startupProfile.expansion_cities.length > 0 && (
              <span className="text-teal-700 font-medium">
                Expansion Targets: {startupProfile.expansion_cities.join(', ')}
              </span>
            )}
          </div>
          <div className="text-[11px] text-teal-800 flex items-center gap-1 font-mono font-medium">
            <Sparkles className="h-3 w-3 text-teal-600" /> Deterministic 100-pt Relevance Engine
          </div>
        </div>
      )}

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          className={`rounded-xl border p-3.5 text-xs flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'border-teal-200 bg-teal-50 text-teal-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-700 ml-2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: EXPLORE RESOURCES DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Discovery Filter Controls */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Search query */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search name, capability, industry..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs h-9"
                    id="search-input"
                  />
                </div>

                {/* City Filter */}
                <div>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 h-9 font-medium"
                    id="filter-city"
                  >
                    <option value="all">All Cities</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                        {startupProfile?.expansion_cities?.includes(city) ? ' ★ Target' : ''}
                        {startupProfile?.current_city === city ? ' (Base)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 h-9 font-medium"
                    id="filter-category"
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(categoryLabels).map(([cat, label]) => (
                      <option key={cat} value={cat}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Verification Status Filter */}
                <div>
                  <select
                    value={selectedVerification}
                    onChange={(e) => setSelectedVerification(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 h-9 font-medium"
                    id="filter-verification"
                  >
                    <option value="all">All Verification Tiers</option>
                    <option value="directly_confirmed">Directly Confirmed</option>
                    <option value="source_checked">Source Checked</option>
                    <option value="unverified">Unverified Listing</option>
                  </select>
                </div>
              </div>

              {/* Status and Clear Filters Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Showing <strong className="text-slate-900">{filteredContacts.length}</strong> businesses
                  {selectedCity !== 'all' ? ` in ${selectedCity}` : ''}
                </span>

                <div className="flex items-center gap-2">
                  <AILocalConnectModal
                    currentCity={selectedCity !== 'all' ? selectedCity : startupProfile?.current_city || 'Bengaluru'}
                    onApplyFilters={(f) => {
                      if (f.category) setSelectedCategory(f.category)
                      if (f.city) setSelectedCity(f.city)
                      if (f.query) setSearchQuery(f.query)
                    }}
                  />
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="text-xs text-slate-500 hover:text-slate-900 h-7 px-2"
                      id="clear-filters-btn"
                    >
                      <X className="h-3 w-3 mr-1" /> Clear all filters
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Grid */}
          {filteredContacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No businesses found matching criteria"
              description="No local businesses matched your current filter criteria. Try clearing filters or selecting another city."
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs">
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredContacts.map((contact) => {
                const Icon = categoryIcons[contact.category] || Users
                const colorClass = categoryColors[contact.category] || 'text-slate-600 bg-slate-100'
                const status = contact.verification_status || (contact.verified ? 'directly_confirmed' : 'unverified')

                return (
                  <Card
                    key={contact.id}
                    className="flex flex-col justify-between border-slate-200/90 bg-white transition-all hover:border-slate-300 hover:shadow-md"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colorClass} shrink-0`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-sm font-bold text-slate-900 hover:text-teal-700 transition-colors truncate">
                              <Link href={`/local-connect/${contact.id}`}>{contact.name}</Link>
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 line-clamp-1">
                              {contact.role ? `${contact.role} · ` : ''}
                              {contact.organization}
                            </CardDescription>
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        <div className="shrink-0 text-right">
                          <div
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              contact.matchScore >= 70
                                ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                : contact.matchScore >= 40
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                            title={`Relevance score: ${contact.matchScore}/100`}
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            {contact.matchScore}%
                          </div>
                        </div>
                      </div>

                      {/* City & Category Bar */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2">
                        <Badge variant="outline" className="text-[10px] border-slate-200 bg-slate-50 text-slate-700">
                          <MapPin className="h-2.5 w-2.5 mr-0.5 text-teal-600" />
                          {contact.city}
                        </Badge>
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {contact.category.replace('-', ' ')}
                        </Badge>
                        {status === 'directly_confirmed' && (
                          <Badge variant="teal" className="gap-1 text-[10px]">
                            <ShieldCheck className="h-2.5 w-2.5" /> Confirmed
                          </Badge>
                        )}
                        {status === 'source_checked' && (
                          <Badge variant="default" className="gap-1 text-[10px]">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Source Checked
                          </Badge>
                        )}
                        {status === 'unverified' && (
                          <Badge variant="unverified" className="gap-1 text-[10px]">
                            <ShieldAlert className="h-2.5 w-2.5" /> Unverified
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0 flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        {contact.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {contact.description}
                          </p>
                        )}

                        {/* Stored Capabilities */}
                        {contact.capabilities && contact.capabilities.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Capabilities:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {contact.capabilities.slice(0, 3).map((cap) => (
                                <span
                                  key={cap}
                                  className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 border border-slate-200"
                                >
                                  {cap}
                                </span>
                              ))}
                              {contact.capabilities.length > 3 && (
                                <span className="text-[10px] text-slate-400">
                                  +{contact.capabilities.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Match Reasons */}
                        {contact.matchReasons.length > 0 && (
                          <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-2.5 space-y-1">
                            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                              Why this matches your expansion:
                            </span>
                            <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
                              {contact.matchReasons.slice(0, 2).map((reason, idx) => (
                                <li key={idx} className="line-clamp-1">
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions & Provenance */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
                        <div className="text-[11px] text-slate-400 line-clamp-1 max-w-[170px]" title={contact.source_name}>
                          Src: {contact.source_name}
                        </div>
                        <Link
                          href={`/local-connect/${contact.id}`}
                          id={`connect-btn-${contact.id}`}
                          className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-900 transition-colors"
                        >
                          View Profile & Connect <ChevronRight className="h-3.5 w-3.5" />
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

      {/* TAB 2: MY INTRODUCTION REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Submitted Connection Requests ({requests.length})
            </h3>
            <span className="text-xs text-slate-500">
              Requests update when processed by local ecosystem administrators
            </span>
          </div>

          {requests.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No connection requests yet"
              description="When you find relevant local businesses, retailers, or partners in the directory, submit an introduction request to begin a conversation."
              action={
                <Button size="sm" onClick={() => setActiveTab('directory')} className="text-xs bg-slate-900 text-white">
                  Browse Directory
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const status = statusConfig[req.status] || statusConfig.pending
                const StatusIcon = status.icon
                const contactMatch = initialContacts.find((c) => c.id === req.contact_id)

                return (
                  <Card key={req.id} className="p-4 sm:p-5 border-slate-200 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {contactMatch?.name || 'Local Partner Contact'}
                          </h4>
                          {contactMatch?.city && (
                            <Badge variant="outline" className="text-[10px]">
                              {contactMatch.city}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Purpose: {req.purpose || 'Partnership Introduction'}
                        </p>
                      </div>
                      <Badge variant={status.variant} className="gap-1 text-xs self-start sm:self-auto font-mono">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>

                    <div className="pt-3 text-xs text-slate-600 space-y-1">
                      {req.business_context && (
                        <p className="line-clamp-2">
                          <strong>Context:</strong> {req.business_context}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2 text-slate-400 text-[11px]">
                        <span>Submitted on {formatDate(req.created_at)}</span>
                        {req.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(req.id)}
                            disabled={cancellingId === req.id}
                            className="text-rose-600 hover:text-rose-800 font-semibold"
                          >
                            Cancel Request
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}
