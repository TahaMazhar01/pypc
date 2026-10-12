'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BUILTIN_ROLES, PERMISSIONS, GOVERNANCE_PERMISSIONS, type Permission } from '@/lib/permissions'
import { AdminDialog } from '@/components/admin/admin-dialog'
type Role = { id: string; name: string; permissions: string; version: number }
export function RoleManager({ roles }: { roles: Role[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Permission[]>(['dashboard.read'])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)
  function edit(role: Role | null) { setEditing(role); setName(role?.name ?? ''); setSelected(role ? JSON.parse(role.permissions) : ['dashboard.read']); setMessage(''); setOpen(true) }
  async function save(remove = false) {
    if (remove && !window.confirm('Delete this custom role? Roles assigned to users cannot be deleted.')) return
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/admin/roles', { method: remove ? 'DELETE' : editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(remove ? { id: editing?.id, version: editing?.version } : { ...(editing ? { id: editing.id, version: editing.version } : {}), name, permissions: selected }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setOpen(false); setEditing(null); setMessage(remove ? 'Role deleted.' : 'Role saved. Assigned users must sign in again.'); router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save role.') }
    finally { setBusy(false) }
  }
  const groups = [...new Set(PERMISSIONS.map(p => p.split('.')[0]))]
  return <div className="space-y-6">
    <div className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Roles & permissions</h2><p className="mt-2 text-sm text-slate-600">Built-in roles have fixed defaults. Custom roles grant only the checked actions. Account and role administration stays with administrators.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(BUILTIN_ROLES).map(([role, permissions]) => <details key={role} className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-semibold">{role.replaceAll('_',' ')} · {permissions.length} permissions</summary><ul className="mt-2 space-y-1 text-xs">{permissions.map(p => <li key={p}>{p}</li>)}</ul></details>)}</div>
    </div>
    <section className="rounded-2xl border bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Custom roles</h3><button className="admin-action admin-action-primary" onClick={() => edit(null)}>+ Create custom role</button></div><div className="admin-record-grid mt-5">{roles.map(role => <article key={role.id} className="admin-record-card"><h3>{role.name}</h3><p className="mt-2">{JSON.parse(role.permissions).length} assigned permissions</p><button className="admin-action mt-4" onClick={() => edit(role)}>Edit {role.name}</button></article>)}</div>{!roles.length && <p className="mt-5 rounded-xl border border-dashed p-6 text-sm text-slate-500">No custom roles yet. Create one to grant only the actions a colleague needs.</p>}<p role="status" className="mt-4 text-sm">{message}</p></section>
      {open && <AdminDialog title={editing ? 'Edit role' : 'New custom role'} busy={busy} onClose={() => setOpen(false)}><form onSubmit={event => { event.preventDefault(); void save() }}><fieldset disabled={busy}>
        <label className="mt-4 block text-sm font-semibold">Role name<input required minLength={3} maxLength={60} value={name} onChange={e => setName(e.target.value)} className="focus-ring mt-2 w-full rounded-lg border p-3" /></label>
        <div className="admin-permission-grid mt-6">{groups.map(group => <fieldset key={group} className="rounded-xl border p-3"><legend className="px-1 text-sm font-bold capitalize">{group}</legend>{PERMISSIONS.filter(p => p.startsWith(group + '.')).map(p => <label key={p} className="my-2 flex min-h-8 items-start gap-2 text-sm"><input type="checkbox" checked={selected.includes(p)} disabled={GOVERNANCE_PERMISSIONS.includes(p)} onChange={e => setSelected(e.target.checked ? [...selected,p] : selected.filter(x => x !== p))} className="mt-1" /><span>{p.split('.')[1]}{GOVERNANCE_PERMISSIONS.includes(p) ? ' (admin only)' : ''}</span></label>)}</fieldset>)}</div>
        <div className="mt-6 flex flex-wrap gap-3"><button disabled={busy} className="focus-ring rounded-lg bg-primary px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save role'}</button>{editing && <button type="button" disabled={busy} onClick={() => void save(true)} className="focus-ring rounded-lg border border-rose-200 px-5 py-3 text-rose-700">Delete role</button>}</div>
        <p role="status" className="mt-4 text-sm">{message}</p>
      </fieldset></form></AdminDialog>}
  </div>
}
