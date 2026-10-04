
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Award, BadgeCheck, CalendarDays, Clock, CreditCard, GraduationCap, Languages, MonitorPlay } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { TiltCard } from '@/components/motion/tilt-card'
import { Counter } from '@/components/motion/counter'
import { Accordion } from '@/components/ui/accordion'
import { buttonVariants } from '@/components/ui/button'
import { TimezonePanel } from '@/components/features/timezone-panel'
import { Icon } from '@/components/ui/icon'
import { courses, researchServices } from '@/lib/data/courses'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Certified courses',
  description:
    'Six certified PYPC short courses — parliamentary procedure, climate policy, AI governance, policy research, negotiation and civic leadership — with live clinics, recorded sessions and QR-verified certificates.',
  alternates: { canonical: '/courses' }
}

const FAQ_ITEMS = [
  {
    question: 'Are the certificates verifiable?',
    answer:
      'Yes. Every completed course issues a certificate carrying a unique code and a QR that resolves to the PYPC verification page, where any third party can confirm the holder, the course, the hours and the issue date.'
  },
  {
    question: 'Do members pay extra for courses?',
    answer:
      'No. Active members attend all six courses at no additional cost — membership funds programme delivery. Non-members pay the published course fee, in PKR locally or USD internationally.'
  },
  {
    question: 'How are the courses delivered?',
    answer:
      'Live sessions run on a published schedule with recordings shared for asynchronous participation. Each course includes mentors, practical exercises and an assessed output such as a policy brief, bill draft or governance memo.'
  },
  {
    question: 'Can my university recognise the hours?',
    answer:
      'PYPC issues a participation letter stating contact hours and learning outcomes on request, which many students attach to credit-transfer or internship applications. The recognition decision itself belongs to your institution.'
  },
  {
    question: 'Is there financial support?',
    answer:
      'Scholarship places are announced per cohort and assessed on merit and need. Members with an active membership are prioritised for funded places when they are available.'
  }
]

export default function CoursesPage() {
  const totalHours = courses.reduce((sum, course) => sum + course.hours, 0)

  return (
    <>
      <PageHero
        eyebrow="Certified courses"
        title="Short courses that produce a document you can actually use"
        description="Six certificate-bearing courses in parliamentary procedure, climate policy, AI governance, policy research, diplomacy and civic leadership. Live clinics, recorded sessions and a QR-verified certificate on completion."
        breadcrumb={[{ label: 'Courses' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/register" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
            Enrol as a member <ArrowRight size={18} />
          </Link>
          <Link href="/membership" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Compare membership tiers
          </Link>
          <Link href="/verify" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Verify a certificate
          </Link>
        </div>
      </PageHero>

      <section className="container py-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Certified courses', value: courses.length },
            { label: 'Total instruction hours', value: totalHours },
            { label: 'Delivery modes', value: 3 },
            { label: 'Verification', value: 100, suffix: '%' }
          ].map((item, index) => (
            <Reveal key={item.label} delay={index * 60}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-extrabold text-primary">
                  <Counter value={item.value} suffix={item.suffix ?? ''} />
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {displayContent(item.label)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container pb-16">
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {courses.map((course, index) => (
            <Reveal key={course.slug} delay={index * 60} direction={index % 2 ? 'right' : 'left'}>
              <TiltCard intensity={8} className="icon-detail-card h-full rounded-3xl border border-slate-200 bg-white p-7">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary">
                    <Icon name={course.icon} size={22} />
                  </span>
                  <span className="rounded-full border border-gold-200 bg-gold-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gold-700">
                    {displayContent(course.level)}
                  </span>
                </div>

                <h2 className="mt-5 text-lg font-extrabold leading-snug text-primary-900">{displayContent(course.title)}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{displayContent(course.summary)}</p>

                <dl className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-gold-600" />
                    <dd>{displayContent(course.hours)} hours · {displayContent(course.weeks)} weeks</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <MonitorPlay size={13} className="text-gold-600" />
                    <dd>{displayContent(course.mode)}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Languages size={13} className="text-gold-600" />
                    <dd>{displayContent(course.language)}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={13} className="text-gold-600" />
                    <dd>Rolling cohorts</dd>
                  </div>
                </dl>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Learning outcomes
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {course.outcomes.map(outcome => (
                      <li key={outcome} className="flex items-start gap-2 text-xs leading-6 text-slate-600">
                        <BadgeCheck size={13} className="mt-0.5 shrink-0 text-gold-600" />
                        {displayContent(outcome)}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4 border-t border-slate-100 pt-5">
                  <div>
                    <p className="text-xl font-extrabold text-primary-900">
                      {displayContent(formatCurrency(course.priceUsd, 'USD'))}
                      <span className="ml-2 text-xs font-semibold text-slate-500">international</span>
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {displayContent(formatCurrency(course.pricePkr, 'PKR'))} in Pakistan · free for members
                    </p>
                  </div>
                  <GraduationCap size={22} className="text-gold-500" />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/register" className={buttonVariants({ variant: 'primary', size: 'md' })}>
                    Enrol now
                  </Link>
                  <Link href="/contact" className={buttonVariants({ variant: 'outline', size: 'md' })}>
                    Ask a question
                  </Link>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-3xl border border-primary-100 bg-primary-50 p-6">
            <CreditCard size={24} className="text-primary" />
            <p className="min-w-0 flex-1 text-sm leading-7 text-slate-700">
              Course fees are collected through the same checkout as membership: JazzCash or Easypaisa in
              PKR for Pakistani participants, card in USD internationally. A gateway appears at checkout only
              once the organisation has activated live credentials for it.
            </p>
            <Link href="/membership/checkout" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
              Go to checkout
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Delivery rhythm */}
      <section className="relative isolate overflow-hidden border-y border-slate-100 bg-slate-50 py-16">
        <div className="container grid items-start gap-8 lg:grid-cols-2">
          <Reveal direction="left">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Delivery</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                Live clinics, recordings and mentors in your time zone
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Each cohort runs a published schedule with live clinics, practical assignments and a mentor
                review. Sessions are recorded so participants in distant time zones can follow the same
                material, and every course ends with an assessed output you keep.
              </p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: MonitorPlay, label: 'Recorded sessions', note: 'Async-friendly delivery' },
                  { icon: Clock, label: 'Published UTC+5 schedule', note: 'Converted to your time zone' },
                  { icon: BadgeCheck, label: 'Assessed output', note: 'Brief, bill draft or memo' },
                  { icon: Award, label: 'QR-verified certificate', note: 'Any third party can confirm' }
                ].map(item => (
                  <li key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <item.icon size={18} className="text-gold-600" />
                    <p className="mt-2 text-sm font-bold text-primary-900">{displayContent(item.label)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{displayContent(item.note)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal direction="right">
            <TimezonePanel />
          </Reveal>
        </div>
      </section>

      {/* Research services cross-sell */}
      <section className="editorial-panel relative isolate overflow-hidden bg-primary-900 py-16 text-white">

        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-300">
                Beyond the classroom
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Research services for members, universities and institutions
              </h2>
              <p className="mt-4 text-sm leading-7 text-primary-100">
                Course graduates can commission or join the research desk. Four services are offered with
                published turnaround times and a stated output.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {researchServices.map((service, index) => (
              <Reveal key={service.title} delay={index * 60}>
                <div className="icon-detail-card h-full rounded-2xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur">
                  <Icon name={service.icon} size={20} className="text-gold-300" />
                  <h3 className="mt-3 text-sm font-extrabold text-white">{displayContent(service.title)}</h3>
                  <p className="mt-2 text-xs leading-6 text-primary-100">{displayContent(service.detail)}</p>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-300">
                    {displayContent(service.turnaround)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/research" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
                Research & services <ArrowRight size={18} />
              </Link>
              <Link
                href="/international"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'lg',
                  className: 'border-white/30 bg-white/5 text-white hover:bg-white/10'
                })}
              >
                International learners
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-16">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Questions</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                Course FAQ
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Certificates, fees, delivery and recognition, answered without hedging. If something is not
                confirmed yet, we say so.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <Accordion items={FAQ_ITEMS} />
          </Reveal>
        </div>
      </section>
    </>
  )
}
