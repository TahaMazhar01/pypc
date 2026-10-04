
import { displayContent } from '@/lib/display-content'
import Link from 'next/link'
import { Award, Download, ShieldCheck } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

/**
 * Server component: renders a certificate with its live QR code.
 * The QR encodes {APP_URL}/verify/{CODE}, so printing this card is as
 * verifiable as the official PDF.
 */
export async function CertificateCard({
  certificate,
  qrDataUrl
}: {
  certificate: {
    id: string
    code: string
    title: string
    recipientName: string
    description: string
    grade: string | null
    issueDate: Date
    expiresAt: Date | null
    status: string
    programme: { title: string } | null
    event: { title: string } | null
    downloadCount: number
    verificationCount: number
  }
  qrDataUrl: string
}) {
  const tone = certificate.status === 'VALID' ? 'success' : certificate.status === 'EXPIRED' ? 'warning' : 'danger'

  return (
    <Card className="grid gap-6 sm:grid-cols-[190px_1fr]">
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt={displayContent(`QR code for ${certificate.code}`)}
          className="h-40 w-40 rounded-xl border border-slate-200 p-1.5"
        />
        <p className="font-mono text-xs font-bold text-primary">{displayContent(certificate.code)}</p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone as 'success' | 'warning' | 'danger'}>{displayContent(certificate.status)}</Badge>
          {displayContent(certificate.grade ? <Badge tone="gold">{displayContent(certificate.grade)}</Badge> : null)}
        </div>

        <h3 className="mt-3 flex items-start gap-2 text-lg font-extrabold text-slate-900">
          <Award size={19} className="mt-0.5 shrink-0 text-gold-600" />
          {displayContent(certificate.title)}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">{displayContent(certificate.description)}</p>

        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-500">Issued to</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">{displayContent(certificate.recipientName)}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-500">Issue date</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">{displayContent(formatDate(certificate.issueDate))}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-500">Programme / activity</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">
              {displayContent(certificate.programme?.title ?? certificate.event?.title ?? 'PYPC programme')}
            </dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-slate-500">Validity</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">
              {displayContent(certificate.expiresAt ? `Until ${formatDate(certificate.expiresAt)}` : 'No expiry stated')}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={`/api/certificates/pdf?code=${encodeURIComponent(certificate.code)}`}
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            <Download size={16} /> Download PDF
          </a>

          <Link
            href={`/verify/${certificate.code}`}
            className={buttonVariants({ variant: 'outline', size: 'md' })}
          >
            <ShieldCheck size={16} /> Public record
          </Link>

          <span className="text-[11px] text-slate-500">
            {displayContent(certificate.downloadCount)} download(s) · {displayContent(certificate.verificationCount)} verification(s)
          </span>
        </div>
      </div>
    </Card>
  )
}
