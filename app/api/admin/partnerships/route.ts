import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isStaff } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { PARTNERSHIP_STATUSES } from '@/lib/validations'
import { PARTNERSHIP_STATUS_LABELS } from '@/lib/partnerships'

const bodySchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(PARTNERSHIP_STATUSES),
  adminNotes: z.string().max(2000).optional()
})

/**
 * PATCH /api/admin/partnerships — the secretariat's decision on a partnership
 * request. Staff-only, audited, and the only way a request changes status, so
 * every step of the MoU process leaves a record naming who moved it.
 */
export async function PATCH(request: Request) {
  const staff = await getCurrentUser()
  if (!staff || !isStaff(staff.role)) {
    return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'A requestId and a valid status are required.' },
      { status: 422 }
    )
  }

  const { requestId, status, adminNotes } = parsed.data

  const existing = await prisma.partnershipRequest.findUnique({ where: { id: requestId } })
  if (!existing) return NextResponse.json({ error: 'Request not found.' }, { status: 404 })

  if (existing.status === status && (adminNotes ?? existing.adminNotes) === existing.adminNotes) {
    return NextResponse.json({
      ok: true,
      unchanged: true,
      status,
      label: PARTNERSHIP_STATUS_LABELS[status]
    })
  }

  const updated = await prisma.partnershipRequest.update({
    where: { id: requestId },
    data: {
      status,
      adminNotes: adminNotes?.trim() ? adminNotes.trim() : existing.adminNotes,
      reviewedById: staff.id,
      reviewedAt: new Date()
    }
  })

  await recordAudit({
    actorId: staff.id,
    actorEmail: staff.email,
    action: 'PARTNERSHIP_STATUS_CHANGED',
    entityType: 'PartnershipRequest',
    entityId: updated.id,
    metadata: {
      reference: updated.reference,
      institution: updated.institutionName,
      from: existing.status,
      to: status
    },
    request
  })

  return NextResponse.json({
    ok: true,
    status: updated.status,
    label: PARTNERSHIP_STATUS_LABELS[status],
    reviewedAt: updated.reviewedAt
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
