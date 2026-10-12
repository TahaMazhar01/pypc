'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminDialog } from '@/components/admin/admin-dialog'
type Details = { title: string; recipientName: string; description: string; grade: string | null }
export function CertificateEditor({ certificate }: { certificate: Details & { id: string; code: string; status: string } }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState<Details>({ title: certificate.title, recipientName: certificate.recipientName, description: certificate.description, grade: certificate.grade })
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(action: 'UPDATE' | 'REVOKE' | 'REINSTATE') {
    if (action !== 'UPDATE' && !window.confirm(`${action === 'REVOKE' ? 'Revoke' : 'Reinstate'} this certificate? Its verification history will remain available.`)) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/certificates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ certificateId: certificate.id, action, ...(action === 'UPDATE' ? { details } : { reason }) }) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error)
      setOpen(false); router.refresh()
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save changes.') }
    finally { setBusy(false) }
  }
  return <><button className="admin-action" onClick={() => { setError(''); setOpen(true) }}>Edit certificate</button>{open && <AdminDialog title="Manage certificate" busy={busy} onClose={() => setOpen(false)}><p className="mb-5 text-xs text-slate-600">{certificate.code} · {certificate.status}. Issued records cannot be deleted; revoke and reinstate preserve the public verification trail.</p><form onSubmit={event => { event.preventDefault(); void save('UPDATE') }}><fieldset disabled={busy} className="space-y-5">
    <div className="admin-form-grid"><label className="admin-field">Certificate title<input required minLength={3} maxLength={180} value={details.title} onChange={event => setDetails({ ...details, title: event.target.value })} /></label><label className="admin-field">Recipient name<input required minLength={2} maxLength={180} value={details.recipientName} onChange={event => setDetails({ ...details, recipientName: event.target.value })} /></label><label className="admin-field admin-form-full">Description<textarea required minLength={10} maxLength={5000} rows={5} value={details.description} onChange={event => setDetails({ ...details, description: event.target.value })} /></label><label className="admin-field">Grade / distinction<input maxLength={100} value={details.grade ?? ''} onChange={event => setDetails({ ...details, grade: event.target.value })} /></label><label className="admin-field">Reason for status change<input maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label></div>
    <div className="admin-dialog-actions"><button className="admin-action admin-action-primary" disabled={busy}>Save certificate</button><button type="button" className="admin-action admin-action-danger" disabled={busy} onClick={() => void save(certificate.status === 'REVOKED' ? 'REINSTATE' : 'REVOKE')}>{certificate.status === 'REVOKED' ? 'Reinstate' : 'Revoke certificate'}</button><button type="button" className="admin-action" onClick={() => setOpen(false)}>Cancel</button></div>{error && <p role="alert" className="admin-notice admin-notice-error">{error}</p>}
  </fieldset></form></AdminDialog>}</>
}
