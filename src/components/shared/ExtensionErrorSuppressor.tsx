'use client'

import { useEffect } from 'react'

/**
 * Suppresses runtime error overlays caused by third-party browser extensions
 * (such as crypto wallets like MetaMask, Phantom, Coinbase Wallet injecting inpage.js)
 * from interrupting the Next.js development overlay.
 */
export function ExtensionErrorSuppressor() {
  useEffect(() => {
    const isExtensionNoise = (text: string) => {
      return (
        text.includes('chrome-extension://') ||
        text.includes('moz-extension://') ||
        text.includes('safari-web-extension://') ||
        text.includes('MetaMask') ||
        text.includes('inpage.js') ||
        text.includes('Failed to connect to MetaMask')
      )
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const reasonStr =
        typeof reason === 'string'
          ? reason
          : (reason?.stack || reason?.message || '') + ''

      if (isExtensionNoise(reasonStr)) {
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    }

    const handleError = (event: ErrorEvent) => {
      const filename = event.filename || ''
      const msg = event.message || ''
      const stack = event.error?.stack || ''
      const combined = `${filename} ${msg} ${stack}`

      if (isExtensionNoise(combined)) {
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection, true)
    window.addEventListener('error', handleError, true)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
      window.removeEventListener('error', handleError, true)
    }
  }, [])

  return null
}
