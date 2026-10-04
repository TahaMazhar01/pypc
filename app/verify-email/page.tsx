
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { MailCheck, ShieldCheck } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { VerificationCodeForm } from '@/components/features/verification-code-form'
import { mailStatus, devMailVisible } from '@/lib/email/mailer'

export const metadata: Metadata = {
  title: 'Verify your email',
  description:
    'Enter the six-digit code sent to your email address to activate your Pakistan Youth Parliamentary Council account.',
  robots: { index: false, follow: false }
}

export const dynamic = 'force-dynamic'

/**
 * Email verification landing page.
 *
 * Reached in two ways:
 *  - from the signup flow (code typed in)
 *  - from the link inside the verification email (`?token=…`), which verifies
 *    automatically on load.
 */
export default function VerifyEmailPage({
  searchParams
}: {
  searchParams: { email?: string; token?: string }
}) {
  const email = (searchParams.email ?? '').trim()
  const token = searchParams.token
  const status = mailStatus()

  if (!email) {
    return (
      <>
        <PageHero
          eyebrow="Account security"
          title="Verify your email address"
          description="Open the link from your verification email, or enter the six-digit code we sent you."
          breadcrumb={[{ label: 'Verify email' }]}
        />

        <section className="container max-w-2xl py-14">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-extrabold text-primary-900">Need a new code?</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Enter the email address you registered with on the{displayContent(' ')}
              <Link href="/register" className="font-bold text-primary underline decoration-gold-300">
                sign up page
              </Link>{displayContent(' ')}
              and we will send a fresh code. If you already verified your address, simply{displayContent(' ')}
              <Link href="/login" className="font-bold text-primary underline decoration-gold-300">
                sign in
              </Link>
              .
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="text-sm font-bold text-primary underline decoration-gold-300">
                Back to sign up
              </Link>
              <Link href="/login" className="text-sm font-bold text-primary underline decoration-gold-300">
                Go to sign in
              </Link>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <PageHero
        eyebrow="Account security"
        title="Verify your email address"
        description="Your account stays locked until this step is complete — that is what keeps PYPC records, certificates and payment receipts tied to a real, reachable person."
        breadcrumb={[{ label: 'Verify email' }]}
      />

      <section className="container max-w-3xl py-14">
        <VerificationCodeForm email={email} token={token} />

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <ShieldCheck size={18} className="text-gold-600" />
            <p className="mt-3 text-sm font-extrabold text-primary-900">Why verification is required</p>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              Without it, anyone could register with someone else&apos;s address, receive their certificate
              links or reset their password. Verification proves the mailbox is yours before any access is
              granted.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <MailCheck size={18} className="text-gold-600" />
            <p className="mt-3 text-sm font-extrabold text-primary-900">Delivery status on this deployment</p>
            <p className="mt-2 text-xs leading-6 text-slate-600">{displayContent(status.message)}</p>
            {displayContent(devMailVisible() ? (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                EMAIL_DEV_MODE is on (local testing): codes are shown on screen instead of being emailed.
              </p>
            ) : null)}
          </div>
        </div>
      </section>
    </>
  )
}
