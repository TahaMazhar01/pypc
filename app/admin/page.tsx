
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, Card, StatCard } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { prisma } from '@/lib/prisma'
import { requireStaffPage } from '@/lib/auth'
import { formatCurrency, formatDateTime, humanise } from '@/lib/utils'

export const metadata: Metadata = { title: 'Admin Overview' }
export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  await requireStaffPage()

  const [
    members,
    activeMemberships,
    pendingApplications,
    certificatesValid,
    certificatesRevoked,
    paidOrders,
    revenue,
    newMessages,
    openPartnerships,
    recentAudit
  ] = await Promise.all([
    prisma.user.count(),
    prisma.membership.count({ where: { status: 'ACTIVE' } }),
    prisma.application.count({ where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
    prisma.certificate.count({ where: { status: 'VALID' } }),
    prisma.certificate.count({ where: { status: 'REVOKED' } }),
    prisma.order.findMany({ where: { status: 'PAID' }, select: { amountMinor: true, currency: true } }),
    prisma.order.count({ where: { status: 'PAID' } }),
    prisma.contactMessage.count({ where: { status: 'NEW' } }),
    prisma.partnershipRequest.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12 })
  ])

  const revenuePkr = paidOrders
    .filter(order => order.currency === 'PKR')
    .reduce((total, order) => total + order.amountMinor / 100, 0)

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Members"
          value={members}
          hint={`${activeMemberships} active membership(s)`}
          icon={<Icon name="Users" size={18} />}
        />
        <StatCard
          label="Applications in queue"
          value={pendingApplications}
          hint="Pending or under review"
          icon={<Icon name="FileText" size={18} />}
          tone="gold"
        />
        <StatCard
          label="Paid orders"
          value={revenue}
          hint={`PKR revenue recorded: ${formatCurrency(revenuePkr, 'PKR')}`}
          icon={<Icon name="CreditCard" size={18} />}
          tone="success"
        />
        <StatCard
          label="Certificates"
          value={certificatesValid}
          hint={`${certificatesRevoked} revoked`}
          icon={<Icon name="Award" size={18} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-slate-900">Operational queues</h2>
            <span className="text-xs font-semibold text-slate-500">{displayContent(newMessages)} new message(s)</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <QueueCard
              title="Review applications"
              detail={`${pendingApplications} awaiting a decision`}
              href="/admin/applications"
              cta="Open queue"
            />
            <QueueCard
              title="Members & roles"
              detail="Update roles, suspend or reinstate accounts"
              href="/admin/users"
              cta="Manage members"
            />
            <QueueCard
              title="Certificates"
              detail="Issue new certificates, revoke or reinstate"
              href="/admin/certificates"
              cta="Open certificates"
            />
            <QueueCard
              title="Payments"
              detail="Reconcile orders and gateway references"
              href="/admin/payments"
              cta="View payments"
            />
            <QueueCard
              title="Contact messages"
              detail="Member and public enquiries"
              href="/admin/messages"
              cta="Read messages"
            />
            <QueueCard
              title="Partnerships & MoUs"
              detail={
                openPartnerships === 0
                  ? 'No open requests — the public form is live at /partnerships'
                  : `${openPartnerships} request(s) awaiting a decision`
              }
              href="/admin/partnerships"
              cta="Review requests"
            />
            <QueueCard
              title="Content control"
              detail="Publish programmes, events and opportunities"
              href="/admin/programmes"
              cta="Manage content"
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-extrabold text-slate-900">Recent audit activity</h2>
          <p className="mt-1 text-xs text-slate-500">
            Immutable record of administrative and member actions.
          </p>

          <div className="mt-4 space-y-3">
            {recentAudit.map(entry => (
              <div key={entry.id} className="rounded-xl border border-slate-100 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone="primary">{displayContent(humanise(entry.action))}</Badge>
                  <span className="text-[11px] text-slate-500">{displayContent(formatDateTime(entry.createdAt))}</span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {displayContent(entry.actorEmail ?? 'system')} · {displayContent(entry.entityType)}
                  {displayContent(entry.entityId ? ` · ${entry.entityId.slice(0, 10)}…` : '')}
                  {displayContent(entry.ip ? ` · ${entry.ip}` : '')}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function QueueCard({
  title,
  detail,
  href,
  cta
}: {
  title: string
  detail: string
  href: string
  cta: string
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div>
        <p className="font-bold text-slate-900">{displayContent(title)}</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">{displayContent(detail)}</p>
      </div>
      <Link
        href={href}
        className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4 w-fit' })}
      >
        {displayContent(cta)}
      </Link>
    </div>
  )
}
