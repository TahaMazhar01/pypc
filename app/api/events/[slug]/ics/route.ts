import { prisma } from '@/lib/prisma'
import { buildIcs, type CalendarEvent } from '@/lib/calendar'

/**
 * Downloads one published PYPC event as a calendar file.
 *
 * Public on purpose: an event people can put in their calendar is an event
 * people actually attend, and nothing private is exposed — the feed contains
 * only what the public event page already shows.
 */
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const event = await prisma.event.findFirst({
    where: { slug: params.slug, isPublished: true }
  })

  if (!event) {
    return new Response('Event not found', { status: 404 })
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  const start = event.startsAt
  // Events without an explicit end time get a sensible one: 3 hours, or 1 day
  // for conferences, so a calendar entry never shows a zero-length block.
  const end =
    event.endsAt ??
    new Date(start.getTime() + (event.eventType === 'Conference' ? 24 : 3) * 60 * 60 * 1000)

  const location = [event.venue, event.city].filter(Boolean).join(', ') || event.mode

  const calendarEvent: CalendarEvent = {
    uid: `pypc-event-${event.slug}@pypc`,
    title: event.title,
    description: [event.description, `Details: ${appUrl}/events/${event.slug}`].join('\n\n'),
    location,
    start,
    end,
    url: `${appUrl}/events/${event.slug}`,
    organiserEmail: process.env.CONTACT_EMAIL || 'pypcofficial@gmail.com',
    organiserName: 'Pakistan Youth Parliamentary Council'
  }

  return new Response(buildIcs(calendarEvent), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="pypc-${event.slug}.ics"`,
      'Cache-Control': 'public, max-age=600'
    }
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
