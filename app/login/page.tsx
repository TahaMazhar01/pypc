import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth/auth-shell'
import { LoginForm } from '@/components/features/login-form'
import { getCurrentUser } from '@/lib/auth'
import { isLocalMailPreview } from '@/lib/email/mailer'
import { hasPermission } from '@/lib/permissions'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your PYPC account to access programmes, applications and certificates.'
}
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect(hasPermission(user, 'dashboard.read') ? '/admin' : '/dashboard')
  const localPreview = isLocalMailPreview()
  return <AuthShell mode="login" localPreview={localPreview}>
    <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-slate-50" role="status" aria-label="Loading sign-in form" />}>
      <LoginForm localPreview={localPreview} />
    </Suspense>
  </AuthShell>
}
