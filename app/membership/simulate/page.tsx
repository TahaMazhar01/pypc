import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHero } from '@/components/layout/page-hero'
import { SimulatePaymentPanel } from '@/components/features/simulate-payment-panel'
import { paymentsSimulationEnabled } from '@/lib/payments'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Simulated payment',
  robots: { index: false, follow: false }
}

export const dynamic = 'force-dynamic'

export default async function SimulatePaymentPage({
  searchParams
}: {
  searchParams: { reference?: string }
}) {
  if (!paymentsSimulationEnabled()) notFound()

  const user = await getCurrentUser()
  if (!user) notFound()

  const order = searchParams.reference
    ? await prisma.order.findUnique({ where: { reference: searchParams.reference } })
    : null

  if (!order || order.userId !== user.id) notFound()

  return (
    <>
      <PageHero
        eyebrow="Development mode"
        title="Simulated gateway page"
        description="Used only while real merchant credentials are pending."
        breadcrumb={[{ label: 'Membership', href: '/membership' }, { label: 'Simulated payment' }]}
      />

      <section className="container py-14">
        <SimulatePaymentPanel reference={order.reference} />
      </section>
    </>
  )
}
