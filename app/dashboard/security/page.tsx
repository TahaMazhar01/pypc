
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { Card } from '@/components/ui/card'
import { PasswordForm } from '@/components/dashboard/password-form'
import { TwoFactorPanel } from '@/components/dashboard/two-factor-panel'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { formatDateTime, humanise } from '@/lib/utils'

export const metadata: Metadata = { title: 'Security' }
export const dynamic = 'force-dynamic'

export default async function SecurityPage() {
  const user = await requireUser()

  const recentAudit = await prisma.auditLog.findMany({
    where: { actorId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Two factor authentication (optional)</h2>
        <p className="mt-1 text-sm text-slate-600">
          The strongest single improvement most accounts can make. Optional, standard based, and yours to
          switch on or off at any time.
        </p>
        <div className="mt-5">
          <TwoFactorPanel enabled={Boolean(user.twoFactorConfirmedAt)} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Change password</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose a strong password you do not use anywhere else. Changing it signs out every other device.
        </p>

        <div className="mt-6">
          <PasswordForm />
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="border-primary-100">
          <h2 className="font-extrabold text-primary-900">Security summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Account status" value={humanise(user.status)} />
            <Row label="Email verified" value={user.emailVerifiedAt ? 'Yes' : 'Not verified'} />
            <Row label="Role" value={humanise(user.role)} />
            <Row label="Last sign-in" value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'} />
            <Row
              label="Two-factor authentication"
              value={user.twoFactorConfirmedAt ? 'On' : 'Off (optional)'}
            />
            <Row label="Sessions invalidated" value={`${user.sessionVersion} time(s)`} />
          </dl>

          <ul className="mt-5 space-y-2 text-xs leading-6 text-slate-600">
            <li>• Passwords are stored as bcrypt hashes, never in readable form.</li>
            <li>• Sessions use signed, HTTP only cookies that JavaScript cannot read.</li>
            <li>• Administrative actions are written to an audit log with actor and IP address.</li>
            <li>• Two factor codes are generated on your own device (TOTP, RFC 6238), no SMS, no app specific lock in.</li>
            <li>• Recovery codes are stored only as bcrypt hashes and are single use.</li>
          </ul>
        </Card>

        <Card>
          <h2 className="font-extrabold text-slate-900">Recent account activity</h2>
          <div className="mt-4 space-y-3">
            {displayContent(recentAudit.length ? (
              recentAudit.map(entry => (
                <div key={entry.id} className="rounded-xl border border-slate-100 p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {displayContent(humanise(entry.action))}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {displayContent(formatDateTime(entry.createdAt))}
                    {displayContent(entry.ip ? ` · ${entry.ip}` : '')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">No recorded activity yet.</p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{displayContent(label)}</dt>
      <dd className="font-bold text-slate-900">{displayContent(value)}</dd>
    </div>
  )
}
