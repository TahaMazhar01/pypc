
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Building2, CheckCircle2, Clock, FileText, Landmark, ScrollText, Scale } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { TiltCard } from '@/components/motion/tilt-card'
import { Counter } from '@/components/motion/counter'
import { buttonVariants } from '@/components/ui/button'
import { correspondenceRecords, milestones } from '@/lib/data/correspondence'

export const metadata: Metadata = {
  title: 'Records & correspondence',
  description:
    'The PYPC correspondence registry: every formal institutional request, MoU template and programme document filed by the Council, with reference numbers, dates and downloadable source documents.',
  alternates: { canonical: '/records' }
}

const CATEGORY_ICONS = {
  'Institutional outreach': Landmark,
  'Governance & legal': Scale,
  Programmes: ScrollText
} as const

const STATUS_TONE: Record<string, string> = {
  'Formal request submitted': 'bg-amber-50 text-amber-700 border-amber-200',
  'Under review': 'bg-sky-50 text-sky-700 border-sky-200',
  'Template in use': 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

export default function RecordsPage() {
  const grouped = Object.keys(CATEGORY_ICONS) as (keyof typeof CATEGORY_ICONS)[]

  return (
    <>
      <PageHero
        eyebrow="Transparency"
        title="Records & correspondence registry"
        description="PYPC publishes every formal institutional request it files. Each entry carries its reference number, recipient, subject, current status and the source document itself — so anyone can check what has been asked, of whom, and what the answer is."
        breadcrumb={[{ label: 'Records' }]}
      >
        <div className="flex flex-wrap gap-3">
          <a href="#registry" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
            Open the registry
          </a>
          <Link href="/partnerships" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Start a formal partnership
          </Link>
          <Link href="/contact" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Request a document
          </Link>
        </div>
      </PageHero>

      <section className="container py-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Formal records published', value: correspondenceRecords.length },
            { label: 'Institutions approached', value: 2 },
            { label: 'Document categories', value: grouped.length },
            { label: 'Source documents attached', value: 100, suffix: '%' }
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

        <Reveal delay={0.1}>
          <div className="mt-8 rounded-3xl border border-primary-100 bg-primary-50 p-6 text-sm leading-7 text-slate-700">
            <p className="font-extrabold text-primary-900">How to read this registry</p>
            <p className="mt-2">
              A record means a document was filed, it is not a claim of approval, partnership or
              endorsement. Statuses are updated as replies arrive, and correspondence is only ever marked
              confirmed when PYPC holds a written response. Personal contact details of recipients are
              deliberately excluded; official institutional addresses and designations are shown instead.
            </p>
          </div>
        </Reveal>
      </section>

      <section id="registry" className="scroll-mt-24 border-y border-slate-100 bg-slate-50 py-16">
        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">The registry</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                {displayContent(correspondenceRecords.length)} filed records, grouped by purpose
              </h2>
            </div>
          </Reveal>

          <div className="mt-10 space-y-12">
            {grouped.map(category => {
              const records = correspondenceRecords.filter(record => record.category === category)
              if (records.length === 0) return null
              const CategoryIcon = CATEGORY_ICONS[category]

              return (
                <div key={category}>
                  <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.16em] text-primary">
                    <CategoryIcon size={16} className="text-gold-600" /> {displayContent(category)}
                  </h3>

                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    {records.map((record, index) => (
                      <Reveal key={record.id} delay={index * 60} direction={index % 2 ? 'right' : 'left'}>
                        <article
                          id={record.id}
                          className="h-full scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <span className="font-mono text-xs font-extrabold text-gold-700">
                              {displayContent(record.reference)}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${
                                STATUS_TONE[record.status] ?? 'border-slate-200 bg-slate-50 text-slate-600'
                              }`}
                            >
                              {displayContent(record.status)}
                            </span>
                          </div>

                          <h4 className="mt-3 text-base font-extrabold leading-snug text-primary-900">
                            {displayContent(record.title)}
                          </h4>

                          <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Clock size={13} className="text-gold-600" /> {displayContent(record.date)}
                          </p>
                          <p className="mt-1 flex items-start gap-2 text-xs leading-6 text-slate-500">
                            <Building2 size={13} className="mt-0.5 shrink-0 text-gold-600" />
                            {displayContent(record.recipient)}
                          </p>

                          <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-6 text-slate-600">
                            Subject: {displayContent(record.subject)}
                          </p>

                          <p className="mt-4 text-sm leading-7 text-slate-600">{displayContent(record.summary)}</p>

                          <a
                            href={record.document}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-4 py-2.5 text-xs font-bold text-primary transition hover:border-gold-300 hover:bg-white"
                          >
                            <FileText size={14} /> Open source document (PDF) <ArrowUpRight size={13} />
                          </a>
                        </article>
                      </Reveal>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Milestones</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
              Where the Council stands today
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Institutional building takes time and paperwork. These are the markers PYPC has reached, stated
              as they are rather than as achievements earned.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {milestones.map((milestone, index) => (
            <Reveal key={milestone.label} delay={index * 70}>
              <TiltCard intensity={7} className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                <CheckCircle2 size={20} className="text-gold-600" />
                <p className="mt-4 text-sm font-extrabold text-primary-900">{displayContent(milestone.label)}</p>
                <p className="mt-2 text-xs leading-6 text-slate-600">{displayContent(milestone.detail)}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <FileText size={20} className="text-gold-600" />
              <p className="mt-4 text-sm font-extrabold text-primary-900">Document templates</p>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                PYPC uses standard templates so its paperwork stays consistent and reviewable.
              </p>
              <a
                href="/documents/PYPC_Memorandum_of_Understanding_Perfect.pdf"
                target="_blank"
                rel="noreferrer noopener"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-gold-700"
              >
                Memorandum of Understanding <ArrowUpRight size={13} />
              </a>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <ScrollText size={20} className="text-gold-600" />
              <p className="mt-4 text-sm font-extrabold text-primary-900">Institutional forms</p>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                Visit and webinar requests follow a standard written format submitted through the relevant
                office.
              </p>
              <a
                href="/documents/PYPC_Employee_Undertaking_Declaration_No_Witness_Fillable.pdf"
                target="_blank"
                rel="noreferrer noopener"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-gold-700"
              >
                Undertaking & declaration form <ArrowUpRight size={13} />
              </a>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <Landmark size={20} className="text-gold-600" />
              <p className="mt-4 text-sm font-extrabold text-primary-900">Programme transparency</p>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                Conferences publish their planning documents and flag anything still pending approval.
              </p>
              <a
                href="/documents/IMUN_2027_Concept_Note_Redesigned.pdf"
                target="_blank"
                rel="noreferrer noopener"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-gold-700"
              >
                IMUN 2027 concept note <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  )
}
