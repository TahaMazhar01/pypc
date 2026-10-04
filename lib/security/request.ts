/**
 * Request-level security helpers shared by every state-changing API route.
 *
 * - Same-origin enforcement (CSRF defence for cookie-authenticated POSTs)
 * - Client IP extraction that prefers the proxy headers a real deployment sets
 * - A database-backed rate limiter that survives restarts
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Should we believe the `X-Forwarded-For` family of headers?
 *
 * Only a proxy you control sets these, and any client can invent them. Behind
 * Cloudflare, an nginx/HAProxy edge, or a platform router they are the real
 * client address and per-IP limits are meaningful, so they are trusted by
 * default. If this application is exposed directly to the internet, set
 * TRUST_PROXY_HEADERS=false: the headers are then ignored and the limiter falls
 * back to one shared bucket (a global cap) rather than a spoofable one.
 */
function trustProxyHeaders() {
  return (process.env.TRUST_PROXY_HEADERS ?? 'true').toLowerCase() !== 'false'
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

/** Host of a URL string, or null when it is not parseable. */
function hostOf(value: string | null) {
  if (!value) return null
  try {
    return new URL(value).host
  } catch {
    return null
  }
}

/**
 * Rejects cross-site POSTs. Browsers always send Origin on cross-origin form
 * posts and fetch calls, so a mismatch (or a same-origin mismatch against the
 * Host header) means the request did not come from our own pages.
 *
 * Requests with no Origin/Referer at all (server-to-server calls, curl, payment
 * gateway callbacks) are allowed through — those routes authenticate by
 * signature instead — but browser-shaped requests must match.
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')

  if (!host) return true
  const originHost = hostOf(origin)
  const refererHost = hostOf(referer)

  if (originHost && originHost !== host) return false
  if (!originHost && refererHost && refererHost !== host) return false
  return true
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
    // Never lock people out because the limiter itself failed.
    return { allowed: true, remaining: rule.limit, retryAfterSeconds }
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
