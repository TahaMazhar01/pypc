
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, FileText, Lock, ScrollText, ShieldCheck, UserCheck } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { TiltCard } from '@/components/motion/tilt-card'
import { buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Policies & governance documents',
  description:
    'Every PYPC policy in one place: privacy and data protection, terms of use, refund policy, code of conduct, and the undertaking and declaration form used by the secretariat.',
  alternates: { canonical: '/policies' }
}

const POLICIES = [
  {
    href: '/privacy',
    title: 'Privacy & data protection',
    detail:
      'What PYPC collects, why, where it is stored, who can access it, how long it is kept, and how to request correction or deletion.',
    icon: Lock
  },
  {
    href: '/terms',
    title: 'Terms of use',
    detail:
      'The rules for using the platform: acceptable conduct, membership conditions, payment terms and the limits of what PYPC provides.',
    icon: ScrollText
  },
  {
    href: '/refund-policy',
    title: 'Refund policy',
    detail:
      'When fees are refundable, when they are not, how long a refund takes and how to request one with your order reference.',
    icon: UserCheck
  },
  {
    href: '/code-of-conduct',
    title: 'Code of conduct',
    detail:
      'Standards for members, delegates, volunteers and staff — including the zero-tolerance position on harassment and discrimination.',
    icon: ShieldCheck
  }
]

const FORMS = [
  {
    href: '/documents/PYPC_Employee_Undertaking_Declaration_No_Witness_Fillable.pdf',
    title: 'Undertaking & declaration form',
    detail:
      'The standard secretariat form used by staff, executives and volunteers to record an undertaking. Fillable, no witness required.',
  },
  {
    href: '/documents/PYPC_Memorandum_of_Understanding_Perfect.pdf',
    title: 'Memorandum of Understanding template',
    detail:
      'The published MoU used for institutional collaboration, covering obligations, branding, certificate wording and governing law.',
  },
  {
    href: '/documents/IMUN_2027_Concept_Note_Redesigned.pdf',
    title: 'IMUN 2027 concept note',
    detail:
      'The authoritative planning document for the International Model United Nations 2027, including scholarship policy and sponsorship tiers.',
  }
]

export default function PoliciesPage() {
  return (
    <>
      <PageHero
        eyebrow="Governance"
        title="Policies, declarations and published templates"
        description="PYPC publishes the rules it operates under and the forms it uses. If a document is not listed here, it is not in force — ask the secretariat rather than assuming."
        breadcrumb={[{ label: 'Policies' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/privacy" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
            Privacy policy
          </Link>
          <Link href="/code-of-conduct" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Code of conduct
          </Link>
          <Link href="/contact" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Ask about a policy
          </Link>
        </div>
      </PageHero>

      <section className="container py-14">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">Member facing policies</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
              Four policies govern every interaction
            </h2>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {POLICIES.map((policy, index) => (
            <Reveal key={policy.href} delay={index * 60} direction={index % 2 ? 'right' : 'left'}>
              <TiltCard intensity={8} className="icon-detail-card h-full rounded-3xl border border-slate-200 bg-white p-7">
                <policy.icon size={22} className="text-primary" />
                <h3 className="mt-4 text-lg font-extrabold text-primary-900">{displayContent(policy.title)}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{displayContent(policy.detail)}</p>
                <Link
                  href={policy.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-gold-700"
                >
                  Read the policy <ArrowUpRight size={14} />
                </Link>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-12 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-700">
              Published templates & source documents
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl">
              The paperwork behind the platform
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              These are the actual documents PYPC files with institutions and issues to members.
            </p>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {FORMS.map((form, index) => (
            <Reveal key={form.href} delay={index * 70}>
              <a
                href={form.href}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex h-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 hover-lift transition hover:border-gold-300 hover:shadow-elevated"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
                  <FileText size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-primary-900">{displayContent(form.title)}</span>
                  <span className="mt-2 block text-xs leading-6 text-slate-600">{displayContent(form.detail)}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:text-gold-700">
                    Open PDF <ArrowUpRight size={13} />
                  </span>
                </span>
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.12}>
          <div className="mt-10 rounded-3xl border border-primary-100 bg-primary-50 p-6">
            <p className="text-sm font-extrabold text-primary-900">Data protection at a glance</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                'Passwords are stored as bcrypt hashes, never in readable form',
                'Sessions use signed, HTTP-only cookies with a version counter for instant revocation',
                'Uploaded CVs and passport-supporting documents are stored privately, outside the public web root',
                'Administrative actions are written to an audit log with actor, timestamp and IP address',
                'Résumé and visa documents are visible only to their owner and to PYPC staff',
                'Payment card data never touches PYPC servers — it stays with the gateway'
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-xs leading-6 text-slate-700">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-gold-600" />
                  {displayContent(item)}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>
    </>
  )
}
