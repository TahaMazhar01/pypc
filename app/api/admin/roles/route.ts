import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, BUILTIN_ROLES, GOVERNANCE_PERMISSIONS } from '@/lib/permissions'
import { ApiError, apiError, authorize, assertActor, auditMutation, readJson, transaction } from '@/lib/admin-api'
const schema = z.object({ id: z.string().max(100).optional(), version: z.number().int().positive().optional(), name: z.string().trim().min(3).max(60).regex(/^[\p{L}\p{N} _-]+$/u), permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length) }).strict()
export async function GET(request: Request) {
  try { await authorize(request, 'roles.manage'); return NextResponse.json({ roles: await prisma.role.findMany({ orderBy: { name: 'asc' } }), builtins: BUILTIN_ROLES, permissions: PERMISSIONS }) }
  catch (error) { return apiError(error) }
}
export async function POST(request: Request) { return save(request) }
export async function PATCH(request: Request) { return save(request) }
async function save(request: Request) {
  try {
    const actor = await authorize(request, 'roles.manage')
    const parsed = schema.safeParse(await readJson(request))
    if (!parsed.success) throw new ApiError(422, 'Provide a role name and valid permissions.')
    const { id, name, version, permissions } = parsed.data
    if ((request.method === 'PATCH' && (!id || !version)) || (request.method === 'POST' && id)) throw new ApiError(422, 'Invalid role revision.')
    if (Object.hasOwn(BUILTIN_ROLES, name.toUpperCase().replace(/ /g, '_')) || name.toUpperCase() === 'CUSTOM') throw new ApiError(422, 'Built-in role names are reserved.')
    if (permissions.some(p => GOVERNANCE_PERMISSIONS.includes(p))) throw new ApiError(403, 'Account and role administration are reserved for built-in administrators.')
    if (!permissions.includes('dashboard.read')) throw new ApiError(422, 'Include dashboard access for a staff role.')
    const role = await transaction(async tx => {
      await assertActor(tx, actor, 'roles.manage')
      const previous = id ? await tx.role.findUnique({ where: { id } }) : null
      if (id && (!previous || previous.version !== version)) throw new ApiError(409, 'This role changed. Refresh before saving.')
      const data = { name, permissions: JSON.stringify([...new Set(permissions)].sort()) }
      const result = id ? await tx.role.update({ where: { id }, data: { ...data, version: { increment: 1 } } }) : await tx.role.create({ data })
      if (id) {
        await tx.authSession.deleteMany({ where: { user: { customRoleId: id } } })
        await tx.user.updateMany({ where: { customRoleId: id }, data: { sessionVersion: { increment: 1 } } })
      }
      await auditMutation(tx, actor, request, id ? 'ROLE_UPDATED' : 'ROLE_CREATED', 'Role', result.id, { before: previous?.permissions, after: data.permissions, name })
      return result
    })
    return NextResponse.json({ ok: true, role }, { status: request.method === 'POST' ? 201 : 200 })
  } catch (error) { return apiError(error) }
}
export async function DELETE(request: Request) {
  try {
    const actor = await authorize(request, 'roles.manage')
    const parsed = z.object({ id: z.string().min(1).max(100), version: z.number().int().positive() }).strict().safeParse(await readJson(request))
    if (!parsed.success) throw new ApiError(422, 'Select a role revision.')
    await transaction(async tx => {
      await assertActor(tx, actor, 'roles.manage')
      if (await tx.user.count({ where: { customRoleId: parsed.data.id } })) throw new ApiError(409, 'Reassign users before deleting this role.')
      const role = await tx.role.findUnique({ where: { id: parsed.data.id } })
      if (!role || role.version !== parsed.data.version) throw new ApiError(409, 'Role changed. Refresh first.')
      await tx.role.delete({ where: { id: role.id } })
      await auditMutation(tx, actor, request, 'ROLE_DELETED', 'Role', role.id, { name: role.name })
    })
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error) }
}
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
