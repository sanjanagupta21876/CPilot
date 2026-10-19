'use client'

import { useEffect } from 'react'

export function ExtensionNoiseSuppressor() {
  useEffect(() => {
    function isExt(s: string) {
      return (
        s.includes('chrome-extension://') ||
        s.includes('moz-extension://') ||
        s.includes('safari-web-extension://') ||
        s.includes('MetaMask') ||
        s.includes('inpage.js') ||
        s.includes('Could not establish connection') ||
        s.includes('Receiving end does not exist') ||
        s.includes('runtime.lastError')
      )
    }

    const handleRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason
      const str = typeof r === 'string' ? r : (r && (r.stack || r.message)) || ''
      if (isExt(str)) {
        e.stopImmediatePropagation()
        e.preventDefault()
      }
    }

    const handleError = (e: ErrorEvent) => {
      const str = (e.filename || '') + ' ' + (e.message || '') + ' ' + (e.error && e.error.stack || '')
      if (isExt(str)) {
        e.stopImmediatePropagation()
        e.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleRejection, true)
    window.addEventListener('error', handleError, true)

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection, true)
      window.removeEventListener('error', handleError, true)
    }
  }, [])

  return null
}
