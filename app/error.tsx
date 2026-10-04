'use client'


import { displayContent } from '@/lib/display-content'
/**
 * Route error boundary.
 *
 * Any unhandled error inside a route segment renders this instead of a stack
 * trace. It is deliberately calm and useful: the visitor is told what happened in
 * plain language, offered the two things that actually help (retry, or go
 * somewhere that works), and given the official contact channels for anything the
 * retry cannot fix. The digest is shown because it is the value support can trace
 * in the server logs — no internal detail is exposed.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, Mail, Phone, RefreshCw } from 'lucide-react'
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_E164 } from '@/lib/constants'
import { captureError } from '@/lib/monitoring'

export default function RouteError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Logged locally, and forwarded to the configured monitoring endpoint when
    // one exists. Never shown to the visitor, and no personal data is included.
    void captureError(error, { source: 'browser', digest: error.digest, route: 'route-segment' })
  }, [error])

  return (
    <section className="container section-y">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
          <AlertTriangle size={26} />
        </span>

        <h1 className="type-display mt-6 font-extrabold text-primary-900">Something went wrong</h1>

        <p className="type-body mt-4 text-slate-700">
          This page could not be completed. Nothing you submitted has been lost, if you were part way
          through a form, reload the page and try again.
        </p>

        {displayContent(error.digest ? (
          <p className="mt-3 text-xs text-slate-500">
            Reference for support: <span className="font-mono">{displayContent(error.digest)}</span>
          </p>
        ) : null)}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-800"
          >
            <RefreshCw size={16} /> Try again
          </button>

          <Link
            href="/"
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-primary-300"
          >
            <Home size={16} /> Return home
          </Link>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
          <p className="text-sm font-bold text-slate-900">Still stuck? Contact the secretariat</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href={`tel:${CONTACT_PHONE_E164}`}
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Phone size={15} /> {displayContent(CONTACT_PHONE)}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 break-all text-primary hover:underline"
              >
                <Mail size={15} /> {displayContent(CONTACT_EMAIL)}
              </a>
            </li>
          </ul>
          <p className="mt-3 text-xs leading-6 text-slate-600">
            The site&apos;s own live status is always available at{displayContent(' ')}
            <Link href="/status" className="font-semibold text-primary hover:underline">
              /status
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
