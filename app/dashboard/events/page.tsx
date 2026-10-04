
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, Card, EmptyState } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { formatDateTime, humanise } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Events' }
export const dynamic = 'force-dynamic'

export default async function DashboardEventsPage() {
  const user = await requireUser()

  const registrations = await prisma.eventRegistration.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { event: true }
  })

  const upcoming = await prisma.event.findMany({
    where: { isPublished: true, startsAt: { gte: new Date() } },
    orderBy: { startsAt: 'asc' },
    take: 4
  })

  const registeredIds = new Set(registrations.map(item => item.eventId))

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">My event registrations</h2>
        <p className="mt-1 text-sm text-slate-600">
          Attendance is recorded by facilitators and contributes to certificate eligibility.
        </p>
      </Card>

      {displayContent(registrations.length ? (
        <div className="space-y-3">
          {registrations.map(registration => (
            <Card key={registration.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{displayContent(registration.event.eventType)}</Badge>
                  <Badge
                    tone={
                      registration.status === 'ATTENDED'
                        ? 'success'
                        : registration.status === 'CANCELLED'
                          ? 'danger'
                          : 'info'
                    }
                  >
                    {displayContent(humanise(registration.status))}
                  </Badge>
                </div>

                <h3 className="mt-3 font-extrabold text-slate-900">{displayContent(registration.event.title)}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {displayContent(formatDateTime(registration.event.startsAt))} · {displayContent(registration.event.mode)}
                  {displayContent(registration.event.city ? ` · ${registration.event.city}` : '')}
                </p>
              </div>

              <Link
                href={`/events/${registration.event.slug}`}
                className={buttonVariants({ variant: 'outline', size: 'md' })}
              >
                Event page
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No event registrations"
          description="Register for an upcoming PYPC event from its page — your seat and attendance record appear here."
          action={
            <Link href="/events" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              See upcoming events
            </Link>
          }
        />
      ))}

      {displayContent(upcoming.length ? (
        <Card>
          <h2 className="text-lg font-extrabold text-slate-900">Recommended for you</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {upcoming.map(event => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="focus-ring rounded-xl border border-slate-100 p-4 transition hover:border-primary-200 hover:bg-primary-50/40"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-gold-700">
                  {displayContent(formatDateTime(event.startsAt))}
                </p>
                <p className="mt-2 font-bold text-slate-900">{displayContent(event.title)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {displayContent(event.mode)}
                  {displayContent(event.city ? ` · ${event.city}` : '')}
                  {displayContent(registeredIds.has(event.id) ? ' · Already registered' : '')}
                </p>
              </Link>
            ))}
          </div>
        </Card>
      ) : null)}
    </div>
  )
}
