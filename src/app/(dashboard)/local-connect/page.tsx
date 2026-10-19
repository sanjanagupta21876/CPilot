import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { Contact, StartupProfile } from '@/types/database'
import { DEMO_CONTACTS, DEMO_PROFILE } from '@/lib/data/demoData'
import { getUserIntroductionRequests } from '@/lib/actions/introductionRequests'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { LocalConnectClient } from './LocalConnectClient'

export const metadata: Metadata = {
  title: 'Local Businesses Directory — CityPilot',
  description:
    'Discover relevant local businesses, retailers, distributors, suppliers, and partners in your target expansion city with verified credentials.',
}

export default async function LocalConnectPage() {
  let contacts: Contact[] = []
  let startupProfile: StartupProfile | null = null
  let hasProfile = false
  let isDemo = false

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // 1. Fetch startup profile
      const { data: profile } = await supabase
        .from('startup_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile) {
        startupProfile = profile as StartupProfile
        hasProfile = true
      }

      // 2. Fetch contacts from Supabase
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .order('city')
        .order('name')
        .limit(100)

      if (contactData && contactData.length > 0) {
        contacts = contactData as Contact[]
      }
    }
  } catch {
    // Supabase unconfigured or offline
  }

  // Fallback to demo contacts and profile when offline or unconfigured
  if (contacts.length === 0) {
    contacts = DEMO_CONTACTS
    isDemo = true
  }

  if (!startupProfile) {
    // Check if in demo mode
    startupProfile = DEMO_PROFILE
    hasProfile = true
    isDemo = true
  }

  // Retrieve existing introduction requests for this user
  const { requests } = await getUserIntroductionRequests()

  return (
    <Suspense fallback={<PageLoader label="Loading local business directory..." />}>
      <LocalConnectClient
        initialContacts={contacts}
        startupProfile={startupProfile}
        initialRequests={requests}
        isDemo={isDemo}
        hasProfile={hasProfile}
      />
    </Suspense>
  )
}

