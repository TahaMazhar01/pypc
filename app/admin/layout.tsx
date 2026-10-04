
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { canAccessAdminPanel, getCurrentUser } from '@/lib/auth'
import { adminNav } from '@/lib/constants'

export const metadata: Metadata = {
  title: { default: 'Admin Panel', template: '%s | PYPC Admin' },
  robots: { index: false, follow: false }
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) redirect('/login?next=/admin')

  // Executives and moderators may review content and applications; only admins
  // and super admins may publish or issue certificates. A plain member is sent
  // back to their own dashboard — and because `children` render in parallel with
  // this layout in the App Router, the same rule is also enforced at the edge in
  // middleware.ts, so an unauthorised request never reaches a 200 at all.
  if (!canAccessAdminPanel(user.role)) {
    redirect('/dashboard')
  }

  return (
    <DashboardShell
      nav={adminNav}
      title="PYPC Admin Panel"
      subtitle={`Signed in as ${user.firstName} ${user.lastName} · ${user.role.replace('_', ' ')}. Every action in this panel is written to the audit log.`}
      accent="slate"
    >
      {displayContent(children)}
    </DashboardShell>
  )
}
