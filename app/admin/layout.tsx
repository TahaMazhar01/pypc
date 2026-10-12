import { hasPermission, PAGE_PERMISSIONS } from '@/lib/permissions'

import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { getCurrentUser } from '@/lib/auth'
import { adminNav } from '@/lib/constants'
import '@/components/admin/admin.css'

export const metadata: Metadata = {
  title: { default: 'Admin Panel', template: '%s | PYPC Admin' },
  robots: { index: false, follow: false }
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) redirect('/login?next=/admin')

  // Every child page also checks its own resource permission before reading data.
  if (!hasPermission(user, 'dashboard.read')) {
    redirect('/dashboard')
  }

  return (
    <DashboardShell
      nav={adminNav.filter(item => hasPermission(user, PAGE_PERMISSIONS[item.href]))}
      title="PYPC Admin Panel"
      subtitle={`Signed in as ${user.firstName} ${user.lastName} · ${user.role.replace('_', ' ')}. Access follows your assigned permissions.`}
      accent="slate"
    >
      {displayContent(children)}
    </DashboardShell>
  )
}
