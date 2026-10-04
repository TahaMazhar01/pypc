
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Badge, Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { sortedNews, type NewsCategory } from '@/lib/data/news'
import { NewsletterSignup } from '@/components/features/newsletter-signup'

export const metadata: Metadata = {
  title: 'Newsroom',
  description:
    'Announcements from the Pakistan Youth Parliamentary Council — membership, programmes, policy and platform updates, each traceable to a published document.',
  alternates: { canonical: '/news' },
  openGraph: {
    title: 'PYPC Newsroom',
    description:
      'Announcements from the Pakistan Youth Parliamentary Council: membership tiers, IMUN 2027, accessibility, verification and correspondence policy.',
    images: [{ url: '/images/og-default.png', width: 1200, height: 630, alt: 'PYPC newsroom' }]
  }
}

export const dynamic = 'force-dynamic'

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

export default function NewsPage({
  searchParams
}: {
  searchParams: { subscribed?: string; unsubscribed?: string }
}) {
  const items = sortedNews()
  const [lead, ...rest] = items

  return (
    <>
      <PageHero
        eyebrow="Newsroom"
        title="Announcements from the Council"
        description="Every announcement here is traceable to something we have actually published — a concept note, a policy decision, a capability that is live on this platform, or a dated statement from an officer. We do not publish unconfirmed partnership notices or invented press coverage."
        breadcrumb={[{ label: 'Newsroom' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/contact" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Media enquiries
          </Link>
          <Link href="/policies" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Published policies
          </Link>
        </div>
      </PageHero>

      <section className="container py-14">
        {displayContent(searchParams.subscribed ? (
          <p className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800" role="status">
            Subscription confirmed. Thank you, the next mailing will reach you at that address.
          </p>
        ) : null)}
        {displayContent(searchParams.unsubscribed ? (
          <p className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700" role="status">
            You have been unsubscribed. Nothing further will be sent to that address.
          </p>
        ) : null)}

        {displayContent(lead ? (
          <Card className="border-primary-100">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={CATEGORY_TONE[lead.category]}>{displayContent(lead.category)}</Badge>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <CalendarDays size={13} /> {displayContent(formatDate(lead.date))}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-primary-900 sm:text-3xl">
              <Link href={`/news/${lead.slug}`} className="underline-offset-4 hover:underline">
                {displayContent(lead.title)}
              </Link>
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{displayContent(lead.summary)}</p>
            <Link
              href={`/news/${lead.slug}`}
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline"
            >
              Read the announcement <ArrowRight size={15} />
            </Link>
          </Card>
        ) : null)}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {rest.map(item => (
            <Card key={item.slug} className="flex h-full flex-col">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={CATEGORY_TONE[item.category]}>{displayContent(item.category)}</Badge>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <CalendarDays size={13} /> {displayContent(formatDate(item.date))}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-extrabold text-primary-900">
                <Link href={`/news/${item.slug}`} className="underline-offset-4 hover:underline">
                  {displayContent(item.title)}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-sm leading-7 text-slate-600">{displayContent(item.summary)}</p>
              <Link
                href={`/news/${item.slug}`}
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline"
              >
                Read more <ArrowRight size={15} />
              </Link>
            </Card>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="text-lg font-extrabold text-primary-900">Hear about the next announcement</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              One mailing a month at most: programme openings, event dates, scholarships and policy
              briefs. Double opt in, one click unsubscribe, addresses never shared.
            </p>
            <div className="mt-5">
              <NewsletterSignup />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-lg font-extrabold text-primary-900">For journalists</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            Media enquiries, interview requests and requests for the Council&apos;s registration and
              governance documents go to the secretariat at{displayContent(' ')}
              <a href="mailto:pypcofficial@gmail.com" className="font-semibold text-primary underline-offset-4 hover:underline">
                pypcofficial@gmail.com
              </a>
              . First response within one working day, Monday Saturday, 10:00 to 18:00 PKT. Officers may be
              quoted only from statements published here or issued in writing by the secretariat.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
