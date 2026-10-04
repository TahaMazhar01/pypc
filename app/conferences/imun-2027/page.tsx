
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CalendarDays,
  ExternalLink,
  FileText,
  Globe2,
  Handshake,
  Landmark,
  MapPin,
  ShieldCheck,
  Users
} from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'
import { TiltCard } from '@/components/motion/tilt-card'
import { Counter } from '@/components/motion/counter'
import { buttonVariants } from '@/components/ui/button'
import { Accordion } from '@/components/ui/accordion'
import { ScrollSpyNav } from '@/components/experience/scroll-spy'
import { ShareButtons } from '@/components/ui/share-buttons'
import { Icon } from '@/components/ui/icon'
import { imun2027 } from '@/lib/data/conferences'
import { correspondenceRecords } from '@/lib/data/correspondence'
import { budgetLines, disclaimer } from '@/lib/data/imun-2027'
import {
  AtAGlance,
  BudgetBreakdown,
  CulturalProgramme,
  FlagParade,
  ParticipationList,
  StatusChip,
  Timeline,
  VenueCompare,
  WhyDifferent,
  Workstreams
} from '@/components/features/imun/imun-sections'
import {
  AgendaTopics,
  AtAGlanceFull,
  ConceptNote,
  CurrentStatusList,
  ParticipantGroups,
  ProgrammeDays,
  VisionAndSignatories
} from '@/components/features/imun/imun-concept'
import { prisma } from '@/lib/prisma'
import { CONTACT_EMAIL } from '@/lib/constants'

/**
 * The conference page reads its live numbers from the database on every request:
 * how many people have registered interest and how many countries are already
 * represented. Nothing here is a hard-coded figure.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  openGraph: {
    images: [{ url: '/images/og-imun-2027.png', width: 1200, height: 630, alt: 'IMUN 2027 — International Model United Nations, Islamabad' }]
  },

  title: 'IMUN 2027 — International Model United Nations',
  description:
    'IMUN 2027: Pakistan’s international Model United Nations conference in Islamabad, January 2027, themed on climate diplomacy. 50+ countries targeted, 30–40% of places planned as scholarship-supported.',
  alternates: { canonical: '/conferences/imun-2027' }
}

const SECTIONS = [
  { id: 'glance', label: 'At a glance' },
  { id: 'programme', label: '3-day programme' },
  { id: 'overview', label: 'Overview' },
  { id: 'concept', label: 'Concept note' },
  { id: 'components', label: 'Programme' },
  { id: 'delegates', label: 'Who can take part' },
  { id: 'categories', label: 'Delegate categories' },
  { id: 'countries', label: 'Countries' },
  { id: 'venue', label: 'Venue' },
  { id: 'culture', label: 'Culture' },
  { id: 'scholarships', label: 'Scholarships' },
  { id: 'budget', label: 'Budget' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'workstreams', label: 'Live workstreams' },
  { id: 'why', label: 'Why different' },
  { id: 'current-status', label: 'Current status' },
  { id: 'vision', label: 'Vision & signatories' },
  { id: 'sponsors', label: 'Sponsorship' },
  { id: 'documents', label: 'Documents' },
  { id: 'faq', label: 'FAQ' },
  { id: 'apply', label: 'How to join' }
]

const DELEGATE_FAQ = [
  {
    question: 'When does registration open?',
    answer: `${imun2027.registrationWindow}. Confirmed and active PYPC members are notified first through their dashboard, then registration opens publicly on this page and the events calendar.`
  },
  {
    question: 'How do international delegates apply for a visa?',
    answer:
      'Once your registration is confirmed you can request an official invitation letter through the visa letter page. The letter is issued on PYPC letterhead within five working days and is yours to submit with your visa application. PYPC cannot influence the visa decision.'
  },
  {
    question: 'Are scholarships available?',
    answer: `${imun2027.scholarshipShare}. Scholarship places are assessed on merit and need using the same application form as standard places, and a written award letter states exactly which components are covered.`
  },
  {
    question: 'What does the delegate fee cover?',
    answer:
      'A published delegate fee covers conference materials, committee sessions, training sessions, the cultural programme, certificates and delegate pack. Travel, accommodation and insurance remain the delegate’s responsibility unless an award letter states otherwise. Final fee tiers are published when registration opens.'
  },
  {
    question: 'Where exactly will IMUN 2027 be held?',
    answer: `The venue is under review: ${imun2027.venue}. The final venue is confirmed only after approval, and this page is updated the moment that happens.`
  },
  {
    question: 'Can universities send delegations?',
    answer:
      'Yes. Universities and Model UN societies can send delegations with a faculty advisor or chaperone. Institutions can also sponsor places, co-brand certificates or join through an MoU — see the partnerships page.'
  }
]

export default async function Imun2027Page() {
  const conceptRecord = correspondenceRecords.find(record => record.id === 'imun-2027')

  /**
   * Live conference signals, read from the database on every request:
   *  · registrations  — event registrations for the IMUN 2027 record, including
   *                     anyone who registered interest from the events calendar
   *  · applications   — applications submitted against the IMUN programme
   *  · countries      — distinct countries among the members who registered,
   *                     which is what "delegation" actually means here
   */
  const [imunEvent, imunProgramme] = await Promise.all([
    prisma.event.findFirst({ where: { slug: { contains: 'imun' } }, select: { id: true, title: true } }),
    prisma.programme.findFirst({ where: { slug: { contains: 'imun' } }, select: { id: true } })
  ])

  const [registrations, applications, members] = await Promise.all([
    imunEvent
      ? prisma.eventRegistration.count({ where: { eventId: imunEvent.id, status: { not: 'CANCELLED' } } })
      : Promise.resolve(0),
    imunProgramme
      ? prisma.application.count({ where: { programmeId: imunProgramme.id } })
      : Promise.resolve(0),
    imunEvent
      ? prisma.eventRegistration.findMany({
          where: { eventId: imunEvent.id, status: { not: 'CANCELLED' } },
          select: { user: { select: { country: true, countryName: true } } }
        })
      : Promise.resolve([] as { user: { country: string | null; countryName: string | null } }[])
  ])

  const countriesRepresented = new Set(
    members
      .map(registration => registration.user.country ?? registration.user.countryName)
      .filter((value): value is string => Boolean(value))
  ).size
  const delegations = registrations + applications

  return (
    <>
      {/* Hero */}
      <section className="editorial-panel relative isolate overflow-hidden bg-primary-900 py-16 text-white sm:py-20">

        <div className="pointer-events-none absolute inset-0 -z-10">
          {/* Conference navy, so the flagship event reads as its own sub-brand. */}
          <div className="absolute inset-0 bg-[radial-gradient(110%_85%_at_20%_0%,rgba(11,29,55,0.94)_0%,rgba(8,22,42,0.9)_55%,rgba(4,12,24,0.96)_100%)]" />
          <div className="orb orb-gold absolute -left-24 top-16 h-72 w-72" />
          <div className="orb orb-emerald absolute right-[-5rem] bottom-0 h-80 w-80" />
        </div>

        <div className="container">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-semibold text-navy-100">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/conferences" className="hover:text-white">Conferences</Link>
            <span>/</span>
            <span className="text-gold-300">IMUN 2027</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="scene-3d">
              <span className="layer-1 inline-flex items-center gap-2 rounded-full border border-azure-300/50 bg-azure-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-azure-100">
                <Globe2 size={14} /> Flagship conference · {displayContent(imun2027.code)}
              </span>

              {/* Live counters, straight from the database (no hard-coded numbers). */}
              <dl className="layer-1 mt-5 flex flex-wrap gap-x-8 gap-y-3" data-live-conference>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-navy-100">
                    Registrations of interest
                  </dt>
                  <dd className="text-2xl font-extrabold text-white">{displayContent(delegations)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-navy-100">
                    Countries represented
                  </dt>
                  <dd className="text-2xl font-extrabold text-white">{displayContent(countriesRepresented)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-navy-100">
                    Registration target
                  </dt>
                  <dd className="text-2xl font-extrabold text-gold-300">End Oct 2026</dd>
                </div>
              </dl>

              <h1 className="layer-1 mt-5 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
                <span className="block">{displayContent(imun2027.name)}</span>
                <span className="mt-2 block text-gradient-gold">{displayContent(imun2027.tagline)}</span>
              </h1>

              <p className="layer-1 mt-6 max-w-2xl text-base leading-8 text-primary-100">
                A three day international Model United Nations conference hosted in {displayContent(imun2027.hostCity)}, built
                around {displayContent(imun2027.theme.toLowerCase())}. Delegates are assigned countries and committees, negotiate
                resolutions under standard rules of procedure, and leave with QR verified recognition.
              </p>

              <div className="layer-1 mt-8 flex flex-wrap gap-3">
                <Link href="/register" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
                  Register interest <ArrowRight size={18} />
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
                  <FileText size={16} /> Concept note (PDF)
                </a>
                <Link
                  href="/international/visa-letter"
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'lg',
                    className: 'border-white/30 bg-white/5 text-white hover:bg-white/10'
                  })}
                >
                  Visa invitation letter
                </Link>
              </div>

              <div className="layer-1 mt-9 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Countries targeted', value: 50, suffix: '+' },
                  { label: 'Places scholarship-planned (%)', value: 40 },
                  { label: 'Conference days', value: 3 }
                ].map(item => (
                  <div key={item.label} className="rounded-2xl border border-white/12 bg-white/[0.05] p-4">
                    <p className="text-2xl font-extrabold text-gold-200">
                      <Counter value={item.value} suffix={item.suffix ?? ''} />
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-200">
                      {displayContent(item.label)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Reveal direction="right">
              <div className="rounded-3xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">At a glance</p>

                <dl className="mt-5 space-y-4 text-sm">
                  {[
                    { icon: MapPin, label: 'Host city', value: imun2027.hostCity },
                    { icon: CalendarDays, label: 'Dates', value: imun2027.dates },
                    { icon: Landmark, label: 'Venue', value: imun2027.venue },
                    { icon: Globe2, label: 'Theme', value: imun2027.theme },
                    { icon: Users, label: 'Scale', value: imun2027.countriesTarget },
                    { icon: Award, label: 'Recognition', value: 'QR-verified certificates for all delegates and volunteers' }
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3">
                      <item.icon size={16} className="mt-0.5 shrink-0 text-gold-300" />
                      <div>
                        <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary-200">
                          {displayContent(item.label)}
                        </dt>
                        <dd className="mt-0.5 text-primary-100">{displayContent(item.value)}</dd>
                      </div>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4">
                  <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-amber-100">
                    <AlertTriangle size={14} /> Planning status
                  </p>
                  <p className="mt-2 text-xs leading-6 text-amber-100/90">{displayContent(imun2027.budgetNote)}.</p>
                </div>

                {displayContent(conceptRecord ? (
                  <p className="mt-4 font-mono text-[11px] text-primary-200">
                    Ref {displayContent(conceptRecord.reference)}
                  </p>
                ) : null)}
              </div>
            </Reveal>
          </div>

          <div className="mt-12 border-t border-white/10 pt-8">
            <ScrollSpyNav sections={SECTIONS} />
          </div>

          {/* Share the conference: LinkedIn, Facebook, X, WhatsApp, native
              share sheet — so the page spreads without a tracking script. */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-gold-300">
              Invite your delegation
            </p>
            <ShareButtons
              title="IMUN 2027, International Model United Nations, Islamabad"
              className="[&_a]:border-white/20 [&_a]:bg-white/10 [&_a]:text-white [&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white"
            />
          </div>
        </div>
      </section>

      {/* Overview */}
      <section id="overview" className="scroll-mt-24 bg-white py-16">
        <div className="container grid gap-10 lg:grid-cols-[1fr_1fr]">
          <Reveal direction="left">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Why IMUN 2027</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                Climate diplomacy, debated by the generation that inherits the outcome
              </h2>
              <p className="mt-5 text-sm leading-7 text-slate-600">
                Pakistan sits among the most climate vulnerable countries in the world. IMUN 2027 places that
                reality at the centre of the agenda: climate finance, adaptation, loss and damage, and the
                negotiating positions of vulnerable states.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Delegates work with standard Model UN procedure but a sharper mandate, the committee
                recommendations are compiled into a published outcome document shared with partners and
                participating institutions, not left in a conference folder.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                {[
                  'Structured preparation pathway with masterclasses before the conference',
                  'International and Pakistani delegates sharing the same committees',
                  'Cultural exchange programme hosted with campuses and communities',
                  'Published outcome document and committee recommendations',
                  'QR-verified certificates and participation letters for every participant'
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <ShieldCheck size={16} className="mt-0.5 shrink-0 text-gold-600" />
                    {displayContent(item)}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div className="grid gap-4 sm:grid-cols-2">
              {imun2027.notes.map((note, index) => (
                <div
                  key={note}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs leading-6 text-slate-600"
                >
                  <p className="font-mono text-[11px] font-extrabold text-gold-700">
                    NOTE {displayContent(String(index + 1).padStart(2, '0'))}
                  </p>
                  <p className="mt-2">{displayContent(note)}</p>
                </div>
              ))}

              <div className="rounded-2xl border border-primary-100 bg-primary-50 p-5 sm:col-span-2">
                <p className="text-sm font-extrabold text-primary-900">Registration window</p>
                <p className="mt-2 text-xs leading-6 text-slate-600">
                  {displayContent(imun2027.registrationWindow)}. Registering a free PYPC account now places you on the
                  notification list and gives you access to the preparation masterclasses.
                </p>
                <Link href="/register" className="mt-3 inline-flex text-xs font-bold text-primary underline decoration-gold-300 underline-offset-4">
                  Create your account →
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Programme components */}
      <section id="components" className="scroll-mt-24 border-y border-slate-100 bg-slate-50 py-16">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Programme</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                Six components make up the conference
              </h2>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {imun2027.components.map((component, index) => (
              <Reveal key={component.title} delay={index * 60}>
                <TiltCard intensity={8} className="icon-detail-card h-full rounded-2xl border border-slate-200 bg-white p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary">
                    <Icon name={component.icon} size={20} />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold text-primary-900">{displayContent(component.title)}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{displayContent(component.detail)}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Delegate categories */}
      <section id="categories" className="scroll-mt-24 bg-white section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Delegate categories</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                Four ways to take part
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Selection is documented and non partisan. Every category uses the same published application
                route and the same review criteria.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {imun2027.delegateCategories.map((category, index) => (
              <Reveal key={category.name} delay={index * 60} direction={index % 2 ? 'right' : 'left'}>
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-sm font-extrabold text-primary-900">{displayContent(category.name)}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{displayContent(category.detail)}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Link href="/register" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                Register your interest
              </Link>
              <Link href="/international" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                International participation
              </Link>
              <Link href="/international/visa-letter" className={buttonVariants({ variant: 'subtle', size: 'lg' })}>
                Request invitation letter
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Scholarships */}
      <section id="scholarships" className="editorial-panel relative isolate scroll-mt-24 overflow-hidden bg-primary-900 py-16 text-white">

        <div className="container grid gap-10 lg:grid-cols-[1fr_1fr]">
          <Reveal direction="left">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-300">Scholarships</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {displayContent(imun2027.scholarshipShare)}
              </h2>
              <p className="mt-5 text-sm leading-7 text-primary-100">
                {displayContent(imun2027.access)}. Scholarships are assessed on merit and need through the same form as
                standard applications, there is no separate paid fast track, and PYPC never charges for the
                right to be considered.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-primary-100">
                {[
                  'Award letters state in writing exactly which components are covered',
                  'Faculty advisors and chaperones can accompany funded delegations',
                  'Need assessment uses the information you provide — no third-party verification fees'
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Award size={16} className="mt-0.5 shrink-0 text-gold-300" />
                    {displayContent(item)}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div className="rounded-3xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Application essentials</p>
              <dl className="mt-5 space-y-4 text-sm">
                {[
                  { label: 'Registration opens', value: imun2027.registrationWindow },
                  { label: 'Organiser', value: imun2027.organiser },
                  { label: 'Format', value: imun2027.format },
                  { label: 'Country', value: imun2027.country },
                  { label: 'Documentation', value: 'QR-verified certificate + participation letter' }
                ].map(item => (
                  <div key={item.label} className="border-b border-white/10 pb-3 last:border-0">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary-200">
                      {displayContent(item.label)}
                    </dt>
                    <dd className="mt-1 text-white">{displayContent(item.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Sponsors */}

      {/* Who can take part */}
      <section id="delegates" className="scroll-mt-24 bg-white section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Who can take part</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                No prior Model UN experience required
              </h2>
              <p className="type-body mt-4 text-slate-700">
                University students, recent graduates and supervised school delegations are all welcome.
                Every category uses the same published application route and the same review criteria.
              </p>
            </div>
          </Reveal>
          <div className="mt-10">
            <ParticipationList />
          </div>
        </div>
      </section>

      {/* Flag parade */}
      <section id="countries" className="scroll-mt-24 border-y border-slate-100 bg-slate-50 section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">International participation</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                Flags already on the board
              </h2>
              <p className="type-body mt-4 text-slate-700">
                PYPC recruits through universities, MUN societies and alumni networks across these regions.
                The count above the grid is read live from the registration database.
              </p>
            </div>
          </Reveal>
          <div className="mt-9">
            <FlagParade delegations={delegations} countriesTarget={50} />
          </div>
        </div>
      </section>

      {/* Venue */}
      <section id="venue" className="scroll-mt-24 bg-white section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Venue</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                Two Islamabad candidates, both under review
              </h2>
              <p className="type-body mt-4 text-slate-700">
                Neither venue is booked yet. Publishing the shortlist with its trade offs is deliberate, the final choice is made on hall configuration, cost and availability, not on appearance.
              </p>
            </div>
          </Reveal>
          <div className="mt-10">
            <VenueCompare />
          </div>
        </div>
      </section>

      {/* Cultural exchange */}
      <section id="culture" className="scroll-mt-24 border-y border-slate-100 bg-slate-50 section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Cultural exchange</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                The part delegates remember ten years later
              </h2>
              <p className="type-body mt-4 text-slate-700">
                The cultural programme is built into the conference rather than bolted on: a Sufi night,
                a heritage evening, an Islamabad discovery day and a buddy for every incoming delegation.
              </p>
            </div>
          </Reveal>
          <div className="mt-10">
            <CulturalProgramme />
          </div>
        </div>
      </section>

      {/* Budget */}
      <section id="budget" className="scroll-mt-24 bg-white section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Budget</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                Where the money is planned to go
              </h2>
              <p className="type-body mt-4 text-slate-700">
                The concept note sets a planning range of PKR 5 to 10 crore. The split below is the shape of
                that spend by category, percentages, because the total is a range until it is approved.
              </p>
            </div>
          </Reveal>
          <div className="mt-10">
            <BudgetBreakdown note={`${imun2027.budgetNote}. Percentages reflect the planned allocation across the ${budgetLines.length} cost categories.`} />
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section id="timeline" className="scroll-mt-24 border-y border-slate-100 bg-slate-50 section-y">
        <div className="container grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal direction="left">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Timeline</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                From concept note to closing ceremony
              </h2>
              <p className="type-body mt-4 text-slate-700">
                Registration opens on the target window of end October 2026. Active members are notified
                first through the dashboard, then registration opens publicly on this page.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <StatusChip status="confirmed" />
                <StatusChip status="in-progress" />
                <StatusChip status="planned" />
              </div>
            </div>
          </Reveal>
          <Reveal direction="right">
            <Timeline />
          </Reveal>
        </div>
      </section>

      {/* Live workstream status */}
      <section id="workstreams" className="scroll-mt-24 bg-white section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Current status</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                Workstreams, as they stand today
              </h2>
              <p className="type-body mt-4 text-slate-700">
                IMUN 2027 is in active development. Each workstream below is published with its real
                state, including the ones that have barely started, so partners know exactly what they
                are joining.
              </p>
            </div>
          </Reveal>
          <div className="mt-10">
            <Workstreams />
          </div>
          <p className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            {displayContent(disclaimer)}
          </p>
        </div>
      </section>

      {/* Why IMUN is different */}
      <section id="why" className="scroll-mt-24 border-y border-slate-100 bg-slate-50 section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Why IMUN 2027</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                Not another Model UN weekend
              </h2>
              <p className="type-body mt-4 text-slate-700">
                Eight dimensions, compared honestly against a standard conference. The difference is not
                the committee simulation, it is everything built around it.
              </p>
            </div>
          </Reveal>
          <div className="mt-10">
            <WhyDifferent />
          </div>
        </div>
      </section>


      {/* At a glance — the concept note's own ten facts */}
      <section id="glance" className="scroll-mt-24 border-b border-slate-100 bg-white section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">At a Glance</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                IMUN 2027, the headline facts
              </h2>
            </div>
          </Reveal>
          <div className="mt-9">
            <AtAGlanceFull />
          </div>

          <Reveal delay={0.1}>
            <div className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-700">
                  Who can take part
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  The current target is participation from 50+ countries. Participation is deliberately
                  not restricted to any academic discipline, and prior MUN experience is not mandatory.
                </p>
              </div>
              <ParticipantGroups />
            </div>
          </Reveal>
        </div>
      </section>

      {/* The three-day programme architecture */}
      <section id="programme" className="scroll-mt-24 border-y border-slate-100 bg-slate-50 section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Proposed Duration</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                Three days, and well beyond conventional committee sessions
              </h2>
              <p className="type-body mt-4 text-slate-700">
                The programme architecture integrates formal diplomatic simulation with leadership
                development, expert engagement, cultural exchange and networking. The detailed programme
                is finalised in consultation with institutional partners.
              </p>
            </div>
          </Reveal>
          <div className="mt-10">
            <ProgrammeDays />
          </div>
        </div>
      </section>

      {/* The concept note itself */}
      <section id="concept" className="scroll-mt-24 bg-white section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Core Concept</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                The concept note, section by section
              </h2>
              <p className="type-body mt-4 text-slate-700">
                PYPC/IMUN/2027/CN 01 is reproduced below so delegates, universities and partners can read
                the plan itself rather than a summary of it. Where the note says something is planned, the
                page says so too.
              </p>
            </div>
          </Reveal>

          <div className="mt-10">
            <ConceptNote />
          </div>

          <Reveal delay={0.1}>
            <div className="mt-12 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <h3 className="type-card-title font-extrabold text-primary-900">
                Agenda topics the committees are expected to engage with
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                The thematic focus connects the conference directly to the international climate agenda.
              </p>
              <div className="mt-6">
                <AgendaTopics />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Current status */}
      <section id="current-status" className="scroll-mt-24 border-y border-slate-100 bg-slate-50 section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">
                Current Status, September 2026
              </p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                Already in active development
              </h2>
              <p className="type-body mt-4 text-slate-700">
                IMUN 2027 is not at the stage of a pure idea. The workstreams below are already under way
                or in advanced discussion, the same list the concept note publishes.
              </p>
            </div>
          </Reveal>
          <div className="mt-9">
            <CurrentStatusList />
          </div>
        </div>
      </section>

      {/* Vision and signatories */}
      <section id="vision" className="scroll-mt-24 bg-white section-y">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">The Larger Vision</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                An international youth diplomacy platform, hosted in Pakistan
              </h2>
            </div>
          </Reveal>
          <div className="mt-10">
            <VisionAndSignatories />
          </div>
        </div>
      </section>

      <section id="sponsors" className="scroll-mt-24 bg-white py-16">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Sponsorship</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                Four sponsorship tiers, each with named deliverables
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Sponsorship is governed by a written agreement. Benefits are stated below exactly as they are
                offered, no implied endorsements and no exclusivity beyond what the tier states.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {imun2027.sponsorPackages.map((pack, index) => (
              <Reveal key={pack.tier} delay={index * 70}>
                <TiltCard intensity={8} className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                  <Handshake size={20} className="text-gold-600" />
                  <p className="mt-4 text-sm font-extrabold text-primary-900">{displayContent(pack.tier)}</p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">{displayContent(pack.detail)}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/partnerships" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                Partnership & MoU process <ArrowRight size={18} />
              </Link>
              <a
                href="/documents/PYPC_Memorandum_of_Understanding_Perfect.pdf"
                target="_blank"
                rel="noreferrer noopener"
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                <FileText size={16} /> MoU template (PDF)
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Documents */}
      <section id="documents" className="scroll-mt-24 border-y border-slate-100 bg-slate-50 py-16">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Documents</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                Read the source material
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The concept note is the authoritative planning document for IMUN 2027. Correspondence with
                institutions is filed with reference numbers and published in the records registry.
              </p>
            </div>
          </Reveal>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <Reveal>
              <a
                href="/documents/IMUN_2027_Concept_Note_Redesigned.pdf"
                target="_blank"
                rel="noreferrer noopener"
                className="group flex h-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 hover-lift transition hover:border-gold-300 hover:shadow-elevated"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
                  <FileText size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-primary-900">
                    IMUN 2027, Concept Note (redesigned)
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-600">
                    Objectives, conference structure, delegate categories, scholarship policy, sponsorship
                    tiers and the planning timeline.
                  </p>
                  {displayContent(conceptRecord ? (
                    <p className="mt-2 font-mono text-[11px] font-bold text-gold-700">
                      Ref {displayContent(conceptRecord.reference)}
                    </p>
                  ) : null)}
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:text-gold-700">
                    Open PDF <ExternalLink size={13} />
                  </span>
                </div>
              </a>
            </Reveal>

            <Reveal delay={0.08}>
              <Link
                href="/records"
                className="group flex h-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 hover-lift transition hover:border-gold-300 hover:shadow-elevated"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
                  <Landmark size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-primary-900">
                    Correspondence registry
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-600">
                    Every formal request PYPC has filed, institutional visits, webinars, MoU templates and
                    the IMUN concept note, with reference numbers and status.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:text-gold-700">
                    Open registry <ExternalLink size={13} />
                  </span>
                </div>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Apply + FAQ */}
      <section id="apply" className="scroll-mt-24 bg-white py-16">
        <div className="container grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal direction="left">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">How to join</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                Three steps to be in the room
              </h2>

              <ol className="mt-6 space-y-4">
                {[
                  {
                    title: 'Create your account',
                    detail: 'Free, takes a minute, and places you on the IMUN 2027 notification list.'
                  },
                  {
                    title: 'Prepare with PYPC',
                    detail: 'Join the diplomacy masterclasses and committee preparation clinics before delegate selection.'
                  },
                  {
                    title: 'Register when the window opens',
                    detail: `${imun2027.registrationWindow}. Apply for a standard or scholarship place through your dashboard.`
                  }
                ].map((step, index) => (
                  <li key={step.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-extrabold text-white">
                      {displayContent(index + 1)}
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-primary-900">{displayContent(step.title)}</p>
                      <p className="mt-1 text-xs leading-6 text-slate-600">{displayContent(step.detail)}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/register" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
                  Register interest
                </Link>
                <Link href="/contact" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                  Contact the secretariat
                </Link>
              </div>

              <p className="mt-5 text-xs leading-6 text-slate-500">
                Questions about sponsorship, delegations or faculty participation? Write to
                {displayContent(' ')}
                {displayContent(CONTACT_EMAIL)} with “IMUN 2027” in the subject line.
              </p>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div id="faq" className="scroll-mt-24">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">FAQ</p>
              <h2 className="type-section mt-3 font-extrabold tracking-tight text-primary-900">
                IMUN 2027 questions, answered plainly
              </h2>

              <div className="mt-6">
                <Accordion items={DELEGATE_FAQ} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
