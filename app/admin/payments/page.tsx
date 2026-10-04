
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { Badge, Card, StatCard } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { prisma } from '@/lib/prisma'
import { requireAdminPage } from '@/lib/auth'
import { formatCurrency, formatDateTime, humanise } from '@/lib/utils'
import { getGatewayStatuses } from '@/lib/payments'

export const metadata: Metadata = { title: 'Payments' }
export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
  await requireAdminPage()

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      plan: { select: { name: true } },
      user: { select: { email: true, firstName: true, lastName: true } }
    }
  })

  const totals = orders.reduce(
    (accumulator, order) => {
      if (order.status === 'PAID') {
        accumulator.paid += 1
        if (order.currency === 'PKR') accumulator.revenuePkr += order.amountMinor / 100
        if (order.currency === 'USD') accumulator.revenueUsd += order.amountMinor / 100
      }
      if (order.status === 'PENDING') accumulator.pending += 1
      if (order.status === 'FAILED') accumulator.failed += 1
      return accumulator
    },
    { paid: 0, pending: 0, failed: 0, revenuePkr: 0, revenueUsd: 0 }
  )

  const gateways = getGatewayStatuses()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Paid orders" value={totals.paid} icon={<Icon name="CheckCircle2" size={18} />} tone="success" />
        <StatCard label="Pending" value={totals.pending} icon={<Icon name="Clock" size={18} />} tone="gold" />
        <StatCard label="Failed" value={totals.failed} icon={<Icon name="Ban" size={18} />} tone="danger" />
        <StatCard
          label="Recorded revenue"
          value={formatCurrency(totals.revenuePkr, 'PKR')}
          hint={`Plus ${formatCurrency(totals.revenueUsd, 'USD')} in USD orders`}
          icon={<Icon name="CircleDollarSign" size={18} />}
        />
      </div>

      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Gateway configuration</h2>
        <p className="mt-1 text-sm text-slate-600">
          A gateway can only be selected by members when its credentials exist in the environment file.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {gateways.map(gateway => (
            <div key={gateway.provider} className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-slate-900">{displayContent(gateway.label)}</p>
                <Badge tone={gateway.configured ? 'success' : 'neutral'}>
                  {displayContent(gateway.simulation ? 'Simulated' : gateway.configured ? 'Configured' : 'Not configured')}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{displayContent(gateway.description)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Reference</th>
              <th className="px-5 py-4">Member</th>
              <th className="px-5 py-4">Plan</th>
              <th className="px-5 py-4">Gateway</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Dates</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="border-b border-slate-50">
                <td className="px-5 py-4 font-mono text-xs text-slate-700">{displayContent(order.reference)}</td>
                <td className="px-5 py-4">
                  <p className="text-xs font-semibold text-slate-800">{displayContent(order.user.email)}</p>
                  <p className="text-xs text-slate-500">
                    {displayContent(order.user.firstName)} {displayContent(order.user.lastName)}
                  </p>
                </td>
                <td className="px-5 py-4 text-slate-600">{displayContent(order.plan.name)}</td>
                <td className="px-5 py-4 text-slate-600">
                  {displayContent(humanise(order.provider))}
                  {displayContent(order.providerRef ? (
                    <p className="mt-1 max-w-[160px] truncate text-[11px] text-slate-500">
                      {displayContent(order.providerRef)}
                    </p>
                  ) : null)}
                </td>
                <td className="px-5 py-4 font-bold text-slate-900">
                  {displayContent(formatCurrency(order.amountMinor / 100, order.currency))}
                </td>
                <td className="px-5 py-4">
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
                </td>
                <td className="px-5 py-4 text-xs text-slate-500">
                  <p>Created {displayContent(formatDateTime(order.createdAt))}</p>
                  {displayContent(order.paidAt ? <p className="mt-1">Paid {displayContent(formatDateTime(order.paidAt))}</p> : null)}
                </td>
              </tr>
            ))}

            {displayContent(!orders.length ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                  No orders recorded yet.
                </td>
              </tr>
            ) : null)}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
