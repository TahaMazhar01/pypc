
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge, Card } from '@/components/ui/card'
import { ContentToggle } from '@/components/admin/admin-controls'
import { prisma } from '@/lib/prisma'
import { isStaff, requireUser } from '@/lib/auth'
import { formatDate, relativeDeadline } from '@/lib/utils'

export const metadata: Metadata = { title: 'Opportunities' }
export const dynamic = 'force-dynamic'

export default async function AdminOpportunitiesPage() {
  const user = await requireUser()
  if (!isStaff(user.role) && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) redirect('/dashboard')

  const opportunities = await prisma.opportunity.findMany({
    orderBy: [{ isActive: 'desc' }, { deadline: 'asc' }],
    include: { _count: { select: { applications: true } } }
  })

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Opportunity listings</h2>
        <p className="mt-1 text-sm text-slate-600">
          Deactivate a listing when the deadline passes or the partner closes intake; the record and its
          applications remain intact for audit.
        </p>
      </Card>

      <div className="space-y-4">
        {opportunities.map(opportunity => (
          <Card key={opportunity.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">{displayContent(opportunity.type)}</Badge>
                  <Badge tone={opportunity.isActive ? 'success' : 'neutral'}>
                    {displayContent(opportunity.isActive ? 'Active' : 'Closed')}
                  </Badge>
                  {displayContent(opportunity.isFeatured ? <Badge tone="gold">Featured</Badge> : null)}
                  <Badge tone="warning">{displayContent(relativeDeadline(opportunity.deadline))}</Badge>
                </div>

                <h3 className="mt-3 font-extrabold text-slate-900">{displayContent(opportunity.title)}</h3>
                <p className="mt-1 text-sm text-slate-600">{displayContent(opportunity.organisation)}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  /opportunities/{displayContent(opportunity.slug)}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {displayContent(opportunity.location)} · {displayContent(opportunity.mode)} · deadline {displayContent(formatDate(opportunity.deadline))} ·{displayContent(' ')}
                  {displayContent(opportunity._count.applications)} application(s)
                </p>
              </div>

              <div className="flex flex-col items-start gap-3">
                <ContentToggle
                  entity="opportunity"
                  id={opportunity.id}
                  field="isActive"
                  value={opportunity.isActive}
                />
                <ContentToggle
                  entity="opportunity"
                  id={opportunity.id}
                  field="isFeatured"
                  value={opportunity.isFeatured}
                />
                <Link
                  href={`/opportunities/${opportunity.slug}`}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  View public page →
                </Link>
              </div>
            </div>
          </Card>
        ))}

        {displayContent(!opportunities.length ? (
          <Card className="text-center text-sm text-slate-500">No opportunities recorded.</Card>
        ) : null)}
      </div>
    </div>
  )
}
