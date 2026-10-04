
import { displayContent } from '@/lib/display-content'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'
import { TiltCard } from '@/components/motion/tilt-card'
import { buttonVariants } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import {
  HomeHero3D,
  type HeroStats
} from '@/components/features/home-hero-3d'
import {
  Governance3D,
  JourneyTimeline3D,
  Pillars3D,
  Reach3D,
  StatsStrip3D,
  VerifyCallout3D
} from '@/components/features/home-sections-3d'
import {
  EventsBand,
  FeaturedCarouselBand,
  InternationalBand,
  ResearchAndReachBand,
  TechnicalHighlights
} from '@/components/features/home-new-sections'
import { PartnerWall } from '@/components/features/partner-wall'
import { CouncilIntroduction } from '@/components/features/council-introduction'
import { featuredPillars, SITE_TAGLINE } from '@/lib/constants'
import { prisma } from '@/lib/prisma'
import { formatShortDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const membershipBenefits = [
  'Structured access to programmes and events',
  'Participation-based certificate eligibility',
  'Curated scholarship, fellowship and career opportunities',
  'Secure personal dashboard and application tracking'
]

export default async function HomePage() {
  const [upcomingEvents, openOpportunities, counts] = await Promise.all([
    prisma.event
      .findMany({
        where: { isPublished: true, startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        take: 3
      })
      .catch(() => []),
    prisma.opportunity
      .findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 3 })
      .catch(() => []),
    Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.certificate.count({ where: { status: 'VALID' } }).catch(() => 0),
      prisma.programme.count({ where: { isActive: true } }).catch(() => 0),
      prisma.event.count().catch(() => 0),
      prisma.opportunity.count({ where: { isActive: true } }).catch(() => 0)
    ])
  ])

  const [memberCount, certificateCount, programmeCount, eventCount, opportunityCount] = counts

  const stats: HeroStats = {
    members: memberCount,
    certificates: certificateCount,
    programmes: programmeCount,
    events: eventCount,
    opportunities: opportunityCount
  }

  return (
    <>
      {/* 1 — 3D hero with the official emblem */}
      <HomeHero3D stats={stats} />
      <CouncilIntroduction />

      {/* 2 — aieys-style rotating highlight carousel */}
      <FeaturedCarouselBand />

      {/* 3 — animated institutional counters */}
      <StatsStrip3D
        stats={{
          members: memberCount,
          certificates: certificateCount,
          programmes: programmeCount,
          events: eventCount,
          opportunities: opportunityCount
        }}
      />

      {/* 4 — pillars as depth-layered 3D cards */}
      <Pillars3D />

      {/* 5 — institutional engagement wall */}
      <PartnerWall />

      {/* 6 — events grid with cover images and "Explore event" */}
      <EventsBand />

      {/* 7 — governance + audit-grade standards */}
      <Governance3D />

      {/* 8 — research desk + international reach with connecting-dots */}
      <ResearchAndReachBand />

      {/* 9 — national reach with live 3D globe */}
      <Reach3D />

      {/* 6 — programmes / events / opportunities preview */}
      <section className="container py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-extrabold text-primary-900">Upcoming events</h2>
              <Link href="/events" className="text-sm font-bold text-primary hover:underline">
                View all
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {displayContent(upcomingEvents.length ? (
                upcomingEvents.map(event => (
                  <TiltCard
                    key={event.id}
                    intensity={7}
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
                  >
                    <Link href={`/events/${event.slug}`} className="focus-ring block">
                      <p className="text-xs font-bold uppercase tracking-wide text-gold-700">
                        {displayContent(event.eventType)} · {displayContent(formatShortDate(event.startsAt))}
                      </p>
                      <h3 className="mt-2 font-extrabold text-slate-900">{displayContent(event.title)}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {displayContent(event.mode)}
                        {displayContent(event.city ? ` · ${event.city}` : '')}
                      </p>
                    </Link>
                  </TiltCard>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                  New events are published regularly. Check back soon.
                </p>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-extrabold text-primary-900">Latest opportunities</h2>
              <Link href="/opportunities" className="text-sm font-bold text-primary hover:underline">
                View all
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {displayContent(openOpportunities.length ? (
                openOpportunities.map(opportunity => (
                  <TiltCard
                    key={opportunity.id}
                    intensity={7}
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
                  >
                    <Link href={`/opportunities/${opportunity.slug}`} className="focus-ring block">
                      <p className="text-xs font-bold uppercase tracking-wide text-gold-700">
                        {displayContent(opportunity.type)} · {displayContent(opportunity.location)}
                      </p>
                      <h3 className="mt-2 font-extrabold text-slate-900">{displayContent(opportunity.title)}</h3>
                      <p className="mt-1 text-sm text-slate-600">{displayContent(opportunity.organisation)}</p>
                    </Link>
                  </TiltCard>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                  Opportunities appear here as partners publish them.
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 10 — membership with 3D panels */}
      <section className="relative overflow-hidden bg-slate-50 py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
          <div className="orb orb-emerald absolute -left-24 top-6 h-72 w-72" />
        </div>

        <div className="container grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <TiltCard intensity={8} className="rounded-3xl bg-primary p-8 text-white shadow-soft sm:p-10">
              <div className="scene-3d">
                <div className="layer-2 flex items-center gap-4">
                  <Image
                    src="/images/pypc-emblem-256.png"
                    alt="PYPC emblem"
                    width={128}
                    height={128}
                    className="h-28 w-28 rounded-2xl bg-white p-3 object-contain shadow-sm"
                  />
                  <Icon name="FileCheck2" size={32} className="text-gold-300" />
                </div>

                <p className="layer-1 mt-6 text-sm font-bold uppercase tracking-[0.16em] text-gold-300">
                  Membership with integrity
                </p>
                <h2 className="type-section layer-1 mt-3 font-extrabold leading-tight">
                  Participation deserves credible recognition.
                </h2>
                <p className="layer-1 mt-5 max-w-xl leading-7 text-primary-100">
                  PYPC membership creates a structured pathway to programmes, opportunities,
                  participation records and verified documentation.
                </p>
                <Link
                  href="/membership"
                  className="layer-1 mt-8 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-3 font-bold text-primary-900 transition hover:bg-gold-400"
                >
                  View Membership Plans <ArrowRight size={18} />
                </Link>
              </div>
            </TiltCard>
          </Reveal>

          <Reveal delay={0.12}>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-gold-700">
                What membership supports
              </p>
              <h2 className="type-section mt-3 font-extrabold text-primary-900">
                A clear path from learning to leadership.
              </h2>
              <ul className="mt-7 space-y-4">
                {membershipBenefits.map(benefit => (
                  <li key={benefit} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary">
                      <CheckCircle2 size={16} />
                    </span>
                    <span className="leading-6 text-slate-700">{displayContent(benefit)}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-7 rounded-2xl border border-gold-200 bg-gold-50 px-5 py-4 text-sm font-bold text-gold-700">
                {displayContent(SITE_TAGLINE)}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 11 — international participation */}
      <InternationalBand />

      {/* 12 — journey timeline */}
      <JourneyTimeline3D />

      {/* 13 — design & engineering standard */}
      <TechnicalHighlights />

      {/* 14 — verification call to action */}
      <VerifyCallout3D />

    </>
  )
}
