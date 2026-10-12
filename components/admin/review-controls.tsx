'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminDialog } from '@/components/admin/admin-dialog'
import { APPLICATION_STATUSES } from '@/lib/constants'
import { PARTNERSHIP_STATUSES, VISA_LETTER_STATUSES } from '@/lib/validations'
export function ReviewControls({ kind, id, status, notes }: { kind: 'application' | 'partnership' | 'visa' | 'message'; id: string; status: string; notes?: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [nextStatus, setNextStatus] = useState(status)
  const [text, setText] = useState(notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const statuses = kind === 'application' ? APPLICATION_STATUSES : kind === 'partnership' ? PARTNERSHIP_STATUSES : kind === 'visa' ? VISA_LETTER_STATUSES : ['NEW','IN_PROGRESS','RESOLVED','ARCHIVED']
  const endpoint = kind === 'application' ? 'applications' : kind === 'partnership' ? 'partnerships' : kind === 'visa' ? 'visa-letters' : 'messages'
  async function save(value = nextStatus) {
    if (value === 'ARCHIVED' && status !== 'ARCHIVED' && !window.confirm('Archive this record? Its submitted information will be retained and you can reopen it later.')) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/' + endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(kind === 'message' ? { id, status: value } : { [kind === 'application' ? 'applicationId' : 'requestId']: id, status: value, adminNotes: text }) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error)
      setOpen(false); router.refresh()
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save. Please try again.') }
    finally { setBusy(false) }
  }
  return <><button className="admin-action" onClick={() => { setNextStatus(status); setText(notes ?? ''); setError(''); setOpen(true) }}>Review / update</button>{open && <AdminDialog title={kind === 'message' ? 'Manage message' : 'Review request'} busy={busy} onClose={() => setOpen(false)}>
    <form onSubmit={event => { event.preventDefault(); void save() }}><fieldset disabled={busy} className="space-y-5"><label className="admin-field">Status<select aria-label="Status" value={nextStatus} onChange={event => setNextStatus(event.target.value)}>{statuses.map(value => <option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>
      {kind !== 'message' && <label className="admin-field">{kind === 'partnership' ? 'Internal note' : 'Note visible to the member'}<textarea rows={6} maxLength={2000} value={text} onChange={event => setText(event.target.value)} /></label>}
      <p className="text-xs leading-6 text-slate-600">Submitted details are retained. Archive closes the record for now; reopening returns it to the review queue. Every change is audited.</p>
      <div className="admin-dialog-actions"><button className="admin-action admin-action-primary" disabled={busy}>Save decision</button><button type="button" className="admin-action admin-action-danger" disabled={busy} onClick={() => void save(status === 'ARCHIVED' ? kind === 'partnership' ? 'SUBMITTED' : kind === 'message' ? 'NEW' : 'PENDING' : 'ARCHIVED')}>{status === 'ARCHIVED' ? 'Reopen for review' : 'Archive record'}</button><button type="button" className="admin-action" onClick={() => setOpen(false)}>Cancel</button></div>
      {error && <p role="alert" className="admin-notice admin-notice-error">{error}</p>}
    </fieldset></form>
  </AdminDialog>}</>
}
