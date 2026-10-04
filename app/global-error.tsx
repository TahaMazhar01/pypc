'use client'


import { displayContent } from '@/lib/display-content'
import { useEffect } from 'react'
import { captureError } from '@/lib/monitoring'

/**
 * Global error boundary.
 *
 * This one catches failures in the root layout itself, so it cannot rely on the
 * site's chrome, its fonts or its theme provider — it renders its own minimal
 * document with inline styles, which is the only thing guaranteed to work when
 * the layout has failed.
 */

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // The layout itself failed, so this is the only place that can report it.
    void captureError(error, { source: 'browser', digest: error.digest, route: 'global' })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: '#04110e',
          color: '#eaf4ef',
          fontFamily: 'system-ui, Segoe UI, Arial, Helvetica, sans-serif'
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#ddbd51'
            }}
          >
            Pakistan Youth Parliamentary Council
          </p>

          <h1 style={{ margin: '1rem 0 0', fontSize: '1.75rem', lineHeight: 1.2 }}>
            The platform could not start this page
          </h1>

          <p style={{ marginTop: '1rem', lineHeight: 1.7, color: '#c6d6cf' }}>
            Please reload the page. If it keeps happening, the secretariat can be reached on
            +92 315 5729598 or at pypcofficial@gmail.com, and the live system report is at /status.
          </p>

          {displayContent(error.digest ? (
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#9db0a8' }}>
              Reference: <span style={{ fontFamily: 'monospace' }}>{displayContent(error.digest)}</span>
            </p>
          ) : null)}
        </div>
      </body>
    </html>
  )
}
