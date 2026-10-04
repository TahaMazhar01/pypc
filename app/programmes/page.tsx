
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/layout/page-hero'
import { ProgrammeCard } from '@/components/features/content-cards'
import { Reveal } from '@/components/motion/reveal'
import { EmptyState } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { featuredPillars } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Programmes',
  description:
    'PYPC programmes across youth parliament, climate action, AI and technology, human rights, entrepreneurship, fellowships and justice reform.'
}

export const dynamic = 'force-dynamic'

export default async function ProgrammesPage({
  searchParams
}: {
  searchParams: { category?: string }
}) {
  const category = searchParams.category

  const programmes = await prisma.programme.findMany({
    where: { isActive: true, ...(category ? { category } : {}) },
    orderBy: { sortOrder: 'asc' }
  })

  const categories = Array.from(
    new Set(
      (
        await prisma.programme.findMany({ where: { isActive: true }, select: { category: true } })
      ).map(item => item.category)
    )
  ).sort()

  return (
    <>
      <PageHero
        eyebrow="Programmes"
        title="Structured pathways from learning to leadership"
        description="Every PYPC programme combines knowledge, practice and mentorship — and ends with a verifiable record of your participation."
        breadcrumb={[{ label: 'Programmes' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/membership" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Join as a member
          </Link>
          <Link href="/events" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            See upcoming events
          </Link>
        </div>
      </PageHero>

      <section className="container py-12">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/programmes"
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
              !category ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600 hover:border-primary-200'
            }`}
          >
            All programmes
          </Link>
          {categories.map(item => (
            <Link
              key={item}
              href={`/programmes?category=${encodeURIComponent(item)}`}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                category === item
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-200 text-slate-600 hover:border-primary-200'
              }`}
            >
              {displayContent(item)}
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {displayContent(programmes.length ? (
            programmes.map((programme, index) => (
              <Reveal key={programme.id} delay={index * 0.04}>
                <ProgrammeCard programme={programme} />
              </Reveal>
            ))
          ) : (
            <div className="md:col-span-2 lg:col-span-3">
              <EmptyState
                title="No programmes in this category yet"
                description="New cohorts are added regularly. Browse all programmes or contact the secretariat for upcoming intakes."
                action={
                  <Link href="/programmes" className={buttonVariants({ variant: 'primary', size: 'md' })}>
                    View all programmes
                  </Link>
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="container">
          <h2 className="text-2xl font-extrabold text-primary-900">Thematic pillars</h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            Programmes are grouped around seven national priority areas. Members may participate across
            pillars as their interests develop.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredPillars.map(pillar => (
              <Link
                key={pillar.slug}
                href={`/programmes/${pillar.slug}`}
                className="focus-ring rounded-xl border border-slate-200 bg-white p-5 transition hover:border-primary-200 hover:shadow-card"
              >
                <p className="font-bold text-slate-900">{displayContent(pillar.title)}</p>
                <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">{displayContent(pillar.description)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
