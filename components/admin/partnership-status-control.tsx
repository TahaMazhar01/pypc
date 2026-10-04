'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea, Field } from '@/components/ui/field'
import { Select } from '@/components/ui/field'
import { PARTNERSHIP_STATUSES } from '@/lib/validations'
import { PARTNERSHIP_STATUS_LABELS } from '@/lib/partnerships'

/**
 * Status control for one partnership request.
 *
 * Staff pick a status and (optionally) leave a note; the PATCH is audited on the
 * server, so this component holds no authority of its own — it only reports what
 * the server decided.
 */
export function PartnershipStatusControl({
  requestId,
  status: initialStatus,
  adminNotes: initialNotes
}: {
  requestId: string
  status: string
  adminNotes: string | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dirty = status !== initialStatus || notes !== (initialNotes ?? '')

  async function save() {
    setSaving(true)
    setError(null)
    setMessage(null)

    const response = await fetch('/api/admin/partnerships', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, status, adminNotes: notes })
    })

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; label?: string; error?: string }
      | null

    setSaving(false)

    if (!response.ok || !data?.ok) {
      setError(data?.error ?? 'The status could not be saved.')
      return
    }

    setMessage(`Saved — ${data.label ?? status}. Recorded in the audit log.`)
    router.refresh()
  }

  return (
    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start">
        <Field label="Status" htmlFor={`status-${requestId}`}>
          <Select
            id={`status-${requestId}`}
            value={status}
            onChange={event => setStatus(event.target.value)}
          >
            {PARTNERSHIP_STATUSES.map(value => (
              <option key={value} value={value}>
                {displayContent(PARTNERSHIP_STATUS_LABELS[value])}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Internal note"
          htmlFor={`notes-${requestId}`}
          hint="What was decided and why. Not shown to the institution."
        >
          <Textarea
            id={`notes-${requestId}`}
            rows={2}
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder="Scope call held on…, agreement drafted, awaiting their registrar."
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          {displayContent(saving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving…
            </>
          ) : (
            'Save decision'
          ))}
        </Button>
        {message && <p className="text-xs font-semibold text-emerald-700">{displayContent(message)}</p>}
        {error && (
          <p className="text-xs font-semibold text-rose-600" role="alert">
            {displayContent(error)}
          </p>
        )}
      </div>
    </div>
  )
}
