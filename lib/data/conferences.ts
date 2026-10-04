/**
 * The IMUN 2027 conference record.
 * Facts below are taken directly from PYPC's confidential concept note
 * (PYPC/IMUN/2027/CN-01). Planning-stage items are explicitly labelled so the
 * public site never overstates what has been approved.
 */

export const imun2027 = {
  code: 'IMUN 2027',
  name: 'International Model United Nations 2027',
  tagline: 'Your Voice. Your Network. Your Future.',
  country: 'Pakistan',
  hostCity: 'Islamabad — Federal Capital',
  format: 'Three-day international Model UN conference',
  dates: 'January 2027 (exact dates to be confirmed)',
  theme: 'Climate Change at the Centre — climate diplomacy',
  countriesTarget: '50+ countries targeted',
  scholarshipShare: 'Approx. 30–40% of places planned to be scholarship-supported',
  access: 'Scholarship pathway for international and need-based applicants',
  venue:
    'Pakistan-China Friendship Centre or Jinnah Convention Centre, Islamabad (venue under review)',
  registrationWindow: 'Target window opens end of October 2026',
  organiser: 'Pakistan Youth Parliamentary Council (PYPC)',
  budgetNote: 'Planning-level budget of PKR 5–10 crore — not yet approved',
  components: [
    {
      title: 'Committee simulations',
      detail:
        'Delegates are assigned countries and committees, debate resolutions and negotiate amendments under standard Model UN rules of procedure.',
      icon: 'Landmark'
    },
    {
      title: 'Climate diplomacy track',
      detail:
        'The central theme: climate finance, adaptation, loss and damage, and the position of climate-vulnerable states — with Pakistan\u2019s own experience as a case study.',
      icon: 'Leaf'
    },
    {
      title: 'Diplomatic leadership training',
      detail:
        'Negotiation, public speaking, drafting and consensus-building masterclasses delivered by practitioners and academics.',
      icon: 'GraduationCap'
    },
    {
      title: 'Cultural exchange',
      detail:
        'A structured cultural programme connecting international delegates with Pakistani hosts, campuses and communities.',
      icon: 'Globe2'
    },
    {
      title: 'Policy output',
      detail:
        'Committee recommendations compiled into a published outcome document shared with partners and participating institutions.',
      icon: 'FileText'
    },
    {
      title: 'Recognition',
      detail:
        'QR-verified certificates, awards and participation letters issued to every delegate and volunteer, verifiable by any third party.',
      icon: 'Award'
    }
  ],
  delegateCategories: [
    { name: 'International delegate', detail: 'Participants from outside Pakistan. Invitation letter issued on confirmed registration; travel and visa are delegate responsibilities.' },
    { name: 'Pakistani delegate', detail: 'Open to members nationwide through the standard application route.' },
    { name: 'Scholarship delegate', detail: 'Approx. 30–40% of places, assessed on merit and need. Covered components are stated in the award letter.' },
    { name: 'Faculty advisor / chaperone', detail: 'For delegations from universities and MUN societies travelling with a supervising academic.' }
  ],
  sponsorPackages: [
    {
      tier: 'Platinum',
      detail: 'Title-level visibility across the conference, opening ceremony recognition, delegate pack branding and named scholarship places.'
    },
    {
      tier: 'Gold',
      detail: 'Committee sponsorship, session branding, exhibition presence and reserved seats for sponsored students.'
    },
    {
      tier: 'Partner institution',
      detail: 'Faculty participation, joint certificate co-branding and an MoU-backed student chapter pathway.'
    },
    {
      tier: 'In-kind',
      detail: 'Venue support, catering, transport, print, media coverage or delegate materials.'
    }
  ],
  notes: [
    'Dates, venue and budget are planning-stage and subject to approval; this page is updated once confirmed.',
    'Registration opens on the target window of end October 2026 — members are notified first through the dashboard.',
    'PYPC does not charge for the right to be considered; only published programme and membership fees apply.'
  ]
}

export const conferences = [
  {
    slug: 'imun-2027',
    title: 'IMUN 2027 — International Model United Nations',
    location: 'Islamabad, Pakistan',
    date: 'January 2027 (to be confirmed)',
    scale: '50+ countries targeted',
    theme: 'Climate diplomacy',
    status: 'Planning · registration opens end October 2026',
    featured: true,
    href: '/conferences/imun-2027'
  },
  {
    slug: 'national-youth-parliament-sitting',
    title: 'National Youth Parliament Sitting',
    location: 'Islamabad',
    date: 'From the events calendar',
    scale: 'All seven regions',
    theme: 'Legislative simulation',
    status: 'Register via the events page',
    featured: false,
    href: '/events'
  },
  {
    slug: 'climate-policy-lab-showcase',
    title: 'Climate Policy Lab Showcase',
    location: 'Lahore (hybrid)',
    date: 'From the events calendar',
    scale: 'Cohort-based',
    theme: 'Adaptation policy',
    status: 'Register via the events page',
    featured: false,
    href: '/events'
  }
]
