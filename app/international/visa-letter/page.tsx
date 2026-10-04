
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, BadgeCheck, Clock, FileText, Globe2, Mail, ShieldCheck } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { TiltCard } from '@/components/motion/tilt-card'
import { buttonVariants } from '@/components/ui/button'
import { VisaLetterForm } from '@/components/features/visa-letter-form'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate, humanise } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Visa invitation letter',
  description:
    'Registered international delegates can request an official PYPC invitation letter for their visa application. Issued on letterhead within five working days.',
  alternates: { canonical: '/international/visa-letter' }
}

export const dynamic = 'force-dynamic'

const REQUIREMENTS = [
  'A registered PYPC account in your own name',
  'A confirmed registration for the programme or conference you are attending',
  'Passport details (number optional, but it speeds up embassy processing)',
  'The embassy or consulate where you will apply',
  'Your intended travel dates, if known'
]

const PROCESS = [
  {
    title: 'Submit the request',
    detail: 'Complete the form below. Everything is stored against your member record and assigned a reference number.'
  },
  {
    title: 'Secretariat verification',
    detail: 'We confirm your registration and identity details. If something is missing we mark the request “more information needed”.'
  },
  {
    title: 'Letter issued',
    detail: 'A PDF letter on PYPC letterhead is issued, signed and dated, stating your name, role, event and dates.'
  },
  {
    title: 'You apply for the visa',
    detail: 'The letter is yours to submit with your application. The visa decision itself rests entirely with the relevant authority.'
  }
]

export default async function VisaLetterPage() {
  const user = await getCurrentUser()

  const existing = user
    ? await prisma.visaLetterRequest
        .findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5 })
        .catch(() => [])
    : []

  return (
    <>
      <PageHero
        eyebrow="International delegate support"
        title="Official visa invitation letters for registered delegates"
        description="If you are travelling to Pakistan for a PYPC conference, course or institutional visit, the secretariat issues a formal invitation letter on official letterhead. It is written for embassy submission: named, dated, referenced and signed."
        breadcrumb={[{ label: 'International', href: '/international' }, { label: 'Visa letter' }]}
      >
        <div className="flex flex-wrap gap-3">
          {displayContent(user ? (
            <a href="#request-form" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
              Go to the request form
            </a>
          ) : (
            <Link href="/register" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
              Create your account first
            </Link>
          ))}
          <Link href="/conferences/imun-2027" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            IMUN 2027 details
          </Link>
        </div>
      </PageHero>

      <section className="container py-14">
        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal>
            <TiltCard intensity={7} className="h-full rounded-2xl border border-slate-200 bg-white p-6">
              <FileText size={22} className="text-primary" />
              <h2 className="mt-4 text-base font-extrabold text-primary-900">What the letter states</h2>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                {[
                  'Your full name as recorded in your passport',
                  'Your role: delegate, participant, researcher or faculty advisor',
                  'The event, its dates and its venue city',
                  'The purpose of your visit and your institution',
                  'PYPC letterhead, issue date, signature and a reference number'
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <BadgeCheck size={14} className="mt-1 shrink-0 text-gold-600" />
                    {displayContent(item)}
                  </li>
                ))}
              </ul>
            </TiltCard>
          </Reveal>

          <Reveal delay={0.08}>
            <TiltCard intensity={7} className="h-full rounded-2xl border border-slate-200 bg-white p-6">
              <Clock size={22} className="text-primary" />
              <h2 className="mt-4 text-base font-extrabold text-primary-900">Turnaround & follow up</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Requests are processed within five working days. Urgent travel cases can be flagged in the
                purpose field, the secretariat prioritises them where the schedule allows.
              </p>
              <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Mail size={14} /> Delivered to your registered email address as a signed PDF.
              </p>
            </TiltCard>
          </Reveal>

          <Reveal delay={0.16}>
            <TiltCard intensity={7} className="h-full rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <AlertTriangle size={22} className="text-amber-700" />
              <h2 className="mt-4 text-base font-extrabold text-amber-900">What PYPC cannot do</h2>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-amber-900">
                <li>PYPC cannot sponsor, guarantee or influence a visa decision.</li>
                <li>PYPC does not cover travel, accommodation or visa fees unless a written scholarship says so.</li>
                <li>Letters are only issued to participants with a confirmed registration.</li>
              </ul>
            </TiltCard>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary-900">
                <ShieldCheck size={18} className="text-gold-600" /> What you need before requesting
              </h2>
              <ol className="mt-4 space-y-3">
                {REQUIREMENTS.map((item, index) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 font-mono text-[11px] font-extrabold text-primary">
                      {displayContent(index + 1)}
                    </span>
                    {displayContent(item)}
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary-900">
                <Globe2 size={18} className="text-gold-600" /> How the process runs
              </h2>
              <ol className="mt-4 space-y-4">
                {PROCESS.map((item, index) => (
                  <li key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="font-mono text-[11px] font-extrabold text-gold-700">
                      STAGE {displayContent(String(index + 1).padStart(2, '0'))}
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-primary-900">{displayContent(item.title)}</p>
                    <p className="mt-1 text-xs leading-6 text-slate-600">{displayContent(item.detail)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Reveal>

        {displayContent(existing.length ? (
          <Reveal delay={0.12}>
            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-extrabold text-primary-900">Your recent requests</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th scope="col" className="py-2 pr-4">Reference</th>
                      <th scope="col" className="py-2 pr-4">Type</th>
                      <th scope="col" className="py-2 pr-4">Submitted</th>
                      <th scope="col" className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {existing.map(request => (
                      <tr key={request.id}>
                        <td className="py-3 pr-4 font-mono text-xs font-bold text-primary">{displayContent(request.reference)}</td>
                        <td className="py-3 pr-4 text-slate-600">{displayContent(humanise(request.letterType))}</td>
                        <td className="py-3 pr-4 text-slate-600">{displayContent(formatDate(request.createdAt))}</td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                            {displayContent(humanise(request.status))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        ) : null)}

        <section id="request-form" className="mt-12 scroll-mt-24">
          <Reveal>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-extrabold text-primary-900">Request your invitation letter</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                {displayContent(user
                  ? 'Your details are pre-filled from your member record — correct anything that differs from your passport.'
                  : 'You can review the form now. Submitting requires a free PYPC account so the letter can be issued in your name and tracked in your dashboard.')}
              </p>

              <div className="mt-6">
                <VisaLetterForm
                  defaultName={user ? `${user.firstName} ${user.lastName}`.trim() : ''}
                  defaultEmail={user?.email ?? ''}
                />
              </div>
            </div>
          </Reveal>
        </section>
      </section>
    </>
  )
}
