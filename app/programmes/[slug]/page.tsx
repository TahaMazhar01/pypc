
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock, MapPin, Users } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { ApplicationForm } from '@/components/features/application-form'
import { Badge } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { featuredPillars } from '@/lib/constants'
import { parseJsonArray } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const programme = await prisma.programme.findUnique({ where: { slug: params.slug } }).catch(() => null)
  const pillar = featuredPillars.find(item => item.slug === params.slug)

  if (!programme && !pillar) return { title: 'Programme not found' }

  return {
    title: programme?.title ?? pillar?.title ?? 'Programme',
    description: programme?.summary ?? pillar?.description
  }
}

export default async function ProgrammeDetailPage({ params }: { params: { slug: string } }) {
  const [programme, user] = await Promise.all([
    prisma.programme.findUnique({ where: { slug: params.slug } }).catch(() => null),
    getCurrentUser()
  ])

  // A thematic pillar may exist before its programme record is published.
  const pillar = featuredPillars.find(item => item.slug === params.slug)

  if (!programme && !pillar) notFound()

  const objectives = parseJsonArray(programme?.objectives)
  const outcomes = parseJsonArray(programme?.outcomes)
  const structure = parseJsonArray(programme?.structure)

  return (
    <>
      <PageHero
        eyebrow={programme?.category ?? 'Thematic pillar'}
        title={displayContent(programme?.title ?? pillar!.title)}
        description={programme?.summary ?? pillar!.description}
        breadcrumb={[{ label: 'Programmes', href: '/programmes' }, { label: programme?.title ?? pillar!.title }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="#apply" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Apply to this programme
          </Link>
          <Link href="/membership" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Membership plans
          </Link>
        </div>
      </PageHero>

      <section className="container grid gap-10 py-14 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-10">
          {displayContent(programme ? (
            <>
              <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-card">
                <h2 className="text-xl font-extrabold text-primary-900">About this programme</h2>
                <p className="mt-4 leading-8 text-slate-600">{displayContent(programme.description)}</p>
              </div>

              {displayContent(objectives.length ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-card">
                  <h2 className="text-xl font-extrabold text-primary-900">Learning objectives</h2>
                  <ul className="mt-4 space-y-3">
                    {objectives.map(item => (
                      <li key={item} className="flex gap-3">
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                        <span className="leading-7 text-slate-600">{displayContent(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null)}

              {displayContent(structure.length ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-card">
                  <h2 className="text-xl font-extrabold text-primary-900">Programme structure</h2>
                  <ol className="mt-4 space-y-4">
                    {structure.map((step, index) => (
                      <li key={step} className="flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary">
                          {displayContent(index + 1)}
                        </span>
                        <span className="leading-7 text-slate-600">{displayContent(step)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null)}

              {displayContent(outcomes.length ? (
                <div className="rounded-2xl border border-gold-200 bg-gold-50/60 p-7">
                  <h2 className="text-xl font-extrabold text-primary-900">What you take away</h2>
                  <ul className="mt-4 space-y-3">
                    {outcomes.map(item => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                        <span className="leading-7 text-slate-700">{displayContent(item)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 text-sm text-slate-600">
                    Certificates issued for this programme carry a QR code and a unique code that anyone
                    can check on the{displayContent(' ')}
                    <Link href="/verify" className="font-bold text-primary hover:underline">
                      verification page
                    </Link>
                    .
                  </p>
                </div>
              ) : null)}
            </>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-7 shadow-card">
              <h2 className="text-xl font-extrabold text-primary-900">Pillar overview</h2>
              <p className="mt-4 leading-8 text-slate-600">{displayContent(pillar!.description)}</p>
              <p className="mt-4 leading-8 text-slate-600">
                A dedicated programme page for this pillar is being prepared. Register your interest and
                the secretariat will notify you when the next cohort opens.
              </p>
            </div>
          ))}

          <div id="apply" className="scroll-mt-28 rounded-2xl border border-slate-100 bg-white p-7 shadow-card">
            <h2 className="text-xl font-extrabold text-primary-900">Apply to this programme</h2>
            <p className="mt-2 text-sm text-slate-600">
              Applications are reviewed by the PYPC secretariat. You will receive a notification as soon
              as the status changes.
            </p>

            <div className="mt-6">
              <ApplicationForm
                type="PROGRAMME"
                programmeId={programme?.id}
                defaultName={user ? `${user.firstName} ${user.lastName}` : ''}
                defaultEmail={user?.email ?? ''}
                defaultPhone={user?.phone ?? ''}
                defaultCity={user?.city ?? ''}
                signedIn={Boolean(user)}
              />
            </div>
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-primary-100 bg-white p-6 shadow-card">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Programme facts</h3>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Category</dt>
                <dd className="font-bold text-slate-900">{displayContent(programme?.category ?? pillar!.title)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <Clock size={14} /> Duration
                </dt>
                <dd className="font-bold text-slate-900">
                  {displayContent(programme?.durationWeeks ? `${programme.durationWeeks} weeks` : 'Cohort based')}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <Users size={14} /> Seats
                </dt>
                <dd className="font-bold text-slate-900">{displayContent(programme?.seats ?? 'Open')}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <MapPin size={14} /> Mode
                </dt>
                <dd className="font-bold text-slate-900">{displayContent(programme?.mode ?? 'Hybrid')}</dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-slate-100 pt-5">
              {displayContent(programme?.isFeatured ? <Badge tone="gold">Flagship programme</Badge> : null)}
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Participation in programmes is included for active PYPC members. Non members may apply
                and join upon acceptance.
              </p>
              <Link
                href="/membership"
                className={buttonVariants({ variant: 'primary', size: 'md', className: 'mt-4 w-full' })}
              >
                View membership plans
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <h3 className="font-bold text-slate-900">Not sure this is right for you?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use the AI Assistant button at the bottom right to ask about programme fit, eligibility,
              timings and membership, answers come from official PYPC information.
            </p>
          </div>
        </aside>
      </section>
    </>
  )
}
