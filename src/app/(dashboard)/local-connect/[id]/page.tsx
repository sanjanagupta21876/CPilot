'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import type { Contact, ContactCategory, IntroductionRequest, StartupProfile, VerificationStatus } from '@/types/database'
import {
  Users,
  ArrowLeft,
  Building2,
  GraduationCap,
  Store,
  Truck,
  Wrench,
  UserCheck,
  Package,
  Briefcase,
  Send,
  CheckCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Sparkles,
  MapPin,
  Calendar,
  XCircle,
  AlertCircle,
  Globe,
  Tag,
  Check,
} from 'lucide-react'
import { calculateLocalConnectMatch, type MatchScoreBreakdown } from '@/lib/scoring/localConnectMatching'
import { createIntroductionRequest, cancelIntroductionRequest } from '@/lib/actions/introductionRequests'
import { formatDate } from '@/lib/utils'

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

const statusConfig = {
  pending: { label: 'Pending Response', variant: 'warning' as const, icon: Clock },
  accepted: { label: 'Introduction Accepted', variant: 'success' as const, icon: CheckCircle },
  declined: { label: 'Declined', variant: 'destructive' as const, icon: XCircle },
  cancelled: { label: 'Cancelled by Founder', variant: 'secondary' as const, icon: XCircle },
  withdrawn: { label: 'Withdrawn', variant: 'secondary' as const, icon: XCircle },
  completed: { label: 'Completed', variant: 'success' as const, icon: CheckCircle },
}

export default function ContactDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [startupProfile, setStartupProfile] = useState<StartupProfile | null>(null)
  const [existingRequest, setExistingRequest] = useState<IntroductionRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  // Form fields
  const [purpose, setPurpose] = useState('Distribution & Pilot Partnership')
  const [businessContext, setBusinessContext] = useState('')
  const [desiredOutcome, setDesiredOutcome] = useState('Initial 30-minute exploratory discussion and review of pilot terms')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadData() {
      if (!id) return
      setLoading(true)
      const supabase = createClient()

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        // Fetch contact and existing request in parallel
        const [cRes, pRes, reqRes] = await Promise.all([
          supabase.from('contacts').select('*').eq('id', id).maybeSingle(),
          user
            ? supabase.from('startup_profiles').select('*').eq('user_id', user.id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          user
            ? supabase
                .from('introduction_requests')
                .select('*')
                .eq('contact_id', id)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ])

        let contactData = cRes.data as Contact | null
        if (!contactData) {
          const { DEMO_CONTACTS } = await import('@/lib/data/demoData')
          contactData = DEMO_CONTACTS.find((c) => c.id === id) || null
        }

        let profileData = pRes.data as StartupProfile | null
        if (!profileData) {
          const { DEMO_PROFILE } = await import('@/lib/data/demoData')
          profileData = DEMO_PROFILE
        }

        if (!contactData) {
          setError('Business profile not found in directory.')
        } else {
          setContact(contactData)
          setStartupProfile(profileData)

          if (reqRes.data) {
            setExistingRequest(reqRes.data as IntroductionRequest)
          }

          // Prepopulate context and message based on startup
          if (profileData) {
            setBusinessContext(
              `${profileData.name} operates in ${profileData.industry}. ${profileData.traction_summary || profileData.product_desc}`
            )
            setMessage(
              `Dear ${contactData.name},\n\nWe are expanding ${profileData.name} into ${contactData.city} and would appreciate connecting regarding your experience with ${contactData.organization || contactData.category}. We are targeting a structured collaboration for ${contactData.city}.\n\nBest regards,\n${profileData.name} Team`
            )
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading business profile.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  const handleSendIntro = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purpose.trim() || !businessContext.trim() || !desiredOutcome.trim() || !contact) return

    setSubmitting(true)
    setError(null)
    setSuccessNotice(null)

    try {
      const matchBreakdown = calculateLocalConnectMatch(startupProfile, contact)
      const primaryReason = matchBreakdown.reasons[0] || `Market entry exploration in ${contact.city}`

      const result = await createIntroductionRequest({
        contact_id: contact.id,
        startup_id: startupProfile?.id,
        purpose: purpose.trim(),
        business_context: businessContext.trim(),
        desired_outcome: desiredOutcome.trim(),
        message: message.trim(),
        match_reason: primaryReason,
      })

      if (result.success && result.data) {
        setExistingRequest(result.data)
        setSuccessNotice('Introduction request submitted successfully! Recorded in database.')
      } else {
        setError(result.error || 'Failed to submit introduction request.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!existingRequest) return
    if (!confirm('Are you sure you want to cancel this pending introduction request?')) return

    setCancelling(true)
    setError(null)

    try {
      const result = await cancelIntroductionRequest(existingRequest.id)
      if (result.success && result.data) {
        setExistingRequest(result.data)
        setSuccessNotice('Your introduction request has been cancelled.')
      } else {
        setError(result.error || 'Failed to cancel introduction request.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cancellation failed.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-28 text-slate-500 space-y-3">
          <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
          <p className="text-sm font-medium">Loading verified local business profile...</p>
        </div>
      </PageShell>
    )
  }

  if (error && !contact) {
    return (
      <PageShell>
        <div className="p-8 text-center space-y-4 max-w-md mx-auto">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Resource Unavailable</h3>
          <p className="text-xs text-rose-700">{error}</p>
          <Link href="/local-connect">
            <Button variant="outline" size="sm" className="text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Directory
            </Button>
          </Link>
        </div>
      </PageShell>
    )
  }

  if (!contact) return null

  const Icon = categoryIcons[contact.category] || Users
  const colorClass = categoryColors[contact.category] || 'text-slate-700 bg-slate-100'
  const verificationStatus: VerificationStatus =
    contact.verification_status || (contact.verified ? 'directly_confirmed' : 'unverified')
  const matchBreakdown: MatchScoreBreakdown = calculateLocalConnectMatch(startupProfile, contact)

  const reqStatusConf = existingRequest
    ? statusConfig[existingRequest.status] || statusConfig.pending
    : null

  return (
    <PageShell>
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/local-connect?city=${encodeURIComponent(contact.city)}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium"
          id="back-to-directory"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {contact.city} Directory
        </Link>
        {contact.is_demo && (
          <Badge variant="teal" className="text-[10px] font-mono">
            Verified Directory Listing
          </Badge>
        )}
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-xs text-teal-900 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-teal-600 shrink-0" />
            <span className="font-medium">{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-slate-400 hover:text-slate-700 text-xs ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-700 text-xs ml-2">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Resource Profile & Verification Provenance */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="text-center pb-4">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border ${colorClass} mb-3`}
              >
                <Icon className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">{contact.name}</CardTitle>
              {contact.role && (
                <p className="text-xs text-slate-600 font-medium">{contact.role}</p>
              )}
              {contact.organization && (
                <p className="text-xs text-slate-500">{contact.organization}</p>
              )}

              {/* Status Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3">
                <Badge variant="outline" className="text-xs border-slate-200 bg-slate-50 text-slate-700">
                  <MapPin className="h-3 w-3 mr-1 text-teal-600" /> {contact.city}
                </Badge>
                <Badge variant="secondary" className="capitalize text-xs">
                  {contact.category.replace('-', ' ')}
                </Badge>
                {verificationStatus === 'directly_confirmed' && (
                  <Badge variant="teal" className="text-xs gap-1">
                    <ShieldCheck className="h-3 w-3" /> Directly Confirmed
                  </Badge>
                )}
                {verificationStatus === 'source_checked' && (
                  <Badge variant="default" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Source Checked
                  </Badge>
                )}
                {verificationStatus === 'unverified' && (
                  <Badge variant="unverified" className="text-xs gap-1">
                    <ShieldAlert className="h-3 w-3" /> Unverified
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-2 border-t border-slate-100 text-xs">
              {/* Description */}
              {contact.description && (
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-1 text-[10px]">
                    Background & Overview
                  </h4>
                  <p className="text-slate-600 leading-relaxed">{contact.description}</p>
                </div>
              )}

              {/* Geographic Service Area */}
              {contact.service_area && (
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-1 text-[10px]">
                    Service Area Coverage
                  </h4>
                  <p className="text-slate-900 font-medium">{contact.service_area}</p>
                </div>
              )}

              {/* Capabilities */}
              {contact.capabilities && contact.capabilities.length > 0 && (
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-1.5 text-[10px]">
                    Core Capabilities
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {contact.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-800 font-mono border border-slate-200"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Industry Focus Tags */}
              {contact.industry_tags && contact.industry_tags.length > 0 && (
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-1.5 text-[10px]">
                    Industry Focus Tags
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {contact.industry_tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] border-slate-200 bg-slate-50 text-slate-700">
                        <Tag className="h-2.5 w-2.5 mr-1" /> {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Public Website */}
              {contact.website_url && (
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-1 text-[10px]">
                    Public Website
                  </h4>
                  <a
                    href={contact.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-teal-700 hover:text-teal-900 hover:underline font-medium"
                  >
                    <Globe className="h-3 w-3" />
                    <span className="truncate max-w-[200px]">{contact.website_url}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              )}

              {/* Transparent Data Provenance */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Data Provenance & Verification
                </span>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <p>
                    <span className="text-slate-500">Source:</span> <strong className="text-slate-900">{contact.source_name}</strong>
                  </p>
                  {contact.source_url && (
                    <a
                      href={contact.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-700 hover:underline text-[11px] font-medium"
                    >
                      <ExternalLink className="h-3 w-3" /> Verify Source Record
                    </a>
                  )}
                  {contact.verified_at && (
                    <p className="flex items-center gap-1 text-slate-500 pt-0.5">
                      <Calendar className="h-3 w-3" />
                      Verified on {formatDate(contact.verified_at)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Match Score & Transparent Explanations */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  Relevance Breakdown
                </CardTitle>
                <div className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">
                  {matchBreakdown.totalScore} / 100
                </div>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Deterministic matching vs {startupProfile?.name || 'active profile'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-xs">
              <div className="space-y-1.5 border-b border-slate-100 pb-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Industry Relevance</span>
                  <span className="font-mono font-bold text-slate-900">{matchBreakdown.industryScore}/35</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Geographic & Expansion Fit</span>
                  <span className="font-mono font-bold text-slate-900">{matchBreakdown.geoScore}/35</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Category & Channel Fit</span>
                  <span className="font-mono font-bold text-slate-900">{matchBreakdown.categoryScore}/15</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Verification Transparency</span>
                  <span className="font-mono font-bold text-slate-900">{matchBreakdown.verificationScore}/15</span>
                </div>
              </div>

              {matchBreakdown.reasons.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider">
                    Ground-Truth Match Reasons:
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-600">
                    {matchBreakdown.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <Check className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Introduction Request Workflow */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-900">
                      Connect with {contact.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Submit your business expansion proposal directly to initiate local collaboration.
                    </CardDescription>
                  </div>
                </div>

                {existingRequest && reqStatusConf && (
                  <Badge variant={reqStatusConf.variant} className="gap-1 capitalize text-xs self-start sm:self-auto font-mono">
                    <reqStatusConf.icon className="h-3 w-3" />
                    {reqStatusConf.label}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {existingRequest ? (
                /* Existing Request Display */
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Clock className="h-4 w-4 text-amber-600" />
                      Status: <span className="capitalize text-teal-800">{existingRequest.status}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Submitted on {formatDate(existingRequest.created_at)}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-semibold block mb-0.5">Purpose:</span>
                      <p className="text-slate-900 font-medium">{existingRequest.purpose || 'Ecosystem partnership'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block mb-0.5">Desired Outcome:</span>
                      <p className="text-slate-900 font-medium">{existingRequest.desired_outcome || 'Introductory review'}</p>
                    </div>
                  </div>

                  {existingRequest.business_context && (
                    <div className="text-xs space-y-1">
                      <span className="text-slate-500 font-semibold block">Business Context:</span>
                      <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                        {existingRequest.business_context}
                      </p>
                    </div>
                  )}

                  {existingRequest.message && (
                    <div className="text-xs space-y-1">
                      <span className="text-slate-500 font-semibold block">Message Body:</span>
                      <pre className="text-slate-800 font-sans whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-200 text-xs">
                        {existingRequest.message}
                      </pre>
                    </div>
                  )}

                  {existingRequest.status === 'pending' && (
                    <div className="pt-2 flex justify-between items-center border-t border-slate-200">
                      <span className="text-xs text-slate-500">
                        Pending review and response from the local contact.
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={cancelling}
                        onClick={handleCancelRequest}
                        className="text-xs"
                        id="cancel-request-btn"
                      >
                        {cancelling ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            Cancelling...
                          </>
                        ) : (
                          'Cancel Request'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* New Request Submission Form */
                <form onSubmit={handleSendIntro} className="space-y-4">
                  {/* Purpose Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-700 font-semibold">
                      Connection Purpose *
                    </Label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 font-medium"
                      id="purpose-select"
                      required
                    >
                      <option value="Distribution & Pilot Partnership">Distribution & Pilot Partnership</option>
                      <option value="Commercial Retail Stocking">Commercial Retail Stocking</option>
                      <option value="Cold-Chain / Logistics Contracting">Cold-Chain / Logistics Contracting</option>
                      <option value="Hardware Component / OEM Sourcing">Hardware Component / OEM Sourcing</option>
                      <option value="Mentorship & Regulatory Strategy">Mentorship & Regulatory Strategy</option>
                      <option value="Incubation & Government Subsidy Alignment">Incubation & Government Subsidy Alignment</option>
                      <option value="Customer Discovery & User Testing">Customer Discovery & User Testing</option>
                    </select>
                  </div>

                  {/* Business Context */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs text-slate-700 font-semibold">
                        Brief Business Context & Readiness *
                      </Label>
                      <span className="text-[10px] text-slate-400">Min 10 characters</span>
                    </div>
                    <textarea
                      rows={3}
                      value={businessContext}
                      onChange={(e) => setBusinessContext(e.target.value)}
                      placeholder="Outline your startup's core product, active traction, and specific goals for this market."
                      required
                      minLength={10}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                      id="business-context-input"
                    />
                  </div>

                  {/* Desired Outcome */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs text-slate-700 font-semibold">
                        Desired Outcome / Next Step *
                      </Label>
                      <span className="text-[10px] text-slate-400">Min 5 characters</span>
                    </div>
                    <Input
                      value={desiredOutcome}
                      onChange={(e) => setDesiredOutcome(e.target.value)}
                      placeholder="e.g. Schedule a 30-min call or explore a 30-day paid pilot"
                      required
                      minLength={5}
                      className="text-xs text-slate-900"
                      id="desired-outcome-input"
                    />
                  </div>

                  {/* Pitch Message Body */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-700 font-semibold">
                        Direct Message to Recipient (Optional)
                      </Label>
                      <span className="text-[10px] text-teal-700 flex items-center gap-1 font-mono font-medium">
                        <Sparkles className="h-3 w-3 text-teal-600" /> Pre-filled pitch template
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                      id="message-input"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 text-xs shadow-sm"
                      id="submit-intro-btn"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Send Connection Request
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
