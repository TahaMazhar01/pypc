import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { news } from '@/lib/data/news'

const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    '',
    '/about',
    '/photo-credits',
    '/leadership',
    '/programmes',
    '/events',
    '/opportunities',
    '/membership',
    '/verify',
    '/contact',
    '/faq',
    '/privacy',
    '/terms',
    '/refund-policy',
    '/code-of-conduct',
    '/cookies',
    '/impact',
    '/accessibility',
    '/news',
    '/partnerships',
    '/status',
    '/login',
    '/register'
  ].map(path => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.8
  }))

  try {
    const [programmes, events, opportunities] = await Promise.all([
      prisma.programme.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      prisma.event.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
      prisma.opportunity.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } })
    ])

    return [
      ...staticRoutes,
      ...news.map(item => ({
        url: `${base}/news/${item.slug}`,
        lastModified: new Date(item.date),
        changeFrequency: 'monthly' as const,
        priority: 0.6
      })),
      ...programmes.map(item => ({
        url: `${base}/programmes/${item.slug}`,
        lastModified: item.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.7
      })),
      ...events.map(item => ({
        url: `${base}/events/${item.slug}`,
        lastModified: item.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7
      })),
      ...opportunities.map(item => ({
        url: `${base}/opportunities/${item.slug}`,
        lastModified: item.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7
      }))
    ]
  } catch {
    // Database unavailable during build — still return the static map plus the
    // newsroom, which is file-based and therefore always available.
    return [
      ...staticRoutes,
      ...news.map(item => ({
        url: `${base}/news/${item.slug}`,
        lastModified: new Date(item.date),
        changeFrequency: 'monthly' as const,
        priority: 0.6
      }))
    ]
  }
}
