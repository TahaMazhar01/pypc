
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { CheckoutPanel } from '@/components/features/checkout-panel'
import { buttonVariants } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { getGatewayStatuses } from '@/lib/payments'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Membership Checkout',
  description: 'Complete your PYPC membership payment securely.'
}

export const dynamic = 'force-dynamic'

const ERROR_MESSAGES: Record<string, string> = {
  payment_failed: 'The payment was not completed. You have not been charged. You can try again below.',
  invalid_signature: 'The gateway response could not be verified, so the payment was not accepted.',
  unknown_order: 'We could not match that payment to an order. Contact support with your reference.',
  missing_reference: 'The gateway returned an incomplete response. Please try again.',
  invalid_payload: 'The gateway response could not be read. No membership was activated.',
  payment_not_confirmed: 'Payment was not confirmed by the gateway. No membership was activated.'
}

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: { plan?: string; error?: string; cancelled?: string }
}) {
  const [plans, user] = await Promise.all([
    prisma.membershipPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    getCurrentUser()
  ])

  const gateways = getGatewayStatuses()
  const errorMessage = searchParams.error ? ERROR_MESSAGES[searchParams.error] : undefined

  return (
    <>
      <PageHero
        eyebrow="Secure checkout"
        title="Complete your membership"
        description="Choose your plan, select JazzCash, Easypaisa or international card, and pay on the provider's own secure page."
        breadcrumb={[{ label: 'Membership', href: '/membership' }, { label: 'Checkout' }]}
      />

      <section className="container py-12">
        {displayContent(errorMessage ? (
          <p className="mb-6 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" /> {displayContent(errorMessage)}
          </p>
        ) : null)}

        {displayContent(searchParams.cancelled ? (
          <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
            Checkout was cancelled before payment. No charge was made.
          </p>
        ) : null)}

        {displayContent(!user ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-primary-100 bg-white p-8 text-center shadow-card">
            <h2 className="text-xl font-extrabold text-primary-900">Sign in to continue</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Memberships are tied to a member account so that certificates, applications and payment
              records stay linked to the right person.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/login?next=/membership/checkout"
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                Sign in
              </Link>
              <Link href="/register" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                Create account
              </Link>
            </div>
          </div>
        ) : (
          <CheckoutPanel
            plans={plans.map(plan => ({
              code: plan.code,
              name: plan.name,
              pricePkr: plan.pricePkr,
              priceUsd: plan.priceUsd,
              tier: plan.tier
            }))}
            gateways={gateways}
            defaultPlanCode={searchParams.plan}
          />
        ))}
      </section>
    </>
  )
}
