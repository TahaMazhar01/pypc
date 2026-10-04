
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, Globe2 } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { VisaLetterControls } from '@/components/admin/visa-letter-controls'
import { prisma } from '@/lib/prisma'
import { isStaff, requireUser } from '@/lib/auth'
import { formatDate, humanise } from '@/lib/utils'

export const metadata: Metadata = { title: 'Visa letters' }
export const dynamic = 'force-dynamic'

export default async function AdminVisaLettersPage({
  searchParams
}: {
  searchParams: { status?: string }
}) {
  const staff = await requireUser()
  if (!isStaff(staff.role)) redirect('/dashboard')

  const status = searchParams.status

  const requests = await prisma.visaLetterRequest
    .findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { email: true, phone: true, city: true } } }
    })
    .catch(() => [])

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Visa invitation letter requests</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          International delegates request official invitation letters here. Marking a request{displayContent(' ')}
          <strong>Issued</strong> notifies the delegate immediately; the letter itself is produced on
          letterhead outside the platform, and every decision is written to the audit log.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <FilterChip label="All" href="/admin/visa-letters" active={!status} />
          {['PENDING', 'NEED_INFO', 'ISSUED', 'REJECTED'].map(item => (
            <FilterChip
              key={item}
              label={humanise(item)}
              href={`/admin/visa-letters?status=${item}`}
              active={status === item}
            />
          ))}
        </div>
      </Card>

      {displayContent(requests.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            No invitation letter requests match this filter yet. Delegates submit requests from the{displayContent(' ')}
            <Link href="/international/visa-letter" className="font-bold text-primary underline decoration-gold-300">
              visa letter page
            </Link>
            .
          </p>
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
                    <span className="font-mono text-xs font-bold text-slate-500">{displayContent(request.reference)}</span>
                  </div>

                  <p className="mt-3 text-sm font-extrabold text-slate-900">{displayContent(request.fullName)}</p>
                  <p className="text-xs text-slate-500">
                    {displayContent(request.email)} · {displayContent(request.nationality)}
                    {displayContent(request.passportNumber ? ` · Passport ${request.passportNumber}` : '')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Applicant record: {displayContent(request.user.email)}
                    {displayContent(request.user.phone ? ` · ${request.user.phone}` : '')}
                  </p>

                  <p className="mt-3 text-xs font-semibold text-slate-600">
                    {displayContent(request.eventName ?? 'General visitor visa support')}
                    {displayContent(request.embassyCity ? ` · applying in ${request.embassyCity}` : '')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Travel: {displayContent(request.travelFrom ? formatDate(request.travelFrom) : 'not stated')} →{displayContent(' ')}
                    {displayContent(request.travelTo ? formatDate(request.travelTo) : 'not stated')}
                  </p>

                  <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
                    {displayContent(request.purpose)}
                  </p>

                  {displayContent(request.documentUrl ? (
                    <a
                      href={request.documentUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-gold-700"
                    >
                      <FileText size={13} /> Attached supporting document
                    </a>
                  ) : null)}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Requested</p>
                  <p className="text-xs font-semibold text-slate-600">{displayContent(formatDate(request.createdAt))}</p>
                  {displayContent(request.issuedAt ? (
                    <>
                      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        Issued
                      </p>
                      <p className="text-xs font-semibold text-emerald-700">{displayContent(formatDate(request.issuedAt))}</p>
                    </>
                  ) : null)}
                  <p className="mt-3 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-slate-500">
                    <Globe2 size={12} /> {displayContent(humanise(request.letterType))}
                  </p>
                </div>
              </div>

              <VisaLetterControls
                requestId={request.id}
                status={request.status}
                adminNotes={request.adminNotes}
              />
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`focus-ring rounded-full border px-4 py-1.5 text-xs font-bold transition ${
        active
          ? 'border-primary bg-primary text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:text-primary'
      }`}
    >
      {displayContent(label)}
    </Link>
  )
}
