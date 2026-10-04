import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isStaff } from '@/lib/auth'
import { notify, recordAudit } from '@/lib/audit'
import { VISA_LETTER_STATUSES } from '@/lib/validations'

const bodySchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(VISA_LETTER_STATUSES),
  adminNotes: z.string().max(2000).optional()
})

/** PATCH /api/admin/visa-letters — secretariat decision on an invitation-letter request. */
export async function PATCH(request: Request) {
  const staff = await getCurrentUser()
  if (!staff || !isStaff(staff.role)) {
    return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'requestId and a valid status are required.' }, { status: 422 })
  }

  const { requestId, status, adminNotes } = parsed.data

  const existing = await prisma.visaLetterRequest.findUnique({ where: { id: requestId } })
  if (!existing) return NextResponse.json({ error: 'Request not found.' }, { status: 404 })

  const updated = await prisma.visaLetterRequest.update({
    where: { id: requestId },
    data: {
      status,
      adminNotes: adminNotes ?? existing.adminNotes,
      issuedAt: status === 'ISSUED' ? new Date() : existing.issuedAt,
      reviewedById: staff.id
    }
  })

  await notify({
    userId: existing.userId,
    title:
      status === 'ISSUED'
        ? 'Invitation letter issued'
        : status === 'NEED_INFO'
          ? 'More information needed for your letter'
          : `Invitation letter request ${status.replace('_', ' ').toLowerCase()}`,
    body: `Update on request ${existing.reference}.${
      adminNotes ? ` Note from the secretariat: ${adminNotes}` : ''
    }`,
    type: status === 'ISSUED' ? 'SUCCESS' : status === 'REJECTED' ? 'WARNING' : 'INFO',
    href: '/dashboard/visa-letters'
  })

  await recordAudit({
    actorId: staff.id,
    actorEmail: staff.email,
    action: 'VISA_LETTER_STATUS_UPDATED',
    entityType: 'VisaLetterRequest',
    entityId: requestId,
    metadata: { status, reference: existing.reference },
    request
  })

  return NextResponse.json({ ok: true, request: updated })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
