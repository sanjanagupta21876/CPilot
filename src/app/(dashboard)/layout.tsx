import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { DEMO_PROFILE } from '@/lib/data/demoData'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const isDemoActive = cookieStore.get('demo_mode')?.value === 'true'

  let user = null
  let profileName = DEMO_PROFILE.name
  let isDemo = isDemoActive

  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null

    if (user) {
      // Authenticated user: check startup profile
      const { data: profile } = await supabase
        .from('startup_profiles')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile?.name) {
        profileName = profile.name
        isDemo = false
      } else if (isDemoActive) {
        // In demo mode, allow browsing even if profile has not been created in DB yet
        profileName = DEMO_PROFILE.name
        isDemo = true
      } else {
        // Authenticated user needs onboarding
        redirect('/onboarding')
      }
    } else if (!isDemoActive) {
      // Unauthenticated and not in demo mode
      redirect('/login')
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err) {
      // Re-throw Next.js redirect errors
      throw err
    }
    // Network or credential failure fallback
    if (!isDemoActive && !user) {
      redirect('/login')
    }
  }

  return (
    <DashboardShell
      user={user}
      isDemo={isDemo}
      startupName={profileName}
    >
      {children}
    </DashboardShell>
  )
}
