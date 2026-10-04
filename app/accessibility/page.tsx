
import { displayContent } from '@/lib/display-content'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Accessibility, CheckCircle2, Mail, MessageSquare, ShieldAlert } from 'lucide-react'

import { PageHero } from '@/components/layout/page-hero'
import { Card } from '@/components/ui/card'
import { CONTACT_EMAIL, CONTACT_EMAILS, CONTACT_PHONE, CONTACT_HOURS } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Accessibility statement',
  description:
    'How the Pakistan Youth Parliamentary Council platform meets WCAG 2.2 AA, what is verified automatically, known limitations, and how to report a barrier.',
  openGraph: {
    title: 'Accessibility statement — PYPC',
    description:
      'Our accessibility commitments, how they are verified, and how to report a barrier.',
    images: [{ url: '/images/og-default.png', width: 1200, height: 630, alt: 'PYPC accessibility statement' }]
  }
}

/**
 * Accessibility statement.
 *
 * This is a commitment with evidence attached, not a badge. Every claim below is
 * either reproduced by an automated suite (`npm run check:contrast`,
 * `check:responsive`) or is a named, checkable behaviour of the interface. Where
 * something is not yet done, it says so — an accessibility statement that
 * overstates is worse than none, because people rely on it.
 */
const VERIFIED = [
  'Colour contrast is measured on every theme: 49 text/background pairs meet WCAG 2.1 AA (4.5:1 for body text, 3:1 for large text and interface borders), in both light and dark mode.',
  'Every page renders exactly one <h1> and a logical heading order, so screen-reader navigation by heading works.',
  'A "Skip to content" link is the first focusable element on every page.',
  'Focus rings are visible on every interactive element and are never removed without a replacement.',
  'The mobile navigation closes on Escape and on the live breakpoint change, and reports state through aria-expanded.',
  'Tap targets are at least 44x44px on touch layouts; form fields carry labels, hints and inline error text.',
  'Layouts are verified from iPhone SE width upward, including safe-area insets for notched devices.',
  'The interface honours prefers-reduced-motion: the parallax, tilt and reveal effects stand down.'
]

const LIMITS = [
  'The 3D hero and canvas layers are decorative and are hidden from assistive technology; all information they carry is also present as text.',
  'Some institutional PDFs (concept notes, letters) were produced outside this platform and are not tagged for screen readers. If you need any of them in an accessible format, contact the secretariat and we will provide one.',
  'Live video sessions are not yet captioned. This is planned and will be announced before the first public session.',
  'A full manual audit with assistive-technology users has not yet been carried out; the checks above are automated plus structured review.'
]

export default function AccessibilityPage() {
  return (
    <>
      <PageHero
        eyebrow="Accessibility"
        title="Accessibility statement"
        description="This platform is built to be used by everyone — on any device, with a keyboard, with a screen reader, or with limited bandwidth."
        breadcrumb={[{ label: 'Accessibility' }]}
      />

      <section className="container max-w-4xl space-y-6 py-14">
        <Card className="border-primary-100 bg-primary-50">
          <div className="flex items-start gap-3">
            <Accessibility size={22} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-extrabold text-primary-900">Our commitment</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                PYPC serves young people across Pakistan and beyond, including members using assistive
                technology and members on slow connections. We aim to meet{displayContent(' ')}
                <strong>WCAG 2.2 level AA</strong> across the public site, the member dashboard and the
                admin tools, and we treat accessibility defects as product defects, they are fixed, not
                deferred.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-extrabold text-slate-900">What is verified, and how</h2>
          <p className="mt-2 text-sm text-slate-600">
            Each line below is checked by a script in this repository, so it cannot silently regress.
          </p>
          <ul className="mt-4 space-y-3">
            {VERIFIED.map(item => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{displayContent(item)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            Reproduce it yourself: <code className="font-mono">npm run check:contrast</code> (49 pairs) ·{displayContent(' ')}
            <code className="font-mono">npm run check:responsive</code> (63 checks incl. target sizes and
            safe areas) · <code className="font-mono">npm run check:suites</code> (everything, with the
            totals summed automatically).
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-extrabold text-slate-900">Known limitations</h2>
          <p className="mt-2 text-sm text-slate-600">
            Stating these plainly is part of the commitment. Each has an owner and is being addressed.
          </p>
          <ul className="mt-4 space-y-3">
            {LIMITS.map(item => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                <ShieldAlert size={17} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
                <span>{displayContent(item)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-extrabold text-slate-900">
            If something blocks you, tell us and we will fix it
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            If any part of this platform stops you from doing what you came to do, contact the secretariat
            with the page address and a short description. Accessibility reports are triaged like a
            production incident, and we will offer an alternative way to complete the task while the fix
            is being made, for example taking a membership or event registration over email.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-slate-700">
              <Mail size={16} className="shrink-0 text-primary" aria-hidden="true" />
              <a className="break-all font-semibold text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}?subject=Accessibility%20report`}>
                {displayContent(CONTACT_EMAIL)}
              </a>
            </li>
            <li className="flex items-center gap-2 text-slate-700">
              <MessageSquare size={16} className="shrink-0 text-primary" aria-hidden="true" />
              <span>Or through the <Link href="/contact" className="font-semibold text-primary hover:underline">contact form</Link>, choose “Accessibility” in the subject.</span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Office hours: {displayContent(CONTACT_HOURS)} · Alternative mailbox: {displayContent(CONTACT_EMAILS[1])}
          </p>
        </Card>

        <Card className="border-slate-200">
          <h2 className="text-lg font-extrabold text-slate-900">Standards and scope</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-bold text-slate-800">Standard</dt>
              <dd className="text-slate-600">
                Web Content Accessibility Guidelines (WCAG) 2.2, level AA, the standard referenced by the
                UK Equality Act, the EU Web Accessibility Directive and the UN Convention on the Rights of
                Persons with Disabilities.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-slate-800">Scope</dt>
              <dd className="text-slate-600">
                Every public page, the member dashboard and the admin panel, on desktop, tablet and mobile
                browsers, and as an installed web app on Android and iOS.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-slate-800">Assessment approach</dt>
              <dd className="text-slate-600">
                Self assessment through automated contrast, responsive and structural audits run against
                every production build, plus manual review of keyboard paths and form flows.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-slate-800">Review cycle</dt>
              <dd className="text-slate-600">
                Automated checks run on every change; this statement is reviewed quarterly and updated
                whenever a limitation is closed.
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-xs text-slate-500">
            Related: <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> ·{displayContent(' ')}
            <Link href="/terms" className="text-primary hover:underline">Terms of Use</Link> ·{displayContent(' ')}
            <Link href="/code-of-conduct" className="text-primary hover:underline">Code of Conduct</Link>
          </p>
        </Card>

        <p className="text-xs text-slate-500">
          Contact by phone:{displayContent(' ')}
          <a href={`tel:${CONTACT_PHONE.replace(/[^0-9+]/g, '')}`} className="font-semibold text-primary hover:underline">
            {displayContent(CONTACT_PHONE)}
          </a>
        </p>
      </section>
    </>
  )
}
