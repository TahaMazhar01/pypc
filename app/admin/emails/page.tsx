
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock, Mail, MailWarning, Send } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { isStaff, requireUser } from '@/lib/auth'
import { mailStatus } from '@/lib/email/mailer'
import { formatDateTime, humanise } from '@/lib/utils'

export const metadata: Metadata = { title: 'Email & verification' }
export const dynamic = 'force-dynamic'

/**
 * Secretariat view of everything the platform has sent, plus the queue of
 * accounts waiting on email verification. This is deliberately read-only:
 * verification is completed by the member entering their own code, never by
 * staff clicking a button, so nobody can activate an account they do not own.
 */
export default async function AdminEmailsPage() {
  const staff = await requireUser()
  if (!isStaff(staff.role)) redirect('/dashboard')

  const [outbox, pending, stats] = await Promise.all([
    prisma.emailOutbox
      .findMany({ orderBy: { createdAt: 'desc' }, take: 30 })
      .catch(() => []),
    prisma.user
      .findMany({
        where: { emailVerifiedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          countryName: true,
          phone: true,
          createdAt: true,
          status: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          emailTokens: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true, expiresAt: true, attempts: true, consumedAt: true }
          }
        }
      })
      .catch(() => []),
    Promise.all([
      prisma.user.count({ where: { emailVerifiedAt: { not: null } } }).catch(() => 0),
      prisma.user.count().catch(() => 0),
      prisma.emailOutbox.count({ where: { status: 'FAILED' } }).catch(() => 0),
      prisma.emailVerificationToken.count({ where: { consumedAt: null } }).catch(() => 0)
    ])
  ])

  const [verifiedCount, totalUsers, failedCount, openTokens] = stats
  const status = mailStatus()

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Email delivery &amp; verification</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Every transactional message the platform sends is recorded here, and this is the queue of accounts
          that cannot sign in until their email address is verified. Codes are single use, expire after 30
          minutes and are stored only as hashes, staff cannot read or complete them.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Verified accounts" value={`${verifiedCount} / ${totalUsers}`} />
          <Stat label="Awaiting verification" value={String(pending.length)} />
          <Stat label="Open codes issued" value={String(openTokens)} />
          <Stat label="Failed sends" value={String(failedCount)} tone={failedCount > 0 ? 'danger' : 'ok'} />
        </div>

        <div
          className={`mt-5 flex items-start gap-3 rounded-xl border px-5 py-4 text-sm ${
            status.transport === 'smtp'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {displayContent(status.transport === 'smtp' ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          ))}
          <div>
            <p className="font-extrabold uppercase tracking-[0.12em]">
              Transport: {displayContent(status.transport)}
              {displayContent(status.devVisible ? ' · EMAIL_DEV_MODE on' : '')}
            </p>
            <p className="mt-1 leading-6">{displayContent(status.message)}</p>
            <p className="mt-1 text-xs opacity-80">From: {displayContent(status.from)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
          <MailWarning size={18} className="text-gold-600" /> Accounts awaiting email verification
        </h3>

        {displayContent(pending.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Every registered account has a verified email address.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-4">Member</th>
                  <th scope="col" className="py-2 pr-4">Country</th>
                  <th scope="col" className="py-2 pr-4">Phone</th>
                  <th scope="col" className="py-2 pr-4">Registered</th>
                  <th scope="col" className="py-2 pr-4">Latest code</th>
                  <th scope="col" className="py-2 pr-4">Login state</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map(user => {
                  const token = user.emailTokens[0]
                  const expired = token ? token.expiresAt.getTime() < Date.now() : false
                  return (
                    <tr key={user.id}>
                      <td className="py-3 pr-4">
                        <span className="block font-bold text-slate-800">
                          {displayContent(user.firstName)} {displayContent(user.lastName)}
                        </span>
                        <span className="block text-xs text-slate-500">{displayContent(user.email)}</span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{displayContent(user.countryName ?? '—')}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{displayContent(user.phone ?? '—')}</td>
                      <td className="py-3 pr-4 text-slate-600">{displayContent(formatDateTime(user.createdAt))}</td>
                      <td className="py-3 pr-4">
                        {displayContent(token ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
                              token.consumedAt
                                ? 'border-slate-200 bg-slate-50 text-slate-500'
                                : expired
                                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            <Clock size={11} />
                            {displayContent(token.consumedAt ? 'Used' : expired ? 'Expired' : 'Active')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">None issued</span>
                        ))}
                        {displayContent(token ? (
                          <span className="mt-1 block text-[11px] text-slate-500">
                            {displayContent(token.attempts)} wrong attempt{displayContent(token.attempts === 1 ? '' : 's')}
                          </span>
                        ) : null)}
                      </td>
                      <td className="py-3 pr-4">
                        {displayContent(user.lockedUntil && user.lockedUntil.getTime() > Date.now() ? (
                          <Badge tone="danger">Locked</Badge>
                        ) : user.failedLoginAttempts > 0 ? (
                          <Badge tone="warning">{displayContent(user.failedLoginAttempts)} failed</Badge>
                        ) : (
                          <Badge tone="neutral">{displayContent(humanise(user.status))}</Badge>
                        ))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}

        <p className="mt-4 text-xs leading-6 text-slate-500">
          A member who cannot receive their code should write to{displayContent(' ')}
          <Link href="/contact" className="font-bold text-primary underline decoration-gold-300">
            the secretariat
          </Link>
          . Verification itself stays with the member, that is what makes the record trustworthy.
        </p>
      </Card>

      <Card>
        <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
          <Send size={18} className="text-gold-600" /> Outbox (last 30 messages)
        </h3>

        {displayContent(outbox.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Nothing has been sent from this deployment yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {outbox.map(message => (
              <li key={message.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-800">
                    <Mail size={14} className="shrink-0 text-slate-500" />
                    <span className="truncate">{displayContent(message.subject)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge
                      tone={
                        message.status === 'SENT'
                          ? 'success'
                          : message.status === 'FAILED'
                            ? 'danger'
                            : 'info'
                      }
                    >
                      {displayContent(humanise(message.status))} · {displayContent(message.transport)}
                    </Badge>
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  To {displayContent(message.to)} · {displayContent(formatDateTime(message.createdAt))}
                  {displayContent(message.error ? ` · error: ${message.error.slice(0, 90)}` : '')}
                </p>
              </li>
            ))}
          </ul>
        ))}
      </Card>
    </div>
  )
}

function Stat({ label, value, tone = 'ok' }: { label: string; value: string; tone?: 'ok' | 'danger' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{displayContent(label)}</p>
      <p className={`mt-1 text-lg font-extrabold ${tone === 'danger' ? 'text-rose-600' : 'text-primary-900'}`}>
        {displayContent(value)}
      </p>
    </div>
  )
}
