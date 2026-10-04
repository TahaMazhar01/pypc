import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/payments/stripe'
import { fulfilOrder, markOrderFailed } from '@/lib/orders'
import { recordAudit } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

/**
 * Every delivery is recorded before it is acted on. The unique constraint on
 * (provider, eventId) means a gateway retry — which Stripe does by design — can
 * never activate a membership twice or double-count revenue.
 */
async function claimEvent(event: { id: string; type: string }, payload: unknown) {
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: 'stripe',
        eventId: event.id,
        eventType: event.type,
        payload: JSON.stringify(payload).slice(0, 100_000)
      }
    })
    return 'claimed' as const
  } catch (error) {
    // P2002 = unique constraint: this exact event has already been handled.
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return 'duplicate' as const
    }
    throw error
  }
}

/**
 * Amount and currency sanity check against the stored order, so a session whose
 * totals do not match what the member actually agreed to pay is flagged for a
 * human instead of being activated automatically. Order amounts are already held
 * in minor units, which is exactly what the gateway reports.
 */
async function verifyAmount(reference: string, amountMinor: number | null, currency: string | null) {
  if (amountMinor === null) return { ok: true as const }
  const order = await prisma.order.findUnique({
    where: { reference },
    select: { amountMinor: true, currency: true }
  })
  if (!order) return { ok: true as const }

  if (order.amountMinor !== amountMinor) {
    return {
      ok: false as const,
      reason: `amount mismatch: gateway ${amountMinor} vs order ${order.amountMinor}`
    }
  }
  if (currency && order.currency && currency.toUpperCase() !== order.currency.toUpperCase()) {
    return { ok: false as const, reason: `currency mismatch: ${currency} vs ${order.currency}` }
  }
  return { ok: true as const }
}

/**
 * Stripe webhook.
 *
 * Configure in the Stripe dashboard:
 *   Endpoint: {APP_URL}/api/payments/stripe/webhook
 *   Events:   checkout.session.completed, checkout.session.expired,
 *             payment_intent.payment_failed
 * Then set STRIPE_WEBHOOK_SECRET so signatures can be verified.
 */
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !secret) {
    return NextResponse.json({ error: 'Webhook signature or secret missing.' }, { status: 400 })
  }

  const rawBody = await request.text()
  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret)
  } catch (error) {
    console.error('[stripe] signature verification failed', error)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  const claim = await claimEvent(event, event.data.object)
  if (claim === 'duplicate') {
    // Acknowledge so the gateway stops retrying — the work is already done.
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const reference = session.metadata?.orderReference ?? session.client_reference_id
        if (reference) {
          const check = await verifyAmount(reference, session.amount_total ?? null, session.currency)
          if (!check.ok) {
            // Flagged for a human: the money moved but does not match the order,
            // so nothing is activated automatically.
            await recordAudit({
              action: 'PAYMENT_FLAGGED',
              entityType: 'Order',
              entityId: reference,
              metadata: { reason: check.reason }
            })
            await markOrderFailed(reference, `flagged: ${check.reason}`)
            break
          }

          await fulfilOrder({
            reference,
            providerRef: session.payment_intent ? String(session.payment_intent) : session.id,
            payload: { paymentStatus: session.payment_status, amountTotal: session.amount_total }
          })
        }
        break
      }

      case 'charge.refunded':
      case 'charge.dispute.created': {
        const charge = event.data.object as { metadata?: Record<string, string> | null; id: string; amount_refunded?: number }
        const reference = charge.metadata?.orderReference
        if (reference) {
          // Refund or dispute: the membership is suspended, never silently kept.
          await markOrderFailed(reference, event.type)
          await recordAudit({
            action: event.type === 'charge.refunded' ? 'PAYMENT_REFUNDED' : 'PAYMENT_DISPUTED',
            entityType: 'Order',
            entityId: reference,
            metadata: { refundedMinorUnits: charge.amount_refunded ?? 0 }
          })
        }
        break
      }

      case 'checkout.session.expired':
      case 'payment_intent.payment_failed': {
        const object = event.data.object as { metadata?: Record<string, string> | null; id: string }
        const reference = object.metadata?.orderReference
        if (reference) await markOrderFailed(reference, event.type)
        break
      }

      default:
        break
    }

    await recordAudit({
      action: `STRIPE_${event.type.toUpperCase()}`,
      entityType: 'Order',
      metadata: { eventId: event.id },
      request
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[stripe] handler error', error)
    // Returning 500 makes Stripe retry the event.
    return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
