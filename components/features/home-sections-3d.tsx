'use client'


import { displayContent } from '@/lib/display-content'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, Globe2, Landmark, Scale, ShieldCheck, IdCard } from 'lucide-react'

import { TiltCard } from '@/components/motion/tilt-card'
import { Counter } from '@/components/motion/counter'
import { Icon } from '@/components/ui/icon'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/card'
import { featuredPillars, governancePrinciples, organisationalStructure } from '@/lib/constants'

/* ------------------------------------------------------------------ STATS */

export function StatsStrip3D({
  stats
}: {
  stats: { members: number; certificates: number; programmes: number; events: number; opportunities: number }
}) {
  const items = [
    /*
     * A figure of zero is never shown as a bare "0".
     *
     * An empty counter reads as an empty organisation, which is exactly the
     * opposite of the truth here: the platform is new and the numbers are small
     * because it is new. So each row carries an honest fallback for the
     * zero/one state, and `value: null` tells the component to print the note
     * instead of a number.
     */
    {
      label: 'Member target',
      value: 5000,
      zeroNote: 'Founding cohort — join now',
      icon: 'UsersRound',
      tone: 'text-primary'
    },
    {
      label: 'Programme target',
      value: 25,
      zeroNote: 'First cohort open',
      icon: 'Landmark',
      tone: 'text-gold-700'
    },
    {
      label: 'Certificate target',
      value: 70,
      zeroNote: 'Issued on completion',
      icon: 'Award',
      tone: 'text-emerald-600'
    },
    {
      label: 'Event target',
      value: 100,
      zeroNote: 'Calendar opening soon',
      icon: 'CalendarDays',
      tone: 'text-blue-600'
    },
    {
      label: 'Open opportunities',
      value: stats.opportunities,
      zeroNote: 'Watch this space',
      icon: 'GraduationCap',
      tone: 'text-violet-600'
    }
  ]

  return (
    <section className="editorial-stats relative border-b border-slate-100 bg-white py-14" aria-label="Future targets and current platform activity"><p className="container mb-6 text-sm text-slate-500">Members, programmes, certificates and events are future targets. Open opportunities reflect current platform activity.</p>
      <div className="container">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((item, index) => (
            <TiltCard
              key={item.label}
              intensity={10}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ${item.tone}`}>
                  <Icon name={item.icon} size={20} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  0{displayContent(index + 1)}
                </span>
              </div>
              {displayContent(item.value > 0 ? (
                <p className="mt-4 text-3xl font-extrabold text-slate-900">
                  <Counter value={item.value} />{['Certificate target', 'Event target'].includes(item.label) ? '+' : ''}
                </p>
              ) : (
                /*
                 * An honest zero state. A brand-new platform legitimately has
                 * small numbers; printing "0" makes it look empty, and inventing
                 * a figure would be worse. So the card states what is true.
                 */
                <p className="mt-4 text-lg font-extrabold leading-snug text-primary">
                  {displayContent(item.zeroNote)}
                </p>
              ))}
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {displayContent(item.label)}
              </p>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- PILLARS */

export function Pillars3D() {
  return (
    <section className="relative overflow-hidden bg-slate-50 section-y">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="orb orb-emerald absolute -left-20 top-10 h-64 w-64" />
        <div className="orb orb-gold absolute -right-16 bottom-0 h-72 w-72" />
      </div>

      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-gold-700">
            Seven thematic pillars
          </p>
          <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
            National priorities, delivered as programmes
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Every pillar runs on the same platform, applications, attendance records, mentorship and
            QR verified certification.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredPillars.map((pillar, index) => (
            <TiltCard
              key={pillar.slug}
              intensity={9}
              className="icon-detail-card group h-full rounded-3xl border border-slate-100 bg-white p-7 shadow-card"
            >
              <div className="scene-3d">
                <div className={`layer-2 flex h-14 w-14 items-center justify-center rounded-2xl ${pillar.accent}`}>
                  <Icon name={pillar.icon} size={28} />
                </div>

                <h3 className="layer-1 mt-6 text-xl font-extrabold text-slate-900 transition group-hover:text-primary">
                  {displayContent(pillar.title)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{displayContent(pillar.description)}</p>

                <Link
                  href={`/programmes/${pillar.slug}`}
                  className="layer-1 mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary"
                >
                  Explore pillar <ArrowRight size={16} />
                </Link>
              </div>
            </TiltCard>
          ))}

          <TiltCard intensity={9} className="icon-detail-card h-full rounded-3xl border border-primary-700 bg-primary p-7 text-white">
            <div className="scene-3d">
              <div className="layer-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <IdCard size={28} className="text-gold-300" />
              </div>
              <h3 className="layer-1 mt-6 text-xl font-extrabold">Membership</h3>
              <p className="mt-3 text-sm leading-6 text-primary-100">
                Join a tier, unlock committees, fellowships and verified experience records.
              </p>
              <Link
                href="/membership"
                className="layer-1 mt-6 inline-flex items-center gap-2 text-sm font-bold text-gold-300"
              >
                View plans <ArrowRight size={16} />
              </Link>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ GOVERNANCE */

const GOVERNANCE_CUBES = [
  { title: 'Non-Partisan', icon: Landmark, accent: 'from-primary-600 to-primary-800' },
  { title: 'Transparent', icon: ShieldCheck, accent: 'from-gold-500 to-gold-700' },
  { title: 'Accountable', icon: Scale, accent: 'from-emerald-600 to-emerald-800' }
]

export function Governance3D() {
  return (
    <section className="editorial-panel relative overflow-hidden bg-primary-900 section-y text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(110%_80%_at_80%_0%,#0b3b2e_0%,#06261e_60%,#031712_100%)]" />
        <div className="grid-floor absolute inset-x-0 bottom-0 h-[45%] opacity-50" />
      </div>

      <div className="container grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-gold-300">Governance</p>
          <h2 className="type-section mt-3 font-extrabold tracking-tight">
            Institution grade standards, not slogans
          </h2>
          <p className="mt-5 max-w-xl leading-8 text-primary-100">
            PYPC operates like a multinational institution: documented processes, role based access,
            append only audit trails and independently verifiable certification.
          </p>

          <ul className="mt-8 space-y-4">
            {organisationalStructure.map(item => (
              <li key={item.unit} className="flex gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-gold-300">
                  ✓
                </span>
                <span className="text-sm leading-6 text-primary-100">
                  <strong className="text-white">{displayContent(item.unit)}.</strong> {displayContent(item.detail)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {GOVERNANCE_CUBES.map((cube, index) => {
            const IconComponent = cube.icon
            return (
              <div key={cube.title} className="cube-stage">
                <TiltCard
                  intensity={14}
                  className="icon-detail-card h-full rounded-2xl p-5"
                >
                  <div className="scene-3d">
                    <span
                      className={`layer-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${cube.accent}`}
                    >
                      <IconComponent size={26} />
                    </span>
                    <h3 className="layer-1 mt-5 font-extrabold">{displayContent(cube.title)}</h3>
                    <p className="mt-2 text-xs leading-5 text-primary-100">
                      {displayContent(governancePrinciples[index % governancePrinciples.length].text)}
                    </p>
                  </div>
                </TiltCard>
              </div>
            )
          })}

          <div className="glass rounded-2xl p-5 sm:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 font-extrabold">
                  <Globe2 size={18} className="text-gold-300" /> National footprint
                </p>
                <p className="mt-1 text-xs text-primary-100">
                  Islamabad secretariat · seven regions · campus circles nationwide
                </p>
              </div>
              <Link
                href="/leadership"
                className={buttonVariants({ variant: 'gold', size: 'md' })}
              >
                Leadership & governance
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------- REACH */

const REACH_POINTS = [
  'Islamabad Capital Territory — National Secretariat',
  'Punjab — Lahore, Rawalpindi, Multan, Faisalabad circles',
  'Sindh — Karachi and Hyderabad chapters',
  'Khyber Pakhtunkhwa — Peshawar and Swat circles',
  'Balochistan — Quetta and Gwadar outreach',
  'Gilgit-Baltistan — Gilgit campus network',
  'Azad Jammu & Kashmir — Muzaffarabad chapter'
]

export function Reach3D() {
  return (
    <section className="relative overflow-hidden bg-white section-y">
      <div className="container grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <figure className="editorial-about-photo">
          <Image src="/images/editorial/pakistan-monument.webp" alt="Pakistan Monument illuminated at blue hour in Islamabad" fill sizes="(max-width: 1023px) 100vw, 45vw" className="object-cover" />
          <figcaption>National reach · Seven regions, one council</figcaption>
        </figure>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-gold-700">National reach</p>
          <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
            A national council with regional delivery
          </h2>
          <p className="mt-5 leading-8 text-slate-600">
            Programmes are delivered regionally, coordinated nationally and recorded centrally, so a
            member in Gilgit and a member in Karachi hold certificates from the same verified registry.
          </p>

          <ul className="mt-8 grid gap-3">
            {REACH_POINTS.map(point => (
              <li
                key={point}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-700"
              >
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-primary" />
                {displayContent(point)}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/about" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              About the council
            </Link>
            <Link href="/leadership" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Structure & office bearers
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- JOURNEY */

const JOURNEY = [
  { step: 'Register', detail: 'Create a verified member account in minutes.' },
  { step: 'Join a tier', detail: 'Associate, Executive or Institutional partnership.' },
  { step: 'Participate', detail: 'Programmes, events, committees, fellowships.' },
  { step: 'Get certified', detail: 'QR-verified certificates and experience letters.' },
  { step: 'Lead', detail: 'Chapter, committee and national roles with mentorship.' }
]

export function JourneyTimeline3D() {
  return (
    <section className="relative overflow-hidden bg-slate-50 section-y">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-gold-700">Member journey</p>
          <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
            From registration to national leadership
          </h2>
        </div>

        <div className="relative mt-14">
          <div className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent lg:block" />

          <ol className="grid gap-6 lg:grid-cols-5">
            {JOURNEY.map((item, index) => (
              <li key={item.step} className="relative">
                <TiltCard intensity={11} className="h-full rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
                  <div className="scene-3d">
                    <span className="layer-2 mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white shadow-soft">
                      {displayContent(index + 1)}
                    </span>
                    <h3 className="layer-1 mt-5 text-center font-extrabold text-slate-900">{displayContent(item.step)}</h3>
                    <p className="mt-2 text-center text-xs leading-5 text-slate-600">{displayContent(item.detail)}</p>
                  </div>
                </TiltCard>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 text-center">
          <Link href="/register" className={buttonVariants({ variant: 'gold', size: 'xl' })}>
            Start your journey today <ArrowRight size={19} />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- VERIFY */

export function VerifyCallout3D() {
  return (
    <section className="relative overflow-hidden bg-white section-y">
      <div className="container">
        <div className="verification-callout grid items-center gap-8 rounded-[2rem] border border-primary-100 bg-[#f7f4eb] p-6 sm:p-10 lg:grid-cols-[1fr_200px] lg:p-12">
          <div>
          <span className="verification-eyebrow inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white px-4 py-2 text-xs font-bold text-primary-900">
            <ShieldCheck size={16} aria-hidden="true" />
            Public verification service
          </span>

          <h2 className="type-section mt-5 font-extrabold text-primary-900">
            Verify any PYPC certificate in seconds
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            Every certificate carries a unique code and QR record. Employers and universities can confirm
            authenticity instantly, including whether a certificate has been revoked.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/verify" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              Verify a certificate <ShieldCheck size={18} />
            </Link>
            <Link href="/verify" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Try demo code PYPC A2B4 C6D8 E9F1
            </Link>
          </div>
          </div>
          <div className="verification-emblem flex h-40 w-40 items-center justify-center rounded-full border border-primary-100 bg-white p-5 lg:h-48 lg:w-48">
            <Image src="/images/pypc-emblem.png" alt="Pakistan Youth Parliamentary Council emblem" width={160} height={160} className="h-full w-full object-contain" />
          </div>
        </div>
      </div>
    </section>
  )
}
