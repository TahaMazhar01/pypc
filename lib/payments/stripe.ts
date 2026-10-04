import Stripe from 'stripe'

/**
 * Stripe adapter — international card payments.
 * Requires STRIPE_SECRET_KEY. Without it the platform reports the gateway
 * as "not configured" and the checkout UI disables the option.
 */
export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
}

let cached: Stripe | null = null

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  }
  return cached
}

export type StripeCheckoutInput = {
  orderReference: string
  planName: string
  amountMinor: number
  currency: 'PKR' | 'USD'
  customerEmail: string
  successUrl: string
  cancelUrl: string
}

export async function createStripeCheckoutSession(input: StripeCheckoutInput) {
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: input.customerEmail,
    client_reference_id: input.orderReference,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amountMinor,
          product_data: { name: input.planName }
        }
      }
    ],
    metadata: { orderReference: input.orderReference },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl
  })

  return { id: session.id, url: session.url }
}
