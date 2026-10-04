/**
 * PYPC — shared constants, navigation, thematic pillars and governance data.
 */

export const SITE_NAME = 'Pakistan Youth Parliamentary Council'
export const SITE_SHORT_NAME = 'PYPC'
export const SITE_TAGLINE = 'Lead. Innovate. Reform. Inspire.'
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
/**
 * Official contact channels.
 *
 * These are the organisation's real addresses and number — every page, email
 * template, policy and API error message reads them from here, so changing a
 * channel in one place updates the whole platform (and the `.env` values
 * override them per deployment without a code change).
 */
export const CONTACT_EMAILS = [
  process.env.NEXT_PUBLIC_CONTACT_EMAIL_1 || 'pypcofficial@gmail.com',
  process.env.NEXT_PUBLIC_CONTACT_EMAIL_2 || 'officialpypc@gmail.com'
] as const

/** Primary mailbox — used for support, verification delivery and policy notices. */
export const CONTACT_EMAIL = CONTACT_EMAILS[0]

/** Human-formatted number, for display only. */
export const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || '+92 315 5729598'

/** E.164 digits, for `tel:` links and WhatsApp. */
export const CONTACT_PHONE_E164 = `+${CONTACT_PHONE.replace(/[^0-9]/g, '')}`
export const CONTACT_WHATSAPP = `https://wa.me/${CONTACT_PHONE.replace(/[^0-9]/g, '')}`

/**
 * The same number in local dialling form — what someone inside Pakistan types:
 * `+92 315 5729598` → `0315 5729598`. Derived, never typed twice, and shown
 * beside the international form so every visitor reads a number they recognise.
 */
export const CONTACT_PHONE_LOCAL = (() => {
  const digits = CONTACT_PHONE.replace(/[^0-9]/g, '')
  const national = digits.startsWith('92') ? `0${digits.slice(2)}` : digits
  const match = national.match(/^0(\d{3})(\d{6,7})$/)
  return match ? `0${match[1]} ${match[2]}` : CONTACT_PHONE
})()

/** Office hours shown beside the number (PKT). */
export const CONTACT_HOURS = 'Monday–Saturday, 10:00–18:00 PKT (GMT+5)'

export const CONTACT_ADDRESS = 'Islamabad, Pakistan'

export const navigationItems = [
  { label: 'About', href: '/about' },
  { label: 'International', href: '/international' },
  { label: 'Conferences', href: '/conferences' },
  { label: 'Courses', href: '/courses' },
  { label: 'Membership', href: '/membership' },
  { label: 'Verify', href: '/verify' },
  { label: 'Contact', href: '/contact' }
]

/** Secondary destinations shown in the "More" menu and the mobile overlay. */
export const navigationMore = [
  { label: 'Programmes', href: '/programmes' },
  { label: 'Events', href: '/events' },
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Research & Services', href: '/research' },
  { label: 'Records & Correspondence', href: '/records' },
  { label: 'Leadership', href: '/leadership' },
  { label: 'Partnerships', href: '/partnerships' },
  { label: 'Newsroom', href: '/news' },
  { label: 'Impact & Reports', href: '/impact' },
  { label: 'Search', href: '/search' },
  { label: 'Policies', href: '/policies' },
  { label: 'FAQ', href: '/faq' }
]

/**
 * Official channels live in `lib/social.ts` — the single place that knows which
 * accounts are real. Import from there:
 *
 *   import { SOCIAL_CHANNELS, SOCIAL_PROFILES, SOCIAL_CHANNEL } from '@/lib/social'
 *
 * (They were re-exported from here at first, but that created an import cycle
 * between the two modules and broke the production build: this module now owns
 * contact details only, and social.ts builds on top of it.)
 */

export const dashboardNav = [
  { label: 'Overview', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'My Profile', href: '/dashboard/profile', icon: 'UserRound' },
  { label: 'Membership', href: '/dashboard/membership', icon: 'BadgeCheck' },
  { label: 'Applications', href: '/dashboard/applications', icon: 'FileText' },
  { label: 'Certificates', href: '/dashboard/certificates', icon: 'Award' },
  { label: 'Events', href: '/dashboard/events', icon: 'CalendarDays' },
  { label: 'Visa Letters', href: '/dashboard/visa-letters', icon: 'Globe2' },
  { label: 'Security', href: '/dashboard/security', icon: 'ShieldCheck' },
  { label: 'Support', href: '/dashboard/support', icon: 'LifeBuoy' }
]

export const adminNav = [
  { label: 'Overview', href: '/admin', icon: 'LayoutDashboard' },
  { label: 'Members', href: '/admin/users', icon: 'Users' },
  { label: 'Applications', href: '/admin/applications', icon: 'FileText' },
  { label: 'Payments', href: '/admin/payments', icon: 'CreditCard' },
  { label: 'Certificates', href: '/admin/certificates', icon: 'Award' },
  { label: 'Programmes', href: '/admin/programmes', icon: 'Landmark' },
  { label: 'Events', href: '/admin/events', icon: 'CalendarDays' },
  { label: 'Opportunities', href: '/admin/opportunities', icon: 'GraduationCap' },
  { label: 'Messages', href: '/admin/messages', icon: 'Mail' },
  { label: 'Email & Verification', href: '/admin/emails', icon: 'MailCheck' },
  { label: 'Visa Letters', href: '/admin/visa-letters', icon: 'Globe2' },
  { label: 'Audit Log', href: '/admin/audit', icon: 'ScrollText' }
]

export const USER_ROLES = ['MEMBER', 'EXECUTIVE', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const USER_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const APPLICATION_STATUSES = [
  'PENDING',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'APPROVED',
  'REJECTED'
] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const CERTIFICATE_STATUSES = ['VALID', 'REVOKED', 'EXPIRED'] as const
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number]

export const ORDER_STATUSES = ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_PROVIDERS = ['STRIPE', 'JAZZCASH', 'EASYPAISA', 'SIMULATED'] as const
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number]

export const PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Gilgit-Baltistan',
  'Azad Jammu & Kashmir',
  'Islamabad Capital Territory'
]

export type Pillar = {
  title: string
  slug: string
  description: string
  icon: string
  accent: string
}

export const featuredPillars: Pillar[] = [
  {
    title: 'Youth Parliament',
    slug: 'youth-parliament',
    description:
      'Learn parliamentary procedure, democratic debate, legislation, committee work and public policy through structured simulations.',
    icon: 'Landmark',
    accent: 'bg-primary-50 text-primary'
  },
  {
    title: 'Climate Action',
    slug: 'climate-action',
    description:
      'Develop climate literacy, policy insight, green innovation and community resilience for a sustainable Pakistan.',
    icon: 'Leaf',
    accent: 'bg-emerald-50 text-emerald-700'
  },
  {
    title: 'AI & Technology',
    slug: 'ai-technology',
    description:
      'Build future-ready AI literacy, responsible technology skills and innovation capacity for Pakistan.',
    icon: 'BrainCircuit',
    accent: 'bg-blue-50 text-blue-700'
  },
  {
    title: 'Human Rights',
    slug: 'human-rights',
    description:
      'Promote equality, dignity, legal literacy, responsible advocacy and access to justice.',
    icon: 'Scale',
    accent: 'bg-rose-50 text-rose-700'
  },
  {
    title: 'Entrepreneurship',
    slug: 'entrepreneurship',
    description:
      'Transform ideas into ventures through bootcamps, mentorship, pitch sessions and professional networks.',
    icon: 'BriefcaseBusiness',
    accent: 'bg-amber-50 text-amber-700'
  },
  {
    title: 'Leadership Fellowships',
    slug: 'leadership-fellowship',
    description:
      'Participate in structured leadership, policy, research, diplomacy, climate and AI fellowship pathways.',
    icon: 'GraduationCap',
    accent: 'bg-violet-50 text-violet-700'
  },
  {
    title: 'Justice Reform',
    slug: 'justice-reform',
    description:
      'Support evidence-based discussion on justice, rehabilitation, dignity and criminal justice reform.',
    icon: 'HeartHandshake',
    accent: 'bg-purple-50 text-purple-700'
  }
]

export const governancePrinciples = [
  {
    title: 'Non-Partisan',
    text: 'PYPC does not affiliate with any political party. All engagement is issue-based, evidence-based and constitutionally grounded.'
  },
  {
    title: 'Transparent',
    text: 'Fees, selection criteria, participation records and certificates follow documented, auditable processes.'
  },
  {
    title: 'Inclusive',
    text: 'Membership is open to young people from every province, district, campus, gender and socio-economic background.'
  },
  {
    title: 'Accountable',
    text: 'Every administrative action inside the platform is written to an immutable audit log with actor, time and IP address.'
  }
]

export const organisationalStructure = [
  { unit: 'National Council', detail: 'Strategic direction, governance and standards.' },
  { unit: 'National Executive Body', detail: '15–35 youth executives delivering programmes.' },
  { unit: 'Secretariat', detail: 'Administration, records, compliance and member services.' },
  { unit: 'Standing Committees', detail: 'Policy, climate, AI, human rights, entrepreneurship and justice.' },
  { unit: 'Regional Chapters', detail: 'Seven geographic regions across Pakistan.' },
  { unit: 'Campus Circles', detail: 'University and college-level chapters.' }
]
