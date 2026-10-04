
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge, Card } from '@/components/ui/card'
import { ContentToggle } from '@/components/admin/admin-controls'
import { prisma } from '@/lib/prisma'
import { isStaff, requireUser } from '@/lib/auth'
import { formatDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Events' }
export const dynamic = 'force-dynamic'

export default async function AdminEventsPage() {
  const user = await requireUser()
  if (!isStaff(user.role) && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) redirect('/dashboard')

  const events = await prisma.event.findMany({
    orderBy: { startsAt: 'desc' },
    include: { _count: { select: { registrations: true, certificates: true } } }
  })

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Event calendar</h2>
        <p className="mt-1 text-sm text-slate-600">
          Unpublished events are hidden from the public site immediately but keep their registrations and
          records. Attendance marking is performed by facilitators through the database record.
        </p>
      </Card>

      <div className="space-y-4">
        {events.map(event => {
          const past = new Date(event.startsAt) < new Date()

          return (
            <Card key={event.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{displayContent(event.eventType)}</Badge>
                    <Badge tone={event.isPublished ? 'success' : 'neutral'}>
                      {displayContent(event.isPublished ? 'Published' : 'Draft')}
                    </Badge>
                    <Badge tone={past ? 'warning' : 'info'}>{displayContent(past ? 'Concluded' : 'Upcoming')}</Badge>
                    {displayContent(event.isFeatured ? <Badge tone="gold">Featured</Badge> : null)}
                  </div>

                  <h3 className="mt-3 font-extrabold text-slate-900">{displayContent(event.title)}</h3>
                  <p className="mt-1 font-mono text-xs text-slate-500">/events/{displayContent(event.slug)}</p>

                  <p className="mt-2 text-sm text-slate-600">
                    {displayContent(formatDateTime(event.startsAt))}
                    {displayContent(event.endsAt ? ` → ${formatDateTime(event.endsAt)}` : '')} · {displayContent(event.mode)}
                    {displayContent(event.city ? ` · ${event.city}` : '')}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {displayContent(event._count.registrations)} registered of {displayContent(event.capacity)} ·{displayContent(' ')}
                    {displayContent(event._count.certificates)} certificate(s)
                  </p>
                </div>

                <div className="flex flex-col items-start gap-3">
                  <ContentToggle entity="event" id={event.id} field="isPublished" value={event.isPublished} />
                  <ContentToggle entity="event" id={event.id} field="isFeatured" value={event.isFeatured} />
                  <Link href={`/events/${event.slug}`} className="text-xs font-bold text-primary hover:underline">
                    View public page →
                  </Link>
                </div>
              </div>
            </Card>
          )
        })}

        {displayContent(!events.length ? (
          <Card className="text-center text-sm text-slate-500">No events recorded.</Card>
        ) : null)}
      </div>
    </div>
  )
}
