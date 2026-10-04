import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { notify, recordAudit } from '@/lib/audit'
import { USER_ROLES, USER_STATUSES } from '@/lib/constants'

const bodySchema = z.object({
  userId: z.string().min(1),
  role: z.enum([...USER_ROLES] as [string, ...string[]]).optional(),
  status: z.enum([...USER_STATUSES] as [string, ...string[]]).optional()
})

/** PATCH /api/admin/users — update member role or status. */
export async function PATCH(request: Request) {
  const admin = await getCurrentUser()
  if (!admin || !isAdmin(admin.role)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'userId plus a valid role or status is required.' }, { status: 422 })
  }

  const { userId, role, status } = parsed.data

  if (!role && !status) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) return NextResponse.json({ error: 'Member not found.' }, { status: 404 })

  // Safety rails: no self-demotion, no touching other super admins.
  if (target.id === admin.id && role && role !== admin.role) {
    return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 400 })
  }
  if (target.role === 'SUPER_ADMIN' && target.id !== admin.id) {
    return NextResponse.json({ error: 'Super admin accounts can only be managed by themselves.' }, { status: 403 })
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      // Force re-authentication when access level or status changes.
      ...(role || status ? { sessionVersion: { increment: 1 } } : {})
    },
    select: { id: true, email: true, role: true, status: true }
  })

  await notify({
    userId: updated.id,
    title: status ? `Account status: ${status}` : `Role updated: ${role}`,
    body: status
      ? `Your PYPC account status was updated to ${status} by the secretariat.`
      : `Your PYPC role was updated to ${role}. Please sign in again to see your new permissions.`,
    type: 'INFO',
    href: '/dashboard'
  })

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: 'ADMIN_USER_UPDATED',
    entityType: 'User',
    entityId: updated.id,
    metadata: { role, status },
    request
  })

  return NextResponse.json({ ok: true, user: updated })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
