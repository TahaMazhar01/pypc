'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminDialog } from '@/components/admin/admin-dialog'
export function PaymentControls({ reference, amount }: { reference: string; amount: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [evidence, setEvidence] = useState('')
  const [note, setNote] = useState('')
  const [decision, setDecision] = useState('APPROVE')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!window.confirm(`${decision === 'APPROVE' ? 'Confirm receipt of' : 'Reject'} ${amount} for ${reference}? This financial decision is recorded permanently.`)) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/payments/manual-settlement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference, evidence, note, decision }) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error)
      setOpen(false); router.refresh()
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not reconcile. Refresh the record before retrying.') }
    finally { setBusy(false) }
  }
  return <><button className="admin-action" onClick={() => setOpen(true)}>Reconcile payment</button>{open && <AdminDialog title="Reconcile pending payment" busy={busy} onClose={() => setOpen(false)}><p className="mb-5 text-sm">{reference} · {amount}</p><form onSubmit={submit}><fieldset disabled={busy} className="space-y-5"><label className="admin-field">Decision<select aria-label="Decision" value={decision} onChange={event => setDecision(event.target.value)}><option value="APPROVE">Payment received / activate membership</option><option value="REJECT">Payment not accepted</option></select></label><label className="admin-field">Bank or receipt reference<input required minLength={4} maxLength={280} value={evidence} onChange={event => setEvidence(event.target.value)} /></label><label className="admin-field">Internal note<textarea rows={4} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></label><p className="text-xs leading-6 text-slate-600">Confirm money received against independent records. Paid or failed orders cannot be settled again or deleted.</p><div className="admin-dialog-actions"><button className="admin-action admin-action-primary" disabled={busy}>Record decision</button><button type="button" className="admin-action" onClick={() => setOpen(false)}>Cancel</button></div>{error && <p role="alert" className="admin-notice admin-notice-error">{error}</p>}</fieldset></form></AdminDialog>}</>
}
