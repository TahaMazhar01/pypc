
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, Card, StatCard } from '@/components/ui/card'
import { CertificateControls, IssueCertificateForm } from '@/components/admin/admin-controls'
import { prisma } from '@/lib/prisma'
import { requireAdminPage } from '@/lib/auth'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'

export const metadata: Metadata = { title: 'Certificates' }
export const dynamic = 'force-dynamic'

export default async function AdminCertificatesPage() {
  await requireAdminPage()

  const [certificates, programmes, events] = await Promise.all([
    prisma.certificate.findMany({
      orderBy: { issueDate: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        programme: { select: { title: true } },
        event: { select: { title: true } },
        issuer: { select: { firstName: true, lastName: true } }
      }
    }),
    prisma.programme.findMany({ where: { isActive: true }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    prisma.event.findMany({ select: { id: true, title: true }, orderBy: { startsAt: 'desc' } })
  ])

  const valid = certificates.filter(item => item.status === 'VALID').length
  const revoked = certificates.filter(item => item.status === 'REVOKED').length
  const totalVerifications = certificates.reduce((total, item) => total + item.verificationCount, 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Valid certificates" value={valid} icon={<Icon name="ShieldCheck" size={18} />} tone="success" />
        <StatCard label="Revoked" value={revoked} icon={<Icon name="Ban" size={18} />} tone="danger" />
        <StatCard
          label="Public verifications"
          value={totalVerifications}
          hint="Times records were checked publicly"
          icon={<Icon name="Fingerprint" size={18} />}
        />
      </div>

      <Card>
        <h2 className="text-lg font-extrabold text-slate-900">Issue a new certificate</h2>
        <p className="mt-1 text-sm text-slate-600">
          A unique code (PYPC XXXX XXXX XXXX) and QR record are generated automatically. Linking the
          member&apos;s user ID publishes it in their dashboard and notifies them.
        </p>

        <div className="mt-5">
          <IssueCertificateForm programmes={programmes} events={events} />
        </div>
      </Card>

      <div className="space-y-4">
        {certificates.map(certificate => (
          <Card key={certificate.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={certificate.status === 'VALID' ? 'success' : certificate.status === 'REVOKED' ? 'danger' : 'warning'}>
                    {displayContent(certificate.status)}
                  </Badge>
                  <span className="font-mono text-xs font-bold text-primary">{displayContent(certificate.code)}</span>
                  {displayContent(certificate.grade ? <Badge tone="gold">{displayContent(certificate.grade)}</Badge> : null)}
                </div>

                <h3 className="mt-3 font-extrabold text-slate-900">{displayContent(certificate.title)}</h3>

                <p className="mt-1 text-sm text-slate-600">
                  Issued to <strong>{displayContent(certificate.recipientName)}</strong>
                  {displayContent(certificate.user ? ` (${certificate.user.email})` : ' — not linked to a member account')}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {displayContent(certificate.programme?.title ?? certificate.event?.title ?? 'No programme/event link')} ·{displayContent(' ')}
                  {displayContent(formatDate(certificate.issueDate))} · Issued by{displayContent(' ')}
                  {displayContent(certificate.issuer
                    ? `${certificate.issuer.firstName} ${certificate.issuer.lastName}`
                    : 'system')}
                </p>

                <p className="mt-2 text-[11px] text-slate-500">
                  {displayContent(certificate.verificationCount)} verification(s) · {displayContent(certificate.downloadCount)} download(s)
                  {displayContent(certificate.lastVerifiedAt
                    ? ` · last checked ${formatDateTime(certificate.lastVerifiedAt)}`
                    : '')}
                </p>

                {displayContent(certificate.revokedReason ? (
                  <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    Revoked: {displayContent(certificate.revokedReason)}
                  </p>
                ) : null)}
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href={`/verify/${certificate.code}`}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Open public record →
                </Link>

                <CertificateControls certificateId={certificate.id} status={certificate.status} />
              </div>
            </div>
          </Card>
        ))}

        {displayContent(!certificates.length ? (
          <Card className="text-center text-sm text-slate-500">
            No certificates issued yet. Use the form above to issue the first one.
          </Card>
        ) : null)}
      </div>
    </div>
  )
}
