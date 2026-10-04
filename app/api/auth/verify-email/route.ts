import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSessionToken, isAdmin, sessionCookieOptions } from '@/lib/auth'
import { verifyEmailSchema } from '@/lib/validations'
import { notify, recordAudit } from '@/lib/audit'
import { consumeEmailVerification } from '@/lib/auth/verification'
import { checkRateLimit, clientIp, isSameOrigin, crossOriginResponse, tooManyRequests } from '@/lib/security/request'
import type { UserRole } from '@/lib/constants'

/**
 * POST /api/auth/verify-email
 * Body: { email, code } from the typed flow, or { email, token } from the email link.
 * On success the account is activated and the member is signed straight in.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  const ip = clientIp(request)

  const limit = await checkRateLimit({
    scope: 'verify-email:ip',
    identity: ip,
    limit: 15,
    windowSeconds: 900
  })
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds, 'Too many verification attempts. Please wait a few minutes.')
  }

  const parsed = verifyEmailSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Enter the code from your email.' },
      { status: 422 }
    )
  }

  const outcome = await consumeEmailVerification(parsed.data)

  if (!outcome.ok) {
    await recordAudit({
      actorEmail: parsed.data.email,
      action: `EMAIL_VERIFICATION_${outcome.code}`,
      entityType: 'User',
      metadata: { ip },
      request
    })

    return NextResponse.json({ error: outcome.reason, code: outcome.code }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: outcome.userId } })
  if (!user) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  }

  await notify({
    userId: user.id,
    title: 'Email verified — welcome to PYPC',
    body: 'Your account is now active. Complete your profile and choose a membership plan to unlock programmes, events and certificates.',
    type: 'SUCCESS',
    href: '/dashboard/profile'
  })

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'EMAIL_VERIFIED',
    entityType: 'User',
    entityId: user.id,
    metadata: { ip },
    request
  })

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    version: user.sessionVersion
  })

  const response = NextResponse.json({
    ok: true,
    email: user.email,
    role: user.role,
    redirectTo: isAdmin(user.role) ? '/admin' : '/dashboard'
  })

  response.cookies.set({ ...sessionCookieOptions, value: token })
  return response
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
