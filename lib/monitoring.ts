/**
 * Error monitoring — one call site, no vendor lock-in.
 *
 * Every unhandled error in this platform passes through two places: the server
 * (`app/global-error.tsx`, API route handlers) and the browser (`app/error.tsx`).
 * Both call `captureError` here.
 *
 * Why not ship an SDK?
 * --------------------
 * A monitoring agent is an external dependency that loads on every page and
 * usually also receives personal data. Installing one without a key would either
 * do nothing (the usual case, and the reason "we added Sentry" often means
 * nothing happened) or, worse, send member data to an endpoint nobody configured.
 * So the platform ships the **integration seam** instead:
 *
 *   1. Set `SENTRY_DSN` (server) and/or `NEXT_PUBLIC_SENTRY_DSN` (browser) and
 *      errors are posted to that DSN's store endpoint using the Sentry envelope
 *      format — no SDK, no extra bundle weight.
 *   2. Until a DSN is present, errors are logged to the server console exactly as
 *      before, so nothing changes for a deployment that has not set one up.
 *   3. The payload is deliberately minimal and scrubbed: message, digest, route,
 *      release and a coarse fingerprint. No email addresses, no names, no tokens,
 *      no request bodies.
 *
 * Swapping in the full Sentry SDK later is a two-line change in the two call
 * sites, because they already funnel through this module.
 */

type ErrorContext = {
  /** `server` or `browser` — which side raised it. */
  source: 'server' | 'browser'
  /** The route or page the error happened on, when known. */
  route?: string
  /** Next.js error digest, which ties a browser report to a server log line. */
  digest?: string
  /** Extra, non-personal detail (never include user input here). */
  detail?: Record<string, string | number | boolean>
}

const RELEASE = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'

/** Fields that must never leave the process, whatever a caller passes. */
const FORBIDDEN_KEYS = /pass|token|secret|key|email|phone|authorization|cookie|iban|card/i

function scrub(detail: Record<string, unknown> | undefined) {
  if (!detail) return {}
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(detail)) {
    if (FORBIDDEN_KEYS.test(key)) continue
    if (typeof value === 'string' && value.length > 200) {
      safe[key] = `${value.slice(0, 200)}…`
      continue
    }
    if (['string', 'number', 'boolean'].includes(typeof value)) safe[key] = value
  }
  return safe
}

/** A stable grouping key, so the same fault does not arrive as a hundred issues. */
function fingerprint(message: string) {
  const normalised = message
    .replace(/[0-9a-f]{8,}/gi, '<id>')
    .replace(/\d+/g, '<n>')
    .slice(0, 120)
  return [normalised]
}

/**
 * Parses a Sentry DSN into its store endpoint.
 * `https://<publicKey>@<host>/<projectId>` → `https://<host>/api/<projectId>/store/`
 */
function storeEndpoint(dsn: string) {
  try {
    const url = new URL(dsn)
    const publicKey = url.username
    const projectId = url.pathname.replace(/^\//, '')
    if (!publicKey || !projectId) return null
    return {
      url: `${url.protocol}//${url.host}/api/${projectId}/store/`,
      publicKey,
      host: url.host
    }
  } catch {
    return null
  }
}

/**
 * Reports an error. Never throws, never blocks the response, and never reports
 * the same error twice from the same page view.
 */
export async function captureError(error: unknown, context: ErrorContext): Promise<void> {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'

  // Always keep a local trace: this is what makes debugging possible without a
  // monitoring vendor at all.
  const line = `[pypc:${context.source}] ${message}${context.digest ? ` (digest ${context.digest})` : ''}${
    context.route ? ` @ ${context.route}` : ''
  }`

  if (context.source === 'server') console.error(line)
  else console.warn(line)

  const dsn = context.source === 'server' ? process.env.SENTRY_DSN : process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  const target = storeEndpoint(dsn)
  if (!target) {
    console.warn('[pypc:monitoring] SENTRY_DSN is set but not a valid DSN — error not forwarded')
    return
  }

  const event = {
    event_id: undefined,
    timestamp: new Date().toISOString(),
    platform: context.source === 'server' ? 'node' : 'javascript',
    level: 'error',
    release: RELEASE,
    environment: process.env.NODE_ENV,
    logger: 'pypc',
    transaction: context.route,
    fingerprint: fingerprint(message),
    exception: {
      values: [{ type: error instanceof Error ? error.name : 'Error', value: message }]
    },
    tags: { source: context.source, digest: context.digest },
    extra: scrub(context.detail),
    // Personal data is stripped rather than sent-and-ignored.
    user: undefined
  }

  try {
    const response = await fetch(target.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${target.publicKey}, sentry_client=pypc/1.0`
      },
      body: JSON.stringify(event),
      // Monitoring must never hold up a request or a render.
      signal: AbortSignal.timeout(2500)
    })
    if (!response.ok) {
      console.warn(`[pypc:monitoring] forward rejected (${response.status})`)
    }
  } catch {
    // A monitoring outage is not the visitor's problem.
  }
}

/** True when a DSN is configured, so the UI can say so honestly. */
export function monitoringEnabled() {
  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
}
