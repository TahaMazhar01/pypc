
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, FileText, Microscope, Search, Target, Users } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { TiltCard } from '@/components/motion/tilt-card'
import { Counter } from '@/components/motion/counter'
import { buttonVariants } from '@/components/ui/button'
import { CapabilityBars } from '@/components/experience/network-and-slider'
import { Icon } from '@/components/ui/icon'
import { researchServices } from '@/lib/data/courses'
import { featuredPillars } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Research & services',
  description:
    'The PYPC research desk: policy research consultations, evidence reviews, survey and stakeholder mapping, and co-authored publications on climate, AI governance and justice reform.',
  alternates: { canonical: '/research' }
}

const PROCESS = [
  {
    title: 'Scope the question',
    detail: 'You send the policy question and the decision it needs to inform. We confirm scope, output and turnaround in writing before any work starts.'
  },
  {
    title: 'Evidence review',
    detail: 'The desk assembles legislation, data, evaluations and academic literature, and records what is strong evidence and what is contested.'
  },
  {
    title: 'Stakeholder mapping',
    detail: 'Duty bearers, influencers, blockers and windows of opportunity are mapped, with a practical engagement route for each.'
  },
  {
    title: 'Written output',
    detail: 'You receive a citable brief on PYPC letterhead: findings, options, risks and recommended next steps — usable with institutions and in academic work.'
  }
]

const PUBLICATIONS = [
  {
    title: 'Climate adaptation finance access for climate-vulnerable districts',
    status: 'In preparation',
    note: 'Cohort output from the climate policy lab, mapping instruments against district-level vulnerability.'
  },
  {
    title: 'AI governance for public services in Pakistan',
    status: 'Research design',
    note: 'Accountability, data protection and procurement questions for public-sector AI deployments.'
  },
  {
    title: 'Youth participation in committee scrutiny',
    status: 'Evidence review',
    note: 'What youth parliamentary simulations actually change in participants’ civic trajectories.'
  },
  {
    title: 'Justice reform: rehabilitation and dignity',
    status: 'Scoping',
    note: 'Evidence review on rehabilitation-focused criminal justice approaches and their cost profile.'
  }
]

export default function ResearchPage() {
  return (
    <>
      <PageHero
        eyebrow="Research & services"
        title="A research desk built for real policy questions"
        description="PYPC produces briefs, evidence reviews and stakeholder maps for members, partner universities and institutions — and gives international students a route to co-author published work."
        breadcrumb={[{ label: 'Research' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/contact" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
            Commission research <ArrowRight size={18} />
          </Link>
          <Link href="/partnerships" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Partner through an MoU
          </Link>
          <Link href="/courses" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Research methods course
          </Link>
        </div>
      </PageHero>

      <section className="container py-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Research services offered', value: researchServices.length },
            { label: 'Thematic pillars covered', value: featuredPillars.length },
            { label: 'Fastest turnaround (weeks)', value: 2 },
            { label: 'Publication authorship credited', value: 100, suffix: '%' }
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
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Services</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
              Four services, each with a stated output
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Every service below produces a written deliverable you can cite or submit. Nothing is sold as
              advice without a document behind it.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {researchServices.map((service, index) => (
            <Reveal key={service.title} delay={index * 60} direction={index % 2 ? 'right' : 'left'}>
              <TiltCard intensity={8} className="icon-detail-card h-full rounded-3xl border border-slate-200 bg-white p-7">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary">
                    <Icon name={service.icon} size={22} />
                  </span>
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                    {displayContent(service.turnaround)}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-primary-900">{displayContent(service.title)}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{displayContent(service.detail)}</p>
                <Link
                  href="/contact"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-gold-700"
                >
                  Start a scoping conversation <ArrowRight size={15} />
                </Link>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Process + capability */}
      <section className="relative isolate overflow-hidden border-y border-slate-100 bg-slate-50 py-16">
        <div className="bg-grid absolute inset-0 -z-10 opacity-50" />

        <div className="container grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal direction="left">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">How it works</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                From question to citable brief in four stages
              </h2>

              <ol className="mt-7 space-y-4">
                {PROCESS.map((stage, index) => (
                  <li key={stage.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-extrabold text-white">
                      {displayContent(String(index + 1).padStart(2, '0'))}
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-primary-900">{displayContent(stage.title)}</p>
                      <p className="mt-1 text-xs leading-6 text-slate-600">{displayContent(stage.detail)}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-900">
                <strong className="font-extrabold">Honest limitation:</strong> PYPC is not a consultancy and
                does not represent clients before institutions. Research outputs are evidence products, findings and options, not lobbying or legal advice.
              </div>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div className="rounded-3xl border border-slate-200 bg-white p-7">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold-700">
                <Microscope size={14} /> Desk capability
              </p>
              <div className="mt-6">
                <CapabilityBars
                  items={[
                    { label: 'Legislative & policy analysis', value: 92, note: 'Bills, rules of procedure, committee scrutiny' },
                    { label: 'Climate & adaptation finance', value: 85, note: 'Vulnerability profiling and finance routes' },
                    { label: 'AI governance & digital rights', value: 78, note: 'Accountability and data protection frameworks' },
                    { label: 'Survey design & fieldwork', value: 74, note: 'Youth-focused instruments and sampling' },
                    { label: 'Publication & citation quality', value: 88, note: 'Referenced briefs on PYPC letterhead' }
                  ]}
                />
              </div>

              <p className="mt-6 border-t border-slate-100 pt-5 text-xs leading-6 text-slate-500">
                Capability ratings are the desk&apos;s own self assessment of current capacity, published so
                partners can judge fit before commissioning.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Publications pipeline */}
      <section className="container py-16">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Pipeline</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
              Publications in progress
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              We publish work in progress rather than implying a back catalogue that does not exist. Each
              item below states its real stage.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {PUBLICATIONS.map((publication, index) => (
            <Reveal key={publication.title} delay={index * 60}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <BookOpen size={20} className="text-gold-600" />
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">
                    {displayContent(publication.status)}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-extrabold text-primary-900">{displayContent(publication.title)}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-600">{displayContent(publication.note)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Collaborators band */}
      <section className="editorial-panel relative isolate overflow-hidden bg-primary-900 py-16 text-white">

        <div className="container grid gap-10 lg:grid-cols-[1fr_1fr]">
          <Reveal direction="left">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-300">
                Collaborate with the desk
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Co author, supervise or fund a research stream
              </h2>
              <p className="mt-5 text-sm leading-7 text-primary-100">
                International students, early career researchers, faculty members and institutions can join
                the desk. Authorship is credited, and every published output carries the names of the people
                who produced it.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-primary-100">
                <li className="flex items-start gap-2.5">
                  <Users size={16} className="mt-0.5 shrink-0 text-gold-300" />
                  Join as a volunteer researcher through your member dashboard
                </li>
                <li className="flex items-start gap-2.5">
                  <Search size={16} className="mt-0.5 shrink-0 text-gold-300" />
                  Bring a policy question for a scoped consultation
                </li>
                <li className="flex items-start gap-2.5">
                  <Target size={16} className="mt-0.5 shrink-0 text-gold-300" />
                  Fund a defined research stream with named outputs
                </li>
                <li className="flex items-start gap-2.5">
                  <FileText size={16} className="mt-0.5 shrink-0 text-gold-300" />
                  Co brand a brief or author an agreed chapter
                </li>
              </ul>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/contact" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
                  Contact the research desk
                </Link>
                <Link
                  href="/partnerships"
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'lg',
                    className: 'border-white/30 bg-white/5 text-white hover:bg-white/10'
                  })}
                >
                  MoU and sponsorship
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-7 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">
                Thematic pillars
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {featuredPillars.map(pillar => (
                  <li key={pillar.slug} className="rounded-xl border border-white/10 bg-primary-900/40 p-4">
                    <p className="text-sm font-bold text-white">{displayContent(pillar.title)}</p>
                    <p className="mt-1 text-[11px] leading-5 text-primary-200">{displayContent(pillar.description)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
