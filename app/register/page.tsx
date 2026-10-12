import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth/auth-shell'
import { RegisterForm } from '@/components/features/register-form'
import { getCurrentUser } from '@/lib/auth'
import { isLocalMailPreview } from '@/lib/email/mailer'
import { hasPermission } from '@/lib/permissions'

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a free PYPC account to join programmes, discover opportunities and take part in your community.'
}
export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  const user = await getCurrentUser()
  if (user) redirect(hasPermission(user, 'dashboard.read') ? '/admin' : '/dashboard')
  const localPreview = isLocalMailPreview()
  return <AuthShell mode="register" localPreview={localPreview}>
    <RegisterForm localPreview={localPreview} />
  </AuthShell>
}
