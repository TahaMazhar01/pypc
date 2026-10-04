
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, MapPin, Ticket, Users } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { ApplicationForm } from '@/components/features/application-form'
import { Badge, Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { downloadIcsUrl, googleCalendarUrl, outlookCalendarUrl } from '@/lib/calendar'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { formatDateTime, formatShortDate, relativeDeadline } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await prisma.event.findUnique({ where: { slug: params.slug } }).catch(() => null)
  if (!event) return { title: 'Event not found' }
  return { title: event.title, description: event.description }
}

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const [event, user] = await Promise.all([
    prisma.event.findUnique({
      where: { slug: params.slug },
      include: {
        _count: { select: { registrations: true } },
        registrations: { where: { status: 'REGISTERED' }, select: { id: true, userId: true } }
      }
    }),
    getCurrentUser()
  ])

  if (!event || !event.isPublished) notFound()

  const alreadyRegistered = user
    ? event.registrations.some(registration => registration.userId === user.id)
    : false

  const seatsLeft = Math.max(event.capacity - event._count.registrations, 0)
  const closingSoon = event.registrationDeadline ? new Date(event.registrationDeadline) : null

  return (
    <>
      <PageHero
        eyebrow={`${event.eventType} · ${event.mode}`}
        title={displayContent(event.title)}
        description={event.description}
        breadcrumb={[{ label: 'Events', href: '/events' }, { label: event.title }]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="gold">{displayContent(formatShortDate(event.startsAt))}</Badge>
          {displayContent(event.city ? <Badge tone="primary">{displayContent(event.city)}</Badge> : null)}
          <Badge tone={seatsLeft > 0 ? 'success' : 'danger'}>
            {displayContent(seatsLeft > 0 ? `${seatsLeft} seats remaining` : 'Capacity reached — waitlist')}
          </Badge>
          {displayContent(closingSoon ? <Badge tone="warning">{displayContent(relativeDeadline(closingSoon))}</Badge> : null)}
        </div>
      </PageHero>

      <section className="container grid gap-10 py-14 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <Card>
            <h2 className="text-xl font-extrabold text-primary-900">Event details</h2>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <DetailRow icon={<CalendarDays size={16} />} label="Starts" value={formatDateTime(event.startsAt)} />
              <DetailRow
                icon={<CalendarDays size={16} />}
                label="Ends"
                value={event.endsAt ? formatDateTime(event.endsAt) : 'Single-session event'}
              />
              <DetailRow icon={<MapPin size={16} />} label="Venue" value={event.venue ?? 'Online'} />
              <DetailRow icon={<MapPin size={16} />} label="City" value={event.city ?? '—'} />
              <DetailRow icon={<Ticket size={16} />} label="Format" value={`${event.eventType} · ${event.mode}`} />
              <DetailRow
                icon={<Users size={16} />}
                label="Capacity"
                value={`${event._count.registrations} registered · ${event.capacity} total`}
              />
            </dl>

            {displayContent(closingSoon ? (
              <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Registration closes {displayContent(formatDateTime(closingSoon))}.
              </p>
            ) : null)}
          </Card>

          <Card>
            <h2 className="text-xl font-extrabold text-primary-900">Add this event to your calendar</h2>
            <p className="mt-2 text-sm text-slate-600">
              The calendar entry carries the venue, the start and end time in Pakistan Standard Time and a
              reminder the day before. It stays accurate because it is generated from the same record this
              page renders.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={downloadIcsUrl(event.slug)}
                className={buttonVariants({ variant: 'primary', size: 'md' })}
                download
              >
                Download .ics file
              </a>
              <a
                href={googleCalendarUrl({
                  uid: `pypc-event-${event.slug}@pypc`,
                  title: event.title,
                  description: `${event.description}\n\nDetails: /events/${event.slug}`,
                  location: [event.venue, event.city].filter(Boolean).join(', '),
                  start: event.startsAt,
                  end:
                    event.endsAt ??
                    new Date(event.startsAt.getTime() + (event.eventType === 'Conference' ? 24 : 3) * 3600_000)
                })}
                className={buttonVariants({ variant: 'outline', size: 'md' })}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Calendar
              </a>
              <a
                href={outlookCalendarUrl({
                  uid: `pypc-event-${event.slug}@pypc`,
                  title: event.title,
                  description: event.description,
                  location: [event.venue, event.city].filter(Boolean).join(', '),
                  start: event.startsAt,
                  end:
                    event.endsAt ??
                    new Date(event.startsAt.getTime() + (event.eventType === 'Conference' ? 24 : 3) * 3600_000)
                })}
                className={buttonVariants({ variant: 'outline', size: 'md' })}
                target="_blank"
                rel="noopener noreferrer"
              >
                Outlook
              </a>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-extrabold text-primary-900">Registration</h2>
            <p className="mt-2 text-sm text-slate-600">
              Attendance is recorded and contributes to certificate eligibility for PYPC programmes.
            </p>

            <div className="mt-6">
              {displayContent(alreadyRegistered ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                  <p className="font-bold text-emerald-800">You are registered for this event</p>
                  <p className="mt-2 text-sm text-emerald-800">
                    Your seat is confirmed. Check the dashboard for schedule updates and attendance
                    records.
                  </p>
                  <Link
                    href="/dashboard/events"
                    className={buttonVariants({ variant: 'primary', size: 'md', className: 'mt-4' })}
                  >
                    View my events
                  </Link>
                </div>
              ) : (
                <ApplicationForm
                  type="EVENT"
                  eventId={event.id}
                  defaultName={user ? `${user.firstName} ${user.lastName}` : ''}
                  defaultEmail={user?.email ?? ''}
                  defaultPhone={user?.phone ?? ''}
                  defaultCity={user?.city ?? ''}
                  signedIn={Boolean(user)}
                />
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-primary p-6 text-white shadow-soft">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gold-300">Key facts</h3>
            <p className="mt-4 text-2xl font-extrabold">{displayContent(formatShortDate(event.startsAt))}</p>
            <p className="mt-1 text-sm text-primary-100">
              {displayContent(event.mode)}
              {displayContent(event.city ? ` · ${event.city}` : '')}
            </p>

            <ul className="mt-5 space-y-2 text-sm text-primary-100">
              <li>• Seats: {displayContent(seatsLeft)} remaining</li>
              <li>• Registration: {displayContent(user ? 'Open to you' : 'Sign in required')}</li>
              <li>• Attendance record: yes</li>
            </ul>

            {displayContent(!user ? (
              <Link
                href={`/login?next=/events/${event.slug}`}
                className={buttonVariants({ variant: 'gold', size: 'md', className: 'mt-5 w-full' })}
              >
                Sign in to register
              </Link>
            ) : null)}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <h3 className="font-bold text-slate-900">Accessibility and conduct</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              All PYPC events follow the{displayContent(' ')}
              <Link href="/code-of-conduct" className="font-bold text-primary hover:underline">
                Code of Conduct
              </Link>
              . Tell the secretariat in advance if you need accessibility adjustments, and the team will
              accommodate wherever possible.
            </p>
          </div>
        </aside>
      </section>
    </>
  )
}

function DetailRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        {displayContent(icon)} {displayContent(label)}
      </dt>
      <dd className="mt-1.5 text-sm font-semibold text-slate-800">{displayContent(value)}</dd>
    </div>
  )
}
