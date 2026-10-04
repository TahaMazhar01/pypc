import 'server-only'

import { prisma } from '@/lib/prisma'
import { news } from '@/lib/data/news'
import { courses } from '@/lib/data/courses'
import { faqs } from '@/lib/data/faq'
import { policies } from '@/lib/data/policies'
import { MEMBERSHIP_TIERS } from '@/lib/data/membership'

/**
 * Site-wide search.
 *
 * Two sources, one index: database records (programmes, events, opportunities,
 * certificates by reference, plans) and file-based editorial content (newsroom,
 * courses, FAQ, policies, membership tiers). Everything the site publishes is
 * searchable, which matters on a site this size — a visitor looking for
 * "refund" should not have to guess it lives under Policies.
 *
 * Scoring is deliberately simple and explainable: an exact phrase in the title
 * beats a title word, which beats a match in the summary, which beats a match in
 * the body. No hidden relevance model, no telemetry, no external service.
 */

export type SearchResult = {
  kind: 'Programme' | 'Event' | 'Opportunity' | 'Course' | 'News' | 'Page' | 'FAQ' | 'Policy' | 'Membership'
  title: string
  summary: string
  href: string
  /** Higher is more relevant. Used for ordering only. */
  score: number
}

function score(haystack: { title: string; summary: string; body: string }, query: string, q: string) {
  let total = 0
  const title = haystack.title.toLowerCase()
  const summary = haystack.summary.toLowerCase()
  const body = haystack.body.toLowerCase()

  if (title === q) total += 100
  if (title.includes(q)) total += 40
  if (title.includes(query)) total += 20
  for (const word of query.split(/\s+/).filter(Boolean)) {
    if (word.length < 3) continue
    if (title.includes(word)) total += 8
    if (summary.includes(word)) total += 4
    if (body.includes(word)) total += 2
  }
  if (summary.includes(query)) total += 6
  if (body.includes(query)) total += 3

  return total
}

export async function searchSite(rawQuery: string, limit = 30): Promise<SearchResult[]> {
  const query = rawQuery.trim().toLowerCase()
  if (query.length < 2) return []
  const q = query.replace(/\s+/g, ' ')

  const [programmes, events, opportunities, plans] = await Promise.all([
    prisma.programme.findMany({ where: { isActive: true }, select: { slug: true, title: true, summary: true, description: true, category: true } }),
    prisma.event.findMany({ where: { isPublished: true }, select: { slug: true, title: true, description: true, city: true, eventType: true } }),
    prisma.opportunity.findMany({ where: { isActive: true }, select: { slug: true, title: true, summary: true, description: true, type: true, organisation: true } }),
    prisma.membershipPlan.findMany({ where: { isActive: true }, select: { code: true, name: true, tagline: true, description: true } })
  ])

  const results: SearchResult[] = []

  for (const item of programmes) {
    const candidate = { title: item.title, summary: item.summary ?? item.category, body: item.description }
    results.push({
      kind: 'Programme',
      title: item.title,
      summary: candidate.summary,
      href: `/programmes/${item.slug}`,
      score: score(candidate, query, q)
    })
  }

  for (const item of events) {
    const candidate = {
      title: item.title,
      summary: [item.eventType, item.city].filter(Boolean).join(' · '),
      body: item.description
    }
    results.push({
      kind: 'Event',
      title: item.title,
      summary: candidate.summary,
      href: `/events/${item.slug}`,
      score: score(candidate, query, q)
    })
  }

  for (const item of opportunities) {
    const candidate = {
      title: item.title,
      summary: [item.type, item.organisation].filter(Boolean).join(' · '),
      body: item.description
    }
    results.push({
      kind: 'Opportunity',
      title: item.title,
      summary: candidate.summary,
      href: `/opportunities/${item.slug}`,
      score: score(candidate, query, q)
    })
  }

  for (const plan of plans) {
    const candidate = { title: plan.name, summary: plan.tagline, body: plan.description }
    results.push({
      kind: 'Membership',
      title: plan.name,
      summary: plan.tagline,
      href: plan.code === 'INSTITUTIONAL' ? '/partnerships' : `/membership/checkout?plan=${plan.code}`,
      score: score(candidate, query, q)
    })
  }

  for (const tier of MEMBERSHIP_TIERS) {
    const candidate = {
      title: tier.name,
      summary: tier.tagline,
      body: [...tier.features, ...tier.benefits, tier.description].join(' ')
    }
    const s = score(candidate, query, q)
    if (s > 0) {
      results.push({
        kind: 'Membership',
        title: `${tier.name} — benefits and pricing`,
        summary: tier.tagline,
        href: tier.code === 'INSTITUTIONAL' ? '/partnerships' : `/membership/checkout?plan=${tier.code}`,
        score: s
      })
    }
  }

  for (const item of news) {
    const candidate = { title: item.title, summary: item.summary, body: item.body.join(' ') }
    results.push({
      kind: 'News',
      title: item.title,
      summary: item.summary,
      href: `/news/${item.slug}`,
      score: score(candidate, query, q)
    })
  }

  for (const course of courses) {
    const candidate = {
      title: course.title,
      summary: course.summary,
      body: [course.level, course.mode, course.summary, ...(course.outcomes ?? [])].join(' ')
    }
    results.push({
      kind: 'Course',
      title: course.title,
      summary: course.summary,
      href: `/courses#${course.slug}`,
      score: score(candidate, query, q)
    })
  }

  for (const faq of faqs) {
    const candidate = { title: faq.question, summary: faq.category, body: faq.answer }
    results.push({
      kind: 'FAQ',
      title: faq.question,
      summary: faq.category,
      href: '/faq',
      score: score(candidate, query, q)
    })
  }

  for (const policy of Object.values(policies)) {
    const candidate = {
      title: policy.title,
      summary: policy.summary,
      body: policy.sections.map(section => [section.heading, ...(section.paragraphs ?? []), ...(section.bullets ?? [])].join(' ')).join(' ')
    }
    results.push({
      kind: 'Policy',
      title: policy.title,
      summary: policy.summary,
      href: `/${policy.slug}`,
      score: score(candidate, query, q)
    })
  }

  for (const page of [
    { title: 'About PYPC', summary: 'Mandate, values, structure and how the Council works', href: '/about', body: 'about mandate values structure governance legal status islamabad council' },
    { title: 'Leadership and structure', summary: 'Officers, committees and regional structure', href: '/leadership', body: 'leadership chairperson chief executive officers committee' },
    {
      title: 'Partnerships and MoUs',
      summary: 'Partner with PYPC: campus chapters, joint events, research, internships and the MoU process',
      href: '/partnerships',
      body: 'partnership partnership moU mou memorandum university college campus chapter ngo government collaborate joint conference research faculty exchange internship scholarship institution request'
    },
    { title: 'Certificate verification', summary: 'Check any PYPC certificate by QR code or reference', href: '/verify', body: 'verify certificate qr reference check validity revoked' },
    { title: 'Contact the secretariat', summary: 'Mailboxes, phone, office hours and response commitment', href: '/contact', body: 'contact email phone whatsapp office hours address secretariat' },
    { title: 'Impact and reports', summary: 'Live metrics and the downloadable impact report', href: '/impact', body: 'impact report annual numbers metrics transparency' },
    { title: 'Newsroom', summary: 'Announcements from the Council', href: '/news', body: 'news press announcements media' },
    { title: 'International participation', summary: 'USD pricing, visa letters and time-zone-friendly delivery', href: '/international', body: 'international students visa letter usd timezone diaspora' },
    { title: 'Research and services', summary: 'Policy desk, briefs and member services', href: '/research', body: 'research policy briefs services desk' },
    { title: 'Records and correspondence', summary: 'Numbered correspondence and record requests', href: '/records', body: 'records correspondence letters reference' },
    { title: 'Accessibility statement', summary: 'What is verified, known limitations and how to report a barrier', href: '/accessibility', body: 'accessibility wcag screen reader keyboard contrast' },
    { title: 'System status', summary: 'Live platform health', href: '/status', body: 'status uptime health database storage email payments' },
    { title: 'Frequently asked questions', summary: 'Membership, programmes, certificates, payments, platform', href: '/faq', body: 'faq questions answers help' }
  ]) {
    results.push({
      kind: 'Page',
      title: page.title,
      summary: page.summary,
      href: page.href,
      score: score(page, query, q)
    })
  }

  return results
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
}
