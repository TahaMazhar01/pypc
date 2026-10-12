'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw, Save } from 'lucide-react'
import { APPLICATION_STATUSES, USER_ROLES, USER_STATUSES } from '@/lib/constants'
import { humanise } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'

function useAction() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(url: string, body: unknown, method: 'PATCH' | 'POST' = 'PATCH') {
    setBusy(true)
    setError(null)

    try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? 'Action failed.')
      return false
    }

    router.refresh()
    return true
    } catch { setError('Could not connect. Your changes are still here; please try again.'); return false }
    finally { setBusy(false) }
  }

  return { run, busy, error }
}

/** Role + status controls for a single member row. */
export function UserControls({
  userId,
  role,
  status,
  customRoleId,
  customRoles = [],
  allowSuperAdmin = false
}: {
  userId: string
  role: string
  status: string
  customRoleId?: string | null
  customRoles?: { id: string; name: string }[]
  allowSuperAdmin?: boolean
}) {
  const { run, busy, error } = useAction()
  const originalRole = role === 'CUSTOM' ? `custom:${customRoleId}` : role
  const [nextRole, setNextRole] = useState(originalRole)
  const [nextStatus, setNextStatus] = useState(status)

  const dirty = nextRole !== originalRole || nextStatus !== status

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={nextRole}
        onChange={event => setNextRole(event.target.value)}
        aria-label="Member role"
        className="h-9 w-auto text-xs"
      >
        {USER_ROLES.filter(item => item !== 'SUPER_ADMIN' || allowSuperAdmin || role === item).map(item => (
          <option key={item} value={item}>
            {displayContent(humanise(item))}
          </option>
        ))}
        {customRoles.map(item => <option key={item.id} value={`custom:${item.id}`}>{item.name} (custom)</option>)}
      </Select>

      <Select
        value={nextStatus}
        onChange={event => setNextStatus(event.target.value)}
        aria-label="Member status"
        className="h-9 w-auto text-xs"
      >
        {USER_STATUSES.map(item => (
          <option key={item} value={item}>
            {displayContent(humanise(item))}
          </option>
        ))}
      </Select>

      <Button
        size="sm"
        disabled={busy || !dirty}
        onClick={() => run('/api/admin/users', { userId, role: nextRole.startsWith('custom:') ? 'CUSTOM' : nextRole, customRoleId: nextRole.startsWith('custom:') ? nextRole.slice(7) : null, status: nextStatus })}
      >
        {displayContent(busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />)} Apply
      </Button>

      <Button size="sm" variant="outline" disabled={busy} onClick={() => run('/api/admin/users', { userId, revokeSessions: true })}>Sign out everywhere</Button>

      {displayContent(error ? <span className="text-xs font-semibold text-rose-600">{displayContent(error)}</span> : null)}
    </div>
  )
}

/** Review decision for a single application. */
export function ApplicationControls({
  applicationId,
  status,
  notes
}: {
  applicationId: string
  status: string
  notes: string | null
}) {
  const { run, busy, error } = useAction()
  const [nextStatus, setNextStatus] = useState(status)
  const [adminNotes, setAdminNotes] = useState(notes ?? '')

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={nextStatus}
          onChange={event => setNextStatus(event.target.value)}
          aria-label="Application status"
          className="h-9 w-auto text-xs"
        >
          {APPLICATION_STATUSES.map(item => (
            <option key={item} value={item}>
              {displayContent(humanise(item))}
            </option>
          ))}
        </Select>

        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            run('/api/admin/applications', {
              applicationId,
              status: nextStatus,
              adminNotes: adminNotes || undefined
            })
          }
        >
          {displayContent(busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />)} Save decision
        </Button>

        {displayContent(error ? <span className="text-xs font-semibold text-rose-600">{displayContent(error)}</span> : null)}
      </div>

      <Textarea
        rows={2}
        value={adminNotes}
        onChange={event => setAdminNotes(event.target.value)}
        placeholder="Internal / member visible note (optional)"
        className="text-xs"
      />
    </div>
  )
}

/** Revoke / reinstate / delete a certificate. */
export function CertificateControls({
  certificateId,
  status
}: {
  certificateId: string
  status: string
}) {
  const { run, busy, error } = useAction()
  const [reason, setReason] = useState('')

  return (
    <div className="space-y-2">
      <Input
        value={reason}
        onChange={event => setReason(event.target.value)}
        placeholder="Reason (shown to member on revoke)"
        className="h-9 text-xs"
      />

      <div className="flex flex-wrap gap-2">
        {displayContent(status !== 'REVOKED' ? (
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => run('/api/admin/certificates', { certificateId, action: 'REVOKE', reason })}
          >
            {displayContent(busy ? <Loader2 size={14} className="animate-spin" /> : null)} Revoke
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => run('/api/admin/certificates', { certificateId, action: 'REINSTATE', reason })}
          >
            {displayContent(busy ? <Loader2 size={14} className="animate-spin" /> : null)} Reinstate
          </Button>
        ))}

        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => run('/api/admin/certificates', { certificateId, action: 'DELETE', reason })}
        >
          Delete (super admin only)
        </Button>
      </div>

      {displayContent(error ? <span className="text-xs font-semibold text-rose-600">{displayContent(error)}</span> : null)}
    </div>
  )
}

/** Publish / activate / feature toggles for content rows. */
export function ContentToggle({
  entity,
  id,
  field,
  value
}: {
  entity: 'programme' | 'event' | 'opportunity'
  id: string
  field: 'isActive' | 'isPublished' | 'isFeatured'
  value: boolean
}) {
  const { run, busy, error } = useAction()

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={value ? 'subtle' : 'outline'}
        disabled={busy}
        onClick={() => run('/api/admin/content', { entity, id, field, value: !value })}
      >
        {displayContent(busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />)}
        {displayContent(field === 'isFeatured' ? (value ? 'Featured' : 'Feature') : value ? 'On' : 'Off')}
      </Button>
      {displayContent(error ? <span className="text-xs font-semibold text-rose-600">{displayContent(error)}</span> : null)}
    </div>
  )
}

/** Issue a new certificate. */
export function IssueCertificateForm({
  programmes,
  events
}: {
  programmes: { id: string; title: string }[]
  events: { id: string; title: string }[]
}) {
  const { run, busy, error } = useAction()
  const [form, setForm] = useState({
    title: '',
    recipientName: '',
    description: '',
    grade: '',
    scope: '',
    userId: ''
  })
  const [success, setSuccess] = useState<string | null>(null)

  async function submit() {
    const [kind, id] = form.scope.split(':')
    const ok = await run(
      '/api/certificates',
      {
        title: form.title,
        recipientName: form.recipientName,
        description: form.description,
        grade: form.grade || undefined,
        programmeId: kind === 'programme' ? id : undefined,
        eventId: kind === 'event' ? id : undefined,
        userId: form.userId || undefined
      },
      'POST'
    )

    if (ok) {
      setSuccess('Certificate issued with a unique code and QR record.')
      setForm({ title: '', recipientName: '', description: '', grade: '', scope: '', userId: '' })
    }
  }

  return (
    <div className="space-y-3">
      {displayContent(!form.scope || !form.title || !form.recipientName || form.description.length < 10 ? (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
          A unique verification code and QR are generated automatically. Recipient must sign in with the
          user ID below to see it in their dashboard.
        </p>
      ) : null)}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          aria-label="Certificate title"
          placeholder="Certificate title"
          value={form.title}
          onChange={event => setForm({ ...form, title: event.target.value })}
        />
        <Input
          aria-label="Recipient full name"
          placeholder="Recipient full name"
          value={form.recipientName}
          onChange={event => setForm({ ...form, recipientName: event.target.value })}
        />
        <Input
          aria-label="Grade or distinction"
          placeholder="Grade / distinction (optional)"
          value={form.grade}
          onChange={event => setForm({ ...form, grade: event.target.value })}
        />
        <Input
          aria-label="Member user ID"
          placeholder="Member user ID (optional, links to dashboard)"
          value={form.userId}
          onChange={event => setForm({ ...form, userId: event.target.value })}
        />
      </div>

      <Select aria-label="Programme or event" value={form.scope} onChange={event => setForm({ ...form, scope: event.target.value })}>
        <option value="">Link to programme or event (optional)</option>
        <optgroup label="Programmes">
          {programmes.map(programme => (
            <option key={programme.id} value={`programme:${programme.id}`}>
              {displayContent(programme.title)}
            </option>
          ))}
        </optgroup>
        <optgroup label="Events">
          {events.map(event => (
            <option key={event.id} value={`event:${event.id}`}>
              {displayContent(event.title)}
            </option>
          ))}
        </optgroup>
      </Select>

      <Textarea
        aria-label="Certificate description"
        rows={3}
        placeholder="Description printed on the certificate"
        value={form.description}
        onChange={event => setForm({ ...form, description: event.target.value })}
      />

      {displayContent(error ? <p className="text-xs font-semibold text-rose-600">{displayContent(error)}</p> : null)}
      {displayContent(success ? <p className="text-xs font-semibold text-emerald-700">{displayContent(success)}</p> : null)}

      <Button
        disabled={
          busy || !form.title || !form.recipientName || form.description.trim().length < 10
        }
        onClick={submit}
      >
        {displayContent(busy ? <Loader2 size={15} className="animate-spin" /> : null)} Issue certificate
      </Button>
    </div>
  )
}
