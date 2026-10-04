
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BarChart3, Download, FileText, ShieldCheck, TrendingUp } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Impact & Reports',
  description:
    'PYPC impact metrics counted from live platform data, the published impact report, and how every figure in it can be independently verified.',
  alternates: { canonical: '/impact' },
  openGraph: {
    images: [{ url: '/images/og-default.png', width: 1200, height: 630, alt: 'PYPC impact and reports' }]
  }
}

export const dynamic = 'force-dynamic'

export default async function ImpactPage() {
  const [members, verified, programmes, events, opportunities, certificates, applications] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      prisma.programme.count({ where: { isActive: true } }),
      prisma.event.count({ where: { isPublished: true } }),
      prisma.opportunity.count({ where: { isActive: true } }),
      prisma.certificate.count(),
      prisma.application.count()
    ])

  const metrics = [
    {
      label: 'Registered members',
      value: members,
      zero: 'Membership opens with the first intake',
      detail: `${verified} with a verified email address — verification is required before an account becomes active.`,
      icon: <TrendingUp size={18} />
    },
    {
      label: 'Active programmes',
      value: programmes,
      zero: 'Programme intake opens with the first cohort',
      detail: 'Each with a stated format, duration, eligibility rule and the record a participant receives.',
      icon: <BarChart3 size={18} />
    },
    {
      label: 'Applications received',
      value: applications,
      zero: 'Applications open with the first programme',
      detail: 'Server-validated submissions with document upload and progress that survives a refresh.',
      icon: <FileText size={18} />
    },
    {
      label: 'Published events',
      value: events,
      zero: 'Dates are published as they are confirmed',
      detail: 'Listed with venue, format and fee; a provisional date is labelled to be confirmed.',
      icon: <BarChart3 size={18} />
    },
    {
      label: 'Open opportunities',
      value: opportunities,
      zero: 'The opportunities board opens with the first intake',
      detail: 'Scholarships, fellowships and delegations, each with its own eligibility criteria.',
      icon: <TrendingUp size={18} />
    },
    {
      label: 'Certificates issued',
      value: certificates,
      zero: 'Issued on completion — the first cohort is in progress',
      detail: 'Every certificate carries a QR code and a reference code that verify publicly, including revocations.',
      icon: <ShieldCheck size={18} />
    }
  ]

  return (
    <>
      <PageHero
        eyebrow="Impact & Reports"
        title="Numbers we can prove, and a report anyone can check"
        description="Every figure on this page is counted from the live platform database when the page loads. Where a measure has not started yet, we say so in words rather than printing a placeholder. The same discipline applies to the published impact report, which is generated from this data."
        breadcrumb={[{ label: 'Impact & Reports' }]}
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/reports/pypc-impact-report-2026.pdf"
            className={buttonVariants({ variant: 'primary', size: 'lg' })}
            download
          >
            <Download size={16} /> Download impact report (PDF)
          </a>
          <Link href="/status" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Live system status
          </Link>
        </div>
      </PageHero>

      <section className="container py-14">
        <h2 className="text-2xl font-extrabold text-primary-900">This year, measured</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          Counted at page load, not typed once and forgotten. Refresh the page and the numbers refresh with
          it, which is the point: a report that cannot be updated by hand cannot quietly overstate.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map(metric => (
            <Card key={metric.label} className="flex h-full flex-col">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
                {displayContent(metric.icon)}
              </span>
              <p className="mt-4 text-3xl font-extrabold text-slate-900">
                {displayContent(metric.value > 0 ? metric.value.toLocaleString('en-GB') : <span className="text-lg">{displayContent(metric.zero)}</span>)}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{displayContent(metric.label)}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{displayContent(metric.detail)}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-14">
        <div className="container grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="text-lg font-extrabold text-primary-900">The published impact report</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              A two page statement covering registered members, programmes, events, certificates and the
              platform&apos;s verified capability, plus how governance and integrity are handled. It is
              produced by{displayContent(' ')}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">the report generator</code>{displayContent(' ')}
              directly from the database, so every number in the PDF matches the numbers on this page.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-600">
              <li>• Generated date printed inside the document.</li>
              <li>• Zero state measures described in words, never printed as 0.</li>
              <li>• Capability claims limited to features that exist on this platform.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/reports/pypc-impact-report-2026.pdf"
                className={buttonVariants({ variant: 'primary', size: 'md' })}
                download
              >
                <Download size={15} /> Download the report
              </a>
              <Link href="/policies" className={buttonVariants({ variant: 'outline', size: 'md' })}>
                Published policies
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-primary-100 bg-primary-50 p-6">
            <h2 className="text-lg font-extrabold text-primary-900">How to verify any figure here</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <li>
                <strong>Certificates</strong>, check any certificate by QR or reference code on the{displayContent(' ')}
                <Link href="/verify" className="font-semibold text-primary underline-offset-4 hover:underline">
                  public verification page
                </Link>
                , including revoked ones.
              </li>
              <li>
                <strong>Members and applications</strong>, the dashboard figures and the impact numbers
                above are the same database rows.
              </li>
              <li>
                <strong>Platform health</strong>, the{displayContent(' ')}
                <Link href="/status" className="font-semibold text-primary underline-offset-4 hover:underline">
                  status page
                </Link>{displayContent(' ')}
                reports database, storage, assets, email and payment state in real time.
              </li>
              <li>
                <strong>Money</strong>, fees, refund terms and upgrade rules are published on the{displayContent(' ')}
                <Link href="/membership" className="font-semibold text-primary underline-offset-4 hover:underline">
                  membership page
                </Link>{displayContent(' ')}
                and the refund policy.
              </li>
              <li>
                <strong>Anything else</strong>, write to the secretariat; the contact page lists the
                mailbox, the phone number, office hours and the first response commitment.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="container py-14" id="partners">
        <h2 className="text-2xl font-extrabold text-primary-900">Partners and affiliations</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          We publish an organisation&apos;s name or mark only once an arrangement is countersigned and the
          partner has approved the wording. Nothing appears here as a &ldquo;coming soon&rdquo; logo, and we
          never display another organisation&apos;s crest to imply a relationship that does not exist.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <p className="font-bold text-slate-900">Where to see current partnerships</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
            <li>
              • <Link href="/partnerships" className="font-semibold text-primary underline-offset-4 hover:underline">Partnership routes</Link>{displayContent(' ')}, MoU process, campus circles and sponsorship tiers with named deliverables.
            </li>
            <li>
              • <Link href="/news" className="font-semibold text-primary underline-offset-4 hover:underline">Newsroom</Link>{displayContent(' ')}, every partnership announcement, each traceable to a signed document.
            </li>
            <li>
              • <Link href="/leadership" className="font-semibold text-primary underline-offset-4 hover:underline">Leadership</Link>{displayContent(' ')}, the officers who sign on behalf of the Council.
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}
