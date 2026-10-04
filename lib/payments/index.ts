import { isStripeConfigured } from './stripe'
import { isEasypaisaConfigured } from './easypaisa'
import { isJazzCashConfigured } from './jazzcash'
import type { PaymentProvider } from '@/lib/constants'

/**
 * Payment gateway registry.
 *
 * A gateway is only selectable in the UI when its credentials exist in .env.
 * PAYMENTS_SIMULATION_MODE=true (development) adds a clearly-labelled
 * "Simulated" option so the complete membership → certificate journey can be
 * tested end to end without merchant accounts. In production set it to false.
 */
export type GatewayStatus = {
  provider: PaymentProvider
  label: string
  description: string
  currencies: ('PKR' | 'USD')[]
  configured: boolean
  simulation: boolean
}

export function paymentsSimulationEnabled() {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.PAYMENTS_SIMULATION_MODE === 'true'
}

export function getGatewayStatuses(): GatewayStatus[] {
  const gateways: GatewayStatus[] = [
    {
      provider: 'JAZZCASH',
      label: 'JazzCash',
      description: 'Mobile wallet & card. Requires an approved JazzCash merchant account.',
      currencies: ['PKR'],
      configured: isJazzCashConfigured(),
      simulation: false
    },
    {
      provider: 'EASYPAISA',
      label: 'Easypaisa',
      description: 'Mobile account. Requires an approved Easypaisa merchant account.',
      currencies: ['PKR'],
      configured: isEasypaisaConfigured(),
      simulation: false
    },
    {
      provider: 'STRIPE',
      label: 'Card (International)',
      description: 'Visa / Mastercard / Amex via Stripe. Requires Stripe keys.',
      currencies: ['PKR', 'USD'],
      configured: isStripeConfigured(),
      simulation: false
    }
  ]

  if (paymentsSimulationEnabled()) {
    gateways.push({
      provider: 'SIMULATED',
      label: 'Simulated (development only)',
      description:
        'Test payment used while merchant credentials are pending. Never enabled in production builds.',
      currencies: ['PKR', 'USD'],
      configured: true,
      simulation: true
    })
  }

  return gateways
}

export function isGatewayUsable(provider: PaymentProvider) {
  if (provider === 'SIMULATED') return paymentsSimulationEnabled()
  const gateway = getGatewayStatuses().find(item => item.provider === provider)
  return Boolean(gateway?.configured)
}

export function makeOrderReference() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  const stamp = Date.now().toString(36).toUpperCase().slice(-5)
  return `PYPC-ORD-${stamp}${random}`
}
