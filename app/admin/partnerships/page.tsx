
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Building2, Mail, Phone, Users } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { isAdmin, isStaff, requireUser } from '@/lib/auth'
import { formatDateTime, humanise } from '@/lib/utils'
import { PartnershipStatusControl } from '@/components/admin/partnership-status-control'
import {
  PARTNERSHIP_INTEREST_LABELS,
  PARTNERSHIP_STATUS_LABELS,
  PARTNERSHIP_STATUS_MEANINGS
} from '@/lib/partnerships'
import type { PartnershipInterest, PartnershipStatus } from '@/lib/partnerships'

export const metadata: Metadata = { title: 'Partnership requests' }
export const dynamic = 'force-dynamic'

function tone(status: string): 'success' | 'info' | 'warning' | 'danger' {
  if (status === 'APPROVED') return 'success'
  if (status === 'UNDER_REVIEW') return 'info'
  if (status === 'DECLINED' || status === 'WITHDRAWN') return 'danger'
  return 'warning'
}

export default async function AdminPartnershipsPage() {
  const user = await requireUser()
  if (!isStaff(user.role) && !isAdmin(user.role)) redirect('/dashboard')

  const requests = await prisma.partnershipRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200
  })

  const open = requests.filter(item => item.status === 'SUBMITTED' || item.status === 'UNDER_REVIEW')

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Partnership and MoU requests</h2>
        <p className="mt-1 text-sm text-slate-600">
          {displayContent(open.length)} open · {displayContent(requests.length)} total. Every status change is written to the audit log with
          your name on it. The process the institution is reading is published on{displayContent(' ')}
          <span className="font-semibold">/partnerships</span>, keep replies inside those turnarounds.
        </p>
        {requests.length === 0 && (
          <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            No request has been submitted yet. The public form is live at /partnerships; anything sent from
            it appears here immediately.
          </p>
        )}
      </Card>

      <div className="space-y-4">
        {requests.map(item => {
          let interests: PartnershipInterest[] = []
          try {
            const parsed = JSON.parse(item.interests)
            if (Array.isArray(parsed)) interests = parsed as PartnershipInterest[]
          } catch {
            /* stored value is not a list — show nothing rather than crash the console */
          }

          const status = item.status as PartnershipStatus

          return (
            <Card key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tone(item.status)}>{displayContent(PARTNERSHIP_STATUS_LABELS[status] ?? item.status)}</Badge>
                    <span className="font-mono text-xs font-bold text-slate-500">{displayContent(item.reference)}</span>
                    <span className="text-xs text-slate-500">{displayContent(formatDateTime(item.createdAt))}</span>
                  </div>

                  <h3 className="mt-3 flex items-center gap-2 font-extrabold text-slate-900">
                    <Building2 size={16} className="text-primary" />
                    {displayContent(item.institutionName)}
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    {displayContent(humanise(item.institutionType))}
                    {displayContent(item.city ? ` · ${item.city}` : '')}
                    {displayContent(item.country ? ` · ${item.country}` : '')}
                    {displayContent(item.website ? (
                      <>
                        {displayContent(' · ')}
                        <a
                          className="font-semibold text-primary hover:underline"
                          href={item.website.startsWith('http') ? item.website : `https://${item.website}`}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          website
                        </a>
                      </>
                    ) : null)}
                  </p>
                </div>

                {item.reviewedAt && (
                  <p className="text-xs text-slate-500">
                    Last decision {displayContent(formatDateTime(item.reviewedAt))}
                  </p>
                )}
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <p className="flex items-start gap-2 text-slate-700">
                  <Users size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span>
                    <span className="font-semibold">{displayContent(item.contactName)}</span> Not available {displayContent(item.contactRole)}
                    {displayContent(item.studentsReached ? ` · reaches ${item.studentsReached}` : '')}
                  </span>
                </p>
                <p className="flex flex-wrap items-start gap-x-4 gap-y-1">
                  <a
                    className="flex items-center gap-2 font-semibold text-primary hover:underline"
                    href={`mailto:${item.contactEmail}?subject=PYPC partnership ${item.reference}`}
                  >
                    <Mail size={16} /> {displayContent(item.contactEmail)}
                  </a>
                  {item.contactPhone && (
                    <span className="flex items-center gap-2 text-slate-700">
                      <Phone size={16} className="text-primary" /> {displayContent(item.contactPhone)}
                    </span>
                  )}
                </p>
              </div>

              {interests.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {interests.map(value => (
                    <li
                      key={value}
                      className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-800"
                    >
                      {displayContent(PARTNERSHIP_INTEREST_LABELS[value] ?? value)}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {displayContent(item.message)}
              </p>

              <p className="mt-3 text-xs text-slate-500">
                Institution sees: “{displayContent(PARTNERSHIP_STATUS_MEANINGS[status] ?? '—')}”
              </p>

              {item.adminNotes && (
                <p className="mt-2 text-xs text-slate-500">
                  <span className="font-semibold">Last note:</span> {displayContent(item.adminNotes)}
                </p>
              )}

              <PartnershipStatusControl
                requestId={item.id}
                status={item.status}
                adminNotes={item.adminNotes}
              />
            </Card>
          )
        })}
      </div>
    </div>
  )
}
