'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, Loader2, LockKeyhole, MailWarning, ShieldCheck } from 'lucide-react'
import { loginSchema, type LoginInput } from '@/lib/validations'
import { AuthField } from '@/components/auth/auth-field'
import { PasswordField } from '@/components/ui/password-field'
import { VerificationCodeForm } from '@/components/features/verification-code-form'

function localDestination(value: unknown) {
  return typeof value === 'string' && /^\/(?!\/)[a-zA-Z0-9/_?=&.#%-]*$/.test(value) ? value : '/dashboard'
}

export function LoginForm({ localPreview = false }: { localPreview?: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const next = localDestination(params.get('next'))
  const [serverError, setServerError] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [totpStage, setTotpStage] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [unverified, setUnverified] = useState<{ email: string } | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  const { register, handleSubmit, getValues, trigger, watch, formState: { errors, isSubmitting } } =
    useForm<LoginInput>({ resolver: zodResolver(loginSchema), mode: 'onTouched' })

  if (unverified) return <div className="space-y-5">
    <div className="auth-message auth-message-neutral"><MailWarning size={20} aria-hidden="true" /><p>{localPreview ? 'This account is still pending. Email delivery is off in the local preview; no code will arrive in your inbox.' : 'One more step: verify your email address to activate your account.'}</p></div>
    <VerificationCodeForm email={unverified.email} localPreview={localPreview} onVerified={destination => { router.push(localDestination(destination ?? next)); router.refresh() }} />
    <button type="button" onClick={() => setUnverified(null)} className="auth-text-button">Back to sign in</button>
  </div>

  return <form className="auth-form" method="post" action="/api/auth/login" data-ready={ready} noValidate aria-busy={isSubmitting} onSubmit={handleSubmit(async values => {
    setServerError(null)
    setAttemptsRemaining(null)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, ...(totpCode ? { totp: totpCode } : {}) })
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        if (data?.code === 'EMAIL_NOT_VERIFIED') { setUnverified({ email: data.email ?? values.email }); return }
        if (data?.code === 'TOTP_REQUIRED' || data?.code === 'TOTP_INVALID') {
          setTotpStage(true); setTotpCode(''); setServerError(data?.code === 'TOTP_REQUIRED' ? null : data?.error ?? 'Check your authentication code.'); return
        }
        setServerError(data?.error ?? 'We could not sign you in. Check your email and password.')
        if (typeof data?.attemptsRemaining === 'number') setAttemptsRemaining(data.attemptsRemaining)
        return
      }
      router.push(localDestination(data?.redirectTo ?? next))
      router.refresh()
    } catch { setServerError('We could not connect. Your details are still here; please try again.') }
  })}>
    <noscript><p role="alert">Enable JavaScript to sign in securely.</p></noscript>
    <fieldset disabled={!ready || isSubmitting} className="auth-fieldset">
      <legend className="sr-only">Sign-in details</legend>
      <AuthField id="login-email" label="Email address" required error={errors.email?.message}>
        <input id="login-email" className="auth-input" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" {...register('email')} aria-required="true" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined} />
      </AuthField>
      <div className="auth-password">
        <PasswordField id="login-password" label="Password" required autoComplete="current-password" registration={register('password')} value={watch('password') ?? ''} error={errors.password?.message} showRequirements={false} showMeter={false} placeholder="Enter your password" disabled={isSubmitting} />
      </div>
      {totpStage && <div className="auth-two-factor">
        <p className="auth-section-label"><ShieldCheck size={17} aria-hidden="true" /> Two-step verification</p>
        <AuthField id="login-totp" label="Authentication code" hint="Enter the code from your authenticator app or a recovery code.">
          <input id="login-totp" className="auth-input auth-code-input" inputMode="text" autoComplete="one-time-code" autoFocus maxLength={7} value={totpCode} onChange={event => setTotpCode(event.target.value.replace(/[^0-9A-Fa-f-]/g, '').slice(0, 7))} placeholder="000000" aria-describedby="login-totp-hint" />
        </AuthField>
      </div>}
      {serverError && <div role="alert" className="auth-message auth-message-error"><AlertCircle size={19} aria-hidden="true" /><div><p>{serverError}</p>{attemptsRemaining !== null && attemptsRemaining > 0 && <p className="mt-1 text-xs">{attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining before a temporary account lock.</p>}</div></div>}
      <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Signing in…</> : <>Sign in <ArrowRight size={18} aria-hidden="true" /></>}</button>
      <button className="auth-verification-link" type="button" onClick={async () => { if (await trigger('email')) setUnverified({ email: getValues('email').trim() }) }}>Need help verifying your email?</button>
    </fieldset>
    <p className="auth-switch">New to PYPC? <Link href="/register">Create a free account</Link></p>
    <p className="auth-security-note"><LockKeyhole size={14} aria-hidden="true" /> Your account stays protected with a secure sign-in.</p>
  </form>
}
