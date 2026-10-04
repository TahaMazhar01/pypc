import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Public, privacy-safe platform activity feed.
 *
 * Returns only aggregate and non-personal metadata (no member names, emails,
 * phones, CNIC or payment details) so it is safe to render on the public site.
 * Cached for 30 seconds at the edge to avoid hammering the database.
 */
export async function GET() {
  try {
    const [members, certificatesValid, programmes, events, opportunities, latestProgrammes, latestEvents, latestOpportunities, newestCertificates] =
      await Promise.all([
        prisma.user.count(),
        prisma.certificate.count({ where: { status: 'VALID' } }),
        prisma.programme.count({ where: { isActive: true } }),
        prisma.event.count({ where: { isPublished: true } }),
        prisma.opportunity.count({ where: { isActive: true } }),
        prisma.programme.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 2, select: { title: true, category: true, createdAt: true } }),
        prisma.event.findMany({ where: { isPublished: true, startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' }, take: 2, select: { title: true, city: true, startsAt: true } }),
        prisma.opportunity.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 2, select: { title: true, type: true, deadline: true, createdAt: true } }),
        prisma.certificate.findMany({ where: { status: 'VALID' }, orderBy: { issueDate: 'desc' }, take: 1, select: { title: true, issueDate: true } })
      ])

    const items: { kind: string; message: string; at: string }[] = []

    for (const certificate of newestCertificates) {
      // Deliberately no recipient name — public feed stays privacy-safe.
      items.push({
        kind: 'certificate',
        message: `Certificate issued · ${certificate.title}`,
        at: certificate.issueDate.toISOString()
      })
    }

    for (const programme of latestProgrammes) {
      items.push({
        kind: 'programme',
        message: `Programme open · ${programme.title} (${programme.category})`,
        at: programme.createdAt.toISOString()
      })
    }

    for (const event of latestEvents) {
      items.push({
        kind: 'event',
        message: `Upcoming · ${event.title}${event.city ? ` · ${event.city}` : ''}`,
        at: event.startsAt.toISOString()
      })
    }

    for (const opportunity of latestOpportunities) {
      items.push({
        kind: 'opportunity',
        message: `${opportunity.type} open · ${opportunity.title}`,
        at: opportunity.createdAt.toISOString()
      })
    }

    return NextResponse.json(
      {
        ok: true,
        updatedAt: new Date().toISOString(),
        totals: {
          members,
          certificatesValid,
          programmes,
          events,
          opportunities
        },
        items
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    )
  } catch (error) {
    console.error('[platform/activity]', error)
    return NextResponse.json({ ok: false, items: [], totals: null }, { status: 200 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
