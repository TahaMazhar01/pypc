
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { dashboardNav } from '@/lib/constants'

export const metadata: Metadata = {
  title: { default: 'Member Dashboard', template: '%s | PYPC Dashboard' },
  robots: { index: false, follow: false }
}

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/dashboard')

  const nav = [...dashboardNav]
  if (isAdmin(user.role)) {
    nav.push({ label: 'Admin Panel', href: '/admin', icon: 'ShieldCheck' })
  }

  return (
    <DashboardShell
      nav={nav}
      title={displayContent(`Assalam-o-Alaikum, ${user.firstName}`)}
      subtitle="Your PYPC account: applications, membership, certificates, events and account security."
    >
      {displayContent(children)}
    </DashboardShell>
  )
}
