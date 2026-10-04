
import { displayContent } from '@/lib/display-content'
import { getSitePhoto, programmePhotos } from '@/lib/site-photos'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CalendarDays, Clock, MapPin, Users } from 'lucide-react'
import { Badge } from '@/components/ui/card'
import { formatShortDate, parseJsonArray, relativeDeadline } from '@/lib/utils'

type ProgrammeLike = {
  slug: string
  title: string
  category: string
  summary: string
  mode: string
  durationWeeks: number | null
  seats: number | null
}

export function ProgrammeCard({ programme }: { programme: ProgrammeLike }) {
  const photo = getSitePhoto(programmePhotos[programme.slug])
  return (
    <Link
      href={`/programmes/${programme.slug}`}
      className="focus-ring group flex h-full flex-col rounded-lg border border-slate-100 bg-white p-6 shadow-card hover-lift transition duration-300 hover:border-primary-100 hover:shadow-soft"
    >
      {photo && <div className="relative -mx-6 -mt-6 mb-5 h-48 overflow-hidden rounded-t-lg">
        <Image src={photo.src} alt={displayContent(photo.alt)} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        
      </div>}
      <Badge tone="primary">{displayContent(programme.category)}</Badge>

      <h3 className="mt-4 text-lg font-extrabold text-slate-900 group-hover:text-primary">
        {displayContent(programme.title)}
      </h3>

      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{displayContent(programme.summary)}</p>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1.5">
          <Clock size={14} /> {displayContent(programme.durationWeeks ?? '—')} weeks
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={14} /> {displayContent(programme.seats ?? 'Open')} seats
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin size={14} /> {displayContent(programme.mode)}
        </span>
      </div>

      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
        View programme <ArrowRight size={15} />
      </span>
    </Link>
  )
}

type EventLike = {
  slug: string
  title: string
  description: string
  eventType: string
  mode: string
  city: string | null
  startsAt: Date
  endsAt: Date | null
  capacity: number
}

export function EventCard({ event }: { event: EventLike }) {
  const sameDay =
    event.endsAt && new Date(event.endsAt).toDateString() === new Date(event.startsAt).toDateString()

  return (
    <Link
      href={`/events/${event.slug}`}
      className="focus-ring group flex h-full flex-col rounded-lg border border-slate-100 bg-white p-6 shadow-card hover-lift transition duration-300 hover:border-primary-100 hover:shadow-soft"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge tone="gold">{displayContent(event.eventType)}</Badge>
        <span className="text-xs font-bold uppercase tracking-wide text-primary">
          {displayContent(relativeDeadline(event.startsAt))}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-extrabold text-slate-900 group-hover:text-primary">{displayContent(event.title)}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{displayContent(event.description)}</p>

      <div className="mt-5 space-y-2 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-2">
          <CalendarDays size={14} />
          {displayContent(formatShortDate(event.startsAt))}
          {displayContent(event.endsAt && !sameDay ? ` – ${formatShortDate(event.endsAt)}` : '')}
        </span>
        <span className="flex items-center gap-2">
          <MapPin size={14} /> {displayContent(event.mode)}
          {displayContent(event.city ? ` · ${event.city}` : '')}
        </span>
        <span className="flex items-center gap-2">
          <Users size={14} /> Capacity {displayContent(event.capacity)}
        </span>
      </div>

      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
        Event details <ArrowRight size={15} />
      </span>
    </Link>
  )
}

type OpportunityLike = {
  slug: string
  title: string
  organisation: string
  type: string
  location: string
  mode: string
  deadline: Date | null
  stipend: string | null
  requirements: string
}

export function OpportunityCard({ opportunity }: { opportunity: OpportunityLike }) {
  const requirements = parseJsonArray(opportunity.requirements)

  return (
    <Link
      href={`/opportunities/${opportunity.slug}`}
      className="focus-ring group flex h-full flex-col rounded-lg border border-slate-100 bg-white p-6 shadow-card hover-lift transition duration-300 hover:border-primary-100 hover:shadow-soft"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge tone="info">{displayContent(opportunity.type)}</Badge>
        <span className="text-xs font-bold text-slate-500">{displayContent(relativeDeadline(opportunity.deadline))}</span>
      </div>

      <h3 className="mt-4 text-lg font-extrabold text-slate-900 group-hover:text-primary">
        {displayContent(opportunity.title)}
      </h3>
      <p className="mt-1 text-sm font-semibold text-slate-500">{displayContent(opportunity.organisation)}</p>

      <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
        {requirements.slice(0, 3).map(requirement => (
          <li key={requirement} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            <span className="leading-6">{displayContent(requirement)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1.5">
          <MapPin size={14} /> {displayContent(opportunity.location)}
        </span>
        {displayContent(opportunity.stipend ? (
          <span className="flex items-center gap-1.5">
            <Users size={14} /> {displayContent(opportunity.stipend)}
          </span>
        ) : null)}
      </div>

      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
        View opportunity <ArrowRight size={15} />
      </span>
    </Link>
  )
}
