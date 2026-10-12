import { NextResponse } from 'next/server'
import { z } from 'zod'
import { BUILTIN_ROLES } from '@/lib/permissions'
import { USER_STATUSES } from '@/lib/constants'
import { ApiError, apiError, authorize, assertActor, auditMutation, readJson, transaction } from '@/lib/admin-api'

const profileSchema = z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), city: z.string().trim().max(120).nullable(), province: z.string().trim().max(120).nullable(), institution: z.string().trim().max(180).nullable(), profession: z.string().trim().max(120).nullable() }).strict()
const schema = z.object({ userId: z.string().min(1).max(100), role: z.string().max(100).optional(), customRoleId: z.string().max(100).nullable().optional(), status: z.enum(USER_STATUSES).optional(), revokeSessions: z.boolean().optional(), profile: profileSchema.optional() }).strict()
export async function PATCH(request: Request) {
  try {
    const actor = await authorize(request, 'users.manage')
    const parsed = schema.safeParse(await readJson(request))
    if (!parsed.success) throw new ApiError(422, 'Provide valid account changes.')
    const { userId, role, customRoleId, status, revokeSessions, profile } = parsed.data
    if (!role && !status && !revokeSessions && !profile) throw new ApiError(422, 'No change supplied.')
    if (role && role !== 'CUSTOM' && !Object.hasOwn(BUILTIN_ROLES, role)) throw new ApiError(422, 'Unknown role.')
    if ((role === 'CUSTOM' && !customRoleId) || (customRoleId && role !== 'CUSTOM')) throw new ApiError(422, 'Select a custom role.')
    const user = await transaction(async tx => {
      await assertActor(tx, actor, 'users.manage')
      const target = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true, customRoleId: true } })
      if (!target) throw new ApiError(404, 'Account not found.')
      if (target.id === actor.id && ((role && role !== target.role) || (status && status !== target.status))) throw new ApiError(409, 'Ask another administrator to change your access.')
      if ((target.role === 'SUPER_ADMIN' || role === 'SUPER_ADMIN') && actor.role !== 'SUPER_ADMIN') throw new ApiError(403, 'Only a super admin may manage this access level.')
      if (customRoleId && !(await tx.role.findUnique({ where: { id: customRoleId } }))) throw new ApiError(422, 'Custom role no longer exists.')
      const nextRole = role ?? target.role; const nextStatus = status ?? target.status
      if (target.role === 'SUPER_ADMIN' && target.status === 'ACTIVE' && (nextRole !== 'SUPER_ADMIN' || nextStatus !== 'ACTIVE')) {
        const otherSuperAdmins = await tx.user.count({ where: { id: { not: userId }, role: 'SUPER_ADMIN', status: 'ACTIVE', emailVerifiedAt: { not: null } } })
        if (!otherSuperAdmins) throw new ApiError(409, 'The last active super administrator must be retained.')
      }
      if (['ADMIN', 'SUPER_ADMIN'].includes(target.role) && target.status === 'ACTIVE' && (!['ADMIN', 'SUPER_ADMIN'].includes(nextRole) || nextStatus !== 'ACTIVE')) {
        const others = await tx.user.count({ where: { id: { not: userId }, role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE', emailVerifiedAt: { not: null } } })
        if (!others) throw new ApiError(409, 'The last active administrator must be retained.')
      }
      const accessChanged = Boolean(role || status || revokeSessions)
      const updated = await tx.user.update({ where: { id: userId }, data: { ...profile, ...(role ? { role, customRoleId: role === 'CUSTOM' ? customRoleId : null } : {}), ...(status ? { status } : {}), ...(accessChanged ? { sessionVersion: { increment: 1 } } : {}) }, select: { id: true, email: true, role: true, status: true, customRoleId: true } })
      if (accessChanged) await tx.authSession.deleteMany({ where: { userId } })
      await auditMutation(tx, actor, request, revokeSessions ? 'ADMIN_SESSIONS_REVOKED' : 'ADMIN_USER_UPDATED', 'User', userId, { before: { role: target.role, status: target.status, customRoleId: target.customRoleId }, after: { role: nextRole, status: nextStatus, customRoleId }, profileFields: profile ? Object.keys(profile) : [] })
      return updated
    })
    return NextResponse.json({ ok: true, user })
  } catch (error) { return apiError(error) }
}
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
