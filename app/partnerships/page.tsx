
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  FileSignature,
  GraduationCap,
  Handshake,
  Mail,
  Phone,
  ScrollText,
  ShieldCheck,
  Users
} from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { TiltCard } from '@/components/motion/tilt-card'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PartnerWall } from '@/components/features/partner-wall'
import { PartnershipForm } from '@/components/features/partnership-form'
import { imun2027 } from '@/lib/data/conferences'
import { prisma } from '@/lib/prisma'
import {
  MOU_PROCESS_STEPS,
  PARTNER_PUBLICATION_RULE,
  PARTNERSHIP_INTEREST_LABELS,
  PARTNERSHIP_INTEREST_SUMMARIES
} from '@/lib/partnerships'
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_LOCAL, SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Partnerships & MoU',
  description:
    'Partner with the Pakistan Youth Parliamentary Council: the Memorandum of Understanding route for universities and institutions, campus chapters with named deliverables, conference sponsorship tiers, and a request form that issues a reference the same day.',
  alternates: { canonical: '/partnerships' },
  openGraph: {
    title: 'Partner with PYPC — MoUs, campus chapters and joint programmes',
    description:
      'A published process with stated turnaround times, a named coordinator on each side, and a reference number the same day.',
    url: `${SITE_URL}/partnerships`,
    type: 'website'
  }
}

export const dynamic = 'force-dynamic'

const PARTNER_BENEFITS = [
  { icon: GraduationCap, title: 'Student chapters', detail: 'A recognised PYPC chapter on campus with a faculty advisor, and access to national programmes.' },
  { icon: FileSignature, title: 'Co-branded certificates', detail: 'Joint certificates for shared programmes, with wording agreed before launch.' },
  { icon: Handshake, title: 'Joint conferences', detail: 'Host a national or international PYPC convening, or send delegations to IMUN 2027.' },
  { icon: Building2, title: 'Faculty participation', detail: 'Faculty join masterclasses, judging panels and research supervision with credited authorship.' },
  { icon: ShieldCheck, title: 'Data protection', detail: 'Participant data handling, consent and record-keeping terms are written into the MoU.' },
  { icon: BadgeCheck, title: 'Verifiable records', detail: 'Every jointly issued certificate is QR-verifiable through the PYPC verification page.' }
]

const FAQS: { question: string; answer: string }[] = [
  {
    question: 'What exactly is an MoU, and do we need one to work together?',
    answer:
      'A memorandum of understanding is a short written agreement recording what each side will do, who coordinates it, and when it is reviewed. It is not a contract for money and creates no financial obligation by itself. If you prefer to start with a single event or a campus workshop, that is fine — many partnerships begin that way and formalise later.'
  },
  {
    question: 'What does a campus chapter involve?',
    answer:
      'A recognised PYPC circle at your institution, run by students with a named faculty liaison. The chapter holds debates and policy sessions, sends delegations to PYPC events, and reports activity each term. PYPC provides the session material, training for office-bearers and the certificate register.'
  },
  {
    question: 'How long does the whole process take?',
    answer:
      'A review decision within ten working days, a scope call within about two weeks of that, and a drafted agreement within three weeks of the call. Most partnerships are active within a term. If a dated event is driving the timeline, say so in the request and we will say honestly whether the date is achievable.'
  },
  {
    question: 'Is there a fee?',
    answer:
      'No fee is charged for a partnership, an MoU or a campus chapter. Where a partnership involves paid elements — sponsored seats, paid training delivered at your venue, or an institutional membership — they are quoted in writing before anything is agreed, with the amounts and refund terms stated. Nothing is charged without a signed acceptance.'
  },
  {
    question: 'Will our logo appear on your website?',
    answer: PARTNER_PUBLICATION_RULE
  },
  {
    question: 'Which law governs the agreement?',
    answer:
      'The Islamic Republic of Pakistan. Every agreement is filed with a reference number and tracked in the public records registry, and either side can exit under the notice terms written into the agreement.'
  },
  {
    question: 'We are outside Pakistan. Can we still partner?',
    answer:
      'Yes. International universities and organisations work with PYPC through online delegations, joint research, visiting speakers and the international membership route. Requests are accepted from any country, and the form accepts international phone numbers.'
  }
]

export default async function PartnershipsPage() {
  // Real figures only — counted from the platform, printed in words when zero.
  const [programmes, events, memberCount] = await Promise.all([
    prisma.programme.count({ where: { isActive: true } }),
    prisma.event.count({ where: { isPublished: true } }),
    prisma.membership.count({ where: { status: 'ACTIVE' } })
  ])

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  }

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Pakistan Youth Parliamentary Council',
    url: `${SITE_URL}/partnerships`,
    email: CONTACT_EMAIL,
    telephone: CONTACT_PHONE,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'partnerships',
        email: CONTACT_EMAIL,
        telephone: CONTACT_PHONE,
        areaServed: 'Worldwide',
        availableLanguage: ['en', 'ur']
      }
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />

      <PageHero
        eyebrow="Partnerships"
        title="Formal collaboration, on paper, with named deliverables"
        description="Universities, colleges, schools, MUN societies, NGOs, public bodies and sponsors partner with PYPC through a written Memorandum of Understanding or a sponsorship agreement — never through an informal understanding. Submit a request below and you receive a reference number the same day."
        breadcrumb={[{ label: 'Partnerships' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="#partner-request" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
            Start a partnership request <ArrowRight size={18} />
          </Link>
          <a
            href="/documents/PYPC_Memorandum_of_Understanding_Perfect.pdf"
            target="_blank"
            rel="noreferrer noopener"
            className={buttonVariants({ variant: 'primary', size: 'lg' })}
          >
            Download MoU template
          </a>
          <Link href="/records" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            See the records registry
          </Link>
        </div>
      </PageHero>

      <PartnerWall />

      {/* Live figures — a count of what actually exists today, not a claim. */}
      <section className="container pt-14" aria-labelledby="reach">
        <h2 id="reach" className="sr-only">
          What PYPC runs today
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Live programmes</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{displayContent(programmes)}</p>
            <p className="mt-1 text-sm text-slate-600">
              {displayContent(programmes === 1 ? 'active programme' : 'active programmes')} partner institutions can plug
              into.
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Scheduled events</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{displayContent(events)}</p>
            <p className="mt-1 text-sm text-slate-600">
              {displayContent(events === 1 ? 'event' : 'events')} on the calendar for joint sessions and delegations.
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Activated members</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{displayContent(memberCount)}</p>
            <p className="mt-1 text-sm text-slate-600">
              {displayContent(memberCount === 0
                ? 'Membership opens with the first intake — partnerships are being confirmed now.'
                : memberCount === 1
                  ? 'member currently activated, from the register.'
                  : 'members currently activated, from the register.')}
            </p>
          </Card>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal direction="left">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">The MoU route</p>
              <h2 id="process" className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
                The process, step by step
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The template is published for a reason: partner institutions can read the exact terms before
                starting. It covers purpose, obligations, branding, certificate wording, data handling,
                duration and exit. Each step below carries the turnaround we hold ourselves to.
              </p>

              <ol className="mt-7 space-y-4">
                {MOU_PROCESS_STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-extrabold text-white">
                      {displayContent(String(index + 1).padStart(2, '0'))}
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-primary-900">{displayContent(step.title)}</p>
                      <p className="mt-1 text-xs leading-6 text-slate-600">{displayContent(step.detail)}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gold-700">
                        <CalendarClock size={13} /> {displayContent(step.turnaround)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs leading-6 text-slate-600">
                Governing law: the Islamic Republic of Pakistan. Every agreement is filed with a reference
                number and tracked in the{displayContent(' ')}
                <Link href="/records" className="font-bold text-primary underline decoration-gold-300">
                  records registry
                </Link>
                . {displayContent(PARTNER_PUBLICATION_RULE)}
              </div>
            </div>
          </Reveal>

          <Reveal direction="right">
            <div className="grid gap-4 sm:grid-cols-2">
              {PARTNER_BENEFITS.map((benefit, index) => (
                <TiltCard key={benefit.title} intensity={7} className="h-full rounded-2xl border border-slate-200 bg-white p-5">
                  <benefit.icon size={20} className="text-gold-600" />
                  <p className="mt-3 text-sm font-extrabold text-primary-900">{displayContent(benefit.title)}</p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">{displayContent(benefit.detail)}</p>
                  <span className="sr-only">{displayContent(index + 1)}</span>
                </TiltCard>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container pb-16" aria-labelledby="areas">
        <h2 id="areas" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Choose what you want to do together
        </h2>
        <p className="mt-3 max-w-3xl text-slate-600">
          These are the areas the request form accepts. Pick one or several, scope can be widened later by
          written amendment.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(PARTNERSHIP_INTEREST_SUMMARIES).map(([value, summary]) => (
            <div
              key={value}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-primary hover:shadow-soft"
            >
              <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <BadgeCheck size={16} className="text-primary" />
                {displayContent(PARTNERSHIP_INTEREST_LABELS[value as keyof typeof PARTNERSHIP_INTEREST_LABELS])}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{displayContent(summary)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Where the honest line sits on partners. */}
      <section className="container pb-16">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-amber-900">
            <Building2 size={18} /> Where we are honest about partners
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Institutions PYPC has written to, the requests already filed, with their reference numbers, are
            listed in the public records register, clearly marked as requests rather than agreements.
          </p>
          <div className="mt-4">
            <Link href="/records" className={buttonVariants({ variant: 'outline', size: 'md' })}>
              Open the records register
            </Link>
          </div>
        </div>
      </section>

      {/* The request form — the functional half of this page. */}
      <section id="partner-request" className="container scroll-mt-24 pb-16" aria-labelledby="request">
        <h2 id="request" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Submit a partnership request
        </h2>
        <p className="mt-3 max-w-3xl text-slate-600">
          One form, about five minutes. You receive a reference immediately, the secretariat reviews it
          within ten working days, and the request appears in the staff console the moment you send it.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <Card className="p-6 sm:p-8">
            <PartnershipForm />
          </Card>

          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="font-extrabold text-slate-900">Prefer to talk first?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The secretariat answers partnership enquiries directly. Mention the institution and what you
                have in mind, and use “Partnership” or “Sponsorship” in the subject line.
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Mail size={16} className="mt-0.5 text-primary" />
                  <a className="font-semibold text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
                    {displayContent(CONTACT_EMAIL)}
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <Phone size={16} className="mt-0.5 text-primary" />
                  <span className="text-slate-700">
                    {displayContent(CONTACT_PHONE)} · {displayContent(CONTACT_PHONE_LOCAL)}
                  </span>
                </li>
              </ul>
              <p className="mt-4 text-xs text-slate-500">
                Response time: within two working days, and within ten working days for a decision on a
                submitted request.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-extrabold text-slate-900">What happens to your data</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The request is stored so the secretariat can act on it, and access is limited to staff. It is
                covered by the{displayContent(' ')}
                <Link className="font-semibold text-primary hover:underline" href="/privacy">
                  privacy policy
                </Link>{displayContent(' ')}
                and can be withdrawn by writing to the secretariat, the record then carries the status
                “withdrawn”.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Every status change is written to the tamper evident audit log, so there is a record of who
                decided what and when.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="flex items-center gap-2 font-extrabold text-slate-900">
                <ScrollText size={16} className="text-primary" /> What you can submit today
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <Users size={15} className="mt-0.5 shrink-0 text-primary" />
                  Campus chapters, MoUs, joint events, research, faculty exchange, internships and
                  scholarships, all in the form.
                </li>
                <li className="flex items-start gap-2">
                  <CalendarClock size={15} className="mt-0.5 shrink-0 text-primary" />
                  Sponsorship tiers for IMUN 2027 are set out below.
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Sponsorship — kept from the original page, with the form as the entry point. */}
      <section className="editorial-panel relative isolate overflow-hidden bg-primary-900 py-16 text-white">

        <div className="container">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-300">
                {displayContent(imun2027.code)} sponsorship
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Sponsor places, committees or an entire conference tier
              </h2>
              <p className="mt-4 text-sm leading-7 text-primary-100">
                Sponsorship is delivered against a written agreement with the benefits stated below. Tier
                availability is confirmed once the venue and budget are approved, use the request form above
                with “Sponsorship” in the proposal, or write to the secretariat.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {imun2027.sponsorPackages.map((pack, index) => (
              <Reveal key={pack.tier} delay={index * 70}>
                <div className="h-full rounded-2xl border border-white/12 bg-white/[0.05] p-6 backdrop-blur">
                  <Handshake size={20} className="text-gold-300" />
                  <p className="mt-4 text-sm font-extrabold text-white">{displayContent(pack.tier)}</p>
                  <p className="mt-2 text-xs leading-6 text-primary-100">{displayContent(pack.detail)}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-10 rounded-3xl border border-gold-400/30 bg-gold-500/10 p-6">
              <div className="flex flex-wrap items-center gap-4">
                <Mail size={24} className="text-gold-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-white">
                    Write to the secretariat with “Partnership” or “Sponsorship” in the subject line
                  </p>
                  <p className="mt-1 text-xs leading-6 text-primary-100">
                    Include your institution, the collaboration you have in mind and a contact person. We
                    respond within five working days with the relevant draft agreement.
                  </p>
                </div>
                <Link href="/contact" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
                  Contact the secretariat
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container py-16" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Partnership questions
        </h2>

        <div className="mt-6 space-y-3">
          {FAQS.map(item => (
            <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold text-slate-900">
                {displayContent(item.question)}
                <ArrowRight
                  size={16}
                  className="shrink-0 text-primary transition group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{displayContent(item.answer)}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  )
}
