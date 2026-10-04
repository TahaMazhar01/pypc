/**
 * Server-side half of the email layer: the DNS MX lookup and the full
 * assessment used by the registration and contact endpoints.
 *
 * Kept out of `lib/validation/email.ts` on purpose — that module is imported by
 * client components, and `node:dns` cannot be bundled for the browser.
 */

import { promises as dns } from 'node:dns'

import {
  isDisposableEmail,
  isRoleMailbox,
  emailSyntaxIssues,
  normaliseEmail,
  NON_ROUTABLE_DOMAINS,
  type EmailAssessment
} from '@/lib/validation/email'

// ---------------------------------------------------------------------------
// Domain deliverability (MX lookup, cached)
// ---------------------------------------------------------------------------

type CacheEntry = { result: 'valid' | 'unknown'; expires: number }
const mxCache = new Map<string, CacheEntry>()
const MX_TTL_MS = 15 * 60 * 1000

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => setTimeout(() => reject(new Error('dns-timeout')), ms))
  ])
}

/**
 * Confirms the domain has a mail exchanger (or an A record as a fallback).
 * Returns 'unknown' when DNS cannot be consulted, so an offline environment or a
 * slow resolver never blocks a legitimate registration.
 */
export async function checkDomainDeliverability(domain: string): Promise<'valid' | 'unknown'> {
  const key = domain.toLowerCase()
  const cached = mxCache.get(key)
  if (cached && cached.expires > Date.now()) return cached.result

  let result: 'valid' | 'unknown' = 'unknown'

  try {
    const records = await withTimeout(dns.resolveMx(key), 3500)
    if (records.length > 0) result = 'valid'
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code

    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      // No MX records. Some domains still accept mail on their A record.
      try {
        const addresses = await withTimeout(dns.resolve4(key), 2500)
        if (addresses.length > 0) result = 'valid'
      } catch {
        result = 'unknown'
      }
    } else {
      // Timeout, network failure, or no DNS at all in this environment.
      result = 'unknown'
    }
  }

  mxCache.set(key, { result, expires: Date.now() + MX_TTL_MS })
  return result
}

/**
 * Full assessment used by the registration and contact endpoints.
 *
 * `strictDeliverability` is used for signup: a domain that definitively has no
 * MX record is rejected. Environment failures are always tolerated.
 */
export async function assessEmail(
  rawEmail: string,
  options: { strictDeliverability?: boolean; allowRoleMailbox?: boolean } = {}
): Promise<EmailAssessment> {
  const email = normaliseEmail(rawEmail)
  const warnings: string[] = []

  const syntaxIssues = emailSyntaxIssues(email)
  if (syntaxIssues.length > 0) {
    return { ok: false, email, reason: syntaxIssues[0], deliverability: 'unknown', warnings }
  }

  const domain = email.split('@')[1]!

  if (NON_ROUTABLE_DOMAINS.has(domain) || domain.endsWith('.invalid') || domain.endsWith('.test')) {
    return {
      ok: false,
      email,
      reason: 'That domain cannot receive email. Please use a real address.',
      deliverability: 'unknown',
      warnings
    }
  }

  if (isDisposableEmail(email)) {
    return {
      ok: false,
      email,
      reason:
        'Disposable or temporary email addresses are not accepted — use a permanent address you control.',
      deliverability: 'unknown',
      warnings
    }
  }

  if (isRoleMailbox(email)) {
    if (!options.allowRoleMailbox) {
      return {
        ok: false,
        email,
        reason:
          'Please use a personal mailbox, not a shared role address (info@, admin@, noreply@ …) — the verification link must reach a person.',
        deliverability: 'unknown',
        warnings
      }
    }
    warnings.push('Role mailbox: make sure a human can open the verification email.')
  }

  const deliverability = await checkDomainDeliverability(domain)

  if (deliverability === 'unknown') {
    warnings.push('The mail domain could not be checked right now; verification will confirm it.')
  }

  if (deliverability === 'unknown' && options.strictDeliverability) {
    // We could not reach DNS — allow the signup, the verification email decides.
    return { ok: true, email, deliverability, warnings }
  }

  return { ok: true, email, deliverability, warnings }
}
