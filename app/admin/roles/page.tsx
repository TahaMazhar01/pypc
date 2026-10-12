import { requirePermissionPage } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RoleManager } from '@/components/admin/role-manager'
export const dynamic = 'force-dynamic'
export default async function RolesPage() {
  await requirePermissionPage('roles.manage')
  const roles = await prisma.role.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, permissions: true, version: true } })
  return <RoleManager roles={roles} />
}
