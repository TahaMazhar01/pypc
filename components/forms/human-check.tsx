'use client'


import { displayContent } from '@/lib/display-content'
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, ShieldCheck } from 'lucide-react'

type Props = {
  /**
   * Called with the current token/answer pair whenever either changes, and with
   * `null` while no challenge is loaded, so the parent form can block submit
   * until the check is ready.
   */
  onChange: (value: { token: string; answer: string } | null) => void
  /** Reported back to the parent so a failed submit can refresh the question. */
  label?: string
}

/**
 * Human check widget — the client half of `lib/security/human-check.ts`.
 *
 * Renders a question the server issued and signed, an input, and a refresh
 * control. Fully keyboard operable, screen-reader labelled, and it announces its
 * state through the visible text rather than colour alone.
 */
export function HumanCheck({ onChange, label = 'Security check' }: Props) {
  const [question, setQuestion] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setAnswer('')
    onChange(null)

    try {
      const response = await fetch('/api/human-check', { cache: 'no-store' })
      if (!response.ok) throw new Error('challenge unavailable')
      const data = (await response.json()) as { token: string; question: string }
      setToken(data.token)
      setQuestion(data.question)
    } catch {
      setToken(null)
      setQuestion(null)
      setError('The security check could not be loaded. Check your connection and refresh it.')
    } finally {
      setLoading(false)
    }
  }, [onChange])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (token) onChange({ token, answer })
  }, [token, answer, onChange])

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="human-answer" className="text-xs font-bold uppercase tracking-wide text-slate-700">
          <ShieldCheck size={13} className="mr-1 inline" aria-hidden="true" />
          {displayContent(label)}
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="focus-ring inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold text-primary underline-offset-4 hover:underline"
        >
          <RefreshCw size={12} aria-hidden="true" /> New question
        </button>
      </div>

      {displayContent(loading ? (
        <p className="mt-2 text-sm text-slate-500" role="status">
          Loading a security question…
        </p>
      ) : error ? (
        <p className="mt-2 text-sm font-semibold text-rose-700" role="alert">
          {displayContent(error)}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm font-semibold text-slate-800" id="human-question">
            {displayContent(question)}
          </p>
          <input
            id="human-answer"
            name="humanAnswer"
            inputMode="numeric"
            autoComplete="off"
            aria-describedby="human-hint human-error"
            value={answer}
            onChange={event => setAnswer(event.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
            className="focus-ring mt-2 h-11 w-28 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            placeholder="Answer"
          />
          <p id="human-hint" className="mt-2 text-[11px] leading-5 text-slate-500">
            This proves a person is filling the form. It is answered in one second and never shared
            with a third party service.
          </p>
        </>
      ))}

      <input type="hidden" name="humanToken" value={token ?? ''} />
      <p id="human-error" className="sr-only" aria-live="polite">
        {displayContent(error ?? '')}
      </p>
    </div>
  )
}
