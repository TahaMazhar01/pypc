'use client'


import { displayContent } from '@/lib/display-content'
/**
 * LiveStatus — the site reports on itself, in real time.
 *
 * Polls `GET /api/status` (the server's own health report) when the tab is
 * visible, pauses while it is hidden, and refreshes the moment the user comes
 * back or the network reconnects. Between polls the "checked … ago" counter
 * ticks every second, so the pill is always telling the truth about how fresh
 * the reading is — that is the real-time part; no fake animation.
 *
 * Deliberately small and dependency-free: one extra request per minute per open
 * tab, nothing at all while the tab is in the background.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type HealthState = 'loading' | 'ok' | 'warn' | 'fail' | 'unreachable'

const POLL_MS = 60_000

const PRESENTATION: Record<HealthState, { label: string; dot: string; pill: string }> = {
  loading: {
    label: 'Checking live status…',
    dot: 'bg-slate-400',
    pill: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
  },
  ok: {
    label: 'All systems operational',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    pill: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950 dark:text-emerald-200'
  },
  warn: {
    label: 'Online — some services need credentials',
    dot: 'bg-amber-600 dark:bg-amber-400',
    pill: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950 dark:text-amber-200'
  },
  fail: {
    label: 'Service issue detected',
    dot: 'bg-rose-600 dark:bg-rose-400',
    pill: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-950 dark:text-rose-200'
  },
  unreachable: {
    label: 'Status endpoint unreachable',
    dot: 'bg-slate-500 dark:bg-slate-300',
    pill: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
  }
}

function describeAge(seconds: number) {
  if (seconds < 5) return 'checked just now'
  if (seconds < 60) return `checked ${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes === 1) return 'checked 1 minute ago'
  if (minutes < 60) return `checked ${minutes} minutes ago`
  const hours = Math.floor(minutes / 60)
  return hours === 1 ? 'checked 1 hour ago' : `checked ${hours} hours ago`
}

export function LiveStatus({ className = '' }: { className?: string }) {
  const [state, setState] = useState<HealthState>('loading')
  const [checkedAt, setCheckedAt] = useState<number | null>(null)
  const [age, setAge] = useState(0)
  const checkedAtRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    let inFlight = false

    async function poll() {
      if (inFlight) return
      inFlight = true
      try {
        const response = await fetch('/api/status', { cache: 'no-store' })
        // 503 is a valid health answer, not a failure to reach the endpoint.
        const payload = await response.json()
        if (cancelled) return
        const next: HealthState =
          payload?.overall === 'ok' ? 'ok' : payload?.overall === 'warn' ? 'warn' : 'fail'
        setState(next)
        const now = Date.now()
        setCheckedAt(now)
        checkedAtRef.current = now
        setAge(0)
      } catch {
        if (!cancelled) setState('unreachable')
      } finally {
        inFlight = false
      }
    }

    function refreshIfVisible() {
      if (document.visibilityState === 'visible') void poll()
    }

    refreshIfVisible()
    const pollTimer = setInterval(refreshIfVisible, POLL_MS)
    const ticker = setInterval(() => {
      if (checkedAtRef.current) setAge(Math.floor((Date.now() - checkedAtRef.current) / 1000))
    }, 1000)

    document.addEventListener('visibilitychange', refreshIfVisible)
    window.addEventListener('online', refreshIfVisible)

    return () => {
      cancelled = true
      clearInterval(pollTimer)
      clearInterval(ticker)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      window.removeEventListener('online', refreshIfVisible)
    }
  }, [])

  const presentation = PRESENTATION[state]

  return (
    <Link
      href="/status"
      data-live-status={state}
      title="Live system status, opens the full report"
      className={`focus-ring inline-flex max-w-full items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition hover:brightness-105 ${presentation.pill} ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {displayContent(state === 'ok' ? (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${presentation.dot}`} />
        ) : null)}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${presentation.dot}`} />
      </span>
      <span className="truncate">{displayContent(presentation.label)}</span>
      <span aria-live="polite" className="hidden shrink-0 font-normal opacity-80 sm:inline">
        {displayContent(checkedAt ? describeAge(age) : 'live')}
      </span>
    </Link>
  )
}
