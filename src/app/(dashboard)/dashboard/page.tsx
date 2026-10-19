'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  MapPin,
  Users,
  ArrowRight,
  CheckCircle2,
  Compass,
  Store,
  Truck,
  Wrench,
  ChevronRight,
} from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DEMO_PROFILE, DEMO_COMPARISONS, DEMO_CONTACTS } from '@/lib/data/demoData'

export default function DashboardPage() {
  const profile = DEMO_PROFILE
  const [selectedQuickCity, setSelectedQuickCity] = useState('Bengaluru')

  // Top comparisons from user or demo
  const recentComparisons = DEMO_COMPARISONS.slice(0, 3)

  // Contacts filtered for quick city spotlight
  const citySpotlightContacts = DEMO_CONTACTS.filter(
    (c) => c.city.toLowerCase() === selectedQuickCity.toLowerCase()
  ).slice(0, 3)

  return (
    <PageShell className="space-y-8">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER: PRODUCT IDENTITY & BUSINESS PROFILE
         ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-3 py-1 text-xs font-semibold text-teal-800">
              <Compass className="h-3.5 w-3.5 text-teal-600" />
              <span>CityPilot Expansion Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Find the right city. Connect with the right people.
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              CityPilot helps small businesses and startups choose the most suitable city for business expansion and discover verified local retailers, distributors, and partners there.
            </p>
          </div>

          {/* Active Business Profile Card */}
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 lg:min-w-[320px]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-extrabold text-lg shadow-xs">
              {profile.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  Active Business
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-[10px] text-slate-500 font-medium capitalize">
                  {profile.stage} Stage
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {profile.name}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {profile.industry} • Target: {profile.target_customer}
              </p>
            </div>
            <Link href="/settings" className="shrink-0 text-slate-400 hover:text-slate-700">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 4-Stage Core User Journey Progress */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 font-medium mb-3">
            <span className="font-semibold text-slate-700">Core Expansion Journey:</span>
            <span>Step 2 of 4 Active</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            {[
              { step: '1. Business Details', status: 'Completed', active: false, done: true },
              { step: '2. Compare Cities', status: 'Recommended Next', active: true, done: false },
              { step: '3. Choose Target City', status: 'Pending Selection', active: false, done: false },
              { step: '4. Connect Locally', status: 'Ready in Directory', active: false, done: false },
            ].map((item, i) => (
              <div
                key={i}
                className={`rounded-xl p-3 border text-xs transition-all ${
                  item.done
                    ? 'border-teal-200 bg-teal-50/60 text-teal-900'
                    : item.active
                    ? 'border-teal-500 bg-teal-50/30 text-teal-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{item.step}</span>
                  {item.done && <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0 ml-1" />}
                </div>
                <p className="text-[10px] mt-1 opacity-80">{item.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. THE TWO CORE USER ACTIONS (VISUALLY PROMINENT)
         ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Primary Actions</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Choose what you want to achieve next in your expansion planning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Action 1: Find the Right City */}
          <Card className="relative overflow-hidden border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shadow-xs group-hover:scale-105 transition-transform">
                  <MapPin className="h-6 w-6" />
                </div>
                <Badge variant="teal" className="text-xs">
                  Feature A
                </Badge>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Find the Right City
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Enter your business category, expansion budget, and customer preferences to compare cities side-by-side using sourced market data and transparent Fit Scores.
                </p>
              </div>

              {/* Supported Dimensions */}
              <div className="pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Evaluation Factors
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Commercial Rent & Costs',
                    'Target Market Demand',
                    'Competitive Density',
                    'Ecosystem Support',
                    'Talent Availability',
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between gap-3">
              <Link href="/city-intelligence" className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                View Past Comparisons ({recentComparisons.length})
              </Link>
              <Link href="/city-intelligence/new">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 h-9 gap-1.5">
                  <span>Start City Comparison</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Action 2: Discover Local Businesses */}
          <Card className="relative overflow-hidden border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shadow-xs group-hover:scale-105 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <Badge variant="teal" className="text-xs">
                  Feature B
                </Badge>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Discover Local Businesses
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Browse a clean directory of local businesses in your target city. Discover verified retailers, distributors, suppliers, and prospective commercial partners.
                </p>
              </div>

              {/* Quick City Launcher */}
              <div className="pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select a City to Explore Directory
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune'].map((cityName) => (
                    <button
                      key={cityName}
                      type="button"
                      onClick={() => setSelectedQuickCity(cityName)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-all cursor-pointer ${
                        selectedQuickCity === cityName
                          ? 'border-teal-500 bg-teal-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cityName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                City: <strong className="text-slate-800">{selectedQuickCity}</strong>
              </span>
              <Link href={`/local-connect?city=${encodeURIComponent(selectedQuickCity)}`}>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 h-9 gap-1.5 shadow-sm shadow-teal-700/20">
                  <span>Browse {selectedQuickCity} Businesses</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SUPPORTING SECTION: SAVED COMPARISONS & LOCAL DIRECTORY PREVIEW
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Saved Comparisons (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Saved City Comparisons
              </h2>
              <p className="text-xs text-slate-500">
                Transparent evaluation results calculated for your business.
              </p>
            </div>
            <Link
              href="/city-intelligence"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentComparisons.map((comp) => (
              <Link key={comp.id} href={`/city-intelligence/${comp.id}`} className="block">
                <Card className="p-4 sm:p-5 hover:border-slate-300 hover:shadow-xs transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] text-teal-700 border-teal-200 bg-teal-50/50">
                          Verified Model
                        </Badge>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(comp.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {comp.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Cities: {comp.cities.join(' vs ')}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                        <span>View Result</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Directory Spotlight in Selected City (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Local Partners in {selectedQuickCity}
              </h2>
              <p className="text-xs text-slate-500">
                Verified businesses ready for partnership inquiries.
              </p>
            </div>
            <Link
              href={`/local-connect?city=${encodeURIComponent(selectedQuickCity)}`}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
            >
              <span>Explore all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {citySpotlightContacts.length > 0 ? (
              citySpotlightContacts.map((contact) => (
                <Card key={contact.id} className="p-3.5 hover:border-slate-300 hover:shadow-xs transition-all">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                      {contact.category === 'retailer' ? (
                        <Store className="h-4 w-4 text-teal-600" />
                      ) : contact.category === 'distributor' ? (
                        <Truck className="h-4 w-4 text-slate-700" />
                      ) : (
                        <Wrench className="h-4 w-4 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {contact.name}
                        </p>
                        {contact.verification_status === 'directly_confirmed' && (
                          <Badge variant="teal" className="text-[9px] px-1.5 py-0 h-4 font-mono">
                            Confirmed
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {contact.organization || contact.role} • {contact.city}
                      </p>
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-1">
                        {contact.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 text-center text-xs text-slate-500">
                No local businesses listed yet for {selectedQuickCity}.
              </Card>
            )}

            <Link href={`/local-connect?city=${encodeURIComponent(selectedQuickCity)}`} className="block pt-1">
              <Button variant="outline" size="sm" className="w-full text-xs h-9 border-dashed text-slate-600 hover:text-slate-900">
                View All {selectedQuickCity} Listings in Directory →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
