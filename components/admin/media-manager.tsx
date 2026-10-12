'use client'
import { useState } from 'react'
import Image from 'next/image'
import { AdminDialog } from '@/components/admin/admin-dialog'
type Media = { id: string; alt: string; width: number; height: number; bytes: number }
export function MediaManager({ initialMedia, canUpload, canDelete }: { initialMedia: Media[]; canUpload: boolean; canDelete: boolean }) {
  const [media, setMedia] = useState(initialMedia)
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Media | null>(null)
  const [description, setDescription] = useState('')
  async function reload() { const r = await fetch('/api/admin/media'); if (r.ok) setMedia((await r.json()).media) }
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!file) return
    if (file.size > 4 * 1024 * 1024) { setMessage('Choose an image no larger than 4 MB.'); return }
    const form = event.currentTarget
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/admin/media', { method: 'POST', headers: { 'Content-Type': file.type, 'x-image-alt': encodeURIComponent(alt) }, body: file })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      await reload(); setFile(null); setAlt(''); form.reset(); setMessage('Image uploaded. Select it in the homepage editor; it becomes public when you publish.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed.') }
    finally { setBusy(false) }
  }
  async function remove(id: string) {
    if (!window.confirm('Delete this unused image?')) return
    setBusy(true)
    try { const r = await fetch('/api/admin/media', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); const b = await r.json(); if (!r.ok) throw new Error(b.error); await reload(); setMessage('Image deleted.') }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Delete failed.') }
    finally { setBusy(false) }
  }
  async function updateDescription(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/admin/media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, alt: description, expectedAlt: editing.alt }) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error)
      await reload(); setEditing(null); setMessage('Media description updated. Existing card captions remain separately editable.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update description.') }
    finally { setBusy(false) }
  }
  return <div className="space-y-6"><div className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Media library</h2><p className="mt-2 text-sm text-slate-600">JPEG, PNG or WebP, up to 4 MB. Images are checked and re-encoded. Draft images are visible only to authorized staff.</p>
    {canUpload && <form onSubmit={upload} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Image<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" /></label><label className="text-sm font-semibold">Image description<input required minLength={3} maxLength={300} value={alt} onChange={e => setAlt(e.target.value)} className="focus-ring mt-2 w-full rounded-lg border p-3" /></label><button disabled={busy} className="focus-ring rounded-lg bg-primary p-3 font-bold text-white disabled:opacity-50">{busy ? 'Working…' : 'Upload image'}</button></form>}
    <p role="status" className="mt-4 text-sm">{message}</p></div>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{media.map(item => <article key={item.id} className="overflow-hidden rounded-2xl border bg-white"><div className="relative aspect-video bg-slate-100"><Image unoptimized src={'/api/media/' + item.id} alt={item.alt} fill sizes="400px" className="object-contain" /></div><div className="p-4"><h3 className="font-semibold">{item.alt}</h3><p className="mt-1 text-xs text-slate-500">{item.width} × {item.height} · {Math.ceil(item.bytes / 1024)} KB</p><input readOnly aria-label="Image path" value={'/api/media/' + item.id} className="mt-3 w-full rounded border p-2 text-xs" onFocus={e => e.target.select()} /><div className="admin-record-actions">{canUpload && <button className="admin-action" disabled={busy} onClick={() => { setEditing(item); setDescription(item.alt); setMessage('') }}>Edit description</button>}{canDelete && <button disabled={busy} onClick={() => void remove(item.id)} className="admin-action admin-action-danger">Delete unused image</button>}</div></div></article>)}</div>
    {!media.length && <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">No uploaded images yet. Existing site pictures remain available in the content editor.</p>}
    {editing && <AdminDialog title="Edit image description" busy={busy} onClose={() => setEditing(null)}><form onSubmit={updateDescription}><label className="admin-field">Accessible description<input required minLength={3} maxLength={300} value={description} onChange={event => setDescription(event.target.value)} disabled={busy} /></label><p className="mt-4 text-xs leading-6 text-slate-600">Describe the image for people who cannot see it. The stored photograph stays unchanged.</p><div className="admin-dialog-actions"><button className="admin-action admin-action-primary" disabled={busy}>Save description</button><button type="button" className="admin-action" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>{message && <p role="alert" className="admin-notice admin-notice-error">{message}</p>}</form></AdminDialog>}
  </div>
}
