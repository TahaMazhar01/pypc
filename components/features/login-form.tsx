'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2, LogIn, MailWarning, ShieldAlert, ShieldCheck } from 'lucide-react'
import { loginSchema, type LoginInput } from '@/lib/validations'
import { Field, Input } from '@/components/ui/field'
import { PasswordField } from '@/components/ui/password-field'
import { Button } from '@/components/ui/button'
import { VerificationCodeForm } from '@/components/features/verification-code-form'

/**
 * Sign-in form.
 *
 * Handles the three security outcomes the API can return:
 *  - wrong credentials, with the remaining attempts before a lockout
 *  - a temporary lock after repeated failures
 *  - an unverified email, which switches the form into the code-verification step
 *    so the visitor is not dead-ended
 */
export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/dashboard'
  const [serverError, setServerError] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  // Set when the account has two-factor authentication switched on: the
  // password was right, and the form now asks for the six-digit code.
  const [totpStage, setTotpStage] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [unverified, setUnverified] = useState<{ email: string } | null>(null)

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const passwordValue = watch('password') ?? ''

  if (unverified) {
    return (
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <MailWarning size={16} className="mt-0.5 shrink-0" />
          That account exists but its email address has not been verified yet. Verify it now and you will be
          signed in automatically.
        </p>

        <VerificationCodeForm
          email={unverified.email}
          onVerified={redirectTo => {
            router.push(redirectTo ?? next)
            router.refresh()
          }}
        />

        <button
          type="button"
          onClick={() => setUnverified(null)}
          className="text-sm font-bold text-primary underline decoration-gold-300"
        >
          Use a different email address
        </button>
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async values => {
        setServerError(null)
        setAttemptsRemaining(null)

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, ...(totpCode ? { totp: totpCode } : {}) })
          })
          const data = await response.json().catch(() => null)

          if (!response.ok) {
            if (data?.code === 'EMAIL_NOT_VERIFIED') {
              setUnverified({ email: data.email ?? values.email })
              return
            }

            // Two-factor step: keep the password in the form, ask for the code.
            if (data?.code === 'TOTP_REQUIRED' || data?.code === 'TOTP_INVALID') {
              setTotpStage(true)
              setTotpCode('')
              setServerError(data?.error ?? null)
              return
            }

            setServerError(data?.error ?? 'Sign in failed. Check your email and password.')
            if (typeof data?.attemptsRemaining === 'number') setAttemptsRemaining(data.attemptsRemaining)
            return
          }

          router.push(data?.redirectTo ?? next)
          router.refresh()
        } catch {
          setServerError('Network error. Please check your connection and try again.')
        }
      })}
    >
      <Field label="Email address" required error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...register('email')} placeholder="you@example.com" />
      </Field>

      <PasswordField
        label="Password"
        required
        autoComplete="current-password"
        registration={register('password')}
        value={passwordValue}
        error={errors.password?.message}
        showRequirements={false}
        showMeter={false}
      />

      {displayContent(totpStage ? (
        <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">
          <label htmlFor="totp" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-900">
            <ShieldCheck size={14} /> Two factor code
          </label>
          <input
            id="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={7}
            value={totpCode}
            onChange={event => setTotpCode(event.target.value.replace(/[^0-9A-Fa-f-]/g, '').slice(0, 7))}
            placeholder="000000"
            className="focus-ring mt-2 h-11 w-40 rounded-lg border border-slate-300 bg-white px-3.5 text-center font-mono text-lg tracking-widest"
          />
          <p className="mt-2 text-[11px] leading-5 text-slate-600">
            The six digit code from your authenticator app, or one of your saved recovery codes. Recovery
            codes work once each.
          </p>
        </div>
      ) : null)}

      {displayContent(serverError ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {displayContent(attemptsRemaining === 0 ? (
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          ))}
          <span>
            {displayContent(serverError)}
            {displayContent(typeof attemptsRemaining === 'number' && attemptsRemaining > 0 ? (
              <span className="mt-1 block text-xs font-semibold text-rose-600">
                {displayContent(attemptsRemaining)} attempt{displayContent(attemptsRemaining === 1 ? '' : 's')} left before the account is
                locked for 15 minutes.
              </span>
            ) : null)}
          </span>
        </p>
      ) : null)}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {displayContent(isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />)}
        {displayContent(isSubmitting ? 'Signing in…' : 'Sign in')}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={() => setUnverified({ email: getValues('email') })}
          className="font-semibold text-slate-500 hover:text-primary"
        >
          Need a verification code?
        </button>
        <Link href="/register" className="font-bold text-primary hover:underline">
          Create a free account
        </Link>
      </div>

      <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
        For your protection, repeated failed attempts lock the account for 15 minutes, every attempt is
        audit logged with its IP address, and unverified accounts cannot sign in.
      </p>
    </form>
  )
}
