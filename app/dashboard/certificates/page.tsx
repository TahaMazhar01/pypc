import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, EmptyState } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { CertificateCard } from '@/components/dashboard/certificate-card'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { certificateQrDataUrl } from '@/lib/certificates'

export const metadata: Metadata = { title: 'My Certificates' }
export const dynamic = 'force-dynamic'

export default async function CertificatesPage() {
  const user = await requireUser()

  const certificates = await prisma.certificate.findMany({
    where: { userId: user.id },
    orderBy: { issueDate: 'desc' },
    include: {
      programme: { select: { title: true } },
      event: { select: { title: true } }
    }
  })

  const withQr = await Promise.all(
    certificates.map(async certificate => ({
      certificate,
      qrDataUrl: await certificateQrDataUrl(certificate.code, 220)
    }))
  )

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Your certificates</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Each certificate carries a unique code and QR record. Anyone can verify it on the public
              verification page, including current status if it is ever revoked or expires.
            </p>
          </div>
          <Link href="/verify" className={buttonVariants({ variant: 'outline', size: 'md' })}>
            Public verification
          </Link>
        </div>
      </Card>

      {withQr.length ? (
        <div className="space-y-4">
          {withQr.map(({ certificate, qrDataUrl }) => (
            <CertificateCard key={certificate.id} certificate={certificate} qrDataUrl={qrDataUrl} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No certificates issued yet"
          description="Certificates appear here once you complete a programme, event or fellowship requirement. Participation must be recorded by the secretariat."
          action={
            <Link href="/programmes" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              Browse programmes
            </Link>
          }
        />
      )}

      <Card className="bg-slate-50">
        <h2 className="font-extrabold text-slate-900">Printing guidance</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <li>• Download the PDF for the official version with the QR code and signature block.</li>
          <li>• For physical copies, print on A4 landscape, 160 to 200 gsm paper.</li>
          <li>• Never edit or re typeset a PYPC certificate, altered documents will not verify.</li>
        </ul>
      </Card>
    </div>
  )
}
