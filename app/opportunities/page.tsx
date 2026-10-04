
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/layout/page-hero'
import { OpportunityCard } from '@/components/features/content-cards'
import { Reveal } from '@/components/motion/reveal'
import { EmptyState } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Opportunities',
  description:
    'Fellowships, scholarships, research roles, delegations and volunteer openings for young Pakistanis.'
}

export const dynamic = 'force-dynamic'

export default async function OpportunitiesPage({
  searchParams
}: {
  searchParams: { type?: string }
}) {
  const type = searchParams.type

  const [opportunities, types] = await Promise.all([
    prisma.opportunity.findMany({
      where: { isActive: true, ...(type ? { type } : {}) },
      orderBy: [{ isFeatured: 'desc' }, { deadline: 'asc' }]
    }),
    prisma.opportunity.findMany({ where: { isActive: true }, select: { type: true } })
  ])

  const uniqueTypes = Array.from(new Set(types.map(item => item.type))).sort()

  return (
    <>
      <PageHero
        eyebrow="Opportunities"
        title="Openings worth applying for"
        description="Curated fellowships, scholarships, research positions, delegations and volunteer roles — with deadlines and requirements stated up front."
        breadcrumb={[{ label: 'Opportunities' }]}
      />

      <section className="container py-14">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/opportunities"
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
              !type ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600 hover:border-primary-200'
            }`}
          >
            All
          </Link>
          {uniqueTypes.map(item => (
            <Link
              key={item}
              href={`/opportunities?type=${encodeURIComponent(item)}`}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                type === item
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-200 text-slate-600 hover:border-primary-200'
              }`}
            >
              {displayContent(item)}
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {displayContent(opportunities.length ? (
            opportunities.map((opportunity, index) => (
              <Reveal key={opportunity.id} delay={index * 0.04}>
                <OpportunityCard opportunity={opportunity} />
              </Reveal>
            ))
          ) : (
            <div className="md:col-span-2 lg:col-span-3">
              <EmptyState
                title="No open opportunities in this category"
                description="New openings are published as partners confirm them. Members receive a notification for each new listing."
              />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
