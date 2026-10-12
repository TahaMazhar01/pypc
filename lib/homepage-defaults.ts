import type { CarouselSlide } from '@/components/features/hero-carousel'
import type { EventCard } from '@/components/features/events-explorer'
import { getSitePhoto } from '@/lib/site-photos'

export const CAROUSEL_SLIDES: CarouselSlide[] = [
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

export const HOME_EVENTS: EventCard[] = [
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

export const HERO_SLIDES = [
  { image: 'parliament-hero', title: 'A voice in our future', category: 'Parliamentary participation' },
  { image: 'pypc-group-provided', title: 'Together, we lead', category: 'Youth and community' },
  { image: 'pakistan-monument', title: 'One nation. Shared purpose.', category: 'Our national vision' },
  { image: 'climate', title: 'Protect what comes next', category: 'Climate and environment' }
].map(slide => ({ ...slide, photo: slide.image === 'pypc-group-provided'
  ? { src: '/images/editorial/pypc-group-provided.webp', alt: 'Group of six people standing together in a hallway, photograph provided by PYPC' }
  : getSitePhoto(`/images/editorial/${slide.image}.webp`)! }))

export const homepageDefaults = [
  ...HERO_SLIDES.map((s, i) => ({ id: 'hero-' + i, section: 'hero', title: s.title, summary: s.category, image: s.photo.src, imageAlt: s.photo.alt, sortOrder: i, href: '/', cta: 'Learn more' })),
  ...CAROUSEL_SLIDES.map((s, i) => ({ id: 'carousel-' + i, section: 'carousel', title: s.title, summary: s.caption, image: s.src, imageAlt: getSitePhoto(s.src)?.alt ?? s.title, sortOrder: i, href: s.href ?? '/', cta: s.cta ?? 'Learn more' })),
  ...HOME_EVENTS.map((s, i) => ({ id: 'card-' + s.slug, section: 'card', title: s.title, summary: s.summary, image: s.image, imageAlt: getSitePhoto(s.image)?.alt ?? s.title, href: s.href, sortOrder: i, fullName: s.fullName, location: s.location, date: s.date, scale: s.scale, category: s.category, status: s.status, featured: s.featured ?? false, cta: 'Explore event' }))
]
