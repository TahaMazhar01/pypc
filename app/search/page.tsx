
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Search as SearchIcon } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { searchSite, type SearchResult } from '@/lib/search'

export const metadata: Metadata = {
  title: 'Search',
  description:
    'Search every page of the PYPC platform: programmes, courses, events, opportunities, membership tiers, policies, newsroom and FAQ.',
  alternates: { canonical: '/search' },
  robots: { index: false }
}

export const dynamic = 'force-dynamic'

const SUGGESTIONS = ['membership', 'visa letter', 'certificate', 'refund', 'IMUN', 'scholarship', 'privacy']

const KIND_TONE: Record<SearchResult['kind'], string> = {
  Programme: 'bg-primary-50 text-primary',
  Event: 'bg-amber-50 text-amber-800',
  Opportunity: 'bg-emerald-50 text-emerald-800',
  Course: 'bg-sky-50 text-sky-800',
  News: 'bg-slate-100 text-slate-700',
  Page: 'bg-slate-100 text-slate-700',
  FAQ: 'bg-violet-50 text-violet-800',
  Policy: 'bg-rose-50 text-rose-800',
  Membership: 'bg-gold-50 text-gold-800'
}

export default async function SearchPage({
  searchParams
}: {
  searchParams: { q?: string }
}) {
  const query = (searchParams.q ?? '').trim()
  const results = query.length >= 2 ? await searchSite(query) : []
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    acc[result.kind] = [...(acc[result.kind] ?? []), result]
    return acc
  }, {})

  return (
    <>
      <PageHero
        eyebrow="Search"
        title={displayContent(query ? `Results for “${query}”` : 'Search the whole platform')}
        description="Programmes, courses, events, opportunities, membership tiers, policies, the newsroom and every FAQ answer — searched in one place, with no tracking of what you look for."
        breadcrumb={[{ label: 'Search' }]}
      >
        <form action="/search" method="get" role="search" className="flex w-full max-w-xl gap-3">
          <label htmlFor="site-search" className="sr-only">
            Search terms
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            defaultValue={query}
            autoFocus={!query}
            placeholder="Try “refund”, “visa letter”, “IMUN”…"
            className="focus-ring h-12 flex-1 rounded-lg border border-slate-300 bg-white/95 px-4 text-sm"
          />
          <button type="submit" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            <SearchIcon size={16} /> Search
          </button>
        </form>
      </PageHero>

      <section className="container py-14">
        {displayContent(!query ? (
          <div className="max-w-3xl">
            <h2 className="text-lg font-extrabold text-primary-900">Popular searches</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map(term => (
                <Link
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="focus-ring rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:text-primary"
                >
                  {displayContent(term)}
                </Link>
              ))}
            </div>
            <p className="mt-8 text-sm leading-7 text-slate-600">
              Search covers everything the Council publishes. If something is missing, it is a defect, tell the secretariat through the contact page and it will be indexed.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="text-lg font-extrabold text-primary-900">
              Nothing matched “{displayContent(query)}”
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Try a shorter phrase, or start from one of these, they cover the questions most visitors
              arrive with:
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map(term => (
                <Link
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="focus-ring rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-primary-300 hover:text-primary"
                >
                  {displayContent(term)}
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/faq" className={buttonVariants({ variant: 'outline', size: 'md' })}>
                Read the FAQ
              </Link>
              <Link href="/contact" className={buttonVariants({ variant: 'outline', size: 'md' })}>
                Ask the secretariat
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-600" role="status">
              {displayContent(results.length)} result{displayContent(results.length === 1 ? '' : 's')} across{displayContent(' ')}
              {displayContent(Object.keys(grouped).length)} section{displayContent(Object.keys(grouped).length === 1 ? '' : 's')}
            </p>

            <div className="mt-8 space-y-10">
              {Object.entries(grouped).map(([kind, items]) => (
                <div key={kind}>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${KIND_TONE[kind as SearchResult['kind']]}`}>
                      {displayContent(kind)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{displayContent(items.length)} result(s)</span>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {items.map(item => (
                      <Card key={`${item.href}-${item.title}`} className="flex h-full flex-col">
                        <h3 className="font-bold text-slate-900">
                          <Link href={item.href} className="underline-offset-4 hover:underline">
                            {displayContent(item.title)}
                          </Link>
                        </h3>
                        <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{displayContent(item.summary)}</p>
                        <Link
                          href={item.href}
                          className="mt-4 text-xs font-bold text-primary underline-offset-4 hover:underline"
                        >
                          Open →
                        </Link>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ))}
      </section>
    </>
  )
}
