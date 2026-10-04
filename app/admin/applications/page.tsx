
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { ApplicationControls } from '@/components/admin/admin-controls'
import { prisma } from '@/lib/prisma'
import { requireUser, isStaff } from '@/lib/auth'
import { APPLICATION_STATUSES } from '@/lib/constants'
import { formatDateTime, humanise } from '@/lib/utils'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Applications' }
export const dynamic = 'force-dynamic'

export default async function AdminApplicationsPage({
  searchParams
}: {
  searchParams: { status?: string; type?: string }
}) {
  const staff = await requireUser()
  if (!isStaff(staff.role) && !['ADMIN', 'SUPER_ADMIN'].includes(staff.role)) redirect('/dashboard')

  const status = searchParams.status
  const type = searchParams.type

  const applications = await prisma.application.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(type ? { type } : {})
    },
    orderBy: { submittedAt: 'desc' },
    take: 100,
    include: {
      user: { select: { id: true, email: true, phone: true, city: true, role: true } },
      programme: { select: { title: true } },
      opportunity: { select: { title: true } }
    }
  })

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Application review</h2>
        <p className="mt-1 text-sm text-slate-600">
          Decisions notify the applicant immediately and are recorded in the audit log. Notes saved here
          are visible to the member.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <FilterChip label="All statuses" href="/admin/applications" active={!status} />
          {APPLICATION_STATUSES.map(item => (
            <FilterChip
              key={item}
              label={humanise(item)}
              href={`/admin/applications?status=${item}`}
              active={status === item}
            />
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        {applications.map(application => (
          <Card key={application.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{displayContent(humanise(application.type))}</Badge>
                  <Badge
                    tone={
                      application.status === 'APPROVED'
                        ? 'success'
                        : application.status === 'REJECTED'
                          ? 'danger'
                          : application.status === 'SHORTLISTED'
                            ? 'gold'
                            : 'info'
                    }
                  >
                    {displayContent(humanise(application.status))}
                  </Badge>
                  <span className="font-mono text-xs text-slate-500">{displayContent(application.reference)}</span>
                </div>

                <h3 className="mt-3 font-extrabold text-slate-900">
                  {displayContent(application.programme?.title ??
                    application.opportunity?.title ??
                    `${humanise(application.type)} application`)}
                </h3>

                <p className="mt-1 text-xs text-slate-600">
                  {displayContent(application.user.email)} · {displayContent(application.phone)}
                  {displayContent(application.city ? ` · ${application.city}` : '')} ·{displayContent(' ')}
                  {displayContent(formatDateTime(application.submittedAt))}
                </p>
              </div>

              <Link
                href="/admin/users"
                className="text-xs font-bold text-primary hover:underline"
              >
                Open member record →
              </Link>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Motivation</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{displayContent(application.motivation)}</p>

                {displayContent(application.experience ? (
                  <>
                    <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Experience
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{displayContent(application.experience)}</p>
                  </>
                ) : null)}

                {displayContent(application.resumeUrl ? (
                  <a
                    href={application.resumeUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-xs font-bold text-primary hover:border-gold-300 hover:bg-white"
                  >
                    <FileText size={13} /> Open attached CV / resume
                  </a>
                ) : (
                  <p className="mt-4 text-xs font-semibold text-slate-500">No CV attached.</p>
                ))}
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Decision</p>
                <div className="mt-3">
                  <ApplicationControls
                    applicationId={application.id}
                    status={application.status}
                    notes={application.adminNotes}
                  />
                </div>

                {displayContent(application.reviewedAt ? (
                  <p className="mt-3 text-[11px] text-slate-500">
                    Last reviewed {displayContent(formatDateTime(application.reviewedAt))}
                  </p>
                ) : null)}
              </div>
            </div>
          </Card>
        ))}

        {displayContent(!applications.length ? (
          <Card className="text-center text-sm text-slate-500">
            No applications match these filters.
          </Card>
        ) : null)}
      </div>
    </div>
  )
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
        active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 text-slate-600 hover:border-slate-400'
      }`}
    >
      {displayContent(label)}
    </Link>
  )
}
