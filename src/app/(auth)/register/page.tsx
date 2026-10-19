'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { CityPilotLogo } from '@/components/shared/CityPilotLogo'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      router.push('/onboarding')
      router.refresh()
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700">
            <MailCheck className="h-7 w-7" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">Check your email</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            We sent a confirmation link to <strong className="text-slate-900">{email}</strong>.
            Click it to activate your account and configure your CityPilot business profile.
          </p>
          <Button
            id="btn-back-to-login"
            variant="outline"
            className="mt-6 w-full text-xs"
            onClick={() => router.push('/login')}
          >
            Back to Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <CityPilotLogo variant="dark" iconSize={32} showTagline={false} className="mb-3" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-2">Create your account</h1>
          <p className="mt-1 text-xs text-slate-500">Find the right city. Connect with the right people.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4" id="form-register">
          <div className="space-y-1.5">
            <Label htmlFor="register-name" className="text-xs text-slate-700">Your name</Label>
            <Input
              id="register-name"
              type="text"
              placeholder="Arjun Sharma"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-xs h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="register-email" className="text-xs text-slate-700">Email address</Label>
            <Input
              id="register-email"
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
            <Label htmlFor="register-password" className="text-xs text-slate-700">Password</Label>
            <div className="relative">
              <Input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10 text-xs h-10"
              />
              <button
                type="button"
                id="btn-toggle-reg-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Minimum 8 characters</p>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <Button
            id="btn-register"
            type="submit"
            className="w-full bg-slate-900 text-white font-bold text-xs h-10 hover:bg-slate-800 shadow-sm"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Creating account…
              </>
            ) : (
              'Create CityPilot Account'
            )}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/login" id="link-login" className="font-semibold text-teal-700 hover:text-teal-800 transition-colors">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  )
}

