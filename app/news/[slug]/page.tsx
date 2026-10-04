
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Badge, Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { news, newsBySlug, sortedNews, type NewsCategory } from '@/lib/data/news'

const CATEGORY_TONE: Record<NewsCategory, 'gold' | 'primary' | 'success' | 'info' | 'neutral'> = {
  Announcement: 'primary',
  Programme: 'info',
  Policy: 'success',
  Platform: 'gold',
  Partnership: 'neutral'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function generateStaticParams() {
  return news.map(item => ({ slug: item.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = newsBySlug(params.slug)
  if (!item) return { title: 'Announcement not found' }

  return {
    title: displayContent(item.title),
    description: displayContent(item.summary),
    alternates: { canonical: `/news/${item.slug}` },
    openGraph: {
      type: 'article',
      title: displayContent(item.title),
      description: displayContent(item.summary),
      publishedTime: item.date,
      images: [{ url: '/images/og-default.png', width: 1200, height: 630, alt: item.title }]
    }
  }
}

export default function NewsArticlePage({ params }: { params: { slug: string } }) {
  const item = newsBySlug(params.slug)
  if (!item) notFound()

  const others = sortedNews()
    .filter(other => other.slug !== item.slug)
    .slice(0, 3)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: item.title,
    description: displayContent(item.summary),
    datePublished: item.date,
    dateModified: item.date,
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: 'Pakistan Youth Parliamentary Council',
      url: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    },
    mainEntityOfPage: `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/news/${item.slug}`
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        eyebrow={item.category}
        title={displayContent(item.title)}
        description={item.summary}
        breadcrumb={[{ label: 'Newsroom', href: '/news' }, { label: item.title }]}
      >
        <div className="flex flex-wrap items-center gap-4">
          <Badge tone={CATEGORY_TONE[item.category]}>{displayContent(item.category)}</Badge>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <CalendarDays size={13} /> Published {displayContent(formatDate(item.date))}
          </span>
        </div>
      </PageHero>

      <div className="container py-14">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <article className="space-y-5">
            {item.body.map(paragraph => (
              <p key={paragraph.slice(0, 40)} className="text-base leading-8 text-slate-700">
                {displayContent(paragraph)}
              </p>
            ))}

            {displayContent(item.links?.length ? (
              <div className="mt-8 rounded-2xl border border-primary-100 bg-primary-50 p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Related on this site</p>
                <ul className="mt-3 space-y-2">
                  {item.links.map(link => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline"
                      >
                        {displayContent(link.label)} <ArrowRight size={14} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null)}

            <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
              <Link href="/news" className={buttonVariants({ variant: 'outline', size: 'md' })}>
                <ArrowLeft size={15} /> All announcements
              </Link>
              <Link href="/contact" className={buttonVariants({ variant: 'ghost', size: 'md' })}>
                Media enquiry
              </Link>
            </div>
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card>
              <h2 className="text-sm font-bold uppercase tracking-wide text-primary">More from the newsroom</h2>
              <ul className="mt-4 space-y-4">
                {others.map(other => (
                  <li key={other.slug}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {displayContent(other.category)} · {displayContent(formatDate(other.date))}
                    </p>
                    <Link
                      href={`/news/${other.slug}`}
                      className="mt-1 block text-sm font-bold leading-6 text-slate-900 underline-offset-4 hover:underline"
                    >
                      {displayContent(other.title)}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-primary">Verification discipline</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Anything the Council states publicly should be checkable. Certificates verify on the public
                page; policies are published; the platform&apos;s live health is on the status page.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/verify" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Verify
                </Link>
                <Link href="/status" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Status
                </Link>
                <Link href="/policies" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Policies
                </Link>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </>
  )
}
