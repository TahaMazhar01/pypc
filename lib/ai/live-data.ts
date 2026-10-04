import 'server-only'

/**
 * Real-time data for the assistant.
 *
 * A language model can only repeat what it was trained on; the PYPC assistant
 * must answer with what is true *now* — today's plan prices, the events that are
 * actually published, how many certificates are currently valid. This module
 * reads those straight from the database at question time and formats them as
 * sentences in all three supported languages.
 *
 * Every function is defensive: if the database is briefly unavailable the
 * assistant still answers from the knowledge base, with a note that the live
 * figure could not be read — it never invents a number.
 */

import { prisma } from '@/lib/prisma'
import {
  CONTACT_EMAIL,
  CONTACT_EMAILS,
  CONTACT_PHONE,
  CONTACT_PHONE_LOCAL,
  SITE_URL
} from '@/lib/constants'
import { SOCIAL_CHANNELS } from '@/lib/social'
import { detectLanguage, type AssistantLanguage } from './language'
import type { LiveScope } from './knowledge-base'

export type LiveFact = {
  /** Machine-readable label, e.g. "Certificate". */
  key: string
  /** Human label in the answer's language. */
  label: string
  /** Already-formatted, localised value. */
  value: string
}

export type LiveDataResult = {
  scope: LiveScope
  /** Localised sentences appended to the answer. */
  lines: string[]
  /** Structured facts, returned to the widget so it can render them as cards. */
  facts: LiveFact[]
  /** When the reading was taken (ISO), so the UI can say "as of …". */
  readAt: string
  /** True when the database could not be read. */
  degraded: boolean
}

const CURRENCY: Record<AssistantLanguage, { label: string; perMonth: string }> = {
  en: { label: 'per year', perMonth: 'per year' },
  ur: { label: 'سالانہ', perMonth: 'سالانہ' },
  'roman-ur': { label: 'saalana', perMonth: 'saalana' }
}

function money(amount: number, currency: 'PKR' | 'USD', language: AssistantLanguage) {
  const formatted =
    currency === 'PKR'
      ? `Rs ${amount.toLocaleString('en-PK')}`
      : `$${amount.toLocaleString('en-US')}`
  if (language === 'ur') return `${formatted}`
  return formatted
}

function dateLabel(value: Date, language: AssistantLanguage) {
  const iso = value.toISOString().slice(0, 10)
  if (language === 'en') {
    return value.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  // Urdu and Roman Urdu readers both read the ISO date unambiguously.
  return iso
}

async function safe<T>(work: () => Promise<T>, fallback: T): Promise<{ value: T; degraded: boolean }> {
  try {
    return { value: await work(), degraded: false }
  } catch (error) {
    console.error('[assistant:live]', error)
    return { value: fallback, degraded: true }
  }
}

/**
 * Reads the live figure for a scope and phrases it in the requested language.
 */
export async function readLiveData(scope: LiveScope, language: AssistantLanguage): Promise<LiveDataResult> {
  const readAt = new Date().toISOString()

  if (scope === 'membership_plans' || scope === 'plans') {
    const { value: plans, degraded } = await safe(
      () =>
        prisma.membershipPlan.findMany({
          where: { isActive: true },
          orderBy: { pricePkr: 'asc' },
          select: { code: true, name: true, pricePkr: true, priceUsd: true, durationMonths: true }
        }),
      [] as { code: string; name: string; pricePkr: number; priceUsd: number; durationMonths: number }[]
    )

    const facts: LiveFact[] = plans.map(plan => ({
      key: plan.code,
      label: plan.name,
      value: `${money(plan.pricePkr, 'PKR', language)} / ${money(plan.priceUsd, 'USD', language)}`
    }))

    if (!plans.length) {
      return {
        scope,
        lines: [
          language === 'ur'
            ? 'اس وقت کوئی رکنیتی پلان فعال نہیں ہے۔'
            : language === 'roman-ur'
              ? 'Is waqt koi membership plan active nahi hai.'
              : 'No membership plan is active on the platform right now.'
        ],
        facts,
        readAt,
        degraded
      }
    }

    const lines = plans.map(plan => {
      const term = `${plan.durationMonths} ${CURRENCY[language].perMonth}`
      if (language === 'ur') {
        return `• ${plan.name}: روپے ${plan.pricePkr.toLocaleString('en-PK')} یا ڈالر ${plan.priceUsd} — ${term}`
      }
      if (language === 'roman-ur') {
        return `• ${plan.name}: Rs ${plan.pricePkr.toLocaleString('en-PK')} ya $${plan.priceUsd} — ${term}`
      }
      return `• ${plan.name}: Rs ${plan.pricePkr.toLocaleString('en-PK')} or $${plan.priceUsd} — ${term}`
    })

    return { scope, lines, facts, readAt, degraded }
  }

  if (scope === 'programmes') {
    const { value: programmes, degraded } = await safe(
      () =>
        prisma.programme.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: { title: true, category: true, mode: true, durationWeeks: true }
        }),
      [] as { title: string; category: string; mode: string | null; durationWeeks: number | null }[]
    )

    const facts: LiveFact[] = programmes.map(p => ({
      key: p.title,
      label: p.category,
      value: [p.mode, p.durationWeeks ? `${p.durationWeeks} weeks` : null].filter(Boolean).join(' · ')
    }))

    const lines = programmes.length
      ? programmes.map(p =>
          language === 'en'
            ? `• ${p.title} (${p.category})${p.mode ? ` — ${p.mode}` : ''}`
            : `• ${p.title} — ${p.category}`
        )
      : [
          language === 'ur'
            ? 'اس وقت کوئی پروگرام شائع نہیں ہوا۔'
            : language === 'roman-ur'
              ? 'Is waqt koi programme publish nahi hua.'
              : 'No programme is published at the moment.'
        ]

    return { scope, lines, facts, readAt, degraded }
  }

  if (scope === 'events') {
    const { value: events, degraded } = await safe(
      () =>
        prisma.event.findMany({
          where: { isPublished: true, startsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
          take: 5,
          select: { title: true, city: true, venue: true, startsAt: true, mode: true }
        }),
      [] as { title: string; city: string | null; venue: string | null; startsAt: Date; mode: string | null }[]
    )

    const facts: LiveFact[] = events.map(e => ({
      key: e.title,
      label: e.title,
      value: `${dateLabel(e.startsAt, language)}${e.city ? ` · ${e.city}` : ''}`
    }))

    const lines = events.length
      ? events.map(e =>
          language === 'en'
            ? `• ${e.title} — ${dateLabel(e.startsAt, 'en')}${e.city ? `, ${e.city}` : ''}`
            : `• ${e.title} — ${dateLabel(e.startsAt, language)}${e.city ? ` (${e.city})` : ''}`
        )
      : [
          language === 'ur'
            ? 'اس وقت کوئی آنے والی تقریب شائع نہیں ہوئی۔'
            : language === 'roman-ur'
              ? 'Is waqt koi aane wala event publish nahi hua.'
              : 'No upcoming event is published right now.'
        ]

    return { scope, lines, facts, readAt, degraded }
  }

  if (scope === 'opportunities') {
    const { value: opportunities, degraded } = await safe(
      () =>
        prisma.opportunity.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { title: true, type: true, location: true, deadline: true }
        }),
      [] as { title: string; type: string; location: string | null; deadline: Date | null }[]
    )

    const facts: LiveFact[] = opportunities.map(o => ({
      key: o.title,
      label: o.title,
      value: [o.type, o.deadline ? dateLabel(o.deadline, language) : null].filter(Boolean).join(' · ')
    }))

    const lines = opportunities.length
      ? opportunities.map(o =>
          language === 'en'
            ? `• ${o.title} (${o.type})${o.deadline ? ` — deadline ${dateLabel(o.deadline, 'en')}` : ''}`
            : `• ${o.title} — ${o.type}${o.deadline ? ` — ${dateLabel(o.deadline, language)}` : ''}`
        )
      : [
          language === 'ur'
            ? 'اس وقت کوئی موقع دستیاب نہیں۔'
            : language === 'roman-ur'
              ? 'Is waqt koi opportunity available nahi.'
              : 'No opportunity is open at the moment.'
        ]

    return { scope, lines, facts, readAt, degraded }
  }

  if (scope === 'certificates') {
    const { value: counts, degraded } = await safe(
      async () => {
        const [valid, revoked] = await Promise.all([
          prisma.certificate.count({ where: { status: 'VALID' } }),
          prisma.certificate.count({ where: { status: 'REVOKED' } })
        ])
        return { valid, revoked }
      },
      { valid: 0, revoked: 0 }
    )

    const lines = [
      language === 'ur'
        ? `اس وقت ${counts.valid} سندیں درست اور ${counts.revoked} منسوخ ہیں۔`
        : language === 'roman-ur'
          ? `Is waqt ${counts.valid} certificates valid aur ${counts.revoked} revoked hain.`
          : `${counts.valid} certificates are currently valid and ${counts.revoked} are revoked.`
    ]

    return {
      scope,
      lines,
      facts: [
        { key: 'VALID', label: language === 'en' ? 'Valid' : 'درست', value: String(counts.valid) },
        { key: 'REVOKED', label: language === 'en' ? 'Revoked' : 'منسوخ', value: String(counts.revoked) }
      ],
      readAt,
      degraded
    }
  }

  if (scope === 'international') {
    const { value: letters, degraded } = await safe(
      async () => {
        const [issued, requested] = await Promise.all([
          prisma.visaLetterRequest.count({ where: { status: 'ISSUED' } }),
          prisma.visaLetterRequest.count()
        ])
        return { issued, requested }
      },
      { issued: 0, requested: 0 }
    )

    const lines = [
      language === 'ur'
        ? `اب تک ${letters.requested} ویزا درخواستیں موصول اور ${letters.issued} دعوت نامے جاری ہو چکے ہیں۔`
        : language === 'roman-ur'
          ? `Ab tak ${letters.requested} visa requests aayi aur ${letters.issued} letters issue ho chuke hain.`
          : `${letters.requested} visa letters have been requested and ${letters.issued} issued so far.`
    ]

    return {
      scope,
      lines,
      facts: [
        { key: 'ISSUED', label: 'Issued', value: String(letters.issued) },
        { key: 'REQUESTED', label: 'Requested', value: String(letters.requested) }
      ],
      readAt,
      degraded
    }
  }

  // members — the headline live counters, and a compact activity snapshot.
  const { value: counts, degraded } = await safe(
    async () => {
      const [members, verifiedMembers, programmes, events, opportunities, certificates] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
        prisma.programme.count({ where: { isActive: true } }),
        prisma.event.count({ where: { isPublished: true } }),
        prisma.opportunity.count({ where: { isActive: true } }),
        prisma.certificate.count({ where: { status: 'VALID' } })
      ])
      return { members, verifiedMembers, programmes, events, opportunities, certificates }
    },
    { members: 0, verifiedMembers: 0, programmes: 0, events: 0, opportunities: 0, certificates: 0 }
  )

  const lines =
    language === 'ur'
      ? [
          `• ممبران: ${counts.members} (تصدیق شدہ: ${counts.verifiedMembers})`,
          `• فعال پروگرام: ${counts.programmes}`,
          `• شائع شدہ تقریبات: ${counts.events}`,
          `• کھلے مواقع: ${counts.opportunities}`,
          `• درست سندیں: ${counts.certificates}`
        ]
      : language === 'roman-ur'
        ? [
            `• Members: ${counts.members} (verified: ${counts.verifiedMembers})`,
            `• Active programmes: ${counts.programmes}`,
            `• Published events: ${counts.events}`,
            `• Open opportunities: ${counts.opportunities}`,
            `• Valid certificates: ${counts.certificates}`
          ]
        : [
            `• Members: ${counts.members} (${counts.verifiedMembers} verified)`,
            `• Active programmes: ${counts.programmes}`,
            `• Published events: ${counts.events}`,
            `• Open opportunities: ${counts.opportunities}`,
            `• Valid certificates: ${counts.certificates}`
          ]

  return {
    scope,
    lines,
    facts: [
      { key: 'Members', label: 'Members', value: String(counts.members) },
      { key: 'Verified', label: 'Verified', value: String(counts.verifiedMembers) },
      { key: 'Programmes', label: 'Programmes', value: String(counts.programmes) },
      { key: 'Events', label: 'Events', value: String(counts.events) },
      { key: 'Opportunities', label: 'Opportunities', value: String(counts.opportunities) },
      { key: 'Certificates', label: 'Certificates', value: String(counts.certificates) }
    ],
    readAt,
    degraded
  }
}

/**
 * Contact details, live from configuration — the assistant quotes the same
 * numbers the footer and contact page do, and can never drift.
 */
export function contactFactLines(language: AssistantLanguage) {
  // The assistant quotes the same channel list the footer shows, from the same
  // module, so the two can never disagree.
  const socials = SOCIAL_CHANNELS.map(channel => {
    const base = channel.handle ? `${channel.short} (${channel.handle})` : channel.short
    return channel.status === 'pending' ? `${base} — soon` : base
  }).join(' · ')

  if (language === 'ur') {
    return [
      `• فون / واٹس ایپ: ${CONTACT_PHONE} (${CONTACT_PHONE_LOCAL})`,
      `• ای میل: ${CONTACT_EMAILS.join(' ، ')}`,
      `• ذرائع: ${socials}`,
      `• ویب سائٹ: ${SITE_URL}`
    ]
  }

  if (language === 'roman-ur') {
    return [
      `• Phone / WhatsApp: ${CONTACT_PHONE} (${CONTACT_PHONE_LOCAL} within Pakistan)`,
      `• Email: ${CONTACT_EMAILS.join(', ')}`,
      `• Channels: ${socials}`,
      `• Website: ${SITE_URL}`
    ]
  }

  return [
    `• Phone / WhatsApp: ${CONTACT_PHONE} (${CONTACT_PHONE_LOCAL} within Pakistan)`,
    `• Email: ${CONTACT_EMAILS.join(', ')}`,
    `• Channels: ${socials}`,
    `• Website: ${SITE_URL}`
  ]
}

/** Language of a free-text message, exported for callers that only need this. */
export { detectLanguage }
