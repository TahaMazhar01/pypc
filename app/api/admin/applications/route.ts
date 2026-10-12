import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, apiError, assertActor, auditMutation, readJson, transaction } from '@/lib/admin-api'
import { notify } from '@/lib/audit'
import { APPLICATION_STATUSES } from '@/lib/constants'

const bodySchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum([...APPLICATION_STATUSES] as [string, ...string[]]),
  adminNotes: z.string().max(2000).optional()
}).strict()

/** PATCH /api/admin/applications — review decision on a member application. */
export async function PATCH(request: Request) {
  let staff
  try { staff = await authorize(request, 'applications.review') } catch (error) { return apiError(error) }

  let body
  try { body = await readJson(request) } catch (error) { return apiError(error) }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'applicationId and a valid status are required.' }, { status: 422 })
  }

  const { applicationId, status, adminNotes } = parsed.data

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { programme: { select: { title: true } }, opportunity: { select: { title: true } } }
  })

  if (!application) return NextResponse.json({ error: 'Application not found.' }, { status: 404 })

  let updated
  try { updated = await transaction(async tx => {
    await assertActor(tx, staff, 'applications.review')
    const result = await tx.application.update({
    where: { id: applicationId },
    data: {
      status,
      adminNotes: adminNotes ?? application.adminNotes,
      reviewedById: staff.id,
      reviewedAt: new Date()
    }
    })
    await auditMutation(tx, staff, request, 'APPLICATION_STATUS_UPDATED', 'Application', applicationId, { status, reference: application.reference })
    return result
  }) } catch (error) { return apiError(error) }

  const itemTitle =
    application.programme?.title ?? application.opportunity?.title ?? application.type

  await notify({
    userId: application.userId,
    title: `Application ${status.replace('_', ' ').toLowerCase()}`,
    body: `Update on your application ${application.reference} (${itemTitle}).${
      adminNotes ? ` Note from the secretariat: ${adminNotes}` : ''
    }`,
    type: status === 'APPROVED' ? 'SUCCESS' : status === 'REJECTED' ? 'WARNING' : 'INFO',
    href: '/dashboard/applications'
  })

  return NextResponse.json({ ok: true, application: updated })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
