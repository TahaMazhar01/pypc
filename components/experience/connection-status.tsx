'use client'


import { displayContent } from '@/lib/display-content'
/**
 * ConnectionStatus — real-time network awareness.
 *
 * A member filling in a long application or a visa-letter request should never
 * lose work silently. This listens to the browser's own online/offline events
 * (and re-checks on window focus, because events can be missed), shows a single
 * high-contrast bar while the network is down, and confirms recovery for a few
 * seconds afterwards. It renders nothing at all when the connection is healthy.
 */

import { useEffect, useRef, useState } from 'react'
import { CloudOff, Wifi } from 'lucide-react'

export function ConnectionStatus() {
  const [offline, setOffline] = useState(false)
  const [recovered, setRecovered] = useState(false)
  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function goOffline() {
      if (recoveryTimer.current) clearTimeout(recoveryTimer.current)
      setRecovered(false)
      setOffline(true)
    }

    function goOnline() {
      setOffline(previous => {
        if (previous) {
          setRecovered(true)
          recoveryTimer.current = setTimeout(() => setRecovered(false), 4000)
        }
        return false
      })
    }

    // Initial state + a safety net: some browsers and proxies do not fire the
    // events reliably, so focus/visibility changes re-sync the real value.
    setOffline(!navigator.onLine)

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    window.addEventListener('focus', goOnline)
    document.addEventListener('visibilitychange', goOnline)

    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('focus', goOnline)
      document.removeEventListener('visibilitychange', goOnline)
      if (recoveryTimer.current) clearTimeout(recoveryTimer.current)
    }
  }, [])

  if (!offline && !recovered) return null

  return (
    <div
      data-connection-status={offline ? 'offline' : 'recovered'}
      role="status"
      aria-live="assertive"
      className="no-print fixed inset-x-0 top-0 z-[120] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      <div
        className={`mx-auto flex max-w-3xl items-center justify-center gap-2.5 rounded-b-xl border px-4 py-2 text-center text-xs font-semibold shadow-elevated sm:text-sm ${
          offline
            ? 'border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-500/50 dark:bg-amber-950 dark:text-amber-100'
            : 'border-emerald-400 bg-emerald-100 text-emerald-950 dark:border-emerald-500/50 dark:bg-emerald-950 dark:text-emerald-100'
        }`}
      >
        {displayContent(offline ? <CloudOff size={16} className="shrink-0" /> : <Wifi size={16} className="shrink-0" />)}
        <span>
          {displayContent(offline
            ? 'You are offline. Content already loaded stays readable — reconnect before submitting a form or payment.'
            : 'Back online. Your connection has been restored.')}
        </span>
      </div>
    </div>
  )
}
