
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/features/login-form'
import { Card } from '@/components/ui/card'
import { PypcEmblem } from '@/components/layout/logo'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your PYPC member account to access programmes, applications and certificates.'
}

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect(isAdmin(user.role) ? '/admin' : '/dashboard')

  return (
    <section className="relative isolate overflow-hidden surface-page py-16">
      <div className="bg-grid absolute inset-0 -z-10 opacity-50" />

      <div className="container grid max-w-5xl items-center gap-10 lg:grid-cols-2">
        <div>
          <PypcEmblem size={78} />
          <h1 className="mt-6 text-3xl font-extrabold text-primary-900 sm:text-4xl">
            Welcome back to PYPC
          </h1>
          <p className="mt-4 max-w-md leading-7 text-slate-600">
            Sign in to track applications, access programme materials, download certificates and manage
            your membership.
          </p>

          <ul className="mt-7 space-y-3 text-sm text-slate-600">
            <li>• Applications with live status tracking</li>
            <li>• QR verified certificates and experience records</li>
            <li>• Event registrations and attendance history</li>
          </ul>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white/70 p-5 text-xs leading-6 text-slate-600">
            <p className="font-bold text-slate-900">Demonstration accounts (seeded database)</p>
            <p className="mt-1">
              Member: <span className="font-mono">member@example.com</span> · Executive:{displayContent(' ')}
              <span className="font-mono">executive@pypc.org.pk</span> · Admin:{displayContent(' ')}
              <span className="font-mono">admin@pypc.org.pk</span>
            </p>
            <p className="mt-1">
              Password for all three: <span className="font-mono font-bold">Pypc@2026</span>, change these
              credentials before any public launch.
            </p>
          </div>
        </div>

        <Card className="shadow-soft">
          <h2 className="text-lg font-extrabold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-600">Use the email address you registered with.</p>

          <div className="mt-6">
            <Suspense fallback={<div className="skeleton h-40 rounded-xl" />}>
              <LoginForm />
            </Suspense>
          </div>
        </Card>
      </div>
    </section>
  )
}
