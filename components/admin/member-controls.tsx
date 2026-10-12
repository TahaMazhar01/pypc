'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminDialog } from '@/components/admin/admin-dialog'
import { USER_ROLES, USER_STATUSES } from '@/lib/constants'
type Profile = { firstName: string; lastName: string; city: string | null; province: string | null; institution: string | null; profession: string | null }
export function MemberControls({ user, roles, superAdmin, self }: { user: Profile & { id: string; email: string; role: string; status: string; customRoleId: string | null }; roles: { id: string; name: string }[]; superAdmin: boolean; self: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<Profile>({ firstName: user.firstName, lastName: user.lastName, city: user.city, province: user.province, institution: user.institution, profession: user.profession })
  const originalRole = user.role === 'CUSTOM' ? 'custom:' + user.customRoleId : user.role
  const [role, setRole] = useState(originalRole)
  const [status, setStatus] = useState(user.status)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function save(revoke = false) {
    const accessChanged = role !== originalRole || status !== user.status
    if ((revoke || accessChanged) && !window.confirm(revoke ? 'Sign this member out on every device?' : 'Update this member’s access? Existing sessions will end. Their records and password are retained.')) return
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(revoke ? { userId: user.id, revokeSessions: true } : { userId: user.id, profile, ...(role !== originalRole ? { role: role.startsWith('custom:') ? 'CUSTOM' : role, customRoleId: role.startsWith('custom:') ? role.slice(7) : null } : {}), ...(status !== user.status ? { status } : {}) }) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error)
      setOpen(false); router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save. Your changes are still here.') }
    finally { setBusy(false) }
  }
  return <><button className="admin-action" onClick={() => { setMessage(''); setOpen(true) }}>Edit member</button>{open && <AdminDialog title="Edit member" busy={busy} onClose={() => setOpen(false)}>
    <p className="mb-5 break-all text-sm text-slate-600">{user.email}</p>
    <form onSubmit={event => { event.preventDefault(); void save() }}><fieldset disabled={busy}>
      <div className="admin-form-grid">{(['firstName','lastName','city','province','institution','profession'] as const).map(key => <label className="admin-field" key={key}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}<input required={key === 'firstName' || key === 'lastName'} maxLength={key === 'institution' ? 180 : key.endsWith('Name') ? 80 : 120} value={profile[key] ?? ''} onChange={event => setProfile(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}</div>
      <p className="my-5 text-xs leading-6 text-slate-600">Email identity and password stay unchanged. Suspend access to deactivate a member while preserving applications, payments and certificates.</p>
      <div className="admin-form-grid"><label className="admin-field">Access role<select disabled={self} value={role} onChange={event => setRole(event.target.value)}>{USER_ROLES.filter(value => superAdmin || value !== 'SUPER_ADMIN').map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}{roles.map(value => <option key={value.id} value={'custom:' + value.id}>{value.name} (custom)</option>)}</select></label><label className="admin-field">Account status<select disabled={self} value={status} onChange={event => setStatus(event.target.value)}>{USER_STATUSES.map(value => <option key={value} value={value}>{value === 'SUSPENDED' ? 'SUSPENDED / Deactivated' : value}</option>)}</select></label></div>
      {self && <p className="admin-notice">Another administrator must change your own access. You can edit your profile here.</p>}
      <div className="admin-dialog-actions"><button className="admin-action admin-action-primary" disabled={busy}>Save member</button><button type="button" className="admin-action" disabled={busy} onClick={() => void save(true)}>Sign out everywhere</button><button type="button" className="admin-action" onClick={() => setOpen(false)}>Cancel</button></div>
      {message && <p role="alert" className="admin-notice admin-notice-error">{message}</p>}
    </fieldset></form>
  </AdminDialog>}</>
}
