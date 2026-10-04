'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, XCircle, CheckCircle2 } from 'lucide-react'

/**
 * Development-only panel. This screen exists so the complete journey
 * (plan → order → payment → membership activation → certificate) can be
 * tested without merchant credentials. It is never reachable in production
 * unless PAYMENTS_SIMULATION_MODE is explicitly enabled on a non-production build.
 */
export function SimulatePaymentPanel({ reference }: { reference: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'SUCCESS' | 'FAILURE' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(outcome: 'SUCCESS' | 'FAILURE') {
    setBusy(outcome)
    setError(null)

    const response = await fetch('/api/memberships/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, outcome })
    })

    const data = await response.json().catch(() => null)
    setBusy(null)

    if (!response.ok) {
      setError(data?.error ?? 'Simulation failed.')
      return
    }

    router.push(data.redirectTo ?? '/membership/checkout')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-8">
      <p className="flex items-center gap-2 font-extrabold text-amber-800">
        <AlertTriangle size={20} /> Simulated payment (development only)
      </p>

      <p className="mt-3 text-sm leading-7 text-amber-800">
        No real money moves here. This screen replaces the gateway page while JazzCash, Easypaisa and
        Stripe credentials are pending. Confirm to activate the membership and issue notifications, or
        fail it to verify the failure path.
      </p>

      <p className="mt-4 rounded-xl bg-white px-4 py-3 font-mono text-sm font-bold text-slate-700">
        Order reference: {displayContent(reference)}
      </p>

      {displayContent(error ? (
        <p className="mt-4 rounded-lg bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-800">{displayContent(error)}</p>
      ) : null)}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => run('SUCCESS')}
          disabled={busy !== null}
          className="focus-ring inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 font-bold text-white disabled:opacity-60"
        >
          {displayContent(busy === 'SUCCESS' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />)}
          Confirm successful payment
        </button>

        <button
          type="button"
          onClick={() => run('FAILURE')}
          disabled={busy !== null}
          className="focus-ring inline-flex h-12 items-center gap-2 rounded-lg border border-rose-300 bg-white px-6 font-bold text-rose-700 disabled:opacity-60"
        >
          {displayContent(busy === 'FAILURE' ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />)}
          Simulate failed payment
        </button>
      </div>

      <p className="mt-5 text-xs leading-6 text-amber-800">
        To go live: set PAYMENTS_SIMULATION_MODE=&quot;false&quot; and add the real merchant values from your
        approved JazzCash, Easypaisa and Stripe accounts to the environment file.
      </p>
    </div>
  )
}
