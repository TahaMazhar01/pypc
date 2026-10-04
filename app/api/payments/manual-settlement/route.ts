import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { crossOriginResponse, isSameOrigin } from '@/lib/security/request'
import { fulfilOrder } from '@/lib/orders'

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
})

export async function POST(request: Request) {
  // Same-origin only: a settlement cannot be triggered by a cross-site post.
  if (!isSameOrigin(request)) return crossOriginResponse()

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  if (!isAdmin(user.role)) {
    return NextResponse.json(
      { error: 'Only an administrator can settle an order manually.' },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    )
  }

  const order = await prisma.order.findUnique({
    where: { reference: parsed.data.reference },
    select: { id: true, reference: true, status: true, userId: true, amountMinor: true, currency: true }
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
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'FAILED' }
    })

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'ORDER_REJECTED_MANUALLY',
      entityType: 'Order',
      entityId: order.reference,
      metadata: { evidence: parsed.data.evidence, note: parsed.data.note ?? null },
      request
    })

    return NextResponse.json({ ok: true, status: 'FAILED' })
  }

  // Approve: reuse the shared fulfilment path so the membership is created with
  // the same rules as a gateway payment (plan duration, receipts, notifications).
  await fulfilOrder({
    reference: order.reference,
    providerRef: `MANUAL-${parsed.data.evidence}`,
    payload: { settlement: 'manual', evidence: parsed.data.evidence, settledBy: user.email }
  })

  await prisma.order.update({
    where: { id: order.id },
    data: { provider: 'BANK_TRANSFER' }
  })

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'ORDER_SETTLED_MANUALLY',
    entityType: 'Order',
    entityId: order.reference,
    metadata: {
      evidence: parsed.data.evidence,
      note: parsed.data.note ?? null,
      amountMinor: order.amountMinor,
      currency: order.currency
    },
    request
  })

  return NextResponse.json({ ok: true, status: 'PAID' })
}
