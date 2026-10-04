import { NextResponse } from 'next/server'
import { issueHumanCheck } from '@/lib/security/human-check'
import { checkRateLimit, clientIp, tooManyRequests } from '@/lib/security/request'

/**
 * Issues a signed human-check challenge for a public form.
 *
 * Stateless and cheap: nothing is written to the database, and the response is
 * never cached, so every form load gets a fresh question and expiry.
 */
export async function GET(request: Request) {
  const limit = await checkRateLimit({
    scope: 'human-check',
    identity: clientIp(request),
    limit: 60,
    windowSeconds: 600
  })

  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds, 'Too many checks requested. Please wait a moment.')
  }

  return NextResponse.json(issueHumanCheck(), {
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
