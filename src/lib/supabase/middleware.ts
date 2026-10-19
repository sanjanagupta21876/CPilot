import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Initialize server client with cookie getters & setters
  let user = null
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              )
              supabaseResponse = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )

      // IMPORTANT: auth.getUser() calls Supabase Auth server directly to validate JWT
      // (avoiding stale or tampered local session tokens)
      const { data } = await supabase.auth.getUser()
      user = data?.user ?? null
    } catch {
      user = null
    }
  }

  const { pathname } = request.nextUrl

  // Protected route prefixes
  const protectedPrefixes = [
    '/dashboard',
    '/city-intelligence',
    '/local-connect',
    '/market-validation',
    '/market-proof',
    '/settings',
    '/onboarding',
  ]

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))
  const isDemoActive = request.cookies.get('demo_mode')?.value === 'true'

  // 1. Unauthenticated users trying to access protected pages without demo opt-in
  if (isProtected && !user && !isDemoActive) {
    const hasSupabase =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('placeholder')

    if (!hasSupabase) {
      // Auto-enable demo mode for frictionless local exploration
      const res = NextResponse.next({ request })
      res.cookies.set('demo_mode', 'true', { path: '/', maxAge: 86400, sameSite: 'lax' })
      return res
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  // 2. Authenticated users visiting /login or /register are redirected to /dashboard
  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
