
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { RegisterForm } from '@/components/features/register-form'
import { Card } from '@/components/ui/card'
import { PypcEmblem } from '@/components/layout/logo'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Create account',
  description:
    'Create a free PYPC member account to join programmes, apply to opportunities and earn verifiable certificates.'
}

export const dynamic = 'force-dynamic'

const benefits = [
  'Free account — membership plans are optional and separate',
  'Track every application with a reference number',
  'Register for events and workshops in one click',
  'Download QR-verified certificates and experience records',
  'Receive curated fellowship, scholarship and career opportunities'
]

export default async function RegisterPage() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')

  return (
    <section className="relative isolate overflow-hidden surface-page py-16">
      <div className="bg-grid absolute inset-0 -z-10 opacity-50" />

      <div className="container grid max-w-6xl items-start gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="lg:sticky lg:top-24">
          <PypcEmblem size={78} />
          <h1 className="mt-6 text-3xl font-extrabold text-primary-900 sm:text-4xl">
            Join the Pakistan Youth Parliamentary Council
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            Creating an account is free. It gives you a member dashboard, application tracking and
            eligibility for programmes, events and certification.
          </p>

          <ul className="mt-7 space-y-3">
            {benefits.map(benefit => (
              <li key={benefit} className="flex gap-3 text-sm text-slate-700">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                <span className="leading-6">{displayContent(benefit)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white/70 p-5 text-xs leading-6 text-slate-600">
            Your data is protected: passwords are stored as bcrypt hashes, sessions use signed HTTP only
            cookies, and administrative actions are audit logged.
          </div>
        </div>

        <Card className="shadow-soft">
          <h2 className="text-lg font-extrabold text-slate-900">Create your account</h2>
          <p className="mt-1 text-sm text-slate-600">
            Fields marked with <span className="text-rose-600">*</span> are required.
          </p>

          <div className="mt-6">
            <RegisterForm />
          </div>
        </Card>
      </div>
    </section>
  )
}
