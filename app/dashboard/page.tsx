
import { displayContent } from '@/lib/display-content'
import Link from 'next/link'
import { ArrowRight, Bell, IdCard } from 'lucide-react'
import { Badge, Card, EmptyState, StatCard } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { formatDate, formatDateTime, humanise } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardOverviewPage() {
  const user = await requireUser()

  const [membership, applications, certificates, registrations, notifications, openApplications] =
    await Promise.all([
      prisma.membership.findFirst({
        where: { userId: user.id },
        include: { plan: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.application.findMany({
        where: { userId: user.id },
        orderBy: { submittedAt: 'desc' },
        take: 5,
        include: {
          programme: { select: { title: true } },
          opportunity: { select: { title: true } }
        }
      }),
      prisma.certificate.findMany({ where: { userId: user.id }, orderBy: { issueDate: 'desc' } }),
      prisma.eventRegistration.count({ where: { userId: user.id } }),
      prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 6 }),
      prisma.application.count({
        where: { userId: user.id, status: { in: ['PENDING', 'UNDER_REVIEW', 'SHORTLISTED'] } }
      })
    ])

  const membershipActive =
    membership?.status === 'ACTIVE' && (!membership.expiresAt || membership.expiresAt > new Date())

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Membership"
          value={membershipActive ? 'Active' : membership ? humanise(membership.status) : 'None'}
          hint={membership ? membership.plan.name : 'Choose a plan to unlock everything'}
          icon={<Icon name="BadgeCheck" size={18} />}
        />
        <StatCard
          label="Open applications"
          value={openApplications}
          hint="Pending review or shortlisted"
          icon={<Icon name="FileText" size={18} />}
          tone="gold"
        />
        <StatCard
          label="Certificates"
          value={certificates.length}
          hint={`${certificates.filter(item => item.status === 'VALID').length} currently valid`}
          icon={<Icon name="Award" size={18} />}
          tone="success"
        />
        <StatCard
          label="Event registrations"
          value={registrations}
          hint="Across all PYPC convenings"
          icon={<Icon name="CalendarDays" size={18} />}
        />
      </div>

      {displayContent(!membershipActive ? (
        <Card className="border-gold-200 bg-gold-50/70">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-extrabold text-primary-900">
                <IdCard size={18} className="text-gold-600" /> Complete your membership
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Your account is active, but a membership plan unlocks committee and fellowship
                eligibility, verified experience letters and certificate issuance.
              </p>
            </div>
            <Link href="/membership" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
              View plans <ArrowRight size={17} />
            </Link>
          </div>
        </Card>
      ) : null)}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-slate-900">Recent applications</h2>
            <Link href="/dashboard/applications" className="text-sm font-bold text-primary hover:underline">
              View all
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {displayContent(applications.length ? (
              applications.map(application => (
                <div
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                      {displayContent(application.programme?.title ?? application.opportunity?.title ?? humanise(application.type))}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{displayContent(application.reference)}</p>
                  </div>
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
                </div>
              ))
            ) : (
              <EmptyState
                title="No applications yet"
                description="Browse programmes, events and opportunities to submit your first application."
                action={
                  <Link href="/programmes" className={buttonVariants({ variant: 'primary', size: 'md' })}>
                    Browse programmes
                  </Link>
                }
              />
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-extrabold text-slate-900">Membership status</h2>
            {displayContent(membership ? (
              <dl className="mt-4 space-y-3 text-sm">
                <Row label="Plan" value={membership.plan.name} />
                <Row label="Status" value={humanise(membership.status)} />
                <Row label="Started" value={formatDate(membership.startsAt)} />
                <Row label="Expires" value={formatDate(membership.expiresAt)} />
                <Row label="Duration" value={`${membership.plan.durationMonths} months`} />
              </dl>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                No membership on record yet. Membership is optional but required for certificate issuance
                and committee eligibility.
              </p>
            ))}

            <Link
              href="/dashboard/membership"
              className={buttonVariants({ variant: 'outline', size: 'md', className: 'mt-5 w-full' })}
            >
              Manage membership
            </Link>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
              <Bell size={18} className="text-primary" /> Notifications
            </h2>

            <div className="mt-4 space-y-3">
              {displayContent(notifications.length ? (
                notifications.map(notification => (
                  <div key={notification.id} className="rounded-xl border border-slate-100 p-3.5">
                    <p className="text-sm font-bold text-slate-900">{displayContent(notification.title)}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{displayContent(notification.body)}</p>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {displayContent(formatDateTime(notification.createdAt))}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">No notifications yet.</p>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{displayContent(label)}</dt>
      <dd className="font-bold text-slate-900">{displayContent(value)}</dd>
    </div>
  )
}
