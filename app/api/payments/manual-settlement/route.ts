import { hasPermission } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { crossOriginResponse, isSameOrigin } from '@/lib/security/request'
import { ApiError, apiError, assertActor, auditMutation, readJson, transaction } from '@/lib/admin-api'

/**
 * Manual settlement — admin only.
 *
 * Bank transfer and any other off-gateway payment is money the platform has
 * physically received but cannot verify by itself. This endpoint is the only way
 * such an order becomes PAID, and it is deliberately narrow:
 *
 *   · admin/super-admin only (never a moderator or executive)
 *   · the order must currently be PENDING (no double settlement, no reopening a
 *     refunded order)
 *   · a reason/reference is mandatory, so the cash-book entry can be traced
 *   · every decision writes an immutable audit row with the acting user
 *
 * Approving activates the membership through the same `fulfilOrder` path the
 * gateways use, so a manually settled order and a gateway order end up in exactly
 * the same state.
 */

const schema = z.object({
  reference: z.string().trim().min(4).max(64),
  decision: z.enum(['APPROVE', 'REJECT']),
  /** Bank reference / slip number / deposit date — mandatory evidence. */
  evidence: z.string().trim().min(4).max(280),
  note: z.string().trim().max(1000).optional()
}).strict()

export async function POST(request: Request) {
  // Same-origin only: a settlement cannot be triggered by a cross-site post.
  if (!isSameOrigin(request)) return crossOriginResponse()

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  if (!hasPermission(user, 'payments.settle')) {
    return NextResponse.json(
      { error: 'Only an administrator can settle an order manually.' },
      { status: 403 }
    )
  }

  let body
  try { body = await readJson(request) } catch (error) { return apiError(error) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    )
  }

  const order = await prisma.order.findUnique({
    where: { reference: parsed.data.reference },
    include: { plan: true }
  })

  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

  if (order.status !== 'PENDING') {
    // Idempotent by design: a second attempt is refused rather than re-settled.
    return NextResponse.json(
      { error: `Order ${order.reference} is already ${order.status}.` },
      { status: 409 }
    )
  }

  if (parsed.data.decision === 'REJECT') {
    try { await transaction(async tx => {
      await assertActor(tx, user, 'payments.settle')
      const changed = await tx.order.updateMany({ where: { id: order.id, status: 'PENDING' }, data: { status: 'FAILED' } })
      if (changed.count !== 1) throw new ApiError(409, 'This order is no longer pending. Refresh before reconciling.')
      await auditMutation(tx, user, request, 'ORDER_REJECTED_MANUALLY', 'Order', order.id, { reference: order.reference, evidence: parsed.data.evidence, note: parsed.data.note ?? null })
    }) } catch (error) { return apiError(error) }

    return NextResponse.json({ ok: true, status: 'FAILED' })
  }

  // Same membership duration rules as fulfilOrder, committed with the guarded
  // staff action and audit. A concurrent reviewer cannot settle it twice.
  try { await transaction(async tx => {
    await assertActor(tx, user, 'payments.settle')
    const now = new Date()
    const expiresAt = new Date(now.getTime() + order.plan.durationMonths * 30 * 86400000)
    const changed = await tx.order.updateMany({ where: { id: order.id, status: 'PENDING' }, data: { status: 'PAID', paidAt: now, provider: 'BANK_TRANSFER', providerRef: 'MANUAL-' + parsed.data.evidence, payload: JSON.stringify({ settlement: 'manual', evidence: parsed.data.evidence, settledBy: user.email }) } })
    if (changed.count !== 1) throw new ApiError(409, 'This order is no longer pending. Refresh before reconciling.')
    const membership = await tx.membership.findFirst({ where: { userId: order.userId, status: 'ACTIVE' } })
    if (membership) await tx.membership.update({ where: { id: membership.id }, data: { planId: order.planId, status: 'ACTIVE', orderId: order.id, expiresAt: membership.expiresAt && membership.expiresAt > expiresAt ? membership.expiresAt : expiresAt } })
    else await tx.membership.create({ data: { userId: order.userId, planId: order.planId, status: 'ACTIVE', startsAt: now, expiresAt, orderId: order.id } })
    await tx.notification.create({ data: { userId: order.userId, title: order.plan.name + ' activated', body: `Payment ${order.reference} was reconciled. Your membership is active.`, type: 'SUCCESS', href: '/dashboard/membership' } })
    await auditMutation(tx, user, request, 'ORDER_SETTLED_MANUALLY', 'Order', order.id, { reference: order.reference, evidence: parsed.data.evidence, note: parsed.data.note ?? null, amountMinor: order.amountMinor, currency: order.currency })
  }) } catch (error) { return apiError(error) }

  return NextResponse.json({ ok: true, status: 'PAID' })
}
