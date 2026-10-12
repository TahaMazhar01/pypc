
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { Badge, Card } from '@/components/ui/card'
import { MemberControls } from '@/components/admin/member-controls'
import { prisma } from '@/lib/prisma'
import { requirePermissionPage } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { formatDate, formatDateTime, humanise } from '@/lib/utils'
import { USER_ROLES } from '@/lib/constants'

export const metadata: Metadata = { title: 'Members' }
export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({
  searchParams: searchParamsPromise
}: {
  searchParams: Promise<{ q?: string; role?: string }>
}) {
  const searchParams = await searchParamsPromise
  const actor = await requirePermissionPage('users.read')
  const customRoles = await prisma.role.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })

  const q = searchParams.q?.trim()
  const role = searchParams.role

  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q } },
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { city: { contains: q } }
            ]
          }
        : {})
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      memberships: {
        where: { status: 'ACTIVE' },
        include: { plan: { select: { name: true } } },
        take: 1
      },
      _count: { select: { applications: true, certificates: true } }
    }
  })

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Member directory</h2>
        <p className="mt-1 text-sm text-slate-600">
          Changing a role or status signs the member out everywhere and issues an audit entry. Super admin
          accounts cannot be modified by other administrators.
        </p>

        <form className="mt-5 flex flex-wrap gap-3" action="/admin/users">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, city…"
            className="focus-ring h-11 min-w-[240px] flex-1 rounded-lg border border-slate-200 px-3.5 text-sm"
          />
          <select
            name="role"
            defaultValue={role ?? ''}
            className="focus-ring h-11 rounded-lg border border-slate-200 px-3 text-sm"
          >
            <option value="">All roles</option>
            {[...USER_ROLES, 'CUSTOM'].map(item => (
              <option key={item} value={item}>
                {displayContent(humanise(item))}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="focus-ring h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white"
          >
            Apply filters
          </button>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="admin-user-table w-full min-w-[780px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Member</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">Membership</th>
              <th className="px-5 py-4">Activity</th>
              <th className="px-5 py-4">Last sign in</th>
              <th className="px-5 py-4">Controls</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-slate-50 align-top">
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-900">
                    {displayContent(user.firstName)} {displayContent(user.lastName)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{displayContent(user.email)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="primary">{displayContent(humanise(user.role))}</Badge>
                    <Badge
                      tone={
                        user.status === 'ACTIVE'
                          ? 'success'
                          : user.status === 'SUSPENDED'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {displayContent(humanise(user.status))}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Joined {displayContent(formatDate(user.createdAt))}
                  </p>
                </td>

                <td className="px-5 py-4 text-slate-600">
                  {displayContent(user.city ?? '—')}
                  {displayContent(user.province ? `, ${user.province}` : '')}
                  <p className="mt-1 text-xs text-slate-500">{displayContent(user.phone ?? 'No phone')}</p>
                </td>

                <td className="px-5 py-4 text-slate-600">
                  {displayContent(user.memberships.length ? (
                    <span className="font-semibold text-slate-800">
                      {displayContent(user.memberships[0].plan.name)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">No active membership</span>
                  ))}
                </td>

                <td className="px-5 py-4 text-xs text-slate-600">
                  <p>{displayContent(user._count.applications)} application(s)</p>
                  <p className="mt-1">{displayContent(user._count.certificates)} certificate(s)</p>
                </td>

                <td className="px-5 py-4 text-xs text-slate-600">
                  {displayContent(user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never')}
                </td>

                <td className="px-5 py-4">
                  {hasPermission(actor, 'users.manage') && (user.role !== 'SUPER_ADMIN' || actor.role === 'SUPER_ADMIN') ? <MemberControls user={{ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, city: user.city, province: user.province, institution: user.institution, profession: user.profession, role: user.role, status: user.status, customRoleId: user.customRoleId }} roles={customRoles} superAdmin={actor.role === 'SUPER_ADMIN'} self={actor.id === user.id} /> : <span className="text-xs text-slate-500">Protected / read only</span>}
                </td>
              </tr>
            ))}

            {displayContent(!users.length ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                  No members match these filters.
                </td>
              </tr>
            ) : null)}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
