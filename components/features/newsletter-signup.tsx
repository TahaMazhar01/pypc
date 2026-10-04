'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { CheckCircle2, Loader2, Mail } from 'lucide-react'
import { HumanCheck } from '@/components/forms/human-check'

/**
 * Newsletter sign-up — double opt-in, honest about what happens next.
 *
 * The widget deliberately does not say "you're subscribed" after a POST: it says
 * a confirmation link has been sent, because that is what actually happens, and
 * pretending otherwise is how mailing lists get filled with addresses that never
 * consented.
 */
export function NewsletterSignup({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [interests, setInterests] = useState('newsletter')
  const [humanCheck, setHumanCheck] = useState<{ token: string; answer: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          interests,
          humanToken: humanCheck?.token ?? '',
          humanAnswer: humanCheck?.answer ?? ''
        })
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.error ?? 'Subscription could not be recorded. Please try again.')
        return
      }

      setMessage(data?.message ?? 'Check your inbox for the confirmation link.')
      setEmail('')
      setName('')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    return (
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-primary-100">
            Email address
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="focus-ring h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-primary-200"
          />
        </label>
        <div className="hidden" aria-hidden="true">
          <input
            tabIndex={-1}
            autoComplete="off"
            value={name}
            onChange={event => setName(event.target.value)}
            aria-hidden="true"
          />
        </div>
        <div className="sm:w-56">
          <HumanCheck onChange={setHumanCheck} label="Quick check" />
        </div>
        <button
          type="submit"
          disabled={busy || !humanCheck}
          className="focus-ring h-11 shrink-0 rounded-lg bg-gold px-5 text-sm font-bold text-primary-900 transition hover:bg-gold-400 disabled:opacity-60"
        >
          {displayContent(busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />)}
          <span className="ml-2">{displayContent(busy ? 'Sending…' : 'Subscribe')}</span>
        </button>
        {displayContent(message ? (
          <p className="text-xs font-semibold text-emerald-300 sm:hidden">{displayContent(message)}</p>
        ) : null)}
        {displayContent(error ? (
          <p className="text-xs font-semibold text-rose-300 sm:hidden" role="alert">
            {displayContent(error)}
          </p>
        ) : null)}
      </form>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">
            Email address
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="focus-ring h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">
            Name <span className="font-normal normal-case text-slate-500">(optional)</span>
          </span>
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Ayesha Khan"
            className="focus-ring h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm"
          />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">
          What should we send you?
        </legend>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'newsletter', label: 'Monthly newsletter' },
            { value: 'events', label: 'Event invitations' },
            { value: 'opportunities', label: 'Scholarships & opportunities' },
            { value: 'research', label: 'Policy briefs' }
          ].map(option => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-full border px-3.5 py-2 text-xs font-bold transition ${
                interests === option.value
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-300 text-slate-700 hover:border-primary-300'
              }`}
            >
              <input
                type="radio"
                name="interests"
                value={option.value}
                checked={interests === option.value}
                onChange={() => setInterests(option.value)}
                className="sr-only"
              />
              {displayContent(option.label)}
            </label>
          ))}
        </div>
      </fieldset>

      <HumanCheck onChange={setHumanCheck} />

      <button
        type="submit"
        disabled={busy || !humanCheck}
        className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary-800 disabled:opacity-60"
      >
        {displayContent(busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />)}
        {displayContent(busy ? 'Sending confirmation…' : 'Send me the confirmation link')}
      </button>

      {displayContent(message ? (
        <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {displayContent(message)}
        </p>
      ) : null)}

      {displayContent(error ? (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">
          {displayContent(error)}
        </p>
      ) : null)}

      <p className="text-xs leading-6 text-slate-500">
        Double opt in: nothing is sent to your address until you click the confirmation link in the email we
        are about to send. Every mailing carries a one click unsubscribe link, and we never sell or share
        subscriber addresses.
      </p>
    </form>
  )
}
