'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CONTENT_SCHEMAS, type ContentEntity, type ContentValues, type EditorItem } from '@/lib/content-schema'

const choices: Record<string, string[]> = {
  section: ['hero','carousel','card'], mode: ['Onsite','Online','Hybrid'],
  eventType: ['Conference','Workshop','Bootcamp','Webinar','Ceremony','Summit','Training','Institutional visit'],
  type: ['Fellowship','Scholarship','Internship','Job','Grant','Competition']
}
const numeric = new Set(['capacity','durationWeeks','seats','feePkr','feeUsd','sortOrder'])
const dates = new Set(['startsAt','endsAt','registrationDeadline','deadline'])
const lists = new Set(['objectives','outcomes','structure','requirements'])
const paragraphs = new Set(['description','summary'])
function label(key: string) { return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).replace('Pkr','PKR').replace('Usd','USD') }
function defaults(entity: ContentEntity): ContentValues {
  const result: ContentValues = {}
  for (const key of Object.keys(CONTENT_SCHEMAS[entity].shape)) result[key] = lists.has(key) ? '[]' : numeric.has(key) ? 0 : dates.has(key) ? null : key === 'isFeatured' || key === 'featured' ? false : choices[key]?.[0] ?? ''
  if (entity === 'homepage') Object.assign(result, { section: 'carousel', image: '/images/editorial/diplomacy.webp', href: '/', cta: 'Learn more', category: 'Conference' })
  if (entity === 'event') result.capacity = 100
  if (entity === 'opportunity') result.applyUrl = null
  return result
}
export function ContentEditor({ entity, initialItems, canWrite, canPublish, media }: { entity: ContentEntity; initialItems: EditorItem[]; canWrite: boolean; canPublish: boolean; media: { id: string; alt: string }[] }) {
  const [items, setItems] = useState(initialItems)
  const [selected, setSelected] = useState<EditorItem | null>(null)
  const [values, setValues] = useState<ContentValues>(defaults(entity))
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const entityLabel = entity === 'homepage' ? 'Homepage pictures & cards' : entity === 'opportunity' ? 'Postings & positions' : entity === 'event' ? 'Events' : 'Programmes'
  const dirty = selected ? JSON.stringify(values) !== JSON.stringify(selected.values) : true
  const inputClass = 'focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 disabled:bg-slate-50'
  function edit(item: EditorItem | null) { setSelected(item); setValues(item ? { ...item.values } : defaults(entity)); setOpen(true); setMessage('') }
  function change(key: string, value: ContentValues[string]) { setValues(previous => ({ ...previous, [key]: key === 'applyUrl' && value === '' ? null : value })) }
  async function perform(action: 'save' | 'publish' | 'unpublish' | 'discard' | 'restore') {
    if ((action === 'unpublish' || action === 'discard') && !window.confirm(action === 'unpublish' ? 'Hide this item from the public site?' : 'Discard the saved draft? Published content will remain unchanged.')) return
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/admin/content', { method: action === 'save' ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'save' ? { entity, ...(selected ? { id: selected.id } : {}), version: selected?.version ?? 0, data: values } : { entity, id: selected?.id, version: selected?.version ?? 0, action }) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error)
      const reload = await fetch('/api/admin/content?entity=' + entity, { cache: 'no-store' })
      const data = await reload.json(); if (!reload.ok) throw new Error(data.error)
      setItems(data.items)
      const item = data.items.find((x: EditorItem) => x.id === (body.id ?? selected?.id))
      if (item) { setSelected(item); setValues(item.values) } else { setOpen(false); setSelected(null) }
      setMessage(action === 'save' ? 'Draft saved. Public content is unchanged until published.' : action === 'publish' ? 'Published successfully.' : action === 'restore' ? 'Restored the retained public version. Unsaved and draft changes were not published.' : action === 'unpublish' ? 'Archived from public view. Records are retained; you can restore this item.' : 'Draft discarded.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not complete this action.') }
    finally { setBusy(false) }
  }
  const keys = Object.keys(CONTENT_SCHEMAS[entity].shape)
  const visible = items.filter(item => String(item.values.title).toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || (filter === 'published' ? item.published : filter === 'draft' ? item.hasDraft : !item.published && item.retained)))
  return <div className="space-y-6">
    <header className="rounded-2xl border bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-gold-700">Content workspace</p><h2 className="mt-2 text-2xl font-bold">{entityLabel}</h2></div>{canWrite && <button onClick={() => edit(null)} className="focus-ring rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white">+ Add {entity === 'homepage' ? 'picture or card' : entity}</button>}</div><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Create and edit drafts, then publish when ready. Archive removes an item from public view; Restore brings back the retained public version. {entity === 'opportunity' ? 'Manage jobs, internship positions, fellowships and other opportunity postings here.' : entity === 'homepage' ? 'Manage hero pictures, carousel slides and existing cards here.' : 'Registrations, applications and certificates are preserved.'}</p></header>
    <p role="status" aria-live="polite" className={message ? 'rounded-xl border bg-white p-4 text-sm' : 'sr-only'}>{message}</p>
    <div className="admin-editor-columns">
      <section className="admin-editor-list space-y-3" aria-label="Content list"><label className="block text-sm font-semibold">Find content<input type="search" value={query} onChange={e => setQuery(e.target.value)} className={inputClass} placeholder="Search titles" /></label><label className="block text-sm font-semibold">Visibility<select value={filter} onChange={event => setFilter(event.target.value)} className={inputClass}><option value="all">All content</option><option value="published">Published</option><option value="draft">Draft changes</option><option value="archived">Archived / unpublished</option></select></label>
        {visible.map(item => <button key={item.id} onClick={() => edit(item)} className={`focus-ring block w-full rounded-xl border p-4 text-left ${selected?.id === item.id ? 'border-primary bg-primary-50' : 'bg-white'}`}><span className="flex flex-wrap gap-2 text-xs font-bold"><span className={item.published ? 'text-emerald-700' : 'text-slate-500'}>{item.published ? 'Published' : item.retained ? 'Archived / unpublished' : 'New draft'}</span>{item.hasDraft && <span className="text-amber-700">Draft changes</span>}{item.values.section && <span className="capitalize text-slate-500">{String(item.values.section)}</span>}</span><span className="mt-2 block font-bold">{String(item.values.title)}</span><span className="mt-1 block truncate text-xs text-slate-500">{String(item.values.slug ?? item.id)}</span><span className="mt-3 block text-xs font-semibold text-primary">{canWrite ? 'Edit & manage' : 'View details'}</span></button>)}
        {!visible.length && <p className="rounded-xl border border-dashed p-6 text-sm text-slate-500">No matching content.</p>}
      </section>
      {open ? <form onSubmit={e => { e.preventDefault(); void perform('save') }} className="min-w-0 rounded-2xl border bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">{selected ? 'Review & edit' : 'New draft'}</h3>{selected?.published && <Link href={entity === 'homepage' ? '/' : '/' + (entity === 'opportunity' ? 'opportunities' : entity + 's') + '/' + selected.values.slug} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary underline">View public page</Link>}</div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">{keys.map(key => {
          const value = values[key]
          const options = key === 'category' && entity === 'homepage' ? ['Conference','Summit','Training','Institutional visit'] : key === 'mode' && entity === 'opportunity' ? [...choices.mode,'Remote'] : choices[key]
          if (typeof value === 'boolean') return <label key={key} className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={value} disabled={!canWrite || busy} onChange={e => change(key,e.target.checked)} />{label(key)}</label>
          let input
          if (options) input = <select value={String(value ?? '')} disabled={!canWrite || busy} onChange={e => change(key,e.target.value)} className={inputClass}>{!options.includes(String(value)) && <option value={String(value)}>{String(value)}</option>}{options.map(option => <option key={option} value={option}>{option}</option>)}</select>
          else if (lists.has(key)) { let list: string[] = []; try { list = JSON.parse(String(value)) } catch {} input = <textarea value={list.join('\n')} rows={4} disabled={!canWrite || busy} onChange={e => change(key,JSON.stringify(e.target.value.split('\n')))} className={inputClass} placeholder="One entry per line" /> }
          else if (paragraphs.has(key)) input = <textarea value={String(value ?? '')} rows={key === 'description' ? 7 : 3} disabled={!canWrite || busy} onChange={e => change(key,e.target.value)} className={inputClass} />
          else input = <input type={numeric.has(key) ? 'number' : dates.has(key) ? 'datetime-local' : 'text'} min={numeric.has(key) ? 0 : undefined} value={dates.has(key) ? String(value ?? '').slice(0,16) : String(value ?? '')} disabled={!canWrite || busy} onChange={e => change(key, numeric.has(key) ? (e.target.value === '' ? null : Number(e.target.value)) : dates.has(key) ? (e.target.value ? e.target.value + ':00.000Z' : null) : e.target.value)} className={inputClass} />
          return <label key={key} className={`block text-sm font-semibold ${paragraphs.has(key) || lists.has(key) || key === 'image' ? 'sm:col-span-2' : ''}`}>{label(key)}{dates.has(key) ? ' (UTC)' : lists.has(key) ? ' — one per line' : ''}{input}{key === 'image' && <><select aria-label="Choose uploaded image" value="" disabled={!canWrite || busy} className={inputClass} onChange={e => { const asset = media.find(m => '/api/media/' + m.id === e.target.value); if (asset) setValues(previous => ({ ...previous, image: e.target.value, imageAlt: asset.alt })) }}><option value="">Choose from media library…</option>{media.map(asset => <option key={asset.id} value={'/api/media/' + asset.id}>{asset.alt}</option>)}</select><Link href="/admin/media" className="mt-2 inline-block text-xs font-normal text-primary underline">Open media library</Link></>}</label>
        })}</div>
        {entity === 'homepage' && typeof values.image === 'string' && /^(\/images\/editorial\/|\/api\/media\/)/.test(values.image) && <div className="mt-6 rounded-xl border p-3"><p className="mb-2 text-xs font-bold uppercase text-slate-500">Draft picture preview</p><div className="relative aspect-video"><Image unoptimized src={values.image} alt={String(values.imageAlt ?? '')} fill sizes="600px" className="rounded-lg object-contain" /></div><p className="mt-3 font-bold">{String(values.title)}</p><p className="mt-1 text-sm text-slate-600">{String(values.summary)}</p></div>}
        <div className="mt-6 flex flex-wrap gap-3">
          {canWrite && <button disabled={busy || !dirty} className="admin-action admin-action-primary">Save draft</button>}
          {canPublish && selected && <button type="button" disabled={busy || dirty || !selected.version} onClick={() => void perform('publish')} className="admin-action admin-action-primary">Publish saved draft</button>}
          {canPublish && selected?.published && <button type="button" disabled={busy || dirty} onClick={() => void perform('unpublish')} className="admin-action admin-action-danger">Archive / unpublish</button>}
          {canPublish && selected?.retained && !selected.published && <button type="button" disabled={busy || dirty} onClick={() => void perform('restore')} className="admin-action">Restore public version</button>}
          {canWrite && selected?.hasDraft && <button type="button" disabled={busy} onClick={() => void perform('discard')} className="admin-action admin-action-danger">{selected.retained ? 'Discard draft changes' : 'Delete draft'}</button>}
          <button type="button" className="admin-action" disabled={busy} onClick={() => { if (!dirty || window.confirm('Close this editor? Unsaved changes will be lost.')) setOpen(false) }}>Close editor</button>
        </div>
        {dirty && selected && <p className="mt-3 text-xs text-slate-500">Save these changes before publishing.</p>}
      </form> : <div className="rounded-2xl border border-dashed p-10 text-center text-slate-500">Select an item to review its fields{canWrite ? ', or add a new draft.' : '.'}</div>}
    </div>
  </div>
}
