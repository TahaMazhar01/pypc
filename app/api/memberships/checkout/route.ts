import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { checkoutSchema } from '@/lib/validations'
import { createStripeCheckoutSession, isStripeConfigured } from '@/lib/payments/stripe'
import { createJazzCashCheckout, isJazzCashConfigured } from '@/lib/payments/jazzcash'
import { createEasypaisaCheckout, isEasypaisaConfigured } from '@/lib/payments/easypaisa'
import { makeOrderReference, paymentsSimulationEnabled } from '@/lib/payments'
import { recordAudit } from '@/lib/audit'
import { fulfilOrder } from '@/lib/orders'

/**
 * Creates an order, then hands off to the selected gateway.
 *
 * - JAZZCASH  → returns an auto-submit form (endpoint + signed fields)
 * - EASYPAISA → returns an auto-submit form with the encrypted payload
 * - STRIPE    → redirects to a Stripe Checkout session
 * - FREE      → the zero-price community tier: the membership is activated
 *               immediately through the same fulfilment path the gateways use
 * - SIMULATED → dev only: returns an internal URL that completes the order so
 *               the full journey can be tested without merchant credentials
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to continue to checkout.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Select a plan and payment method.' }, { status: 422 })
  }

  const { planCode, provider, currency } = parsed.data

  const plan = await prisma.membershipPlan.findUnique({ where: { code: planCode } })
  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: 'That membership plan is not available.' }, { status: 404 })
  }

  const isFreePlan = plan.pricePkr === 0 && plan.priceUsd === 0

  // A free tier must never be routed through a payment gateway (there is
  // nothing to charge), and a paid tier must never be activated without one.
  if (isFreePlan && provider !== 'FREE') {
    return NextResponse.json(
      {
        error:
          'The Free Community tier costs nothing. Choose “Activate free membership” — no payment details are needed.'
      },
      { status: 400 }
    )
  }

  if (!isFreePlan && provider === 'FREE') {
    return NextResponse.json(
      { error: 'That tier requires a completed payment. Select JazzCash, Easypaisa or card.' },
      { status: 400 }
    )
  }

  if (isFreePlan) {
    const reference = makeOrderReference()

    const order = await prisma.order.create({
      data: {
        reference,
        userId: user.id,
        planId: plan.id,
        provider: 'FREE',
        currency: 'PKR',
        amountMinor: 0,
        status: 'PENDING'
      }
    })

    // Same idempotent fulfilment the gateways call, so activation, the in-app
    // notification and the audit trail are identical for a free membership.
    const result = await fulfilOrder({ reference, payload: { method: 'FREE_TIER' } })

    if (!result.ok) {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } }).catch(() => undefined)
      return NextResponse.json({ error: 'Could not activate the free membership. Please try again.' }, { status: 500 })
    }

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'MEMBERSHIP_ACTIVATED_FREE',
      entityType: 'Order',
      entityId: order.id,
      metadata: { planCode, reference },
      request
    })

    return NextResponse.json({ ok: true, reference, redirectUrl: `/membership/success?reference=${reference}` })
  }

  if (provider === 'JAZZCASH' && !isJazzCashConfigured()) {
    return NextResponse.json(
      {
        error:
          'JazzCash is not configured yet. Add JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD and JAZZCASH_INTEGRITY_SALT to .env once your merchant account is approved.'
      },
      { status: 503 }
    )
  }

  if (provider === 'EASYPAISA' && !isEasypaisaConfigured()) {
    return NextResponse.json(
      {
        error:
          'Easypaisa is not configured yet. Add EASYPAISA_STORE_ID and EASYPAISA_HASH_KEY to .env once your merchant account is approved.'
      },
      { status: 503 }
    )
  }

  // The developer gateway is refused here, before any order row exists, so a
  // production build can never leave an orphan PENDING order behind when the
  // simulated path is requested.
  if (provider === 'SIMULATED' && !paymentsSimulationEnabled()) {
    return NextResponse.json({ error: 'Unsupported payment method.' }, { status: 400 })
  }

  if (provider === 'STRIPE' && !isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.' },
      { status: 503 }
    )
  }

  const reference = makeOrderReference()
  const amountMinor = currency === 'USD' ? plan.priceUsd * 100 : plan.pricePkr * 100

  const order = await prisma.order.create({
    data: {
      reference,
      userId: user.id,
      planId: plan.id,
      provider,
      currency,
      amountMinor,
      status: 'PENDING'
    }
  })

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'ORDER_CREATED',
    entityType: 'Order',
    entityId: order.id,
    metadata: { provider, planCode, currency, amountMinor },
    request
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

  try {
    if (provider === 'JAZZCASH') {
      const result = createJazzCashCheckout({
        orderReference: reference,
        amountMinor,
        customerMobile: user.phone ?? '',
        customerEmail: user.email,
        description: `${plan.name} — ${reference}`,
        returnUrl: `${appUrl}/api/payments/jazzcash/callback`
      })

      return NextResponse.json({
        ok: true,
        reference,
        autoSubmitForm: { endpoint: result.endpoint, fields: result.fields }
      })
    }

    if (provider === 'EASYPAISA') {
      const result = createEasypaisaCheckout({
        orderReference: reference,
        amountMinor,
        customerMobile: user.phone ?? '',
        customerEmail: user.email,
        description: `${plan.name} — ${reference}`,
        returnUrl: `${appUrl}/api/payments/easypaisa/callback`
      })

      return NextResponse.json({
        ok: true,
        reference,
        autoSubmitForm: { endpoint: result.endpoint, fields: result.fields }
      })
    }

    if (provider === 'STRIPE') {
      const session = await createStripeCheckoutSession({
        orderReference: reference,
        planName: plan.name,
        amountMinor,
        currency,
        customerEmail: user.email,
        successUrl: `${appUrl}/membership/success?reference=${reference}`,
        cancelUrl: `${appUrl}/membership/checkout?cancelled=1`
      })

      await prisma.order.update({
        where: { id: order.id },
        data: { providerRef: session.id }
      })

      return NextResponse.json({ ok: true, reference, redirectUrl: session.url })
    }

    // Development-only simulated payment path. Availability was settled above,
    // before the order was created; reaching this line means it is enabled.
    return NextResponse.json({
      ok: true,
      reference,
      redirectUrl: `/membership/simulate?reference=${reference}`
    })
  } catch (error) {
    console.error('[checkout]', error)
    await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } }).catch(() => undefined)
    return NextResponse.json(
      { error: 'The payment gateway could not be reached. No amount has been charged. Please try again.' },
      { status: 502 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
