
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/layout/page-hero'
import { Badge } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { faqCategories, faqs } from '@/lib/data/faq'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Answers about PYPC membership, programmes, events, payments, certificates and certificate verification.'
}

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Support centre"
        title="Frequently asked questions"
        description="Straight answers about membership, programmes, payments and certificates. If your question is not covered here, the AI Assistant at the bottom-right or the secretariat will answer it."
        breadcrumb={[{ label: 'FAQ' }]}
      />

      <section className="container max-w-4xl py-14">
        {faqCategories.map(category => (
          <div key={category} className="mb-12">
            <h2 className="text-xl font-extrabold text-primary-900">{displayContent(category)}</h2>

            <div className="mt-5 space-y-3">
              {faqs
                .filter(item => item.category === category)
                .map(item => (
                  <details
                    key={item.question}
                    className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-card open:border-primary-100"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold text-slate-900 marker:content-none">
                      <span>{displayContent(item.question)}</span>
                      <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-primary group-open:hidden">
                        Open
                      </span>
                      <span className="hidden shrink-0 text-xs font-bold uppercase tracking-wide text-primary group-open:block">
                        Close
                      </span>
                    </summary>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{displayContent(item.answer)}</p>
                  </details>
                ))}
            </div>
          </div>
        ))}

        <div className="rounded-3xl border border-primary-100 bg-primary-50 p-8">
          <Badge tone="primary">Still stuck?</Badge>
          <h2 className="mt-4 text-2xl font-extrabold text-primary-900">Talk to the secretariat</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Send a message and a team member will respond within two working days. Members can also raise
            a tracked support request from the dashboard.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/contact" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              Contact us
            </Link>
            <Link href="/dashboard/support" className={buttonVariants({ variant: 'outline', size: 'md' })}>
              Member support
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
