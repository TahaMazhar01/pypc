
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Badge, Card } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { isAdmin, requireUser } from '@/lib/auth'
import { verifyAuditChain } from '@/lib/audit'
import { formatDateTime, humanise } from '@/lib/utils'

export const metadata: Metadata = { title: 'Audit Log' }
export const dynamic = 'force-dynamic'

export default async function AdminAuditPage({
  searchParams
}: {
  searchParams: { action?: string }
}) {
  const user = await requireUser()
  if (!isAdmin(user.role)) redirect('/dashboard')

  const action = searchParams.action?.trim()

  const [logs, actions, chain] = await Promise.all([
    prisma.auditLog.findMany({
      where: action ? { action: { contains: action } } : {},
      orderBy: { createdAt: 'desc' },
      take: 200
    }),
    prisma.auditLog.findMany({ select: { action: true }, distinct: ['action'] }),
    verifyAuditChain()
  ])

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Audit log</h2>
        <p className="mt-1 text-sm text-slate-600">
          Every administrative and security relevant action is recorded with actor, entity, timestamp and
          IP address. Records are append only, and each entry is cryptographically chained to the one
          before it: editing or deleting an entry breaks every hash that follows, which is what makes this
          log tamper evident rather than merely stored.
        </p>

        <div
          className={`mt-5 rounded-xl border p-4 ${
            chain.ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-300 bg-rose-50'
          }`}
        >
          <p className={`text-sm font-bold ${chain.ok ? 'text-emerald-800' : 'text-rose-800'}`}>
            {displayContent(chain.ok
              ? `Chain verified — ${chain.checked} entries checked, no break found`
              : `Chain broken at entry ${chain.brokenAt}`)}
          </p>
          <p className="mt-1 text-xs leading-6 text-slate-600">
            {displayContent(chain.ok
              ? `Head hash ${chain.lastHash?.slice(0, 16) ?? '—'}… · re-verified on every page load.`
              : chain.brokenReason)}
          </p>
        </div>

        <form className="mt-5 flex flex-wrap gap-3" action="/admin/audit">
          <input
            name="action"
            defaultValue={action ?? ''}
            placeholder="Filter by action, e.g. CERTIFICATE_ISSUED"
            className="focus-ring h-11 min-w-[260px] flex-1 rounded-lg border border-slate-200 px-3.5 text-sm"
          />
          <button
            type="submit"
            className="focus-ring h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white"
          >
            Filter
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {actions.slice(0, 14).map(item => (
            <a
              key={item.action}
              href={`/admin/audit?action=${encodeURIComponent(item.action)}`}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:border-primary-300 hover:text-primary"
            >
              {displayContent(item.action)}
            </a>
          ))}
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Action</th>
              <th className="px-5 py-4">Actor</th>
              <th className="px-5 py-4">Entity</th>
              <th className="px-5 py-4">Metadata</th>
              <th className="px-5 py-4">IP</th>
              <th className="px-5 py-4">When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-slate-50 align-top">
                <td className="px-5 py-4">
                  <Badge tone={log.action.includes('FAILED') || log.action.includes('REVOKED') ? 'danger' : 'primary'}>
                    {displayContent(humanise(log.action))}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-xs text-slate-600">
                  {displayContent(log.actorEmail ?? 'system')}
                  {displayContent(log.actorId ? (
                    <p className="mt-1 font-mono text-[11px] text-slate-500">{displayContent(log.actorId.slice(0, 12))}…</p>
                  ) : null)}
                </td>
                <td className="px-5 py-4 text-xs text-slate-600">
                  {displayContent(log.entityType)}
                  {displayContent(log.entityId ? (
                    <p className="mt-1 font-mono text-[11px] text-slate-500">{displayContent(log.entityId.slice(0, 14))}…</p>
                  ) : null)}
                </td>
                <td className="px-5 py-4 max-w-[280px] break-words text-xs text-slate-500">
                  {displayContent(log.metadata ?? '—')}
                </td>
                <td className="px-5 py-4 text-xs text-slate-500">{displayContent(log.ip ?? '—')}</td>
                <td className="px-5 py-4 text-xs text-slate-500">{displayContent(formatDateTime(log.createdAt))}</td>
              </tr>
            ))}

            {displayContent(!logs.length ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                  No audit entries match this filter.
                </td>
              </tr>
            ) : null)}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
