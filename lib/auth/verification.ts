import 'server-only'

import { createHash, randomInt, randomBytes, timingSafeEqual } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { sendMail, devMailVisible, mailStatus } from '@/lib/email/mailer'
import { verificationEmail, verificationResentEmail } from '@/lib/email/templates'
import { SITE_URL } from '@/lib/constants'

/**
 * Email ownership verification.
 *
 * Design decisions that matter:
 *  - The raw token and code are **never stored**. Only SHA-256 hashes are kept,
 *    so a database leak cannot be used to verify someone else's account.
 *  - Tokens are single-use, expire (30 minutes) and cap guessing attempts.
 *  - A six-digit code is offered alongside the link because many mail clients on
 *    mobile strip links; both paths are checked against the same record.
 *  - Issuing a new token invalidates previous unused ones for that purpose.
 */

const TOKEN_TTL_MINUTES = 30
const MAX_CODE_ATTEMPTS = 6

export function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function generateCode() {
  // randomInt is uniform and cryptographically secure (unlike Math.random()).
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

function safeEqual(a: string, b: string) {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

export type IssuedVerification = {
  /** Only returned so the caller can decide whether to expose it (dev mode). */
  code: string
  link: string
  expiresAt: Date
  expiresMinutes: number
  delivered: boolean
  transport: string
  deliveryError?: string
}

/** Issues a verification token for a user and emails it. */
export async function issueEmailVerification(params: {
  userId: string
  email: string
  firstName: string
  purpose?: 'SIGNUP' | 'RESEND' | 'EMAIL_CHANGE'
  ip?: string
  userAgent?: string
  resend?: boolean
}): Promise<IssuedVerification> {
  const purpose = params.purpose ?? 'SIGNUP'

  // Invalidate anything still open for this purpose.
  await prisma.emailVerificationToken.updateMany({
    where: { userId: params.userId, purpose: { in: ['SIGNUP', 'RESEND'] }, consumedAt: null },
    data: { consumedAt: new Date() }
  })

  const rawToken = randomBytes(32).toString('base64url')
  const code = generateCode()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000)

  await prisma.emailVerificationToken.create({
    data: {
      userId: params.userId,
      tokenHash: hashToken(rawToken),
      codeHash: hashToken(code),
      purpose,
      expiresAt,
      requestedIp: params.ip ?? null,
      userAgent: params.userAgent?.slice(0, 200) ?? null
    }
  })

  const link = `${SITE_URL}/verify-email?token=${rawToken}&email=${encodeURIComponent(params.email)}`

  const content = params.resend
    ? verificationResentEmail({
        firstName: params.firstName,
        code,
        link,
        expiresMinutes: TOKEN_TTL_MINUTES
      })
    : verificationEmail({
        firstName: params.firstName,
        email: params.email,
        code,
        link,
        expiresMinutes: TOKEN_TTL_MINUTES
      })

  const delivery = await sendMail({
    to: params.email,
    subject: content.subject,
    text: content.text,
    html: content.html,
    userId: params.userId
  })

  return {
    code,
    link,
    expiresAt,
    expiresMinutes: TOKEN_TTL_MINUTES,
    delivered: delivery.ok,
    transport: delivery.transport,
    deliveryError: delivery.error
  }
}

export type VerifyOutcome =
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: string; code:
      | 'INVALID'
      | 'EXPIRED'
      | 'TOO_MANY_ATTEMPTS'
      | 'ALREADY_VERIFIED'
      | 'NOT_FOUND' }

/**
 * Consumes a verification attempt. Accepts either a raw token (from the email
 * link) or a six-digit code (typed in).
 */
export async function consumeEmailVerification(input: {
  email: string
  token?: string
  code?: string
}): Promise<VerifyOutcome> {
  const email = input.email.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) return { ok: false, reason: 'We could not find that account.', code: 'NOT_FOUND' }

  if (user.emailVerifiedAt) {
    return { ok: false, reason: 'This email address is already verified.', code: 'ALREADY_VERIFIED' }
  }

  const record = input.token
    ? await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(input.token) } })
    : await prisma.emailVerificationToken.findFirst({
        where: { userId: user.id, consumedAt: null },
        orderBy: { createdAt: 'desc' }
      })

  if (!record || record.userId !== user.id) {
    return {
      ok: false,
      reason: 'That verification link is not valid. Request a new code.',
      code: 'INVALID'
    }
  }

  if (record.consumedAt) {
    return {
      ok: false,
      reason: 'That code has already been used. Request a new one.',
      code: 'INVALID'
    }
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'That code has expired. Request a new one.', code: 'EXPIRED' }
  }

  if (record.attempts >= MAX_CODE_ATTEMPTS) {
    return {
      ok: false,
      reason: 'Too many incorrect attempts. Request a new code.',
      code: 'TOO_MANY_ATTEMPTS'
    }
  }

  // Token path: the token itself is the proof.
  const tokenMatches = Boolean(input.token) && safeEqual(record.tokenHash, hashToken(input.token!))

  // Code path: constant-time comparison against the hashed code.
  const codeMatches =
    !tokenMatches && Boolean(input.code) && safeEqual(record.codeHash, hashToken(input.code!.trim()))

  if (!tokenMatches && !codeMatches) {
    await prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } }
    })

    const remaining = MAX_CODE_ATTEMPTS - (record.attempts + 1)
    return {
      ok: false,
      reason:
        remaining > 0
          ? `That code is not correct. ${remaining} attempt${remaining === 1 ? '' : 's'} left.`
          : 'Too many incorrect attempts. Request a new code.',
      code: remaining > 0 ? 'INVALID' : 'TOO_MANY_ATTEMPTS'
    }
  }

  const now = new Date()

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { consumedAt: now }
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: now,
        status: user.status === 'PENDING' ? 'ACTIVE' : user.status,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    })
  ])

  return { ok: true, userId: user.id, email: user.email }
}

/** True when verification can actually be delivered or surfaced today. */
export function verificationDeliverable() {
  const status = mailStatus()
  return status.transport === 'smtp' || status.devVisible
}

export { devMailVisible }
