/**
 * PYPC membership — single source of truth.
 *
 * Everything about membership lives here: the four tiers, their pricing in PKR
 * and USD, the benefit matrix used by the comparison table, the joining
 * timeline and the transparency statements. `prisma/seed.ts` writes these tiers
 * into the database, and the public membership page renders the matrix from the
 * same arrays, so the marketing page and the checkout can never drift apart.
 *
 * Tier ladder (round 7 blueprint):
 *   FREE         — Community member, PKR 0 / USD 0
 *   ASSOCIATE    — PKR 2,500 / USD 15
 *   EXECUTIVE    — PKR 7,500 / USD 45   (most chosen)
 *   INSTITUTIONAL— PKR 50,000 / USD 300 (universities, colleges, organisations)
 *
 * Pricing is quoted for a 12-month term. PYPC does not auto-charge: nothing is
 * ever debited without an explicit payment, and the free tier never expires
 * into a paid plan on its own.
 */

export type MembershipTierCode = 'FREE' | 'ASSOCIATE' | 'EXECUTIVE' | 'INSTITUTIONAL'

export type MembershipTier = {
  code: MembershipTierCode
  /** Display name shown on cards, checkout and dashboards. */
  name: string
  /** Short internal tier word used by the checkout summary. */
  tier: string
  /** One-line positioning statement. */
  tagline: string
  /** Paragraph describing the tier in plain language. */
  description: string
  /** Who this tier is genuinely for — used for the "which tier" guidance. */
  audience: string
  pricePkr: number
  priceUsd: number
  durationMonths: number
  /** Card checklist. */
  features: string[]
  /** Secondary "also included" list. */
  benefits: string[]
  isPopular: boolean
  sortOrder: number
  /** Button label on the membership page. */
  ctaLabel: string
}

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    code: 'FREE',
    name: 'Free Community Membership',
    tier: 'FREE',
    tagline: 'Start here — no fee, no card, no expiry',
    description:
      'A genuine membership, not a trial. It exists so that cost is never the reason a young Pakistani cannot take part in civic leadership. You get a member profile, the newsletter, the opportunities board and every open session we run.',
    audience: 'Students and first-time participants who want to explore before paying anything.',
    pricePkr: 0,
    priceUsd: 0,
    durationMonths: 12,
    features: [
      'PYPC digital member card with your membership number',
      'Member dashboard, saved applications and application tracking',
      'All open webinars, workshops and online clinics',
      'Monthly opportunities newsletter (scholarships, fellowships, conferences)',
      'Participation certificate on completion of any open programme',
      'Access to the FAQ and public policy explainers'
    ],
    benefits: [
      'Free tier never expires into a paid tier automatically',
      'Upgrade to Associate at any time and only pay the difference',
      'No card details are ever required to hold a free membership'
    ],
    isPopular: false,
    sortOrder: 0,
    ctaLabel: 'Join free'
  },
  {
    code: 'ASSOCIATE',
    name: 'Associate Membership',
    tier: 'ASSOCIATE',
    tagline: 'For students building their first record of participation',
    description:
      'The working membership for students who want more than announcements: structured programmes, mentorship sessions and a verified participation record they can put in a university or scholarship application.',
    audience: 'Undergraduate and college students attending events and programmes regularly.',
    pricePkr: 2500,
    priceUsd: 15,
    durationMonths: 12,
    features: [
      'Everything in Free Community Membership',
      'Priority invitations to regional and national events',
      'Structured mentorship sessions with assigned mentors',
      'Participation certificate with QR verification for every completed programme',
      'Certificate verification profile listing your issued records',
      'Access to the member opportunities board and reference letters'
    ],
    benefits: [
      'Discount on programme and conference delegate fees',
      'Access to recorded masterclasses and toolkits',
      'Membership fee is credited in full when you upgrade to Executive'
    ],
    isPopular: false,
    sortOrder: 1,
    ctaLabel: 'Choose Associate'
  },
  {
    code: 'EXECUTIVE',
    name: 'Executive Membership',
    tier: 'EXECUTIVE',
    tagline: 'For active leaders serving in committees and chapters',
    description:
      'For members who carry responsibility: committee seats, chapter roles, delegation leadership and programme delivery. Executive membership is the tier that turns participation into a leadership record with earned evidence.',
    audience: 'Members holding or seeking committee, chapter or delegation leadership roles.',
    pricePkr: 7500,
    priceUsd: 45,
    durationMonths: 12,
    features: [
      'Everything in Associate Membership',
      'Eligibility for committee, chapter and delegation leadership roles',
      'Youth Parliament, fellowship and summer school prioritisation',
      'Leadership development track with mentor matching',
      'Verified executive experience letters on PYPC letterhead',
      'Recognition at the annual PYPC ceremony'
    ],
    benefits: [
      'Direct nominations to national delegations',
      'Speaking opportunities at PYPC convenings',
      'Advisory access to policy research briefs',
      'Voting rights at the annual general meeting'
    ],
    isPopular: true,
    sortOrder: 2,
    ctaLabel: 'Choose Executive'
  },
  {
    code: 'INSTITUTIONAL',
    name: 'Institutional Partnership',
    tier: 'INSTITUTIONAL',
    tagline: 'For universities, colleges and organisations',
    description:
      'For institutions that want a campus circle, jointly delivered programmes and participation records issued under both names. One invoice, named deliverables, and a partnership report at the end of the term.',
    audience: 'Universities, colleges, schools and youth organisations (billed to the institution).',
    pricePkr: 50000,
    priceUsd: 300,
    durationMonths: 12,
    features: [
      'Campus circle registration and onboarding',
      'Joint programmes co-delivered with PYPC faculty and mentors',
      'Bulk membership for up to 25 students',
      'Institution dashboard for participation records',
      'Co-branded certificates with QR verification',
      'Annual partnership report with participation data'
    ],
    benefits: [
      'National visibility through PYPC channels',
      'Access to the PYPC policy research network',
      'Faculty participation in national convenings',
      'Formal Memorandum of Understanding countersigned by both parties'
    ],
    isPopular: false,
    sortOrder: 3,
    ctaLabel: 'Request partnership'
  }
]

export function tierByCode(code: string): MembershipTier | undefined {
  return MEMBERSHIP_TIERS.find(tier => tier.code === code)
}

/**
 * Comparison matrix. `true` renders a tick, `false` a muted dash, and any
 * string is printed as the definitive value for that cell. Groups are ordered
 * the way a prospective member thinks: what do I get, can I take part, what
 * proof do I receive, what support exists.
 */
export type ComparisonValue = string | boolean

export type ComparisonRow = {
  label: string
  /** Optional clarifying sentence shown under the row label. */
  hint?: string
  values: Record<MembershipTierCode, ComparisonValue>
}

export type ComparisonGroup = {
  group: string
  rows: ComparisonRow[]
}

export const MEMBERSHIP_COMPARISON: ComparisonGroup[] = [
  {
    group: 'Membership & access',
    rows: [
      {
        label: 'Annual fee',
        values: { FREE: 'Free', ASSOCIATE: 'PKR 2,500 / $15', EXECUTIVE: 'PKR 7,500 / $45', INSTITUTIONAL: 'PKR 50,000 / $300' }
      },
      {
        label: 'Digital member card with membership number',
        values: { FREE: true, ASSOCIATE: true, EXECUTIVE: true, INSTITUTIONAL: true }
      },
      {
        label: 'Member dashboard & application tracking',
        values: { FREE: true, ASSOCIATE: true, EXECUTIVE: true, INSTITUTIONAL: true }
      },
      {
        label: 'Open webinars, workshops and online clinics',
        values: { FREE: true, ASSOCIATE: true, EXECUTIVE: true, INSTITUTIONAL: true }
      },
      {
        label: 'Membership seats included',
        hint: 'Institutional partnership covers a cohort of students.',
        values: { FREE: '1 member', ASSOCIATE: '1 member', EXECUTIVE: '1 member', INSTITUTIONAL: 'Up to 25 students' }
      },
      {
        label: 'Monthly opportunities newsletter',
        values: { FREE: true, ASSOCIATE: true, EXECUTIVE: true, INSTITUTIONAL: true }
      }
    ]
  },
  {
    group: 'Programmes & participation',
    rows: [
      {
        label: 'Participation in open programmes',
        values: { FREE: true, ASSOCIATE: true, EXECUTIVE: true, INSTITUTIONAL: true }
      },
      {
        label: 'Priority invitations to regional & national events',
        values: { FREE: false, ASSOCIATE: true, EXECUTIVE: true, INSTITUTIONAL: true }
      },
      {
        label: 'Mentorship sessions with assigned mentors',
        values: { FREE: 'Group sessions', ASSOCIATE: '3 sessions / year', EXECUTIVE: 'Unlimited, priority booking', INSTITUTIONAL: 'For the whole cohort' }
      },
      {
        label: 'Eligibility for committee, chapter and delegation roles',
        values: { FREE: false, ASSOCIATE: 'Applications open', EXECUTIVE: true, INSTITUTIONAL: true }
      },
      {
        label: 'Youth Parliament, fellowship & summer school prioritisation',
        values: { FREE: 'Standard queue', ASSOCIATE: 'Priority review', EXECUTIVE: 'Highest priority', INSTITUTIONAL: 'Reserved cohort places' }
      },
      {
        label: 'Delegate fee discount on PYPC conferences',
        values: { FREE: false, ASSOCIATE: '15%', EXECUTIVE: '30%', INSTITUTIONAL: 'Group rate for the cohort' }
      },
      {
        label: 'International Model United Nations delegate fee',
        hint: 'IMUN 2027 fees are published separately; member discounts apply.',
        values: { FREE: false, ASSOCIATE: 'Member rate', EXECUTIVE: 'Member rate + priority allotment', INSTITUTIONAL: 'Group rate for the cohort' }
      },
      {
        label: 'Voting rights at the annual general meeting',
        values: { FREE: false, ASSOCIATE: false, EXECUTIVE: true, INSTITUTIONAL: 'One institutional vote' }
      }
    ]
  },
  {
    group: 'Certification & records',
    rows: [
      {
        label: 'Participation certificate on programme completion',
        values: { FREE: true, ASSOCIATE: true, EXECUTIVE: true, INSTITUTIONAL: true }
      },
      {
        label: 'QR-verified certificate verification profile',
        values: { FREE: 'Public verification link', ASSOCIATE: true, EXECUTIVE: true, INSTITUTIONAL: true }
      },
      {
        label: 'Verified experience / reference letters',
        values: { FREE: false, ASSOCIATE: 'On request', EXECUTIVE: 'Executive letters on letterhead', INSTITUTIONAL: 'For the cohort' }
      },
      {
        label: 'Co-branded certificates under both names',
        values: { FREE: false, ASSOCIATE: false, EXECUTIVE: false, INSTITUTIONAL: true }
      },
      {
        label: 'Institution dashboard for participation records',
        values: { FREE: false, ASSOCIATE: false, EXECUTIVE: false, INSTITUTIONAL: true }
      }
    ]
  },
  {
    group: 'Research, policy & recognition',
    rows: [
      {
        label: 'Published policy briefs and explainers',
        values: { FREE: 'Public briefs', ASSOCIATE: 'Public briefs', EXECUTIVE: 'Advisory access', INSTITUTIONAL: 'Advisory access + network' }
      },
      {
        label: 'Research desk submissions',
        values: { FREE: false, ASSOCIATE: 'On invitation', EXECUTIVE: true, INSTITUTIONAL: true }
      },
      {
        label: 'Speaking opportunities at PYPC convenings',
        values: { FREE: false, ASSOCIATE: false, EXECUTIVE: true, INSTITUTIONAL: 'Faculty & students' }
      },
      {
        label: 'Recognition at the annual PYPC ceremony',
        values: { FREE: false, ASSOCIATE: false, EXECUTIVE: true, INSTITUTIONAL: true }
      },
      {
        label: 'National visibility through PYPC channels',
        values: { FREE: false, ASSOCIATE: false, EXECUTIVE: 'Member highlights', INSTITUTIONAL: 'Partner features' }
      }
    ]
  },
  {
    group: 'Partnership & support',
    rows: [
      {
        label: 'Campus circle registration and onboarding',
        values: { FREE: false, ASSOCIATE: false, EXECUTIVE: false, INSTITUTIONAL: true }
      },
      {
        label: 'Joint programmes with PYPC faculty and mentors',
        values: { FREE: false, ASSOCIATE: false, EXECUTIVE: false, INSTITUTIONAL: true }
      },
      {
        label: 'Memorandum of Understanding',
        values: { FREE: false, ASSOCIATE: false, EXECUTIVE: false, INSTITUTIONAL: 'Countersigned MoU' }
      },
      {
        label: 'Annual partnership report',
        values: { FREE: false, ASSOCIATE: false, EXECUTIVE: false, INSTITUTIONAL: true }
      },
      {
        label: 'Email support first response',
        hint: 'Measured in office hours, Monday–Saturday, 10:00–18:00 PKT.',
        values: { FREE: 'Within 3 working days', ASSOCIATE: 'Within 48 hours', EXECUTIVE: 'Within 24 hours', INSTITUTIONAL: 'Dedicated liaison, same day' }
      }
    ]
  }
]

/**
 * What happens after you pay — published so nobody has to guess, matching the
 * automated activation the platform actually performs.
 */
export const MEMBERSHIP_STEPS: { title: string; detail: string }[] = [
  {
    title: 'Create your account',
    detail:
      'Register with a working email address and your phone number with country code. We send a verification link before an account becomes active.'
  },
  {
    title: 'Verify your email',
    detail:
      'Click the link in the verification email. If it does not arrive within a few minutes, the dashboard can resend it.'
  },
  {
    title: 'Choose a tier and pay',
    detail:
      'Pay by JazzCash or Easypaisa in PKR, or by card in PKR or USD through Stripe. The free tier skips this step entirely.'
  },
  {
    title: 'Membership activates automatically',
    detail:
      'The gateway confirms payment to our server, the order is marked paid, and your membership, member card and dashboard access switch on without waiting for anyone to approve it.'
  },
  {
    title: 'Start taking part',
    detail:
      'Apply to programmes, book mentorship sessions and collect QR-verified certificates that anyone can check on the public verification page.'
  }
]

/**
 * Fee transparency. Blueprint phase 6 asks for a fee structure that is stated
 * plainly, including what is NOT covered.
 */
export const MEMBERSHIP_FEE_NOTES: string[] = [
  'The annual fee is the whole cost of membership. There is no joining fee, no renewal penalty and no charge for your member card or certificates.',
  'Travel, accommodation, visa costs and insurance for in-person events are not included in membership and are always stated separately before you commit to an event.',
  'Awards and scholarships we distribute are never reduced by a membership fee — if a programme is funded, it is funded for the member who earns it.',
  'No payment is ever taken automatically. Nothing renews without you starting a new payment yourself.',
  'Fees are published in PKR and USD on this page. Where a card issuer applies its own conversion, the amount in PKR is charged through JazzCash/Easypaisa and the amount in USD through Stripe.'
]

export const MEMBERSHIP_REFUND_SUMMARY: string[] = [
  'Request a full refund within 14 days of payment if you have not attended a paid programme in that period.',
  'After 14 days, refunds are prorated only where PYPC cancels a programme you paid for.',
  'Membership upgrades are charged as the difference between tiers, never as a second full fee.',
  'The full policy, including how to request a refund and the timeline for the money to return, is published on the refund policy page.'
]
