import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resendVerificationSchema } from '@/lib/validations'
import { recordAudit } from '@/lib/audit'
import { issueEmailVerification, devMailVisible } from '@/lib/auth/verification'
import { mailStatus } from '@/lib/email/mailer'
import { checkRateLimit, clientIp, isSameOrigin, crossOriginResponse, tooManyRequests } from '@/lib/security/request'

/**
 * POST /api/auth/resend-verification
 *
 * Always answers with the same shape, whether or not the address exists, so this
 * endpoint cannot be used to discover who has an account. Rate limited per IP and
 * per address, and a fresh code invalidates the previous one.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  const ip = clientIp(request)

  const ipLimit = await checkRateLimit({ scope: 'resend:ip', identity: ip, limit: 8, windowSeconds: 3600 })
  if (!ipLimit.allowed) {
    return tooManyRequests(ipLimit.retryAfterSeconds, 'Too many code requests from this connection. Please try later.')
  }

  const parsed = resendVerificationSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter the email address you registered with.' }, { status: 422 })
  }

  const email = parsed.data.email

  const emailLimit = await checkRateLimit({ scope: 'resend:email', identity: email, limit: 4, windowSeconds: 3600 })
  if (!emailLimit.allowed) {
    return tooManyRequests(
      emailLimit.retryAfterSeconds,
      'A code was requested for this address several times already. Please check your inbox and spam folder.'
    )
  }

  const user = await prisma.user.findUnique({ where: { email } })

  let devCode: string | undefined
  let devLink: string | undefined
  let delivered = false
  let expiresMinutes = 30

  if (user && !user.emailVerifiedAt) {
    const verification = await issueEmailVerification({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      purpose: 'RESEND',
      ip,
      userAgent: request.headers.get('user-agent') ?? undefined,
      resend: true
    })

    devCode = devMailVisible() ? verification.code : undefined
    devLink = devMailVisible() ? verification.link : undefined
    delivered = verification.delivered
    expiresMinutes = verification.expiresMinutes

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'VERIFICATION_CODE_RESENT',
      entityType: 'User',
      entityId: user.id,
      metadata: { ip },
      request
    })
  } else {
    // Same visible outcome for unknown or already-verified addresses.
    await recordAudit({
      actorEmail: email,
      action: 'VERIFICATION_CODE_RESEND_IGNORED',
      entityType: 'User',
      request
    })
  }

  const status = mailStatus()

  return NextResponse.json({
    ok: true,
    delivered,
    expiresMinutes,
    message:
      'If that address has an unverified PYPC account, a new six-digit code is on its way. It expires in 30 minutes.',
    transportNote:
      status.transport === 'smtp'
        ? `Sent from ${status.from}.`
        : 'SMTP is not configured on this deployment, so the message was logged and stored in the outbox instead of being delivered.',
    devCode,
    devLink
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
