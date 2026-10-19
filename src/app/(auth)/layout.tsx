import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In — CityPilot',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      suppressHydrationWarning
      className="relative flex min-h-screen items-center justify-center p-4 bg-slate-50 overflow-hidden"
    >
      {/* Ambient background teal radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(13,148,136,0.08),rgba(255,255,255,0))]" />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  )
}

