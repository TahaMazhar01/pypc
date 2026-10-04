
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import { Fragment } from 'react'
import Link from 'next/link'
import { CheckCircle2, X, ShieldCheck, Zap, Users, Landmark, Receipt, ArrowRight } from 'lucide-react'
import { PageHero } from '@/components/layout/page-hero'
import { Badge, Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { formatCurrency, parseJsonArray } from '@/lib/utils'
import { getGatewayStatuses } from '@/lib/payments'
import { faqs } from '@/lib/data/faq'
import {
  MEMBERSHIP_COMPARISON,
  MEMBERSHIP_FEE_NOTES,
  MEMBERSHIP_REFUND_SUMMARY,
  MEMBERSHIP_STEPS,
  MEMBERSHIP_TIERS,
  type MembershipTierCode
} from '@/lib/data/membership'

export const metadata: Metadata = {
  openGraph: {
    images: [
      {
        url: '/images/og-membership.png',
        width: 1200,
        height: 630,
        alt: 'PYPC membership — Free, Associate, Executive and Institutional tiers in PKR and USD'
      }
    ]
  },

  title: 'Membership',
  description:
    'PYPC membership tiers — Free Community, Associate, Executive and Institutional partnership. Priced in PKR and USD, with QR-verified certificates, mentorship and programme access.'
}

export const dynamic = 'force-dynamic'

const TIER_ORDER: MembershipTierCode[] = ['FREE', 'ASSOCIATE', 'EXECUTIVE', 'INSTITUTIONAL']

export default async function MembershipPage() {
  const plans = await prisma.membershipPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  })

  const gateways = getGatewayStatuses().filter(gateway => gateway.configured)
  const membershipFaqs = faqs.filter(faq => faq.category === 'Membership' || faq.category === 'Payments')
  // The comparison matrix is keyed by tier code, so only render columns for
  // tiers that are actually published in the database.
  const publishedCodes = TIER_ORDER.filter(code => plans.some(plan => plan.code === code))
  const tiers = publishedCodes.map(code => ({
    code,
    tier: MEMBERSHIP_TIERS.find(item => item.code === code)
  }))

  return (
    <>
      <PageHero
        eyebrow="Membership"
        title="Join a membership tier built around real participation"
        description="Membership funds programme delivery, mentorship and certification — and gives you a verifiable record of everything you complete. Four tiers, priced in PKR and USD, activated automatically the moment your payment is confirmed."
        breadcrumb={[{ label: 'Membership' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/membership/checkout?plan=FREE" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            Join free, no payment
          </Link>
          <Link href="#compare" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Compare all four tiers
          </Link>
        </div>
      </PageHero>

      <section className="container py-10">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Users size={18} />, title: 'Four tiers', detail: 'Free Community, Associate, Executive, Institutional' },
            { icon: <Receipt size={18} />, title: 'PKR and USD', detail: 'JazzCash & Easypaisa in PKR · card in PKR or USD' },
            { icon: <Zap size={18} />, title: 'Instant activation', detail: 'Payment confirmation switches membership on — no waiting list' },
            { icon: <ShieldCheck size={18} />, title: 'Verifiable records', detail: 'Every certificate carries a QR code and a public verify page' }
          ].map(item => (
            <li key={item.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
                {displayContent(item.icon)}
              </span>
              <p className="mt-3 font-extrabold text-slate-900">{displayContent(item.title)}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{displayContent(item.detail)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Tier cards ──────────────────────────────────────────────────── */}
      <section className="container pb-6" id="tiers">
        <h2 className="text-2xl font-extrabold text-primary-900 sm:text-3xl">Choose your tier</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          Every tier is an annual membership. Start at the free tier and upgrade at any time, when you
          upgrade, the fee you already paid is credited and you only pay the difference.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map(plan => {
            const features = parseJsonArray(plan.features)
            const benefits = parseJsonArray(plan.benefits)
            const isFree = plan.pricePkr === 0 && plan.priceUsd === 0
            const tierData = MEMBERSHIP_TIERS.find(item => item.code === plan.code)

            return (
              <Card
                key={plan.id}
                className={`relative flex h-full flex-col ${
                  plan.isPopular ? 'border-gold-300 shadow-gold' : isFree ? 'border-primary-200' : ''
                }`}
              >
                {displayContent(plan.isPopular ? (
                  <Badge tone="gold" className="absolute -top-3 left-6">
                    Most chosen
                  </Badge>
                ) : null)}
                {displayContent(isFree ? (
                  <Badge tone="primary" className="absolute -top-3 left-6">
                    Free to join
                  </Badge>
                ) : null)}

                <h3 className="text-lg font-extrabold text-primary-900">{displayContent(plan.name)}</h3>
                <p className="mt-1 text-sm font-semibold text-gold-700">{displayContent(plan.tagline)}</p>

                <p className="mt-5 flex flex-wrap items-end gap-2">
                  {displayContent(isFree ? (
                    <span className="text-3xl font-extrabold text-slate-900">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-slate-900">
                        {displayContent(formatCurrency(plan.pricePkr, 'PKR'))}
                      </span>
                      <span className="pb-1 text-sm font-semibold text-slate-500">/ year</span>
                    </>
                  ))}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {displayContent(isFree
                    ? 'No card, no wallet, no expiry into a paid tier'
                    : `or ${formatCurrency(plan.priceUsd, 'USD')} for international members paying by card`)}
                </p>

                {displayContent(tierData ? (
                  <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                    <strong className="text-slate-800">Best for:</strong> {displayContent(tierData.audience)}
                  </p>
                ) : null)}

                <p className="mt-4 text-sm leading-7 text-slate-600">{displayContent(plan.description)}</p>

                <ul className="mt-5 flex-1 space-y-3">
                  {features.map(feature => (
                    <li key={feature} className="flex gap-3 text-sm">
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-primary" />
                      <span className="leading-6 text-slate-700">{displayContent(feature)}</span>
                    </li>
                  ))}
                </ul>

                {displayContent(benefits.length ? (
                  <div className="mt-5 rounded-xl bg-primary-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">Also included</p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600">
                      {benefits.map(benefit => (
                        <li key={benefit}>• {displayContent(benefit)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null)}

                <Link
                  href={`/membership/checkout?plan=${plan.code}`}
                  className={buttonVariants({
                    variant: plan.isPopular ? 'gold' : 'primary',
                    size: 'lg',
                    className: 'mt-6 w-full'
                  })}
                >
                  {displayContent(tierData?.ctaLabel ?? `Choose ${plan.tier}`)}
                </Link>

                {displayContent(plan.code === 'INSTITUTIONAL' ? (
                  <Link
                    href="/partnerships"
                    className="mt-2 text-center text-xs font-bold text-primary underline-offset-4 hover:underline"
                  >
                    Read the MoU and sponsorship routes first
                  </Link>
                ) : null)}
              </Card>
            )
          })}
        </div>
      </section>

      {/* ── Comparison matrix ───────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-50 py-14" id="compare">
        <div className="container">
          <h2 className="text-2xl font-extrabold text-primary-900 sm:text-3xl">Compare the tiers</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            Stated plainly and in full, including what each tier does <em>not</em> include. Institutional
            values apply to the whole partner cohort.
          </p>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <caption className="sr-only">
                PYPC membership comparison across Free Community, Associate, Executive and Institutional
                tiers
              </caption>
              <thead>
                <tr className="bg-primary text-white">
                  <th scope="col" className="px-5 py-4 text-left font-bold">
                    What you get
                  </th>
                  {tiers.map(({ code }) => {
                    const plan = plans.find(item => item.code === code)
                    return (
                      <th key={code} scope="col" className="px-4 py-4 text-left align-top font-bold">
                        <span className="block">{displayContent(plan?.name.replace(' Membership', '').replace(' Partnership', ''))}</span>
                        <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-primary-100">
                          {displayContent(plan && plan.pricePkr === 0
                            ? 'Free'
                            : plan
                              ? `${formatCurrency(plan.pricePkr, 'PKR')} · ${formatCurrency(plan.priceUsd, 'USD')}`
                              : '—')}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {MEMBERSHIP_COMPARISON.map(group => (
                  <Fragment key={group.group}>
                    <tr className="bg-primary-50">
                      <th
                        scope="colgroup"
                        colSpan={tiers.length + 1}
                        className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary"
                      >
                        {displayContent(group.group)}
                      </th>
                    </tr>
                    {group.rows.map(row => (
                      <tr key={row.label} className="border-t border-slate-100">
                        <th scope="row" className="px-5 py-3.5 text-left align-top font-semibold text-slate-800">
                          {displayContent(row.label)}
                          {displayContent(row.hint ? (
                            <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{displayContent(row.hint)}</span>
                          ) : null)}
                        </th>
                        {tiers.map(({ code }) => {
                          const value = row.values[code]
                          return (
                            <td key={code} className="px-4 py-3.5 align-top text-slate-700">
                              {displayContent(value === true ? (
                                <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                                  <CheckCircle2 size={15} />
                                  <span className="sr-only">Included</span>
                                </span>
                              ) : value === false ? (
                                <span className="inline-flex items-center gap-1.5 text-slate-500">
                                  <X size={15} />
                                  <span className="sr-only">Not included</span>
                                </span>
                              ) : (
                                <span className="leading-6">{displayContent(value)}</span>
                              ))}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Scroll the table sideways on a phone. Values in PKR and USD are the annual membership fee for a
            12 month term.
          </p>
        </div>
      </section>

      {/* ── Fee transparency + refund ───────────────────────────────────── */}
      <section className="container py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary-900">
              <Receipt size={18} /> Fee transparency
            </h2>
            <ul className="mt-4 space-y-3">
              {MEMBERSHIP_FEE_NOTES.map(note => (
                <li key={note} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span>{displayContent(note)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary-900">
              <Landmark size={18} /> Refunds in short
            </h2>
            <ul className="mt-4 space-y-3">
              {MEMBERSHIP_REFUND_SUMMARY.map(note => (
                <li key={note} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold-600" />
                  <span>{displayContent(note)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/refund-policy" className={buttonVariants({ variant: 'outline', size: 'md' })}>
                Full refund policy
              </Link>
              <Link href="/terms" className={buttonVariants({ variant: 'ghost', size: 'md' })}>
                Terms of use
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-50 py-14">
        <div className="container">
          <h2 className="text-2xl font-extrabold text-primary-900 sm:text-3xl">What happens after you join</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            This is the automated flow on this platform, not a promise, each step is exactly what the site
            does.
          </p>
          <ol className="mt-8 grid gap-4 md:grid-cols-5">
            {MEMBERSHIP_STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">
                  {displayContent(index + 1)}
                </span>
                <p className="mt-3 font-bold text-slate-900">{displayContent(step.title)}</p>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{displayContent(step.detail)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── International + payments ────────────────────────────────────── */}
      <section className="container py-14">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-primary-100 bg-primary-50 p-6">
            <h2 className="text-lg font-extrabold text-primary-900">Members joining from outside Pakistan</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Fees are published in USD for international members and are charged through Stripe in USD, so
              your bank sees the amount in the currency shown above. Delegates who need a visa invitation
              letter for an in person PYPC programme can request one from the member dashboard once their
              place is confirmed, letters are issued on PYPC letterhead with the programme dates, venue and
              the delegate&apos;s passport name.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/international" className={buttonVariants({ variant: 'primary', size: 'md' })}>
                International members hub
              </Link>
              <Link href="/courses" className={buttonVariants({ variant: 'outline', size: 'md' })}>
                Courses with USD pricing
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <p className="flex items-center gap-2 font-bold text-primary-900">
              <ShieldCheck size={18} /> Payment methods on this deployment
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {displayContent(gateways.length ? (
                gateways.map(gateway => (
                  <li key={gateway.provider} className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-primary" /> {displayContent(gateway.label)}
                    <span className="text-xs text-slate-500">({displayContent(gateway.currencies.join(' / '))})</span>
                  </li>
                ))
              ) : (
                <li>
                  No gateway is configured yet. Add merchant credentials to <code>.env</code> to enable
                  checkout, the free tier remains available regardless.
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              Gateways that PYPC has not yet activated appear disabled at checkout instead of failing after
              you enter your details. Merchant accounts, SECP/NTN registration and tax treatment are
              confirmed by the organisation before any member is charged.
            </p>
            <Link
              href="/status"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary underline-offset-4 hover:underline"
            >
              Check live system status <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-50 py-14">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-extrabold text-primary-900">Membership questions</h2>

          <div className="mt-6 space-y-3">
            {membershipFaqs.map(faq => (
              <details key={faq.question} className="rounded-2xl border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer font-bold text-slate-900">{displayContent(faq.question)}</summary>
                <p className="mt-3 text-sm leading-7 text-slate-600">{displayContent(faq.answer)}</p>
              </details>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/faq" className={buttonVariants({ variant: 'outline', size: 'md' })}>
              All FAQs
            </Link>
            <Link href="/refund-policy" className={buttonVariants({ variant: 'ghost', size: 'md' })}>
              Refund policy
            </Link>
            <Link href="/code-of-conduct" className={buttonVariants({ variant: 'ghost', size: 'md' })}>
              Code of conduct
            </Link>
            <Link href="/contact" className={buttonVariants({ variant: 'ghost', size: 'md' })}>
              Ask a question
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-primary py-14 text-white">
        <div className="container flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Start with the free tier, upgrade when you are ready</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-primary-100">
              You can hold a free membership indefinitely. Nothing is ever charged automatically, and your
              certificates stay verifiable for life.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
              Create account
            </Link>
            <Link href="/membership/checkout" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Go to checkout
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
