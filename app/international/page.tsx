
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, CreditCard, FileText, Globe2, GraduationCap, Landmark, Mail, ShieldCheck, UsersRound } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { TiltCard } from '@/components/motion/tilt-card'
import { Counter } from '@/components/motion/counter'
import { Accordion } from '@/components/ui/accordion'
import { buttonVariants } from '@/components/ui/button'
import { TimezonePanel } from '@/components/features/timezone-panel'
import { ReachGlobe } from '@/components/three/reach-globe'
import { Icon } from '@/components/ui/icon'
import {
  globalRegions,
  internationalAudiences,
  internationalFaqs,
  internationalSteps,
  internationalSupport,
  participationModes
} from '@/lib/data/international'
import { courses } from '@/lib/data/courses'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'International students & delegates',
  description:
    'Join the Pakistan Youth Parliamentary Council from anywhere: online and hybrid participation, USD pricing, visa invitation letters, scholarships, time-zone friendly schedules and academic recognition support.',
  alternates: { canonical: '/international' }
}

const AUDIENCE_ICONS = ['GraduationCap', 'Globe2', 'Landmark', 'UsersRound']

export const dynamic = 'force-dynamic'

export default async function InternationalPage() {
  const plans = await prisma.membershipPlan
    .findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
    .catch(() => [])

  return (
    <>
      <PageHero
        eyebrow="International participation"
        title="Study, debate and research with Pakistan's youth parliamentary platform, from anywhere"
        description="PYPC is open to students, delegates and researchers of every nationality. Participate online with no Pakistani documentation, or travel to Islamabad with an official invitation letter. Every completed programme produces a QR-verifiable record."
        breadcrumb={[{ label: 'International' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/register" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
            Create a free account <ArrowRight size={18} />
          </Link>
          <Link href="/international/visa-letter" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Request an invitation letter
          </Link>
          <Link href="/courses" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Browse certified courses
          </Link>
        </div>
      </PageHero>

      {/* Who this is for */}
      <section className="container py-16">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Who participates</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
              Four groups PYPC is built to serve internationally
            </h2>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {internationalAudiences.map((audience, index) => (
            <Reveal key={audience.title} delay={index * 70}>
              <TiltCard intensity={8} className="icon-detail-card h-full rounded-2xl border border-slate-200 bg-white p-6">
                <Icon name={AUDIENCE_ICONS[index] ?? 'Globe2'} size={22} className="text-primary" />
                <h3 className="mt-4 text-base font-extrabold text-primary-900">{displayContent(audience.title)}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{displayContent(audience.detail)}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Participation modes */}
      <section className="relative isolate overflow-hidden border-y border-slate-100 bg-slate-50 py-16">
        <div className="bg-grid absolute inset-0 -z-10 opacity-50" />

        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">How you take part</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                Three participation modes, stated honestly
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Requirements are listed for each mode so you can decide before you apply. Travel, visa and
                insurance costs sit with the delegate unless a written scholarship award says otherwise.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {participationModes.map((mode, index) => (
              <Reveal key={mode.mode} delay={index * 90} direction={index === 0 ? 'left' : index === 2 ? 'right' : 'up'}>
                <div className="scene-3d h-full">
                  <TiltCard intensity={9} className="icon-detail-card h-full rounded-3xl border border-slate-200 bg-white p-7">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary">
                      <Icon name={mode.icon} size={22} />
                    </span>
                    <h3 className="mt-5 text-lg font-extrabold text-primary-900">{displayContent(mode.mode)}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{displayContent(mode.detail)}</p>

                    <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                      {mode.requirements.map(requirement => (
                        <li key={requirement} className="flex items-start gap-2.5 text-xs leading-6 text-slate-600">
                          <BadgeCheck size={14} className="mt-0.5 shrink-0 text-gold-600" />
                          {displayContent(requirement)}
                        </li>
                      ))}
                    </ul>
                  </TiltCard>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Five step journey */}
      <section className="container py-16">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">The pathway</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
              From account to verified documentation in five steps
            </h2>
          </div>
        </Reveal>

        <ol className="mt-10 grid gap-4 lg:grid-cols-5">
          {internationalSteps.map((step, index) => (
            <Reveal key={step.step} delay={index * 60}>
              <li className="h-full rounded-2xl border border-slate-200 bg-white p-5">
                <span className="font-mono text-xs font-extrabold text-gold-700">
                  STEP {displayContent(String(index + 1).padStart(2, '0'))}
                </span>
                <h3 className="mt-2 text-sm font-extrabold text-primary-900">{displayContent(step.step)}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-600">{displayContent(step.detail)}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Support grid */}
      <section className="editorial-panel relative isolate overflow-hidden bg-primary-900 py-16 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(110%_90%_at_80%_0%,#0b3b2e_0%,#06261e_60%,#031712_100%)]" />
        </div>

        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-300">
                Support for international participants
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Everything PYPC can actually put in writing for you
              </h2>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {internationalSupport.map((item, index) => (
              <Reveal key={item.title} delay={index * 60}>
                <div className="icon-detail-card h-full rounded-2xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur transition hover:border-gold-300/50">
                  <ShieldCheck size={20} className="text-gold-300" />
                  <h3 className="mt-4 text-sm font-extrabold text-white">{displayContent(item.title)}</h3>
                  <p className="mt-2 text-xs leading-6 text-primary-100">{displayContent(item.detail)}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-10 flex flex-wrap items-center gap-4 rounded-3xl border border-gold-400/30 bg-gold-500/10 p-6">
              <FileText size={26} className="text-gold-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-white">
                  Need an invitation letter for your visa application?
                </p>
                <p className="mt-1 text-xs leading-6 text-primary-100">
                  Registered delegates can request a letter on official letterhead. Issued within five
                  working days, addressed to the embassy or consulate you nominate.
                </p>
              </div>
              <Link href="/international/visa-letter" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
                Start the request
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pricing in USD */}
      <section className="container py-16">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Pricing</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
              Transparent USD pricing for international members
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              International members pay in USD through card checkout. Pakistani members pay in PKR through
              JazzCash or Easypaisa. A payment gateway only appears at checkout once the organisation has
              activated live credentials for it.
            </p>
          </div>
        </Reveal>

        {displayContent(plans.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            Membership plans are published from the PYPC administration panel. Please check the{displayContent(' ')}
            <Link href="/membership" className="font-bold text-primary underline decoration-gold-300">
              membership page
            </Link>{displayContent(' ')}
            or contact the secretariat.
          </p>
        ) : null)}

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <Reveal key={plan.code} delay={index * 80}>
              <TiltCard intensity={8} className="h-full rounded-3xl border border-slate-200 bg-white p-7">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">{displayContent(plan.name)}</p>
                <p className="mt-3 text-3xl font-extrabold text-primary-900">
                  {displayContent(formatCurrency(plan.priceUsd, 'USD'))}
                  <span className="ml-2 text-sm font-semibold text-slate-500">/ year</span>
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {displayContent(formatCurrency(plan.pricePkr, 'PKR'))} for members in Pakistan
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-600">{displayContent(plan.description)}</p>
                <Link
                  href={`/membership/checkout?plan=${plan.code}`}
                  className={buttonVariants({ variant: 'primary', size: 'md', className: 'mt-6 w-full' })}
                >
                  Join in USD
                </Link>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200">
            <div className="table-scroll">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Certified course fees in PKR and USD</caption>
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">Certified course</th>
                  <th scope="col" className="px-5 py-3">Hours</th>
                  <th scope="col" className="px-5 py-3">Members in Pakistan</th>
                  <th scope="col" className="px-5 py-3">International</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {courses.map(course => (
                  <tr key={course.slug} className="transition hover:bg-slate-50/70">
                    <th scope="row" className="px-5 py-4 font-bold text-slate-800">{displayContent(course.title)}</th>
                    <td className="px-5 py-4 text-slate-600">{displayContent(course.hours)} h</td>
                    <td className="px-5 py-4 text-slate-600">{displayContent(formatCurrency(course.pricePkr, 'PKR'))}</td>
                    <td className="px-5 py-4 font-bold text-primary">{displayContent(formatCurrency(course.priceUsd, 'USD'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Active members attend these courses at no additional cost. Fees shown are the published rates
            for non members.
          </p>
        </Reveal>
      </section>

      {/* Time zones + globe */}
      <section className="relative isolate overflow-hidden border-y border-slate-100 bg-slate-50 py-16">
        <div className="container grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal direction="left">
            <TimezonePanel />
          </Reveal>

          <Reveal direction="right">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <ReachGlobe className="h-[320px] w-full" />
              <div className="border-t border-slate-100 p-6">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold-700">
                  <Globe2 size={14} /> Regions PYPC serves
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {globalRegions.map(region => (
                    <li key={region.region} className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-xs font-extrabold text-primary-900">{displayContent(region.region)}</p>
                      <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{displayContent(region.note)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Numbers */}
      <section className="container py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Scholarship share planned for IMUN 2027', value: 40, suffix: '%' },
            { label: 'Programmes open to international participants', value: 6, suffix: '+' },
            { label: 'Participation modes (online, hybrid, on-site)', value: 3 },
            { label: 'Working days to issue an invitation letter', value: 5 }
          ].map((item, index) => (
            <Reveal key={item.label} delay={index * 70}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-extrabold text-primary">
                  <Counter value={item.value} suffix={item.suffix ?? ''} />
                </p>
                <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">{displayContent(item.label)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container pb-20">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Questions</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                International participation FAQ
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                If your question is not covered here, the AI assistant answers from official PYPC
                information, and the secretariat replies to email within five working days.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/contact" className={buttonVariants({ variant: 'outline', size: 'md' })}>
                  <Mail size={16} /> Contact the secretariat
                </Link>
                <Link href="/faq" className={buttonVariants({ variant: 'subtle', size: 'md' })}>
                  General FAQ
                </Link>
              </div>

              <ul className="mt-8 space-y-4 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CreditCard size={16} className="text-gold-600" /> Stripe card checkout in USD
                </li>
                <li className="flex items-center gap-2">
                  <GraduationCap size={16} className="text-gold-600" /> Academic recognition letters on request
                </li>
                <li className="flex items-center gap-2">
                  <Landmark size={16} className="text-gold-600" /> MoU route for partner universities
                </li>
                <li className="flex items-center gap-2">
                  <UsersRound size={16} className="text-gold-600" /> Delegation hosting for MUN societies
                </li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <Accordion items={internationalFaqs} />
          </Reveal>
        </div>
      </section>
    </>
  )
}
