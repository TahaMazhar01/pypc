'use client'


import { displayContent } from '@/lib/display-content'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, MailCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Six-digit verification code entry.
 *
 * The code is entered in a single input (fast on mobile with autofill), pasted
 * codes are cleaned automatically, and the resend button is rate limited by the
 * API rather than by the UI alone.
 */
export function VerificationCodeForm({
  email,
  devCode,
  devLink,
  token,
  onVerified
}: {
  email: string
  devCode?: string
  devLink?: string
  token?: string
  onVerified?: (redirectTo?: string) => void
}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [localDevCode, setLocalDevCode] = useState(devCode)
  const [localDevLink, setLocalDevLink] = useState(devLink)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = window.setInterval(() => setSecondsLeft(current => Math.max(0, current - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [secondsLeft])

  async function submit(nextCode: string) {
    if (nextCode.length !== 6 || busy) return
    setBusy(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(token ? { email, token } : { email, code: nextCode })
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.error ?? 'That code could not be verified. Please try again.')
        setCode('')
        inputRef.current?.focus()
        return
      }

      setNotice('Email verified — your account is active. Taking you to your dashboard…')
      onVerified?.(data?.redirectTo)
    } catch {
      setError('Network error while verifying. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // Auto-submit when the email link supplied a token.
  useEffect(() => {
    if (token) void submit('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function resend() {
    setResending(true)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.error ?? 'A new code could not be requested right now.')
        return
      }

      setNotice(data?.message ?? 'A new code is on its way.')
      setLocalDevCode(data?.devCode)
      setLocalDevLink(data?.devLink)
      setSecondsLeft(60)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary">
          <KeyRound size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-primary-900">Enter your verification code</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Six digits sent to <strong className="break-all">{displayContent(email)}</strong>. The code expires in 30 minutes
            and can only be used once.
          </p>
        </div>
      </div>

      <form
        className="mt-5 flex flex-wrap items-center gap-3"
        onSubmit={event => {
          event.preventDefault()
          void submit(code)
        }}
      >
        <input
          ref={inputRef}
          value={code}
          onChange={event => {
            const cleaned = event.target.value.replace(/\D/g, '').slice(0, 6)
            setCode(cleaned)
            if (cleaned.length === 6) void submit(cleaned)
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          aria-label="Six digit verification code"
          placeholder="000000"
          className="focus-ring h-14 w-[190px] rounded-xl border border-slate-200 bg-white text-center font-mono text-2xl font-bold tracking-[0.5em] text-primary-900 placeholder:tracking-[0.3em] placeholder:text-slate-300"
        />

        <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
          {displayContent(busy ? <Loader2 size={18} className="animate-spin" /> : <MailCheck size={18} />)}
          {displayContent(busy ? 'Verifying…' : 'Verify email')}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={resend}
          disabled={resending || secondsLeft > 0}
        >
          {displayContent(resending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />)}
          {displayContent(secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code')}
        </Button>
      </form>

      {displayContent(error ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {displayContent(error)}
        </p>
      ) : null)}

      {displayContent(notice ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {displayContent(notice)}
        </p>
      ) : null)}

      {displayContent(localDevCode ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-800">
            Local testing only, SMTP not configured
          </p>
          <p className="mt-2 text-sm text-amber-900">
            This deployment has no SMTP server, so the code is shown here because{displayContent(' ')}
            <code className="font-mono">EMAIL_DEV_MODE=true</code>. It is never shown when SMTP is configured
            or in production.
          </p>
          <p className="mt-3 font-mono text-2xl font-extrabold tracking-[0.4em] text-amber-900">{displayContent(localDevCode)}</p>
          {displayContent(localDevLink ? (
            <p className="mt-2 break-all text-xs text-amber-800">
              Link:{displayContent(' ')}
              <Link href={localDevLink} className="font-bold underline">
                {displayContent(localDevLink)}
              </Link>
            </p>
          ) : null)}
        </div>
      ) : null)}

      <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-6 text-slate-500">
        Nothing arriving? Check the spam folder, confirm the address is spelled correctly, or contact{displayContent(' ')}
        <Link href="/contact" className="font-bold text-primary underline decoration-gold-300">
          the secretariat
        </Link>
        . Accounts that are never verified are never activated.
      </p>
    </div>
  )
}
