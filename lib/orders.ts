import 'server-only'

import { prisma } from '@/lib/prisma'
import { notify, recordAudit } from '@/lib/audit'

/**
 * Marks an order as paid and activates the related membership.
 * Idempotent: calling it twice for the same order has no double effect,
 * which matters because payment gateways retry webhooks/callbacks.
 */
export async function fulfilOrder(input: {
  reference: string
  providerRef?: string | null
  payload?: Record<string, unknown> | null
}) {
  const order = await prisma.order.findUnique({
    where: { reference: input.reference },
    include: { plan: true }
  })

  if (!order) return { ok: false as const, error: 'ORDER_NOT_FOUND' }

  if (order.status === 'PAID') {
    return { ok: true as const, alreadyPaid: true, order }
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      providerRef: input.providerRef ?? order.providerRef,
      payload: input.payload ? JSON.stringify(input.payload) : order.payload
    }
  })

  const startsAt = new Date()
  const expiresAt = new Date(startsAt.getTime() + order.plan.durationMonths * 30 * 86_400_000)

  const existing = await prisma.membership.findFirst({
    where: { userId: order.userId, status: 'ACTIVE' }
  })

  if (existing) {
    await prisma.membership.update({
      where: { id: existing.id },
      data: {
        planId: order.planId,
        status: 'ACTIVE',
        expiresAt: expiresAt > existing.expiresAt! ? expiresAt : existing.expiresAt,
        orderId: updated.id
      }
    })
  } else {
    await prisma.membership.create({
      data: {
        userId: order.userId,
        planId: order.planId,
        status: 'ACTIVE',
        startsAt,
        expiresAt,
        orderId: updated.id
      }
    })
  }

  await notify({
    userId: order.userId,
    title: `${order.plan.name} activated`,
    body: `Payment of ${order.currency} ${(order.amountMinor / 100).toLocaleString()} confirmed. Your membership is active until ${expiresAt.toDateString()}.`,
    type: 'SUCCESS',
    href: '/dashboard/membership'
  })

  await recordAudit({
    actorId: order.userId,
    action: 'ORDER_PAID',
    entityType: 'Order',
    entityId: updated.id,
    metadata: { provider: order.provider, reference: order.reference }
  })

  return { ok: true as const, alreadyPaid: false, order: updated }
}

export async function markOrderFailed(reference: string, reason: string) {
  const order = await prisma.order.findUnique({ where: { reference } })
  if (!order || order.status === 'PAID') return

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'FAILED', payload: JSON.stringify({ reason }) }
  })

  await recordAudit({
    actorId: order.userId,
    action: 'ORDER_FAILED',
    entityType: 'Order',
    entityId: order.id,
    metadata: { reason }
  })
}
