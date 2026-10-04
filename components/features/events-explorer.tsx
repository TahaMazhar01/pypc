'use client'


import { displayContent } from '@/lib/display-content'
import Image from 'next/image'
import { getSitePhoto } from '@/lib/site-photos'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CalendarDays, Filter, Globe2, MapPin, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/motion/reveal'
import { TiltCard } from '@/components/motion/tilt-card'

export type EventCard = {
  slug: string
  title: string
  fullName: string
  summary: string
  image: string
  href: string
  location: string
  date: string
  scale: string
  category: 'Conference' | 'Summit' | 'Training' | 'Institutional visit'
  status: string
  featured?: boolean
}

/**
 * Event explorer: cover-image cards with a bold title, full name and an
 * "Explore event" call to action, plus category filtering — the same browsing
 * model as the reference site, populated with PYPC's own programme of work.
 */
export function EventsExplorer({ events }: { events: EventCard[] }) {
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(events.map(event => event.category)))],
    [events]
  )
  const [filter, setFilter] = useState<string>('All')

  const visible = filter === 'All' ? events : events.filter(event => event.category === filter)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          <Filter size={13} /> Filter
        </span>
        {categories.map(category => (
          <button
            key={category}
            type="button"
            onClick={() => setFilter(category)}
            aria-pressed={filter === category}
            className={cn(
              'focus-ring rounded-full border px-4 py-1.5 text-xs font-bold transition',
              filter === category
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:text-primary'
            )}
          >
            {displayContent(category)}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((event, index) => (
          <Reveal key={event.slug} delay={index * 70} className="h-full">
            <TiltCard className="h-full" intensity={7}>
              <article
                className={cn(
                  'flex h-full flex-col overflow-hidden rounded-lg border bg-white transition duration-300 hover:shadow-elevated',
                  event.featured ? 'border-gold-300 ring-1 ring-gold-200' : 'border-slate-200'
                )}
              >
                <div className="relative h-44 overflow-hidden">
                  
                  <Image
                    src={event.image}
                    alt={displayContent(getSitePhoto(event.image)?.alt ?? 'Illustrative photograph')}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-900/85 via-primary-900/15 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
                      {displayContent(event.category)}
                    </span>
                    {displayContent(event.featured ? (
                      <span className="rounded-full bg-gold-500 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary-900">
                        Flagship
                      </span>
                    ) : null)}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-extrabold leading-snug text-primary-900">{displayContent(event.title)}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-gold-700">
                    {displayContent(event.fullName)}
                  </p>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{displayContent(event.summary)}</p>

                  <dl className="mt-4 grid gap-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={13} className="text-primary-500" />
                      <dd>{displayContent(event.date)}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-primary-500" />
                      <dd>{displayContent(event.location)}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={13} className="text-primary-500" />
                      <dd>{displayContent(event.scale)}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe2 size={13} className="text-primary-500" />
                      <dd>{displayContent(event.status)}</dd>
                    </div>
                  </dl>

                  <Link
                    href={event.href}
                    data-cursor="Explore"
                    className="focus-ring mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-800"
                  >
                    Explore event
                  </Link>
                </div>
              </article>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
