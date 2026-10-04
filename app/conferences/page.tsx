
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, FileText, Globe2, Handshake, Landmark } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { TiltCard } from '@/components/motion/tilt-card'
import { buttonVariants } from '@/components/ui/button'
import { EventsExplorer, type EventCard } from '@/components/features/events-explorer'
import { PartnerWall } from '@/components/features/partner-wall'
import { HeroCarousel } from '@/components/features/hero-carousel'
import { Icon } from '@/components/ui/icon'
import { conferences, imun2027 } from '@/lib/data/conferences'

export const metadata: Metadata = {
  title: 'Conferences & events',
  description:
    'PYPC conferences, summits and training cycles — led by IMUN 2027, the International Model United Nations conference in Islamabad with 50+ countries targeted.',
  alternates: { canonical: '/conferences' }
}

const CONFERENCE_IMAGES: Record<string, string> = {
  'imun-2027': '/images/editorial/international-law.webp',
  'national-youth-parliament-sitting': '/images/editorial/civic-institutions.webp',
  'climate-policy-lab-showcase': '/images/editorial/urban-nature.webp'
}

function toEventCard(conference: (typeof conferences)[number]): EventCard {
  const summaryBySlug: Record<string, string> = {
    'imun-2027':
      'Three days of committee simulation, climate diplomacy and cultural exchange in the federal capital, with a scholarship pathway covering 30–40% of places.',
    'national-youth-parliament-sitting':
      'A full legislative simulation: bill drafting, committee scrutiny, floor debate and recorded votes across all seven PYPC regions.',
    'climate-policy-lab-showcase':
      'Cohort outputs from the climate policy lab presented as citable briefs — vulnerability profiles and adaptation finance routes.'
  }

  return {
    slug: conference.slug,
    title: conference.title.split('—')[0].trim(),
    fullName: conference.title,
    summary: summaryBySlug[conference.slug] ?? conference.theme,
    image: CONFERENCE_IMAGES[conference.slug]!,
    href: conference.href,
    location: conference.location,
    date: conference.date,
    scale: conference.scale,
    category: conference.slug === 'imun-2027' ? 'Conference' : conference.slug.includes('sitting') ? 'Conference' : 'Summit',
    status: conference.status,
    featured: conference.featured
  }
}

const SLIDES = [
  {
    src: '/images/editorial/global-forum.webp',
    title: 'IMUN 2027 — Islamabad, January 2027',
    caption:
      'International Model United Nations under the theme of climate diplomacy, hosted in Pakistan’s federal capital with 50+ countries targeted.',
    href: '/conferences/imun-2027',
    cta: 'Read the concept note'
  },
  {
    src: '/images/editorial/islamabad.webp',
    title: 'National Youth Parliament Sitting',
    caption:
      'Youth members draft and debate legislation through a full parliamentary simulation with committee scrutiny and recorded proceedings.',
    href: '/events',
    cta: 'See the calendar'
  },
  {
    src: '/images/editorial/forest-restoration.webp',
    title: 'Climate Policy Lab Showcase',
    caption:
      'Adaptation policy research produced by the climate cohort, presented as briefs for decision-makers.',
    href: '/programmes/climate-policy-lab',
    cta: 'Explore the programme'
  }
]

export default function ConferencesPage() {
  return (
    <>
      <PageHero
        eyebrow="Conferences & events"
        title="Convene, debate and publish, PYPC's conference programme"
        description="From the International Model United Nations in Islamabad to national youth parliament sittings and climate policy showcases, every PYPC convening is documented, certified and open in its selection process."
        breadcrumb={[{ label: 'Conferences' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/conferences/imun-2027" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
            IMUN 2027 <ArrowRight size={18} />
          </Link>
          <Link href="/events" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Full event calendar
          </Link>
          <Link href="/partnerships" className={buttonVariants({ variant: 'subtle', size: 'lg' })}>
            Sponsorship packages
          </Link>
        </div>
      </PageHero>

      <section className="container py-14">
        <Reveal>
          <HeroCarousel slides={SLIDES} />
        </Reveal>
      </section>

      <section className="container pb-16">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">All listings</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
              Conferences, sittings, showcases and institutional visits
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Filter by type. Every card opens a real destination, a concept note, a programme page, the
              events calendar or a filed correspondence record.
            </p>
          </div>
        </Reveal>

        <div className="mt-10">
          <EventsExplorer events={conferences.map(toEventCard)} />
        </div>
      </section>

      {/* IMUN highlight with 3D backdrop */}
      <section className="editorial-panel relative isolate overflow-hidden bg-primary-900 py-16 text-white">

        <div className="container grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal direction="left">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-300">
                Flagship · {displayContent(imun2027.code)}
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {displayContent(imun2027.name)}
              </h2>
              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-gold-200">
                {displayContent(imun2027.tagline)}
              </p>

              <dl className="mt-7 grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Host city', value: imun2027.hostCity, icon: Landmark },
                  { label: 'Dates', value: imun2027.dates, icon: Globe2 },
                  { label: 'Theme', value: imun2027.theme, icon: Globe2 },
                  { label: 'Scale', value: imun2027.countriesTarget, icon: Handshake }
                ].map(item => (
                  <div key={item.label} className="rounded-2xl border border-white/12 bg-white/[0.05] p-4">
                    <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-200">
                      <item.icon size={13} className="text-gold-300" /> {displayContent(item.label)}
                    </dt>
                    <dd className="mt-1.5 text-sm text-white">{displayContent(item.value)}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/conferences/imun-2027" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
                  Full IMUN 2027 brief
                </Link>
                <a
                  href="/documents/IMUN_2027_Concept_Note_Redesigned.pdf"
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'lg',
                    className: 'border-white/30 bg-white/5 text-white hover:bg-white/10'
                  })}
                >
                  <FileText size={16} /> Download concept note
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">
                Conference components
              </p>
              <ul className="mt-4 space-y-3">
                {imun2027.components.map(component => (
                  <li key={component.title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-300">
                      <Icon name={component.icon} size={17} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">{displayContent(component.title)}</p>
                      <p className="mt-0.5 text-xs leading-6 text-primary-100">{displayContent(component.detail)}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-5 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-[11px] leading-6 text-amber-100">
                {displayContent(imun2027.notes[0])}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <PartnerWall />
    </>
  )
}
