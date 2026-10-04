import type { Metadata } from 'next'
import { PageHero } from '@/components/layout/page-hero'
import { EventCard } from '@/components/features/content-cards'
import { Reveal } from '@/components/motion/reveal'
import { EmptyState } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Events',
  description:
    'PYPC conferences, workshops, bootcamps, webinars and ceremonies across Pakistan. Register as a member.'
}

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([
    prisma.event.findMany({
      where: { isPublished: true, startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' }
    }),
    prisma.event.findMany({
      where: { isPublished: true, startsAt: { lt: new Date() } },
      orderBy: { startsAt: 'desc' },
      take: 6
    })
  ])

  return (
    <>
      <PageHero
        eyebrow="Events"
        title="Convenings that turn participation into experience"
        description="Conferences, workshops, bootcamps, webinars and ceremonies — with attendance recorded for certificate eligibility."
        breadcrumb={[{ label: 'Events' }]}
      />

      <section className="container py-14">
        <h2 className="text-2xl font-extrabold text-primary-900">Upcoming events</h2>

        <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {upcoming.length ? (
            upcoming.map((event, index) => (
              <Reveal key={event.id} delay={index * 0.04}>
                <EventCard event={event} />
              </Reveal>
            ))
          ) : (
            <div className="md:col-span-2 lg:col-span-3">
              <EmptyState
                title="No upcoming events published"
                description="The next calendar of convenings is being finalised. Members are notified first through the dashboard."
              />
            </div>
          )}
        </div>

        {past.length ? (
          <>
            <h2 className="mt-16 text-2xl font-extrabold text-primary-900">Recently concluded</h2>
            <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {past.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        ) : null}
      </section>
    </>
  )
}
