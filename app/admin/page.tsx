import Link from 'next/link'
import { requirePermissionPage } from '@/lib/auth'
import { hasPermission, PAGE_PERMISSIONS } from '@/lib/permissions'
import { adminNav } from '@/lib/constants'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui/icon'
export const dynamic = 'force-dynamic'
export default async function Page() {
  const user = await requirePermissionPage('dashboard.read')
  const links = adminNav.filter(item => item.href !== '/admin' && hasPermission(user, PAGE_PERMISSIONS[item.href]))
  const audit = hasPermission(user, 'audit.read') ? await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, action: true, actorEmail: true, createdAt: true } }) : []
  const stats = await Promise.all([
    hasPermission(user, 'users.read') ? prisma.user.count().then(value => ({ label: 'Registered members', value, href: '/admin/users', icon: 'Users' })) : null,
    hasPermission(user, 'events.read') ? prisma.event.count({ where: { isPublished: true } }).then(value => ({ label: 'Published events', value, href: '/admin/events', icon: 'CalendarDays' })) : null,
    hasPermission(user, 'applications.read') ? prisma.application.count({ where: { status: { in: ['PENDING','UNDER_REVIEW'] } } }).then(value => ({ label: 'Applications to review', value, href: '/admin/applications', icon: 'FileText' })) : null,
    hasPermission(user, 'media.read') ? prisma.mediaAsset.count().then(value => ({ label: 'Library images', value, href: '/admin/media', icon: 'Image' })) : null
  ])
  return <div className="space-y-7">
    <section className="admin-welcome"><div><p>YOUR COUNCIL WORKSPACE</p><h2>Welcome back, {user.firstName}.</h2><p>Keep the website current, support members, and manage your team.</p></div><span>{user.customRole?.name ?? user.role.replaceAll('_', ' ')}</span></section>
    <div className="admin-stats">{stats.filter(value => value !== null).map(stat => <Link key={stat.href} href={stat.href} className="admin-stat"><div><p>{stat.label}</p><strong>{stat.value}</strong></div><Icon name={stat.icon} size={23} /></Link>)}</div>
    <section><div className="mb-4"><h2 className="text-lg font-bold">Manage your workspace</h2><p className="mt-1 text-xs leading-6 text-slate-600">Choose an area. Draft content stays private until an authorized publisher approves it.</p></div><div className="admin-record-grid">{links.map(item => <Link key={item.href} href={item.href} className="admin-workspace-link"><span><Icon name={item.icon} size={21} /></span><div><h3>{item.label}</h3><p>Open workspace</p></div><span aria-hidden="true">↗</span></Link>)}</div>{!links.length && <p className="admin-notice">Your account has dashboard access. An administrator can assign additional permissions when your responsibilities require them.</p>}</section>
    {audit.length > 0 && <section className="rounded-2xl border bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Recent activity</h2><Link href="/admin/audit" className="admin-action">View audit trail</Link></div><ul className="mt-4 divide-y">{audit.map(entry => <li key={entry.id} className="admin-audit-item"><div><p>{entry.action.replaceAll('_',' ')}</p><span>{entry.actorEmail ?? 'System / local operator'}</span></div><time dateTime={entry.createdAt.toISOString()}>{entry.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })} · {entry.createdAt.toISOString().slice(11,16)} UTC</time></li>)}</ul></section>}
  </div>
}
