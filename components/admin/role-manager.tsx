'use client'
import { useState } from 'react'
import Link from 'next/link'
import { PERMISSION_LABELS, PERMISSION_GROUPS, roleLabel } from '@/lib/admin-labels'
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
  const [viewing, setViewing] = useState<{ name: string; permissions: readonly Permission[] } | null>(null)
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
    <section className="rounded-2xl border bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Team roles</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Choose what each team member can do. Custom roles can be edited; standard roles have fixed access.</p></div><button className="admin-action admin-action-primary" onClick={() => edit(null)}>+ Add role</button></div>
      <p className="admin-notice">1. Add a role and choose its tasks. 2. Save it. 3. <Link className="font-bold underline" href="/admin/users">Open Members &amp; users</Link> to assign it to a person.</p>
      <div className="mt-6 overflow-x-auto"><table className="admin-role-table w-full text-left text-sm"><caption className="sr-only">Team roles and allowed tasks</caption><thead><tr><th scope="col">Role</th><th scope="col">Type</th><th scope="col">Allowed tasks</th><th scope="col">Actions</th></tr></thead><tbody>
        {roles.map(role => { const permissions = JSON.parse(role.permissions) as Permission[]; return <tr key={role.id}><th scope="row">{role.name}</th><td>Custom · editable</td><td><button className="admin-action" onClick={() => setViewing({ name: role.name, permissions })}>View {permissions.length} tasks</button></td><td><button className="admin-action admin-action-primary" aria-label={'Edit ' + role.name} onClick={() => edit(role)}>Edit role</button></td></tr> })}
        {Object.entries(BUILTIN_ROLES).map(([role, permissions]) => <tr key={role}><th scope="row">{roleLabel(role)}</th><td>Standard · fixed</td><td><button className="admin-action" onClick={() => setViewing({ name: roleLabel(role), permissions })}>{permissions.length ? 'View ' + new Set(permissions).size + ' tasks' : 'View member access'}</button></td><td><span className="text-slate-500">Cannot be edited</span></td></tr>)}
      </tbody></table></div>
      {!roles.length && <p className="mt-4 text-sm text-slate-600">No custom roles yet. Use <strong>Add role</strong> above to create your first one.</p>}<p role="status" className="mt-4 text-sm">{message}</p>
    </section>
    {viewing && <AdminDialog title={viewing.name + ': allowed tasks'} onClose={() => setViewing(null)}>{viewing.permissions.length ? <ul className="list-disc space-y-3 pl-5 text-sm">{[...new Set(viewing.permissions)].map(p => <li key={p}>{PERMISSION_LABELS[p]}</li>)}</ul> : <p className="text-sm leading-6">Members can use their own member account. This role does not give access to the admin dashboard.</p>}</AdminDialog>}
      {open && <AdminDialog title={editing ? 'Edit role' : 'Add role'} busy={busy} onClose={() => setOpen(false)}><form onSubmit={event => { event.preventDefault(); void save() }}><fieldset disabled={busy}>
        <p className="text-sm leading-6 text-slate-600">Name the role and tick the tasks it should allow. Unticked tasks stay unavailable. After saving, assign it from Members &amp; users. Editing an existing role signs its members out so their new access takes effect.</p><label className="mt-4 block text-sm font-semibold">Role name<input placeholder="For example: Events coordinator" required minLength={3} maxLength={60} value={name} onChange={e => setName(e.target.value)} className="focus-ring mt-2 w-full rounded-lg border p-3" /></label>
        <div className="admin-permission-grid mt-6">{groups.map(group => <fieldset key={group} className="rounded-xl border p-3"><legend className="px-1 text-sm font-bold capitalize">{PERMISSION_GROUPS[group]}</legend>{PERMISSIONS.filter(p => p.startsWith(group + '.')).map(p => <label key={p} className="my-2 flex min-h-8 items-start gap-2 text-sm"><input type="checkbox" checked={selected.includes(p)} disabled={p === 'dashboard.read' || GOVERNANCE_PERMISSIONS.includes(p)} onChange={e => setSelected(e.target.checked ? [...selected,p] : selected.filter(x => x !== p))} className="mt-1" /><span>{PERMISSION_LABELS[p]}{p === 'dashboard.read' ? ' — required for every team role' : ''}{GOVERNANCE_PERMISSIONS.includes(p) ? ' — reserved for administrators' : ''}</span></label>)}</fieldset>)}</div>
        <div className="mt-6 flex flex-wrap gap-3"><button disabled={busy} className="focus-ring rounded-lg bg-primary px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save role'}</button>{editing && <button type="button" disabled={busy} onClick={() => void save(true)} className="focus-ring rounded-lg border border-rose-200 px-5 py-3 text-rose-700">Delete role</button>}</div>
        <p role="status" className="mt-4 text-sm">{message}</p>
      </fieldset></form></AdminDialog>}
  </div>
}
