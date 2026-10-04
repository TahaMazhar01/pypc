import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isStaff } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'

const bodySchema = z.object({
  entity: z.enum(['programme', 'event', 'opportunity']),
  id: z.string().min(1),
  field: z.enum(['isActive', 'isPublished', 'isFeatured']),
  value: z.boolean()
})

/**
 * PATCH /api/admin/content — publish/unpublish, activate/deactivate or
 * feature/unfeature a programme, event or opportunity.
 */
export async function PATCH(request: Request) {
  const staff = await getCurrentUser()
  if (!staff || !isStaff(staff.role)) {
    return NextResponse.json({ error: 'Staff access required.' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'entity, id, field and value are required.' }, { status: 422 })
  }

  const { entity, id, field, value } = parsed.data

  try {
    if (entity === 'programme') {
      const updated = await prisma.programme.update({
        where: { id },
        data: { [field]: value },
        select: { id: true, title: true, isActive: true, isFeatured: true }
      })
      await audit(staff, 'PROGRAMME_UPDATED', id, { field, value })
      return NextResponse.json({ ok: true, item: updated })
    }

    if (entity === 'event') {
      const updated = await prisma.event.update({
        where: { id },
        data: { [field]: value },
        select: { id: true, title: true, isPublished: true, isFeatured: true }
      })
      await audit(staff, 'EVENT_UPDATED', id, { field, value })
      return NextResponse.json({ ok: true, item: updated })
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: { [field]: value },
      select: { id: true, title: true, isActive: true, isFeatured: true }
    })
    await audit(staff, 'OPPORTUNITY_UPDATED', id, { field, value })
    return NextResponse.json({ ok: true, item: updated })
  } catch (error) {
    console.error('[admin/content]', error)
    return NextResponse.json({ error: 'Could not update this item.' }, { status: 400 })
  }
}

async function audit(
  staff: { id: string; email: string },
  action: string,
  entityId: string,
  metadata: Record<string, unknown>
) {
  await recordAudit({
    actorId: staff.id,
    actorEmail: staff.email,
    action,
    entityType: 'Content',
    entityId,
    metadata
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
