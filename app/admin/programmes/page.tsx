
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, Card } from '@/components/ui/card'
import { ContentToggle } from '@/components/admin/admin-controls'
import { prisma } from '@/lib/prisma'
import { requireUser, isStaff } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Programmes' }
export const dynamic = 'force-dynamic'

export default async function AdminProgrammesPage() {
  const user = await requireUser()
  if (!isStaff(user.role) && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) redirect('/dashboard')

  const programmes = await prisma.programme.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { applications: true, certificates: true } } }
  })

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Programme catalogue</h2>
        <p className="mt-1 text-sm text-slate-600">
          Toggle availability and featured status instantly. Full content editing (descriptions, dates,
          fees, structure) is performed in the database via{displayContent(' ')}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npm run db:studio</code>, this keeps
          rich text changes reviewable rather than buried in a form.
        </p>
      </Card>

      <div className="space-y-4">
        {programmes.map(programme => (
          <Card key={programme.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{displayContent(programme.category)}</Badge>
                  {displayContent(programme.isFeatured ? <Badge tone="gold">Featured</Badge> : null)}
                  <Badge tone={programme.isActive ? 'success' : 'neutral'}>
                    {displayContent(programme.isActive ? 'Active' : 'Inactive')}
                  </Badge>
                </div>

                <h3 className="mt-3 font-extrabold text-slate-900">{displayContent(programme.title)}</h3>
                <p className="mt-1 font-mono text-xs text-slate-500">/programmes/{displayContent(programme.slug)}</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{displayContent(programme.summary)}</p>

                <p className="mt-3 text-xs text-slate-500">
                  {displayContent(programme.durationWeeks ?? '—')} weeks · {displayContent(programme.seats ?? 'Open')} seats ·{displayContent(' ')}
                  {displayContent(programme.mode)} · {displayContent(programme._count.applications)} application(s) ·{displayContent(' ')}
                  {displayContent(programme._count.certificates)} certificate(s)
                </p>
              </div>

              <div className="flex flex-col items-start gap-3">
                <ContentToggle
                  entity="programme"
                  id={programme.id}
                  field="isActive"
                  value={programme.isActive}
                />
                <ContentToggle
                  entity="programme"
                  id={programme.id}
                  field="isFeatured"
                  value={programme.isFeatured}
                />
                <Link
                  href={`/programmes/${programme.slug}`}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  View public page →
                </Link>
                <span className="text-[11px] text-slate-500">
                  Updated {displayContent(formatDate(programme.updatedAt))}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
