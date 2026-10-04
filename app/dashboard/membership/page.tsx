
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, Card, EmptyState } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { formatCurrency, formatDate, humanise } from '@/lib/utils'
import { getGatewayStatuses } from '@/lib/payments'

export const metadata: Metadata = { title: 'Membership' }
export const dynamic = 'force-dynamic'

export default async function DashboardMembershipPage() {
  const user = await requireUser()

  const [memberships, orders, plans] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: user.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.order.findMany({
      where: { userId: user.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
      take: 8
    }),
    prisma.membershipPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
  ])

  const active = memberships.find(
    item => item.status === 'ACTIVE' && (!item.expiresAt || item.expiresAt > new Date())
  )

  const daysLeft = active?.expiresAt
    ? Math.ceil((active.expiresAt.getTime() - Date.now()) / 86_400_000)
    : null

  const gateways = getGatewayStatuses()

  return (
    <div className="space-y-6">
      <Card className={active ? 'border-emerald-200' : 'border-gold-200'}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current membership</p>

            {displayContent(active ? (
              <>
                <h2 className="mt-2 text-2xl font-extrabold text-primary-900">{displayContent(active.plan.name)}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Active until <strong>{displayContent(formatDate(active.expiresAt))}</strong>
                  {displayContent(daysLeft !== null ? ` (${daysLeft} days remaining)` : '')}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-extrabold text-primary-900">No active membership</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Choose a plan to unlock committee eligibility, fellowship applications, verified
                  experience letters and certificate issuance.
                </p>
              </>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={active ? '/membership/checkout' : '/membership'}
              className={buttonVariants({ variant: active ? 'outline' : 'gold', size: 'md' })}
            >
              {displayContent(active ? 'Renew or upgrade' : 'Choose a plan')}
            </Link>
            <Link href="/refund-policy" className={buttonVariants({ variant: 'ghost', size: 'md' })}>
              Refund policy
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="text-lg font-extrabold text-slate-900">Payment history</h2>

          <div className="mt-4 space-y-3">
            {displayContent(orders.length ? (
              orders.map(order => (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{displayContent(order.plan.name)}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{displayContent(order.reference)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {displayContent(order.provider)} · {displayContent(formatDate(order.createdAt))}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-extrabold text-slate-900">
                      {displayContent(formatCurrency(order.amountMinor / 100, order.currency))}
                    </p>
                    <Badge
                      tone={
                        order.status === 'PAID'
                          ? 'success'
                          : order.status === 'FAILED'
                            ? 'danger'
                            : order.status === 'REFUNDED'
                              ? 'info'
                              : 'warning'
                      }
                    >
                      {displayContent(humanise(order.status))}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No payments yet"
                description="Your membership and programme payments will appear here with gateway references."
              />
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-extrabold text-slate-900">Membership history</h2>
            <div className="mt-4 space-y-3">
              {displayContent(memberships.length ? (
                memberships.map(item => (
                  <div key={item.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-slate-900">{displayContent(item.plan.name)}</p>
                      <Badge tone={item.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {displayContent(humanise(item.status))}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {displayContent(formatDate(item.startsAt))} Not available {displayContent(formatDate(item.expiresAt))}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">No memberships recorded.</p>
              ))}
            </div>
          </Card>

          <Card className="bg-slate-50">
            <h2 className="font-extrabold text-slate-900">Checkout availability</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {gateways.map(gateway => (
                <li key={gateway.provider} className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">{displayContent(gateway.label)}</span>
                  <Badge tone={gateway.configured ? 'success' : 'neutral'}>
                    {displayContent(gateway.configured ? 'Available' : 'Not configured')}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Gateways are enabled by the organisation once merchant accounts are approved. Plans:{displayContent(' ')}
              {displayContent(plans.map(plan => plan.name).join(' · '))}.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
