
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { buttonVariants } from '@/components/ui/button'
import {
  featuredPillars,
  governancePrinciples,
  organisationalStructure,
  SITE_TAGLINE
} from '@/lib/constants'

export const metadata: Metadata = {
  title: 'About PYPC',
  description:
    'The Pakistan Youth Parliamentary Council is a national, non-partisan platform for youth leadership, parliamentary engagement, public policy and national impact.'
}

const journey = [
  {
    step: 'Register',
    detail: 'Create a free member account and complete your profile with your interests and region.'
  },
  {
    step: 'Join a membership tier',
    detail: 'Associate, Executive or Institutional — each tier defines what you can access and deliver.'
  },
  {
    step: 'Participate',
    detail: 'Enrol in programmes, attend events, join committees and apply to fellowships and delegations.'
  },
  {
    step: 'Be recognised',
    detail: 'Earn certificates and experience letters with QR verification that employers can check.'
  },
  {
    step: 'Lead',
    detail: 'Move into chapter, committee and national roles, and mentor the next cohort of members.'
  }
]

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="A national, non partisan platform for young Pakistanis"
        description="PYPC connects young people with parliamentary practice, public policy, leadership development, climate action, technology and civic responsibility — with credible, verifiable recognition for real participation."
        breadcrumb={[{ label: 'About' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/programmes" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Explore programmes
          </Link>
          <Link href="/leadership" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Leadership structure
          </Link>
        </div>
      </PageHero>

      <section className="container grid gap-10 py-16 lg:grid-cols-2">
        <Reveal>
          <div>
            <h2 className="text-3xl font-extrabold text-primary-900">Our mandate</h2>
            <div className="prose-pypc mt-5">
              <p>
                Pakistan has one of the world&apos;s largest youth populations, yet opportunities to
                learn how policy is actually made, to practise democratic procedure and to contribute
                evidence to public debate remain concentrated and unevenly distributed.
              </p>
              <p>
                PYPC exists to close that gap. We give young people structured access to parliamentary
                practice, policy research and leadership development, and we hold ourselves to
                documented, auditable standards so that participation means something concrete.
              </p>
              <p>
                We are non partisan by design. PYPC does not endorse parties, candidates or campaigns,
                and members participate in PYPC activities in a personal, non partisan capacity.
              </p>
            </div>

            <p className="mt-6 rounded-2xl border border-gold-200 bg-gold-50 px-5 py-4 text-lg font-extrabold text-gold-700">
              {displayContent(SITE_TAGLINE)}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <Card className="icon-detail-card h-full border-primary-100">
            <h3 className="text-xl font-extrabold text-primary-900">How we work</h3>
            <ul className="mt-5 space-y-4">
              {governancePrinciples.map(principle => (
                <li key={principle.title} className="flex gap-3">
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-primary" />
                  <span>
                    <span className="font-bold text-slate-900">{displayContent(principle.title)}.</span>{displayContent(' ')}
                    <span className="text-slate-600">{displayContent(principle.text)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      </section>

      <section className="border-y border-slate-100 bg-slate-50 py-16">
        <div className="container">
          <Reveal>
            <h2 className="text-3xl font-extrabold text-primary-900">Organisational structure</h2>
            <p className="mt-4 max-w-3xl text-slate-600">
              PYPC operates through a national council, an executive body, a secretariat, standing
              committees, regional chapters and campus circles. Exact composition and office bearers are
              announced by the official council.
            </p>
          </Reveal>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organisationalStructure.map((item, index) => (
              <Reveal key={item.unit} delay={index * 0.05}>
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-gold-700">
                    {displayContent(String(index + 1).padStart(2, '0'))}
                  </p>
                  <h3 className="mt-2 font-extrabold text-slate-900">{displayContent(item.unit)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{displayContent(item.detail)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <Reveal>
          <h2 className="text-3xl font-extrabold text-primary-900">The member journey</h2>
          <p className="mt-4 max-w-3xl text-slate-600">
            From registration to national leadership, a documented path with a record at every stage.
          </p>
        </Reveal>

        <ol className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {journey.map((item, index) => (
            <li key={item.step} className="h-full rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {displayContent(index + 1)}
              </span>
              <h3 className="mt-4 font-extrabold text-slate-900">{displayContent(item.step)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{displayContent(item.detail)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-slate-100 bg-primary py-16 text-white">
        <div className="container">
          <h2 className="text-3xl font-extrabold">Seven thematic pillars</h2>
          <p className="mt-4 max-w-3xl text-primary-100">
            Programmes, research and advocacy are organised around the national priorities where young
            Pakistanis can contribute most.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredPillars.map(pillar => (
              <Link
                key={pillar.slug}
                href={`/programmes/${pillar.slug}`}
                className="rounded-2xl border border-white/15 bg-white/5 p-5 transition hover:border-gold-300/60 hover:bg-white/10"
              >
                <Icon name={pillar.icon} size={26} className="text-gold-300" />
                <h3 className="mt-4 font-bold">{displayContent(pillar.title)}</h3>
                <p className="mt-2 text-xs leading-5 text-primary-100">{displayContent(pillar.description)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
