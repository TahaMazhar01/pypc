import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { VerificationForm } from '@/components/features/verification-form'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = {
  openGraph: {
    images: [{ url: '/images/og-verify.png', width: 1200, height: 630, alt: 'Verify a PYPC certificate by code or QR' }]
  },

  title: 'Verify a Certificate',
  description:
    'Verify a PYPC certificate or official document using its unique code or QR code. Instant, public verification.'
}

export default function VerifyPage() {
  return (
    <>
      <PageHero
        eyebrow="Public verification service"
        title="Verify a PYPC certificate or document"
        description="Enter the code printed on the certificate, or scan its QR code. Verification is instant and does not require an account."
        breadcrumb={[{ label: 'Verify' }]}
      />

      <section className="container grid gap-10 py-14 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="text-xl font-extrabold text-primary-900">Enter certificate code</h2>
          <p className="mt-2 text-sm text-slate-600">
            The code appears at the bottom of every PYPC certificate in the format
            <span className="font-mono font-bold"> PYPC XXXX XXXX XXXX</span>, next to the QR code.
          </p>

          <div className="mt-7">
            <VerificationForm />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 size={16} /> Valid
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                Issued by PYPC and currently in force. Details shown match the issuing record.
              </p>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-rose-800">
                <AlertTriangle size={16} /> Revoked or expired
              </p>
              <p className="mt-1 text-xs leading-5 text-rose-800">
                The certificate was withdrawn by PYPC, or its stated validity period has passed.
              </p>
            </div>
          </div>
        </Card>

        <aside className="space-y-5">
          <Card className="border-primary-100">
            <ShieldCheck size={24} className="text-primary" />
            <h3 className="mt-3 font-extrabold text-primary-900">Why verification matters</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Paper certificates are easy to copy. A QR verified record lets employers, universities and
              partners confirm in seconds that a certificate was genuinely issued and is still valid, and if it was revoked, they see that too.
            </p>
          </Card>

          <Card>
            <h3 className="font-extrabold text-slate-900">Demo codes in this build</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The seeded database includes two records so you can see both outcomes immediately:
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <span className="font-mono font-bold text-emerald-700">PYPC A2B4 C6D8 E9F1</span>
                <span className="block text-xs text-slate-500">Valid certificate</span>
              </li>
              <li>
                <span className="font-mono font-bold text-rose-700">PYPC Z9Y8 X7W6 V5U4</span>
                <span className="block text-xs text-slate-500">Revoked certificate</span>
              </li>
            </ul>
          </Card>

          <Card className="bg-slate-50">
            <h3 className="font-extrabold text-slate-900">Found a discrepancy?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              If a certificate does not verify but claims to be issued by PYPC, report it, this protects
              members and the organisation.
            </p>
            <Link href="/contact" className="mt-3 inline-flex text-sm font-bold text-primary hover:underline">
              Report a discrepancy →
            </Link>
          </Card>
        </aside>
      </section>
    </>
  )
}
