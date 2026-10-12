import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Trust proxy IP headers only when the ingress strips caller-provided values. */
function trustProxyHeaders() {
  return process.env.TRUST_PROXY_HEADERS === 'true'
}

export function clientIp(request: Request) {
  if (!trustProxyHeaders()) return 'direct'

  const headers = request.headers
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  return (
    headers.get('x-real-ip')?.trim() ||
    headers.get('cf-connecting-ip')?.trim() ||
    headers.get('x-vercel-forwarded-for')?.trim() ||
    'unknown'
  )
}

/** Cookie-authenticated mutations require the exact canonical origin, including scheme and port. */
export function isSameOrigin(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false
  const claimed = request.headers.get('origin') ?? request.headers.get('referer')
  if (!claimed || claimed === 'null') return false
  try {
    const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin
    return new URL(claimed).origin === expected
  } catch { return false }
}

/** 403 response for a cross-site request. */
export function crossOriginResponse() {
  return NextResponse.json(
    { error: 'This request was blocked because it did not originate from the PYPC site.' },
    { status: 403 }
  )
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

export type RateLimitRule = {
  /** Logical bucket, e.g. "register". */
  scope: string
  /** Who/what is being limited, e.g. the IP or the email address. */
  identity: string
  /** Maximum attempts allowed inside the window. */
  limit: number
  /** Window length in seconds. */
  windowSeconds: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

function windowStart(seconds: number) {
  const size = seconds * 1000
  return new Date(Math.floor(Date.now() / size) * size)
}

/**
 * Fixed-window counter stored in the database. Cheap, deterministic and shared
 * across processes; a fresh window starts automatically.
 */
export async function checkRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const key = `${rule.scope}:${rule.identity.toLowerCase()}`
  const start = windowStart(rule.windowSeconds)
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((start.getTime() + rule.windowSeconds * 1000 - Date.now()) / 1000)
  )

  try {
    const counter = await prisma.rateLimitCounter.upsert({
      where: { key_windowStart: { key, windowStart: start } },
      create: { key, windowStart: start, count: 1 },
      update: { count: { increment: 1 } }
    })

    if (counter.count > rule.limit) {
      return { allowed: false, remaining: 0, retryAfterSeconds }
    }

    return { allowed: true, remaining: Math.max(0, rule.limit - counter.count), retryAfterSeconds }
  } catch {
    // Unavailable anti-abuse storage must not disable throttling.
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }
}

/** Clears a bucket — used after a successful sign-in so the user starts clean. */
export async function resetRateLimit(scope: string, identity: string) {
  try {
    await prisma.rateLimitCounter.deleteMany({
      where: { key: `${scope}:${identity.toLowerCase()}` }
    })
  } catch {
    /* non-fatal */
  }
}

export function tooManyRequests(retryAfterSeconds: number, message: string) {
  return NextResponse.json(
    { error: message, retryAfterSeconds },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  )
}
