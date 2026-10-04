import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isStaff } from '@/lib/auth'
import { notify, recordAudit } from '@/lib/audit'
import { APPLICATION_STATUSES } from '@/lib/constants'

const bodySchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum([...APPLICATION_STATUSES] as [string, ...string[]]),
  adminNotes: z.string().max(2000).optional()
})

/** PATCH /api/admin/applications — review decision on a member application. */
export async function PATCH(request: Request) {
  const staff = await getCurrentUser()
  if (!staff || !isStaff(staff.role)) {
    return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'applicationId and a valid status are required.' }, { status: 422 })
  }

  const { applicationId, status, adminNotes } = parsed.data

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { programme: { select: { title: true } }, opportunity: { select: { title: true } } }
  })

  if (!application) return NextResponse.json({ error: 'Application not found.' }, { status: 404 })

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status,
      adminNotes: adminNotes ?? application.adminNotes,
      reviewedById: staff.id,
      reviewedAt: new Date()
    }
  })

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

  await recordAudit({
    actorId: staff.id,
    actorEmail: staff.email,
    action: 'APPLICATION_STATUS_UPDATED',
    entityType: 'Application',
    entityId: applicationId,
    metadata: { status, reference: application.reference },
    request
  })

  return NextResponse.json({ ok: true, application: updated })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
