
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Badge, Card, EmptyState } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { formatDateTime, humanise } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Applications' }
export const dynamic = 'force-dynamic'

export default async function ApplicationsPage() {
  const user = await requireUser()

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { submittedAt: 'desc' },
    include: {
      programme: { select: { title: true, slug: true } },
      opportunity: { select: { title: true, slug: true } }
    }
  })

  const statusTone = (status: string) =>
    status === 'APPROVED'
      ? 'success'
      : status === 'REJECTED'
        ? 'danger'
        : status === 'SHORTLISTED'
          ? 'gold'
          : status === 'UNDER_REVIEW'
            ? 'info'
            : 'neutral'

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">All applications</h2>
            <p className="mt-1 text-sm text-slate-600">
              {displayContent(applications.length)} application(s) on record. Statuses update automatically when the
              secretariat reviews them.
            </p>
          </div>
          <Link href="/programmes" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            Apply to a programme
          </Link>
        </div>
      </Card>

      {displayContent(applications.length ? (
        <div className="space-y-4">
          {applications.map(application => (
            <Card key={application.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{displayContent(humanise(application.type))}</Badge>
                    <Badge tone={statusTone(application.status) as 'success' | 'danger' | 'gold' | 'info' | 'neutral'}>
                      {displayContent(humanise(application.status))}
                    </Badge>
                  </div>

                  <h3 className="mt-3 text-lg font-extrabold text-slate-900">
                    {displayContent(application.programme?.title ??
                      application.opportunity?.title ??
                      `${humanise(application.type)} application`)}
                  </h3>

                  <p className="mt-1 font-mono text-xs text-slate-500">{displayContent(application.reference)}</p>
                </div>

                <div className="text-right text-xs text-slate-500">
                  <p>Submitted</p>
                  <p className="font-semibold text-slate-700">{displayContent(formatDateTime(application.submittedAt))}</p>
                  {displayContent(application.reviewedAt ? (
                    <>
                      <p className="mt-2">Reviewed</p>
                      <p className="font-semibold text-slate-700">{displayContent(formatDateTime(application.reviewedAt))}</p>
                    </>
                  ) : null)}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Your motivation</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{displayContent(application.motivation)}</p>

                  {displayContent(application.resumeUrl ? (
                    <a
                      href={application.resumeUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-gold-700"
                    >
                      <FileText size={13} /> Your attached CV
                    </a>
                  ) : null)}
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Review notes</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {displayContent(application.adminNotes ?? 'No notes from the secretariat yet.')}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    Contact: {displayContent(application.email)} · {displayContent(application.phone)}
                    {displayContent(application.city ? ` · ${application.city}` : '')}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No applications yet"
          description="When you apply to a programme, event or opportunity it appears here with a reference number and live status."
          action={
            <Link href="/opportunities" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              Browse opportunities
            </Link>
          }
        />
      ))}
    </div>
  )
}
