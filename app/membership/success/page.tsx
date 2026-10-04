
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, Clock } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CONTACT_EMAIL } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Payment received',
  description: 'Your PYPC membership payment has been received.'
}

export const dynamic = 'force-dynamic'

export default async function MembershipSuccessPage({
  searchParams
}: {
  searchParams: { reference?: string }
}) {
  const reference = searchParams.reference
  const user = await getCurrentUser()

  const order = reference
    ? await prisma.order.findUnique({
        where: { reference },
        include: { plan: true }
      })
    : null

  const membership = user
    ? await prisma.membership.findFirst({
        where: { userId: user.id, status: 'ACTIVE' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' }
      })
    : null

  const paid = order?.status === 'PAID'

  return (
    <>
      <PageHero
        eyebrow="Checkout"
        title={displayContent(paid ? 'Payment received — membership active' : 'Confirming your payment')}
        description={
          paid
            ? 'Your membership has been activated and is visible in your dashboard.'
            : 'Your bank or wallet provider has returned you to PYPC. Confirmation usually completes within a few seconds.'
        }
        breadcrumb={[{ label: 'Membership', href: '/membership' }, { label: 'Confirmation' }]}
      />

      <section className="container max-w-3xl py-14">
        <Card className={paid ? 'border-emerald-200' : 'border-amber-200'}>
          <p className={`flex items-center gap-2 text-lg font-extrabold ${paid ? 'text-emerald-700' : 'text-amber-700'}`}>
            {displayContent(paid ? <CheckCircle2 size={20} /> : <Clock size={20} />)}
            {displayContent(paid ? 'Payment confirmed' : 'Awaiting gateway confirmation')}
          </p>

          {displayContent(order ? (
            <dl className="mt-6 space-y-3 text-sm">
              <Row label="Order reference" value={order.reference} mono />
              <Row label="Plan" value={order.plan.name} />
              <Row label="Amount" value={formatCurrency(order.amountMinor / 100, order.currency)} />
              <Row label="Gateway" value={order.provider} />
              <Row label="Status" value={order.status} />
              <Row label="Paid at" value={order.paidAt ? formatDate(order.paidAt) : 'Pending'} />
            </dl>
          ) : (
            <p className="mt-5 text-sm leading-7 text-slate-600">
              We could not find that order reference. If you were charged, send the reference from your
              payment confirmation to {displayContent(CONTACT_EMAIL)} and it will be traced with the gateway.
            </p>
          ))}

          {displayContent(membership ? (
            <div className="mt-6 rounded-xl bg-primary-50 p-4">
              <p className="text-sm font-bold text-primary">
                Active membership: {displayContent(membership.plan.name)}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Valid until {displayContent(formatDate(membership.expiresAt))}. Renew any time from the dashboard.
              </p>
            </div>
          ) : null)}

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/dashboard" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              Go to dashboard
            </Link>
            <Link href="/programmes" className={buttonVariants({ variant: 'outline', size: 'md' })}>
              Browse programmes
            </Link>
            <Link href="/contact" className={buttonVariants({ variant: 'ghost', size: 'md' })}>
              Need help?
            </Link>
          </div>
        </Card>

        <p className="mt-6 text-xs leading-6 text-slate-500">
          Keep your order reference for your records. Membership fees fund programme delivery, mentorship
          and certification. Refunds are governed by the{displayContent(' ')}
          <Link href="/refund-policy" className="font-bold text-primary hover:underline">
            Refund Policy
          </Link>
          .
        </p>
      </section>
    </>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{displayContent(label)}</dt>
      <dd className={`font-bold text-slate-900 ${mono ? 'font-mono' : ''}`}>{displayContent(value)}</dd>
    </div>
  )
}
