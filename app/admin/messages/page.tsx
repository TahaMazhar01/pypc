
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Badge, Card } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { isAdmin, isStaff, requireUser } from '@/lib/auth'
import { formatDateTime, humanise } from '@/lib/utils'

export const metadata: Metadata = { title: 'Messages' }
export const dynamic = 'force-dynamic'

export default async function AdminMessagesPage() {
  const user = await requireUser()
  if (!isStaff(user.role) && !isAdmin(user.role)) redirect('/dashboard')

  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200
  })

  const grouped = {
    NEW: messages.filter(message => message.status === 'NEW'),
    IN_PROGRESS: messages.filter(message => message.status === 'IN_PROGRESS'),
    RESOLVED: messages.filter(message => message.status === 'RESOLVED')
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Contact & support messages</h2>
        <p className="mt-1 text-sm text-slate-600">
          {displayContent(grouped.NEW.length)} new · {displayContent(grouped.IN_PROGRESS.length)} in progress · {displayContent(grouped.RESOLVED.length)}{displayContent(' ')}
          resolved. Reply by email from the address shown, then update the status in the database record.
        </p>
      </Card>

      <div className="space-y-4">
        {messages.map(message => (
          <Card key={message.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      message.status === 'RESOLVED'
                        ? 'success'
                        : message.status === 'IN_PROGRESS'
                          ? 'info'
                          : 'warning'
                    }
                  >
                    {displayContent(humanise(message.status))}
                  </Badge>
                  <span className="text-xs text-slate-500">{displayContent(formatDateTime(message.createdAt))}</span>
                </div>

                <h3 className="mt-3 font-extrabold text-slate-900">{displayContent(message.subject)}</h3>

                <p className="mt-1 text-sm text-slate-600">
                  {displayContent(message.name)} ·{displayContent(' ')}
                  <a href={`mailto:${message.email}`} className="font-semibold text-primary hover:underline">
                    {displayContent(message.email)}
                  </a>
                  {displayContent(message.phone ? ` · ${message.phone}` : '')}
                </p>

                <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {displayContent(message.message)}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {displayContent(!messages.length ? (
          <Card className="text-center text-sm text-slate-500">No messages received yet.</Card>
        ) : null)}
      </div>
    </div>
  )
}
