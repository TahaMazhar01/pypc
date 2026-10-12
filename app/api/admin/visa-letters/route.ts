import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, apiError, assertActor, auditMutation, readJson, transaction } from '@/lib/admin-api'
import { notify } from '@/lib/audit'
import { VISA_LETTER_STATUSES } from '@/lib/validations'

const bodySchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(VISA_LETTER_STATUSES),
  adminNotes: z.string().max(2000).optional()
}).strict()

/** PATCH /api/admin/visa-letters — secretariat decision on an invitation-letter request. */
export async function PATCH(request: Request) {
  let staff
  try { staff = await authorize(request, 'visa.review') } catch (error) { return apiError(error) }

  let body
  try { body = await readJson(request) } catch (error) { return apiError(error) }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'requestId and a valid status are required.' }, { status: 422 })
  }

  const { requestId, status, adminNotes } = parsed.data

  const existing = await prisma.visaLetterRequest.findUnique({ where: { id: requestId } })
  if (!existing) return NextResponse.json({ error: 'Request not found.' }, { status: 404 })

  let updated
  try { updated = await transaction(async tx => {
    await assertActor(tx, staff, 'visa.review')
    const result = await tx.visaLetterRequest.update({
    where: { id: requestId },
    data: {
      status,
      adminNotes: adminNotes ?? existing.adminNotes,
      issuedAt: status === 'ISSUED' ? new Date() : existing.issuedAt,
      reviewedById: staff.id
    }
    })
    await auditMutation(tx, staff, request, 'VISA_LETTER_STATUS_UPDATED', 'VisaLetterRequest', requestId, { status, reference: existing.reference })
    return result
  }) } catch (error) { return apiError(error) }

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

  return NextResponse.json({ ok: true, request: updated })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
