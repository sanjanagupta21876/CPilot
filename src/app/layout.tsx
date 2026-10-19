import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ExtensionNoiseSuppressor } from '@/components/shared/ExtensionNoiseSuppressor'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'CityPilot — Find the right city. Connect with the right people.',
    template: '%s | CityPilot',
  },
  description:
    'CityPilot helps small businesses and startups choose a suitable city for business expansion and discover relevant local businesses in that city.',
  keywords: ['business expansion', 'city selection', 'local businesses', 'suppliers', 'retailers', 'CityPilot'],
  authors: [{ name: 'CityPilot' }],
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        suppressHydrationWarning
        className={`${inter.variable} font-sans antialiased bg-slate-50 text-slate-900`}
      >
        <ExtensionNoiseSuppressor />
        {children}
      </body>
    </html>
  )
}

