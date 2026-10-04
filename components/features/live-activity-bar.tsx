'use client'


import { displayContent } from '@/lib/display-content'
import { useEffect, useState } from 'react'
import { Activity, Award, CalendarDays, GraduationCap, Landmark, Radio } from 'lucide-react'

type ActivityItem = { kind: string; message: string; at: string }

const ICONS: Record<string, typeof Activity> = {
  certificate: Award,
  programme: Landmark,
  event: CalendarDays,
  opportunity: GraduationCap
}

const FALLBACK: ActivityItem[] = [
  { kind: 'programme', message: 'Programmes accepting applications across seven pillars', at: '' },
  { kind: 'certificate', message: 'QR verification available for every issued certificate', at: '' },
  { kind: 'event', message: 'Regional events published throughout the year', at: '' }
]

/**
 * Live platform activity strip.
 *
 * Pulls non-personal activity from /api/platform/activity and rotates it.
 * If the request fails it degrades to a static institutional message rather
 * than showing an error to visitors.
 */
export function LiveActivityBar() {
  const [items, setItems] = useState<ActivityItem[]>(FALLBACK)
  const [index, setIndex] = useState(0)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/platform/activity', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (cancelled) return
        if (Array.isArray(data?.items) && data.items.length) {
          setItems(data.items)
          setLive(true)
        }
      } catch {
        /* keep the fallback content */
      }
    }

    load()
    const interval = window.setInterval(load, 30000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const rotate = window.setInterval(() => {
      setIndex(current => (current + 1) % Math.max(items.length, 1))
    }, 4200)
    return () => window.clearInterval(rotate)
  }, [items.length])

  const item = items[index % Math.max(items.length, 1)]
  const IconComponent = ICONS[item?.kind ?? 'programme'] ?? Activity

  return (
    <div className="border-b border-white/10 bg-black/25">
      <div className="container flex items-center gap-3 overflow-hidden py-2 text-xs">
        <span className="flex shrink-0 items-center gap-2 font-bold uppercase tracking-[0.16em] text-emerald-300">
          <Radio size={13} className={live ? 'animate-pulse' : ''} />
          Live
        </span>

        <span className="hidden h-4 w-px shrink-0 bg-white/15 sm:block" />

        <span
          key={`${index}-${item?.message}`}
          className="flex min-w-0 items-center gap-2 truncate font-semibold text-primary-100"
          style={{ animation: 'fade-up 500ms ease-out both' }}
        >
          <IconComponent size={14} className="shrink-0 text-gold-300" />
          <span className="truncate">{displayContent(item?.message ?? 'Platform services online')}</span>
        </span>

        <span className="ml-auto hidden shrink-0 items-center gap-2 font-semibold text-primary-200 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
          {displayContent(items.length > 1 ? `${index + 1}/${items.length} updates` : 'Registry active')}
        </span>
      </div>
    </div>
  )
}
