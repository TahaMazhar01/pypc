/**
 * Human check for public forms — a self-hosted, stateless CAPTCHA.
 *
 * Why self-hosted: an external CAPTCHA (reCAPTCHA/hCaptcha/Turnstile) adds a
 * third-party script to every page, moves visitor data to another company, and
 * breaks silently when a key expires. This check is issued by our own server,
 * signed with a server secret, and validated without any outbound request.
 *
 * How it works
 *  1. The browser asks `GET /api/human-check` for a challenge.
 *  2. The server returns a question ("What is 7 + 5?") plus a signed token that
 *     contains the expected answer and an expiry, HMAC-SHA256 over a secret.
 *  3. The form posts `humanToken` and `humanAnswer`.
 *  4. `verifyHumanCheck()` recomputes the signature, checks the expiry and
 *     compares the answer in constant time.
 *
 * Because the answer never leaves the server, a bot cannot read it from the
 * page; it must solve arithmetic and return within the validity window, on the
 * same form, which is exactly what a scripted POST does not do. Combined with
 * the existing rate limiter and honeypot fields this is a real gate for form
 * spam without shipping anyone else's JavaScript.
 *
 * Threat model note: this stops opportunistic form spam, not a determined human
 * attacker. Anything more (proof-of-work, behavioural scoring) needs a dedicated
 * service and is documented as an upgrade path rather than pretended here.
 */

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

const VALIDITY_MS = 10 * 60 * 1000

function secret() {
  return process.env.HUMAN_CHECK_SECRET || process.env.AUTH_SECRET || 'pypc-dev-human-check'
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export type HumanChallenge = {
  token: string
  question: string
  /** Seconds the challenge stays valid. */
  expiresInSeconds: number
}

/**
 * Word problems, not digits-only, so a screen reader announces a sentence and a
 * human reads it at a glance. `a + b` with both operands ≤ 9 keeps it trivial
 * for people and useless as an entropy source for a bot farm.
 */
export function issueHumanCheck(): HumanChallenge {
  const a = randomInt(2, 10)
  const b = randomInt(2, 10)
  const answer = a + b
  const expiresAt = Date.now() + VALIDITY_MS
  const payload = `answer=${answer}&exp=${expiresAt}`
  const token = `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`

  return {
    token,
    question: `What is ${a} + ${b}?`,
    expiresInSeconds: Math.floor(VALIDITY_MS / 1000)
  }
}

export type HumanCheckResult = { ok: true } | { ok: false; reason: string }

/**
 * Validates a submitted answer against a previously issued token. Never throws.
 */
export function verifyHumanCheck(token: unknown, answer: unknown): HumanCheckResult {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'The human check is missing. Please reload the page and try again.' }
  }

  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) {
    return { ok: false, reason: 'The human check is malformed. Please reload the page and try again.' }
  }

  let payload: string
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return { ok: false, reason: 'The human check is malformed. Please reload the page and try again.' }
  }

  const expected = sign(payload)
  const given = Buffer.from(signature)
  const want = Buffer.from(expected)
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return { ok: false, reason: 'The human check could not be verified. Please solve the new question shown.' }
  }

  const parts = new URLSearchParams(payload)
  const expectedAnswer = Number(parts.get('answer'))
  const expiresAt = Number(parts.get('exp'))

  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return { ok: false, reason: 'The human check has expired. Please solve the new question shown.' }
  }

  const given1 = String(answer ?? '').trim()
  if (!/^\d{1,3}$/.test(given1)) {
    return { ok: false, reason: 'Please answer the human check question (a number).' }
  }

  if (Number(given1) !== expectedAnswer) {
    return { ok: false, reason: 'That answer to the human check is not correct. Please try the new question.' }
  }

  return { ok: true }
}

/** Optional switch for automated test environments. Default: enforced. */
export function humanCheckRequired() {
  return (process.env.HUMAN_CHECK_REQUIRED ?? 'true').toLowerCase() !== 'false'
}
