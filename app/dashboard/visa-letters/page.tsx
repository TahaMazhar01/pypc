
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock, FileText, Globe2 } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate, humanise } from '@/lib/utils'

export const metadata: Metadata = { title: 'Visa invitation letters' }
export const dynamic = 'force-dynamic'

export default async function DashboardVisaLettersPage() {
  const user = await requireUser()

  const requests = await prisma.visaLetterRequest
    .findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    .catch(() => [])

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Visa invitation letters</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Requests for official invitation letters issued to registered international delegates. Letters
              are produced on PYPC letterhead and emailed as a signed PDF. An invitation letter supports a
              visa application; the decision itself rests with the relevant authority.
            </p>
          </div>

          <Link href="/international/visa-letter" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            <FileText size={16} /> New request
          </Link>
        </div>
      </Card>

      {displayContent(requests.length === 0 ? (
        <Card>
          <div className="flex flex-col items-start gap-3">
            <Globe2 size={22} className="text-gold-600" />
            <p className="text-sm font-extrabold text-slate-900">No invitation letter requests yet</p>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              If you are joining a PYPC conference or course from outside Pakistan and need documentation for
              a visa application, submit a request and the secretariat will issue a letter within five
              working days.
            </p>
            <Link href="/international/visa-letter" className={buttonVariants({ variant: 'gold', size: 'md' })}>
              Request an invitation letter
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <Card key={request.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{displayContent(humanise(request.letterType))}</Badge>
                    <Badge
                      tone={
                        request.status === 'ISSUED'
                          ? 'success'
                          : request.status === 'REJECTED'
                            ? 'danger'
                            : request.status === 'NEED_INFO'
                              ? 'gold'
                              : 'info'
                      }
                    >
                      {displayContent(humanise(request.status))}
                    </Badge>
                  </div>

                  <p className="mt-3 font-mono text-xs font-bold text-primary">{displayContent(request.reference)}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {displayContent(request.eventName ?? 'General visitor visa support')}
                  </p>

                  <dl className="mt-3 grid gap-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-primary-500" />
                      Requested {displayContent(formatDate(request.createdAt))}
                      {displayContent(request.issuedAt ? ` · issued ${formatDate(request.issuedAt)}` : '')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe2 size={13} className="text-primary-500" />
                      {displayContent(request.nationality)}
                      {displayContent(request.embassyCity ? ` · applying in ${request.embassyCity}` : '')}
                    </div>
                  </dl>

                  <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
                    {displayContent(request.purpose)}
                  </p>

                  {displayContent(request.adminNotes ? (
                    <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      Secretariat note: {displayContent(request.adminNotes)}
                    </p>
                  ) : null)}

                  {displayContent(request.documentUrl ? (
                    <a
                      href={request.documentUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-gold-700"
                    >
                      <FileText size={13} /> Your attached document
                    </a>
                  ) : null)}
                </div>

                <div className="shrink-0">
                  {displayContent(request.status === 'ISSUED' ? (
                    <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
                      <CheckCircle2 size={15} /> Letter issued, check your email
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
                      <Clock size={15} /> In the queue · 5 working days
                    </p>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}
