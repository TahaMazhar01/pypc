import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { fulfilOrder, markOrderFailed } from '@/lib/orders'
import { paymentsSimulationEnabled } from '@/lib/payments'
import { recordAudit } from '@/lib/audit'

/**
 * Development-only endpoint that completes a simulated payment.
 * It refuses to run when PAYMENTS_SIMULATION_MODE is off or in production,
 * so it can never create paid memberships on a live site.
 */
export async function POST(request: Request) {
  if (!paymentsSimulationEnabled()) {
    return NextResponse.json({ error: 'Simulated payments are disabled.' }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    reference?: string
    outcome?: 'SUCCESS' | 'FAILURE'
  }

  const reference = body.reference
  if (!reference) return NextResponse.json({ error: 'Order reference required.' }, { status: 400 })

  const order = await prisma.order.findUnique({ where: { reference } })
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: 'Order not found for this account.' }, { status: 404 })
  }

  if (body.outcome === 'FAILURE') {
    await markOrderFailed(reference, 'Simulated failure (developer test)')
    return NextResponse.json({ ok: true, status: 'FAILED', redirectTo: '/membership/checkout?error=payment_failed' })
  }

  const result = await fulfilOrder({
    reference,
    providerRef: `SIM-${Date.now()}`,
    payload: { simulated: true }
  })

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'SIMULATED_PAYMENT_CONFIRMED',
    entityType: 'Order',
    entityId: order.id,
    metadata: { reference },
    request
  })

  if (!result.ok) {
    return NextResponse.json({ error: 'Order could not be completed.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: 'PAID', redirectTo: `/membership/success?reference=${reference}` })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
