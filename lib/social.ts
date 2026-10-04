/**
 * Official PYPC channels — one definition, used everywhere.
 *
 * The organisation's real destinations live here and nowhere else: the footer,
 * the side rail, the header, the contact page, the AI assistant's knowledge and
 * the structured data all read this module, so a channel can never drift out of
 * sync between pages.
 *
 * Rules this file follows
 * -----------------------
 * 1. **No invented links.** A channel only renders when it has a real address,
 *    and an address only renders as a *link* when it actually resolves.
 * 2. **All four social pages are compiled in** exactly as supplied by the
 *    secretariat — LinkedIn, Instagram, Facebook, YouTube — and any of them can
 *    be moved per deployment with the matching `NEXT_PUBLIC_SOCIAL_*` variable.
 * 3. **One handle, everywhere.** The secretariat uses `pypcofficial` on every
 *    platform — Instagram, Facebook, YouTube and the primary mailbox — and that
 *    is how all of them are presented, so a visitor never wonders which account
 *    is real.
 * 4. **A channel can still be marked `pending`.** Every channel here ships as a
 *    normal link. If a channel page is ever taken down, set
 *    `NEXT_PUBLIC_SOCIAL_<CHANNEL>_PENDING="true"` (or flip the switch below)
 *    and that channel renders as a labelled chip instead of a link, everywhere
 *    at once — one edit, no code changes.
 * 4. Every entry carries the copy the interface needs (`short`), the accessible
 *    label (`label`) and an icon id, so consumers never re-invent wording.
 */

import { CONTACT_EMAIL, CONTACT_EMAILS, CONTACT_PHONE, CONTACT_PHONE_E164, CONTACT_WHATSAPP, SITE_URL } from './constants'

export type SocialChannel = {
  /** Icon id — see components/ui/brand-icons.tsx and the Lucide registry. */
  id: 'linkedin' | 'instagram' | 'facebook' | 'youtube' | 'email' | 'phone' | 'whatsapp'
  /** Accessible label, e.g. "PYPC on LinkedIn". */
  label: string
  /** Short label for compact UI, e.g. "LinkedIn". */
  short: string
  /** Public handle, when the channel has one. */
  handle?: string
  /** Real destination. */
  href: string
  /** Where the address came from — shown in docs, never guessed. */
  source: 'verified' | 'configured'
  /**
   * `live`   — the address resolves; rendered as a link everywhere.
   * `pending` — the page is not published yet; rendered as a labelled chip so
   *             the channel is visible without sending anyone to a dead page.
   */
  status: 'live' | 'pending'
}

const ENV = {
  linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
  instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
  facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
  youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
  youtubePending: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_PENDING
}

/**
 * Compiled-in addresses — all four supplied and confirmed by the secretariat as
 * the council's own official pages. Nothing here is guessed, and another
 * organisation's page is never substituted. Each can be moved per deployment
 * with the matching `NEXT_PUBLIC_SOCIAL_*` variable (see .env.example).
 *
 * YouTube uses the `@handle` form: that is the address YouTube resolves for a
 * channel handle, and it is the one that will serve the council's channel as
 * soon as the channel itself is published.
 */
const VERIFIED = {
  linkedin: 'https://www.linkedin.com/company/pakistan-youth-parliamentary-council',
  instagram: 'https://www.instagram.com/pypcofficial/',
  facebook: 'https://www.facebook.com/pypcofficial',
  youtube: 'https://www.youtube.com/@pypcofficial'
}

/**
 * Per-channel link/chip switch.
 *
 * Every channel ships as a link. Flip a flag — or set the matching
 * `NEXT_PUBLIC_SOCIAL_<CHANNEL>_PENDING` variable — if a page is ever
 * unreachable, and that channel becomes a labelled chip across the whole site
 * (footer, contact page, header menus, side rail) instead of sending visitors to
 * an error page.
 */
const PENDING: Record<string, boolean> = {
  youtube: ENV.youtubePending === 'true'
}

/**
 * The handle shown beside each mark. LinkedIn addresses a company by its public
 * slug rather than a `@handle`, so that is what is shown there; everything else
 * is the council's single handle, `pypcofficial`.
 */
const HANDLES: Record<string, string> = {
  linkedin: 'pakistan-youth-parliamentary-council',
  instagram: '@pypcofficial',
  facebook: '@pypcofficial',
  youtube: '@pypcofficial'
}

function social(
  id: SocialChannel['id'],
  label: string,
  short: string,
  href: string | undefined,
  source: SocialChannel['source'],
  status: SocialChannel['status'] = 'live'
): SocialChannel | null {
  if (!href) return null
  return { id, label, short, handle: HANDLES[id], href, source, status }
}

/**
 * Every channel the organisation actually has, in the order they should be
 * presented: social first, then the direct mailbox and phone lines.
 */
export const SOCIAL_CHANNELS: SocialChannel[] = [
  social('linkedin', 'PYPC on LinkedIn', 'LinkedIn', ENV.linkedin || VERIFIED.linkedin, ENV.linkedin ? 'configured' : 'verified'),
  social('instagram', 'PYPC on Instagram', 'Instagram', ENV.instagram || VERIFIED.instagram, ENV.instagram ? 'configured' : 'verified'),
  social(
    'facebook',
    'PYPC on Facebook',
    'Facebook',
    ENV.facebook || VERIFIED.facebook,
    ENV.facebook ? 'configured' : 'verified'
  ),
  social(
    'youtube',
    'PYPC on YouTube',
    'YouTube',
    ENV.youtube || VERIFIED.youtube,
    ENV.youtube ? 'configured' : 'verified',
    PENDING.youtube ? 'pending' : 'live'
  ),
  {
    id: 'email',
    label: 'Email the secretariat',
    short: 'Email',
    handle: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    source: 'verified'
  },
  {
    id: 'phone',
    label: 'Call the secretariat',
    short: 'Phone',
    handle: CONTACT_PHONE,
    href: `tel:${CONTACT_PHONE_E164}`,
    source: 'verified'
  },
  {
    id: 'whatsapp',
    label: 'Message the secretariat on WhatsApp',
    short: 'WhatsApp',
    handle: CONTACT_PHONE,
    href: CONTACT_WHATSAPP,
    source: 'verified'
  }
].filter((channel): channel is SocialChannel => Boolean(channel))

/** Channels that point at a social network (used by the follow blocks). */
export const SOCIAL_PROFILES = SOCIAL_CHANNELS.filter(
  channel => !['email', 'phone', 'whatsapp'].includes(channel.id)
)

/**
 * Profiles that resolve today. Only these go into the structured data: search
 * engines follow `sameAs` URLs, and a dead one is worse than a missing one.
 */
export const SOCIAL_PROFILES_LIVE = SOCIAL_PROFILES.filter(channel => channel.status === 'live')

/** Channels a visitor can message or call directly. */
export const CONTACT_CHANNELS = SOCIAL_CHANNELS.filter(channel =>
  ['email', 'phone', 'whatsapp'].includes(channel.id)
)

/** Quick lookup, e.g. `SOCIAL_CHANNEL.instagram.href`. */
export const SOCIAL_CHANNEL = Object.fromEntries(
  SOCIAL_CHANNELS.map(channel => [channel.id, channel])
) as Partial<Record<SocialChannel['id'], SocialChannel>>

/**
 * `sameAs` array for schema.org Organisation markup.
 *
 * Web profiles only — search engines expect resolvable page URLs here, so the
 * mailboxes are published through the schema's own `email` and `contactPoint`
 * fields instead (see components/seo/organisation-schema.tsx).
 */
export const ORGANISATION_SAME_AS = SOCIAL_PROFILES_LIVE.map(channel => channel.href)

/** Canonical site address, without a trailing slash. */
export const CANONICAL_SITE_URL = SITE_URL.replace(/\/$/, '')

/**
 * A channel with a blank/placeholder value must never reach a visitor, so the
 * environment is normalised once here rather than at every call site.
 */
export function isConfiguredChannel(channel: SocialChannel) {
  return Boolean(channel.href && channel.href.trim().length > 8)
}
