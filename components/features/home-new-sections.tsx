
import { displayContent } from '@/lib/display-content'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUp,
  Cloud,
  Cpu,
  FileUp,
  Globe2,
  Layers,
  MousePointer2,
  Navigation,
  PanelsTopLeft,
  Share2,
  Smartphone,
  Palette,
  Waves
} from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'
import { TiltCard } from '@/components/motion/tilt-card'
import { buttonVariants } from '@/components/ui/button'
import { HeroCarousel, type CarouselSlide } from '@/components/features/hero-carousel'
import { EventsExplorer, type EventCard } from '@/components/features/events-explorer'

import { Icon } from '@/components/ui/icon'
import { researchServices } from '@/lib/data/courses'
import { globalRegions } from '@/lib/data/international'

const CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    src: '/images/editorial/diplomacy.webp',
    title: 'IMUN 2027 — International Model United Nations, Islamabad',
    caption:
      'Three days of committee simulation and climate diplomacy in the federal capital, with 50+ countries targeted and 30–40% of places planned as scholarship-supported.',
    href: '/conferences/imun-2027',
    cta: 'Explore IMUN 2027'
  },
  {
    src: '/images/editorial/learning.webp',
    title: 'Certified short courses — parliamentary procedure to AI governance',
    caption:
      'Six certificate-bearing courses with live clinics, recorded sessions and USD pricing for international learners. Members join at no additional cost.',
    href: '/courses',
    cta: 'Browse courses'
  },
  {
    src: '/images/editorial/cultural-exchange.webp',
    title: 'International participation — study, research and delegate pathways',
    caption:
      'Online and hybrid participation, visa invitation letters, time-zone friendly scheduling and academic recognition support for students outside Pakistan.',
    href: '/international',
    cta: 'International students'
  }
]

const HOME_EVENTS: EventCard[] = [
  {
    slug: 'imun-2027',
    title: 'IMUN 2027',
    fullName: 'International Model United Nations 2027',
    summary:
      'Pakistan’s flagship international Model UN conference on climate diplomacy. Registration opens on the target window at the end of October 2026.',
    image: '/images/editorial/pakistan-student-dialogue.webp',
    href: '/conferences/imun-2027',
    location: 'Islamabad, Pakistan',
    date: 'January 2027 (to be confirmed)',
    scale: '50+ countries targeted',
    category: 'Conference',
    status: 'Planning · concept note published',
    featured: true
  },
  {
    slug: 'national-youth-parliament-sitting',
    title: 'National Youth Parliament Sitting',
    fullName: 'Legislative simulation across all seven regions',
    summary:
      'Young members draft, debate and vote on bills through a full parliamentary sitting, with committee scrutiny and recorded proceedings.',
    image: '/images/editorial/assembly.webp',
    href: '/events',
    location: 'Islamabad & regional chapters',
    date: 'Scheduled from the events calendar',
    scale: 'All seven regions',
    category: 'Conference',
    status: 'Listing published on the events page'
  },
  {
    slug: 'climate-policy-lab',
    title: 'Climate Policy Lab Showcase',
    fullName: 'Adaptation policy outputs from the climate cohort',
    summary:
      'Cohort projects presented as policy briefs — vulnerability profiles, adaptation finance routes and district-level recommendations.',
    image: '/images/editorial/pakistan-earth-day.webp',
    href: '/programmes/climate-policy-lab',
    location: 'Lahore (hybrid)',
    date: 'Cohort-based · see programme page',
    scale: 'Cohort-based',
    category: 'Summit',
    status: 'Programme page live'
  },
  {
    slug: 'certified-course-cohort',
    title: 'Certified Course Cohorts',
    fullName: 'Intensive training cycles with verifiable certificates',
    summary:
      'Short courses run in cycles with live clinics, mentors and assessments. Every graduate receives a QR-verified certificate.',
    image: '/images/editorial/pakistan-computer-lab.webp',
    href: '/courses',
    location: 'Online · global time zones',
    date: 'Rolling cohorts',
    scale: 'Open to all members',
    category: 'Training',
    status: 'Enrolment open'
  },
  {
    slug: 'ndu-institutional-visit',
    title: 'Institutional Visit — NDU',
    fullName: 'National Defence University educational visit',
    summary:
      'A youth leadership visit requested through the office of the NDU President to build institutional literacy among young Pakistanis.',
    image: '/images/editorial/institutional-visit.webp',
    href: '/records#ndu-visit',
    location: 'National Defence University, Islamabad',
    date: 'Request submitted 27 September 2026',
    scale: 'Selected youth leaders',
    category: 'Institutional visit',
    status: 'Awaiting approval'
  },
  {
    slug: 'senate-delegation',
    title: 'Senate Delegation Visit',
    fullName: 'Delegation through the Deputy Chairman Senate office',
    summary:
      'A supervised delegation visit to Parliament House and the Senate Museum, requested with the office of the Deputy Chairman Senate.',
    image: '/images/editorial/senate.webp',
    href: '/records#senate-visit',
    location: 'Parliament House, Islamabad',
    date: 'Request submitted 27 September 2026',
    scale: 'Nominated delegation',
    category: 'Institutional visit',
    status: 'Awaiting approval'
  }
]

/** aieys-style hero carousel band, populated with PYPC's own programme of work. */
export function FeaturedCarouselBand() {
  return (
    <section className="relative bg-white section-y">
      <div className="container">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">
                Featured across the platform
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                Conferences, courses and international participation
              </h2>
            </div>
            <Link
              href="/conferences"
              className="text-sm font-bold text-primary underline decoration-gold-300 underline-offset-4"
            >
              All events & conferences →
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="mt-8">
          <HeroCarousel slides={CAROUSEL_SLIDES} />
        </Reveal>
      </div>
    </section>
  )
}

/** Events grid with cover images and "Explore event" actions. */
export function EventsBand() {
  return (
    <section className="relative isolate overflow-hidden bg-slate-50 section-y">
      <div className="bg-grid absolute inset-0 -z-10 opacity-50" />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="orb orb-gold absolute -right-24 top-10 h-80 w-80" />
      </div>

      <div className="container">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Events</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
              What is coming up across the Council
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Every listing states its real status. Planning stage events are labelled as such, and
              nothing appears here until PYPC has a published listing behind it.
            </p>
          </div>
        </Reveal>

        <div className="mt-10">
          <EventsExplorer events={HOME_EVENTS} />
        </div>
      </div>
    </section>
  )
}

const RESEARCH_TEASERS = researchServices.slice(0, 4)

/** Research and international reach band with a live connecting-dots network. */
export function ResearchAndReachBand() {
  return (
    <section className="editorial-panel relative isolate overflow-hidden bg-primary-900 section-y text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_10%_0%,#0b3b2e_0%,#06261e_55%,#031712_100%)]" />
      </div>


      <div className="container grid items-stretch gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="contents">
          <Reveal className="lg:col-span-2 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-300">
              Research & international reach
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              A research desk that answers real policy questions
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-primary-100">
              The PYPC research desk produces briefs, evidence reviews and stakeholder maps for members,
              partner universities and institutions. International students can join the desk and
              co author published work.
            </p>
          </Reveal>

          <div className="flex h-full flex-col">
          <div className="research-service-grid grid flex-1 auto-rows-fr gap-4 sm:grid-cols-2">
            {RESEARCH_TEASERS.map((service, index) => (
              <Reveal key={service.title} delay={index * 70} direction={index % 2 === 0 ? 'left' : 'right'}>
                <div className="icon-detail-card h-full rounded-2xl border border-white/12 bg-white/[0.05] p-5 backdrop-blur transition hover:border-gold-300/50">
                  <Icon name={service.icon} size={20} className="text-gold-300" />
                  <span className="absolute right-7 top-8" title="Pakistan based research desk">
                    <svg width="36" height="24" viewBox="0 0 36 24" role="img" aria-label="Pakistan flag">
                      <rect width="36" height="24" rx="2" fill="#01411c" /><path d="M0 0h9v24H0z" fill="white" />
                      <circle cx="23" cy="12" r="7" fill="white" /><circle cx="25" cy="10" r="6" fill="#01411c" />
                      <path d="m27 5 .8 2.3h2.4l-2 1.4.8 2.3-2-1.4-2 1.4.8-2.3-2-1.4h2.4z" fill="white" />
                    </svg>
                  </span>
                  <h3 className="mt-3 text-sm font-extrabold text-white">{displayContent(service.title)}</h3>
                  <p className="mt-2 text-xs leading-6 text-primary-100">{displayContent(service.detail)}</p>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-300">
                    {displayContent(service.turnaround)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/research" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
                Research services <ArrowRight size={18} />
              </Link>
              <Link
                href="/international"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'lg',
                  className: 'border-white/30 bg-white/5 text-white hover:bg-white/10'
                })}
              >
                International students
              </Link>
            </div>
          </Reveal>
        </div>

        </div>
        <Reveal delay={0.12} className="regions-panel h-full">
          <div className="flex h-full flex-col rounded-3xl border border-white/12 bg-white/[0.04] p-6 backdrop-blur">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold-300">
              <Globe2 size={14} /> Regions served
            </p>

            <ul className="mt-5 grid flex-1 auto-rows-fr gap-3 sm:grid-cols-2">
              {globalRegions.map(region => (
                <li
                  key={region.region}
                  className="flex flex-col justify-center rounded-xl border border-white/10 bg-primary-900/40 px-4 py-4"
                >
                  <Globe2 size={26} className="mb-3 text-primary" aria-hidden="true" />
                  <p className="text-sm font-bold text-white">{displayContent(region.region)}</p>
                  <p className="mt-1 text-[11px] leading-5 text-primary-200">{displayContent(region.note)}</p>
                </li>
              ))}
            </ul>

            <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-6 text-primary-200">
              International participants join online from these regions. On site participation requires
              travel and a visa, which remain the delegate&apos;s responsibility; PYPC issues supporting
              documentation.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const DESIGN_ITEMS = [
  {
    icon: Layers,
    "title": "Photo-led storytelling",
    "detail": "Programme imagery gives context to the people and opportunities behind the council."
  },
  {
    icon: Palette,
    "title": "Light editorial palette",
    "detail": "White and warm cream surfaces with forest-green and mustard accents."
  },
  {
    icon: Waves,
    "title": "Clear visual hierarchy",
    "detail": "Strong headings, short introductions and grouped details make long pages easier to scan."
  },
  {
    icon: MousePointer2,
    "title": "Visible keyboard focus",
    "detail": "Clear focus outlines help keyboard users find and activate controls."
  },
  {
    icon: Cloud,
    "title": "Immediate content",
    "detail": "Headings and programme details remain visible without waiting for decorative effects."
  },
  {
    icon: Navigation,
    "title": "Consistent page structure",
    "detail": "Shared navigation, breadcrumbs and section spacing across the platform."
  },
  {
    icon: Share2,
    "title": "Simple bordered cards",
    "detail": "Stable cards keep summaries and actions easy to read and select."
  },
  {
    icon: Cpu,
    "title": "Smooth anchor navigation",
    "detail": "Section links help visitors move through longer pages."
  }
]

const PLATFORM_ITEMS = [
  { icon: Smartphone, title: 'Fully responsive', detail: 'Designed from 360 px phones to wide desktops, with mobile-first spacing.' },
  { icon: FileUp, title: 'Resume / CV upload', detail: 'Applications and profiles accept PDF or Word files, stored privately.' },
  { icon: Navigation, title: 'Active navigation highlighting', detail: 'The current section stays highlighted as you move through the site.' },
  { icon: ArrowUp, title: 'Back-to-top control', detail: 'A floating control appears once you scroll past the opening screens.' },
  { icon: PanelsTopLeft, title: 'Mobile hamburger overlay', detail: 'A full-screen menu with staggered links, actions and contact details.' },
  { icon: Share2, title: 'Official social channels', detail: 'Find LinkedIn and the council’s other official channels together in the footer.' },
  { icon: Layers, title: 'Readable surfaces', detail: 'Clean backgrounds keep the focus on programme information and application details.' },
  { icon: Globe2, title: 'Consistent content grids', detail: 'Cards adapt to the screen while keeping related information together.' }
]

/** The engineering and design standard behind the platform. */
export function TechnicalHighlights() {
  return (
    <section className="editorial-technical relative isolate overflow-hidden border-y border-slate-100 bg-white section-y">
      <div className="bg-grid absolute inset-0 -z-10 opacity-40" />

      <div className="container">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">
              Design & engineering standard
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
              Built to look like an institution and behave like a product
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Clear page structure, accessible controls and responsive layouts help visitors find programmes, compare opportunities and complete their applications.
            </p>
          </div>
        </Reveal>

        <div className="technical-groups mt-10 grid gap-8 lg:grid-cols-2">
          <div className="technical-group">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary">Design & presentation</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {DESIGN_ITEMS.map((item, index) => (
                <Reveal key={item.title} delay={index * 50} direction={index % 2 ? 'right' : 'left'}>
                  <div className="icon-detail-card h-full rounded-2xl border border-slate-200 bg-white p-5">
                    <item.icon size={20} className="text-gold-600" />
                    <h3 className="mt-3 text-sm font-extrabold text-primary-900">{displayContent(item.title)}</h3>
                    <p className="mt-2 text-xs leading-6 text-slate-600">{displayContent(item.detail)}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="technical-group">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-primary">
              Platform & usability
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {PLATFORM_ITEMS.map((item, index) => (
                <Reveal key={item.title} delay={index * 50} direction={index % 2 ? 'left' : 'right'}>
                  <div className="icon-detail-card h-full rounded-2xl border border-slate-200 bg-white p-5">
                    <item.icon size={20} className="text-gold-600" />
                    <h3 className="mt-3 text-sm font-extrabold text-primary-900">{displayContent(item.title)}</h3>
                    <p className="mt-2 text-xs leading-6 text-slate-600">{displayContent(item.detail)}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** International participation call-out used on the home page. */
export function InternationalBand() {
  return (
    <section className="relative isolate overflow-hidden bg-white section-y">
      <div className="container grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <Reveal direction="left">
          <div className="scene-3d">
            <div className="rounded-3xl border border-primary-100 surface-page p-7 shadow-card sm:p-9">
              <div className="layer-2 flex items-center gap-3">
                <Icon name="Globe2" size={26} className="text-primary" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-700">
                  International students
                </p>
              </div>

              <h2 className="layer-1 mt-5 text-2xl font-extrabold leading-snug text-primary-900 sm:text-3xl">
                Join from anywhere, and leave with documentation that travels.
              </h2>

              <ul className="layer-1 mt-6 space-y-3 text-sm text-slate-700">
                {[
                  'Free account — no Pakistani documentation needed for online participation',
                  'USD pricing on memberships and courses with international card checkout',
                  'Visa invitation letters for registered on-site delegates',
                  'Time-zone published schedules with recorded sessions',
                  'Academic recognition support letters stating hours and outcomes',
                  'Scholarship pathway — 30–40% of IMUN 2027 places planned'
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                    {displayContent(item)}
                  </li>
                ))}
              </ul>

              <div className="layer-1 mt-7 flex flex-wrap gap-3">
                <Link href="/international" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                  International hub <ArrowRight size={18} />
                </Link>
                <Link href="/international/visa-letter" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                  Request invitation letter
                </Link>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal direction="right">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { value: '3', label: 'Participation modes', note: 'Online, hybrid, on-site' },
              { value: 'USD', label: 'International pricing', note: 'PKR & USD both supported' },
              { value: '5–10', label: 'Working days', note: 'Invitation letter turnaround' }
            ].map(item => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm"
              >
                <p className="text-2xl font-extrabold text-primary">{displayContent(item.value)}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  {displayContent(item.label)}
                </p>
                <p className="mt-2 text-xs text-slate-500">{displayContent(item.note)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-extrabold text-primary-900">What PYPC will never do</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              We do not promise visas, credit transfer or accreditation, and we do not charge for the
              right to be considered. Where a document is issued, we state exactly what it proves.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

