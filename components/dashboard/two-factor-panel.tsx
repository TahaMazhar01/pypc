'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { Copy, KeyRound, Loader2, ShieldCheck, ShieldOff } from 'lucide-react'

type Stage = 'idle' | 'password' | 'scan' | 'confirm' | 'codes' | 'disable'

/**
 * Two-factor authentication, self-service.
 *
 * The flow is deliberately honest about each step: the secret is shown as a QR
 * code (drawn by the browser from the otpauth URI, so no external image service
 * ever sees it), then as a typed key, and the member must prove the app works by
 * entering one code before 2FA is actually switched on. Recovery codes are shown
 * once, with a copy button, and the page says plainly that they are the only way
 * in if the phone is lost.
 */
export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const [stage, setStage] = useState<Stage>('idle')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [secret, setSecret] = useState<string | null>(null)
  const [readableSecret, setReadableSecret] = useState<string | null>(null)
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function call(payload: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/dashboard/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error ?? 'That did not work. Please try again.')
        return null
      }
      return data
    } catch {
      setError('Network error. Please check your connection and try again.')
      return null
    } finally {
      setBusy(false)
    }
  }

  if (enabled && stage === 'idle') {
    // Re-bound so the comparisons below are not narrowed away by the check above.
    const current = stage as Stage
    return (
      <div>
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
          <ShieldCheck size={16} /> Two factor authentication is on
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Signing in requires your password and a six digit code from your authenticator app. If you lose
          the phone, a recovery code gets you in, each one works once.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setStage('password')}
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:border-primary-300 hover:text-primary"
          >
            <KeyRound size={15} /> Get new recovery codes
          </button>
          <button
            type="button"
            onClick={() => setStage('disable')}
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
          >
            <ShieldOff size={15} /> Turn off
          </button>
        </div>

        {displayContent(current === 'password' ? (
          <form
            className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            onSubmit={async event => {
              event.preventDefault()
              const data = await call({ action: 'regenerate', password, code })
              if (data?.recoveryCodes) {
                setRecoveryCodes(data.recoveryCodes)
                setStage('codes')
              }
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Confirm your identity to generate new codes
            </p>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Your password"
              className="focus-ring h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm"
            />
            <input
              inputMode="numeric"
              required
              value={code}
              onChange={event => setCode(event.target.value)}
              placeholder="Current code or a recovery code"
              className="focus-ring h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {displayContent(busy ? <Loader2 size={15} className="animate-spin" /> : null)} Generate new codes
            </button>
          </form>
        ) : null)}

        {displayContent(current === 'disable' ? (
          <form
            className="mt-5 space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4"
            onSubmit={async event => {
              event.preventDefault()
              const data = await call({ action: 'disable', password })
              if (data?.ok) {
                setMessage(data.message)
                setStage('idle')
                // Reload so the panel reflects the new state server-side.
                window.location.reload()
              }
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-rose-800">
              Turning 2FA off weakens your account. Confirm with your password.
            </p>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Your password"
              className="focus-ring h-11 w-full rounded-lg border border-rose-200 px-3.5 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {displayContent(busy ? <Loader2 size={15} className="animate-spin" /> : null)} Turn off two factor
            </button>
          </form>
        ) : null)}

        {displayContent(recoveryCodes ? <RecoveryCodes codes={recoveryCodes} /> : null)}
        <Feedback error={error} message={message} />
      </div>
    )
  }

  if (stage === 'codes' && recoveryCodes) {
    return (
      <div>
        <p className="font-bold text-slate-900">Your recovery codes</p>
        <RecoveryCodes codes={recoveryCodes} />
        <button
          type="button"
          onClick={() => {
            setRecoveryCodes(null)
            setStage('idle')
            setPassword('')
            setCode('')
          }}
          className="focus-ring mt-4 h-10 rounded-lg bg-primary px-4 text-sm font-bold text-white"
        >
          I have saved them
        </button>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm leading-6 text-slate-600">
        Adds a second step to signing in: your password, then a six digit code from an authenticator app on
        your phone. It is optional, it works offline, and your code is generated on your own device, we
        never send codes by SMS, and the app cannot be blocked by network coverage.
      </p>

      {displayContent(stage === 'idle' ? (
        <button
          type="button"
          onClick={() => setStage('password')}
          className="focus-ring mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-800"
        >
          <ShieldCheck size={16} /> Set up two factor authentication
        </button>
      ) : null)}

      {displayContent(stage === 'password' ? (
        <form
          className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={async event => {
            event.preventDefault()
            const data = await call({ action: 'begin', password })
            if (data?.secret) {
              setSecret(data.secret)
              setReadableSecret(data.readableSecret)
              setOtpauthUri(data.otpauthUri)
              setStage('scan')
            }
          }}
        >
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-700" htmlFor="twofa-password">
            Confirm your password to begin
          </label>
          <input
            id="twofa-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            className="focus-ring h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm"
            placeholder="Your password"
          />
          <button
            type="submit"
            disabled={busy}
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {displayContent(busy ? <Loader2 size={15} className="animate-spin" /> : null)} Continue
          </button>
        </form>
      ) : null)}

      {displayContent(stage === 'scan' && secret && otpauthUri ? (
        <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
            1. Scan this with your authenticator app
          </p>

          <div className="flex flex-wrap items-start gap-5">
            <QrCode value={otpauthUri} />
            <div className="min-w-[220px] flex-1">
              <p className="text-xs font-semibold text-slate-600">Or type this key by hand:</p>
              <p className="mt-1 select-all rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm tracking-wider">
                {displayContent(readableSecret ?? secret)}
              </p>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                Account name: your PYPC email · Type: time based (TOTP) · 6 digits · 30 seconds
              </p>
            </div>
          </div>

          <form
            className="space-y-3 border-t border-slate-200 pt-4"
            onSubmit={async event => {
              event.preventDefault()
              const data = await call({ action: 'confirm', code })
              if (data?.recoveryCodes) {
                setRecoveryCodes(data.recoveryCodes)
                setMessage(data.message)
                setStage('codes')
              }
            }}
          >
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700" htmlFor="twofa-code">
              2. Enter the six digit code it shows
            </label>
            <input
              id="twofa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={event => setCode(event.target.value.replace(/[^0-9]/g, ''))}
              className="focus-ring h-11 w-40 rounded-lg border border-slate-300 px-3.5 text-center font-mono text-lg tracking-widest"
              placeholder="000000"
            />
            <div>
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                {displayContent(busy ? <Loader2 size={15} className="animate-spin" /> : null)} Switch on two factor
              </button>
            </div>
            <p className="text-[11px] leading-5 text-slate-500">
              Nothing changes until this code is accepted, so a half finished setup can never lock you out.
            </p>
          </form>
        </div>
      ) : null)}

      {displayContent(recoveryCodes ? <RecoveryCodes codes={recoveryCodes} /> : null)}
      <Feedback error={error} message={message} />
    </div>
  )
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-900">Save these recovery codes now</p>
      <p className="mt-1 text-xs leading-5 text-amber-900">
        Each code signs you in once if you lose your phone. They are shown only this once, store them
        somewhere safe and offline.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map(code => (
          <li key={code} className="rounded bg-white px-3 py-1.5 text-center tracking-wide">
            {displayContent(code)}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(codes.join('\n'))
            setCopied(true)
          } catch {
            setCopied(false)
          }
        }}
        className="focus-ring mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900"
      >
        <Copy size={13} /> {displayContent(copied ? 'Copied' : 'Copy all')}
      </button>
    </div>
  )
}

function Feedback({ error, message }: { error: string | null; message: string | null }) {
  return (
    <>
      {displayContent(error ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">
          {displayContent(error)}
        </p>
      ) : null)}
      {displayContent(message ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
          {displayContent(message)}
        </p>
      ) : null)}
    </>
  )
}

/**
 * QR code rendered locally from the otpauth URI.
 *
 * Deliberately not an external QR image service: the provisioning URI contains
 * the account's TOTP secret, so sending it to a third party to be drawn would
 * hand them the second factor. The QR is generated as an SVG grid in the browser
 * from the `qrcode` package that is already a dependency for certificates.
 */
function QrCode({ value }: { value: string }) {
  const [svg, setSvg] = useState<string | null>(null)

  if (!svg) {
    void import('qrcode')
      .then(QR => QR.toString(value, { type: 'svg', margin: 1, width: 168 }))
      .then(setSvg)
      .catch(() => setSvg(null))
  }

  return (
    <div
      className="flex h-[180px] w-[180px] items-center justify-center rounded-xl border border-slate-300 bg-white p-1"
      aria-label="QR code for authenticator app setup"
      role="img"
    >
      {displayContent(svg ? (
        <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <Loader2 size={20} className="animate-spin text-slate-500" />
      ))}
    </div>
  )
}
