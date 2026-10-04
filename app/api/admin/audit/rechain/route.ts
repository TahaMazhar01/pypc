import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth'
import { rechainAllowed, rechainAuditLog } from '@/lib/audit'
import { isSameOrigin, crossOriginResponse } from '@/lib/security/request'

/**
 * Rebuilds the audit chain after a deliberate, documented retention trim.
 *
 * This is a maintenance operation, not a repair tool: it is off unless
 * `AUDIT_ALLOW_RECHAIN="true"` is set on the server, it requires an
 * administrator session, and it writes an `AUDIT_LOG_RECHAINED` entry that
 * stays visible in the console forever. Anyone auditing the log can therefore
 * see exactly when and why the chain was rebuilt — which is why this cannot be
 * used to hide tampering.
 *
 *   curl -X POST https://…/api/admin/audit/rechain \
 *        -H 'content-type: application/json' -H "origin: https://…" \
 *        -H "cookie: pypc_session=…" \
 *        -d '{"reason":"removed a rejected test account before hand-over"}'
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  const user = await getCurrentUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 })
  }

  if (!rechainAllowed()) {
    return NextResponse.json(
      {
        error:
          'Re-chaining is disabled on this deployment. Set AUDIT_ALLOW_RECHAIN="true" temporarily if a documented retention trim requires it.'
      },
      { status: 403 }
    )
  }

  let reason = 'unspecified maintenance'
  try {
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body.reason === 'string' && body.reason.trim().length >= 8) reason = body.reason.trim()
  } catch {
    /* body is optional */
  }

  const result = await rechainAuditLog({ reason, actorEmail: user.email })

  return NextResponse.json({
    ok: true,
    entriesRewritten: result.rewritten,
    reason,
    note: 'The chain has been rebuilt and the rebuild recorded as AUDIT_LOG_RECHAINED.'
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
