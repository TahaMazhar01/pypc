
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, ExternalLink, MapPin } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { ApplicationForm } from '@/components/features/application-form'
import { Badge, Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { formatDate, parseJsonArray, relativeDeadline } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const opportunity = await prisma.opportunity.findUnique({ where: { slug: params.slug } }).catch(() => null)
  if (!opportunity) return { title: 'Opportunity not found' }
  return { title: opportunity.title, description: opportunity.summary }
}

export default async function OpportunityDetailPage({ params }: { params: { slug: string } }) {
  const [opportunity, user] = await Promise.all([
    prisma.opportunity.findUnique({ where: { slug: params.slug } }),
    getCurrentUser()
  ])

  if (!opportunity || !opportunity.isActive) notFound()

  const requirements = parseJsonArray(opportunity.requirements)

  return (
    <>
      <PageHero
        eyebrow={`${opportunity.type} · ${opportunity.location}`}
        title={displayContent(opportunity.title)}
        description={opportunity.summary}
        breadcrumb={[
          { label: 'Opportunities', href: '/opportunities' },
          { label: opportunity.title }
        ]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="info">{displayContent(opportunity.organisation)}</Badge>
          <Badge tone="primary">{displayContent(opportunity.mode)}</Badge>
          <Badge tone={opportunity.deadline && new Date(opportunity.deadline) < new Date() ? 'danger' : 'warning'}>
            {displayContent(relativeDeadline(opportunity.deadline))}
          </Badge>
          {displayContent(opportunity.stipend ? <Badge tone="gold">{displayContent(opportunity.stipend)}</Badge> : null)}
        </div>
      </PageHero>

      <section className="container grid gap-10 py-14 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <Card>
            <h2 className="text-xl font-extrabold text-primary-900">Overview</h2>
            <p className="mt-4 leading-8 text-slate-600">{displayContent(opportunity.description)}</p>
          </Card>

          {displayContent(requirements.length ? (
            <Card>
              <h2 className="text-xl font-extrabold text-primary-900">Requirements</h2>
              <ul className="mt-4 space-y-3">
                {requirements.map(requirement => (
                  <li key={requirement} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                    <span className="leading-7 text-slate-600">{displayContent(requirement)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null)}

          <Card>
            <h2 className="text-xl font-extrabold text-primary-900">Apply through PYPC</h2>
            <p className="mt-2 text-sm text-slate-600">
              Submitting through PYPC creates a tracked application in your dashboard. You will be
              notified when the secretariat reviews it.
            </p>

            <div className="mt-6">
              <ApplicationForm
                type="OPPORTUNITY"
                opportunityId={opportunity.id}
                defaultName={user ? `${user.firstName} ${user.lastName}` : ''}
                defaultEmail={user?.email ?? ''}
                defaultPhone={user?.phone ?? ''}
                defaultCity={user?.city ?? ''}
                signedIn={Boolean(user)}
              />
            </div>

            {displayContent(opportunity.applyUrl ? (
              <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                This opportunity is also listed by the partner organisation.{displayContent(' ')}
                <a
                  href={opportunity.applyUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                >
                  Open partner page <ExternalLink size={14} />
                </a>
              </p>
            ) : null)}
          </Card>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-primary-100 bg-white p-6 shadow-card">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">At a glance</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <CalendarDays size={14} /> Deadline
                </dt>
                <dd className="font-bold text-slate-900">{displayContent(formatDate(opportunity.deadline))}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <MapPin size={14} /> Location
                </dt>
                <dd className="font-bold text-slate-900">{displayContent(opportunity.location)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Type</dt>
                <dd className="font-bold text-slate-900">{displayContent(opportunity.type)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Support</dt>
                <dd className="font-bold text-slate-900">{displayContent(opportunity.stipend ?? 'Not specified')}</dd>
              </div>
            </dl>

            <Link
              href="/membership"
              className={buttonVariants({ variant: 'primary', size: 'md', className: 'mt-5 w-full' })}
            >
              Become a member first
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
            <h3 className="font-bold text-slate-900">Application tips</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <li>• Write specifically, generic statements are the most common reason for rejection.</li>
              <li>• Link your motivation to the requirements listed above.</li>
              <li>• Keep your profile and contact details current so we can reach you.</li>
            </ul>
          </div>
        </aside>
      </section>
    </>
  )
}
