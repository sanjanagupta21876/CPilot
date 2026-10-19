'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { CityPilotLogo } from '@/components/shared/CityPilotLogo'

function LoginForm() {
  const [email, setEmail] = useState('founder@business.com')
  const [password, setPassword] = useState('demo1234')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const redirectedFrom = searchParams.get('redirectedFrom')
  const initialError =
    errorParam === 'auth-callback-failed'
      ? 'Email verification or authentication callback failed. The link may have expired.'
      : redirectedFrom
      ? 'Please sign in to access your protected expansion dashboard.'
      : null

  const [error, setError] = useState<string | null>(initialError)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder')

    if (!isSupabaseConfigured) {
      // Local/Demo Mode: sign in directly without cloud credentials
      document.cookie = 'demo_mode=true; path=/; max-age=86400; SameSite=Lax'
      setLoading(false)
      router.push('/dashboard')
      router.refresh()
      return
    }

    // Clear demo mode cookie on real sign in attempt
    document.cookie = 'demo_mode=; path=/; max-age=0'

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      if (email === 'founder@business.com') {
        document.cookie = 'demo_mode=true; path=/; max-age=86400; SameSite=Lax'
        setLoading(false)
        router.push('/dashboard')
        router.refresh()
        return
      }
      setLoading(false)
      setError(authError.message)
      return
    }

    setLoading(false)
    router.push('/dashboard')
    router.refresh()
  }

  const handleEnterDemo = () => {
    document.cookie = 'demo_mode=true; path=/; max-age=86400; SameSite=Lax'
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <CityPilotLogo variant="dark" iconSize={32} showTagline={false} className="mb-3" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-2">Welcome back to CityPilot</h1>
          <p className="mt-1 text-xs text-slate-500">Find the right city. Connect with the right people.</p>
        </div>

        {/* Demo banner */}
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/80 px-3.5 py-2.5 text-center">
          <p className="text-xs font-semibold text-teal-900">Demo Credentials Pre-filled</p>
          <p className="text-[11px] text-teal-700 mt-0.5">Click &quot;Sign in to Dashboard&quot; below to enter immediately.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" id="form-login">
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs text-slate-700">Email address</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="founder@business.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-xs h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password" className="text-xs text-slate-700">Password</Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10 text-xs h-10"
              />
              <button
                type="button"
                id="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <Button
            id="btn-login"
            type="submit"
            className="w-full bg-slate-900 text-white font-bold text-xs h-10 hover:bg-slate-800 shadow-sm"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Signing in…
              </>
            ) : (
              'Sign in to Dashboard'
            )}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            id="link-register"
            className="font-semibold text-teal-700 hover:text-teal-800 transition-colors"
          >
            Create one →
          </Link>
        </p>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <button
            type="button"
            onClick={handleEnterDemo}
            id="link-explore-demo"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
          >
            <span>Explore CityPilot Demo Prototype</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading sign in..." />}>
      <LoginForm />
    </Suspense>
  )
}

