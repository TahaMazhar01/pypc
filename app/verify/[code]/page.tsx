
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Download, ShieldCheck } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Badge, Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { certificateQrDataUrl, verifyCertificate } from '@/lib/certificates'
import { formatDate, formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  return {
    title: `Verify ${decodeURIComponent(params.code).toUpperCase()}`,
    description: 'PYPC certificate verification record.',
    robots: { index: false, follow: false }
  }
}

export default async function VerifyResultPage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code)
  const result = await verifyCertificate(code)

  if (!result.found || !result.certificate) {
    return (
      <>
        <PageHero
          eyebrow="Verification result"
          title="No record found"
          description="This code does not match any certificate issued by the Pakistan Youth Parliamentary Council."
          breadcrumb={[{ label: 'Verify', href: '/verify' }, { label: 'Not found' }]}
        />

        <section className="container max-w-3xl py-14">
          <Card className="border-rose-200 bg-rose-50">
            <p className="flex items-center gap-2 text-lg font-extrabold text-rose-800">
              <AlertTriangle size={20} /> Unverified certificate code
            </p>
            <p className="mt-3 text-sm leading-7 text-rose-800">
              We searched for <span className="font-mono font-bold">{displayContent(result.code)}</span> and found no
              matching record. Possible reasons: the code was mistyped, the certificate is not a PYPC
              document, or the code was fabricated.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/verify" className={buttonVariants({ variant: 'primary', size: 'md' })}>
                Try another code
              </Link>
              <Link href="/contact" className={buttonVariants({ variant: 'outline', size: 'md' })}>
                Report a discrepancy
              </Link>
            </div>
          </Card>
        </section>
      </>
    )
  }

  const certificate = result.certificate
  const qrDataUrl = await certificateQrDataUrl(certificate.code, 320)
  const isValid = certificate.status === 'VALID'

  return (
    <>
      <PageHero
        eyebrow="Verification result"
        title={displayContent(isValid ? 'Certificate verified' : `Certificate ${certificate.status.toLowerCase()}`)}
        description={
          isValid
            ? 'This certificate was issued by the Pakistan Youth Parliamentary Council and is currently valid.'
            : 'This certificate is on record but is not currently valid. See the status details below.'
        }
        breadcrumb={[{ label: 'Verify', href: '/verify' }, { label: certificate.code }]}
      />

      <section className="container grid gap-8 py-14 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card className={isValid ? 'border-emerald-200' : 'border-rose-200'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge tone={isValid ? 'success' : 'danger'}>
                {displayContent(isValid ? (
                  <>
                    <ShieldCheck size={14} /> Valid certificate
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} /> {displayContent(certificate.status)}
                  </>
                ))}
              </Badge>
              <span className="font-mono text-xs font-bold text-slate-500">{displayContent(certificate.code)}</span>
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-primary-900">{displayContent(certificate.title)}</h2>

            <p className="mt-5 text-sm font-bold uppercase tracking-wide text-slate-500">
              Issued to
            </p>
            <p className="text-2xl font-extrabold text-slate-900">{displayContent(certificate.recipientName)}</p>

            <p className="mt-5 text-sm font-bold uppercase tracking-wide text-slate-500">Description</p>
            <p className="mt-1 leading-7 text-slate-600">{displayContent(certificate.description)}</p>

            <dl className="mt-7 grid gap-4 sm:grid-cols-2">
              <Row label="Issuing programme / activity" value={certificate.programme ?? certificate.event ?? 'PYPC programme'} />
              <Row label="Issue date" value={formatDate(certificate.issueDate)} />
              <Row label="Validity" value={certificate.expiresAt ? `Until ${formatDate(certificate.expiresAt)}` : 'No expiry stated'} />
              <Row label="Grade / distinction" value={certificate.grade ?? 'Not graded'} />
              <Row label="Authorised by" value={certificate.issuedBy ?? 'PYPC National Secretariat'} />
              <Row label="Verified at" value={formatDateTime(new Date())} />
            </dl>

            {displayContent(!isValid ? (
              <p className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                Status: {displayContent(certificate.status)}
                {displayContent(certificate.revokedReason ? ` — ${certificate.revokedReason}` : '')}. Do not rely on this
                document as evidence of participation.
              </p>
            ) : null)}
          </Card>

          {displayContent(isValid ? (
            <Card>
              <h3 className="text-lg font-extrabold text-primary-900">Download official copy</h3>
              <p className="mt-2 text-sm text-slate-600">
                The PDF includes the certificate details, e signature block and the embedded QR code.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={`/api/certificates/pdf?code=${encodeURIComponent(certificate.code)}`}
                  className={buttonVariants({ variant: 'primary', size: 'md' })}
                >
                  <Download size={17} /> Download PDF
                </a>
                <Link href="/verify" className={buttonVariants({ variant: 'outline', size: 'md' })}>
                  Verify another certificate
                </Link>
              </div>
            </Card>
          ) : null)}
        </div>

        <aside className="space-y-5">
          <Card className="text-center">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">QR record</h3>
            <div className="mt-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={displayContent(`QR code for certificate ${certificate.code}`)}
                className="h-52 w-52 rounded-xl border border-slate-200 p-2"
              />
            </div>
            <p className="mt-4 font-mono text-sm font-bold text-primary">{displayContent(certificate.code)}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Scanning this code any time returns this same live record, including if the certificate is
              later revoked.
            </p>
          </Card>

          <Card className="bg-slate-50">
            <h3 className="font-extrabold text-slate-900">Verification activity</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This certificate has been checked{displayContent(' ')}
              <strong>{displayContent(certificate.verificationCount.toLocaleString('en-PK'))}</strong> time(s) in total.
              Verification counts help PYPC detect abnormal or bulk checking activity.
            </p>
          </Card>

          <Link
            href="/verify"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            <ArrowLeft size={16} /> Back to verification
          </Link>
        </aside>
      </section>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{displayContent(label)}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-800">{displayContent(value)}</dd>
    </div>
  )
}
