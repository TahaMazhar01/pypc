'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { Select, Textarea } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { VISA_LETTER_STATUSES } from '@/lib/validations'
import { humanise } from '@/lib/utils'

/**
 * Secretariat controls for an invitation-letter request: change the status and
 * leave a note for the delegate. Every change notifies the member and is written
 * to the audit log by the API route.
 */
export function VisaLetterControls({
  requestId,
  status,
  adminNotes
}: {
  requestId: string
  status: string
  adminNotes: string | null
}) {
  const router = useRouter()
  const [nextStatus, setNextStatus] = useState(status)
  const [notes, setNotes] = useState(adminNotes ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/admin/visa-letters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status: nextStatus, adminNotes: notes })
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data?.error ?? 'The update could not be saved.')
        return
      }

      setMessage(`Status set to ${humanise(nextStatus)}. The delegate has been notified.`)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[220px_1fr_auto]">
      <div>
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500" htmlFor={`status-${requestId}`}>
          Status
        </label>
        <Select
          id={`status-${requestId}`}
          value={nextStatus}
          onChange={event => setNextStatus(event.target.value)}
        >
          {VISA_LETTER_STATUSES.map(item => (
            <option key={item} value={item}>
              {displayContent(humanise(item))}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500" htmlFor={`notes-${requestId}`}>
          Note to delegate (optional)
        </label>
        <Textarea
          id={`notes-${requestId}`}
          rows={2}
          value={notes}
          onChange={event => setNotes(event.target.value)}
          placeholder="e.g. Letter issued and emailed. Reference included on page 2."
        />
      </div>

      <div className="flex flex-col justify-end gap-2">
        <Button type="button" size="md" onClick={save} disabled={busy}>
          {displayContent(busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />)}
          {displayContent(busy ? 'Saving…' : 'Save decision')}
        </Button>
        {displayContent(message ? <p className="text-xs font-semibold text-emerald-700">{displayContent(message)}</p> : null)}
        {displayContent(error ? <p className="text-xs font-semibold text-rose-600">{displayContent(error)}</p> : null)}
      </div>
    </div>
  )
}
