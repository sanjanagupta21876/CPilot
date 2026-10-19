import { redirect } from 'next/navigation'

// Root "/" redirects based on auth state (handled in middleware)
// If user reaches here unauthenticated, middleware sends them to /login.
// This fallback redirects to /dashboard.
export default function RootPage() {
  redirect('/dashboard')
}
