import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSessionToken, isAdmin, sessionCookieOptions, verifyPassword, passwordWithinBcryptLimit } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { recordAudit } from '@/lib/audit'
import type { UserRole } from '@/lib/constants'
import { checkRateLimit, clientIp, isSameOrigin, crossOriginResponse, resetRateLimit, tooManyRequests } from '@/lib/security/request'
import { verifyTotp } from '@/lib/auth/totp'

/** Progressive lockout: 5 free attempts, then a 15-minute cooldown. */
const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  const ip = clientIp(request)

  const ipLimit = await checkRateLimit({ scope: 'login:ip', identity: ip, limit: 20, windowSeconds: 900 })
  if (!ipLimit.allowed) {
    return tooManyRequests(
      ipLimit.retryAfterSeconds,
      'Too many sign-in attempts from this connection. Please wait a few minutes and try again.'
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address and password.' }, { status: 422 })
  }

  const { email, password } = parsed.data

  // bcrypt only reads the first 72 bytes. Rather than silently truncating (which
  // would let a very long string "work" against a shorter password), say so.
  if (!passwordWithinBcryptLimit(password)) {
    return NextResponse.json(
      {
        error:
          'That password is longer than 72 characters — please check for an accidental paste. If you use a password manager, make sure it filled the password field only.'
      },
      { status: 422 }
    )
  }

  if ((parsed.data.companyWebsite ?? '').length > 0) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
  }

  const accountLimit = await checkRateLimit({
    scope: 'login:account',
    identity: email,
    limit: MAX_ATTEMPTS,
    windowSeconds: LOCK_MINUTES * 60
  })

  const user = await prisma.user.findUnique({ where: { email } })

  // Locked accounts are stopped before the password is even checked, so a
  // brute-force run cannot continue regardless of the guesses used.
  if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    return NextResponse.json(
      {
        error: `This account is temporarily locked after several failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}, or reset your password.`,
        lockedForMinutes: minutes
      },
      { status: 423 }
    )
  }

  if (!accountLimit.allowed) {
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) }
      })
      await recordAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: 'ACCOUNT_LOCKED',
        entityType: 'User',
        entityId: user.id,
        metadata: { minutes: LOCK_MINUTES, ip },
        request
      })
    }
    return tooManyRequests(
      accountLimit.retryAfterSeconds,
      `Too many failed attempts. This account is locked for ${LOCK_MINUTES} minutes.`
    )
  }

  // Verify the password with bcrypt in constant time, whether or not the user exists.
  const passwordMatches = user ? verifyPassword(password, user.passwordHash) : false

  if (!user || !passwordMatches) {
    if (user) {
      const attempts = user.failedLoginAttempts + 1
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil:
            attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : user.lockedUntil
        }
      })
    }

    await recordAudit({
      actorEmail: email,
      action: 'LOGIN_FAILED',
      entityType: 'User',
      metadata: { ip },
      request
    })

    const remaining = user ? Math.max(0, MAX_ATTEMPTS - (user.failedLoginAttempts + 1)) : null

    return NextResponse.json(
      {
        error: 'Incorrect email or password.',
        attemptsRemaining: remaining
      },
      { status: 401 }
    )
  }

  if (!user.emailVerifiedAt) {
    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'LOGIN_BLOCKED_UNVERIFIED_EMAIL',
      entityType: 'User',
      entityId: user.id,
      request
    })

    return NextResponse.json(
      {
        error:
          'Your email address is not verified yet. Enter the six-digit code we emailed you to activate the account.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
        canResend: true
      },
      { status: 403 }
    )
  }

  if (user.status === 'SUSPENDED') {
    return NextResponse.json(
      { error: 'This account is suspended. Please contact the PYPC secretariat.' },
      { status: 403 }
    )
  }

  if (user.status === 'REJECTED') {
    return NextResponse.json(
      { error: 'This account application was not approved. Please contact the secretariat.' },
      { status: 403 }
    )
  }

  // ── Optional two-factor authentication ────────────────────────────────────
  // The password was correct. If the member switched 2FA on, the session is not
  // issued yet: a six-digit code (or a single-use recovery code) is required.
  if (user.twoFactorConfirmedAt && user.twoFactorSecret) {
    const raw = (body ?? {}) as Record<string, unknown>
    const submitted = String(raw.totp ?? raw.code ?? '').replace(/\s+/g, '')

    if (!submitted) {
      return NextResponse.json(
        {
          error: 'Enter the six-digit code from your authenticator app to finish signing in.',
          code: 'TOTP_REQUIRED',
          email: user.email,
          method: 'APP'
        },
        { status: 401 }
      )
    }

    let accepted = verifyTotp(user.twoFactorSecret, submitted)

    // A recovery code also works — once. It is only checked when the TOTP check
    // failed, and a wrong TOTP alone never consumes a code.
    if (!accepted && user.twoFactorRecoveryCodes) {
      const hashes: string[] = JSON.parse(user.twoFactorRecoveryCodes)
      const bcrypt = (await import('bcryptjs')).default
      const normalised = submitted.toUpperCase()

      for (let index = 0; index < hashes.length; index += 1) {
        if (await bcrypt.compare(normalised, hashes[index])) {
          accepted = true
          const remaining = hashes.filter((_, position) => position !== index)
          await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorRecoveryCodes: JSON.stringify(remaining) }
          })
          await recordAudit({
            actorId: user.id,
            actorEmail: user.email,
            action: 'TWO_FACTOR_RECOVERY_CODE_USED',
            entityType: 'User',
            entityId: user.id,
            metadata: { remaining: remaining.length },
            request
          })
          break
        }
      }
    }

    if (!accepted) {
      await recordAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: 'LOGIN_FAILED_TWO_FACTOR',
        entityType: 'User',
        entityId: user.id,
        metadata: { ip },
        request
      })

      return NextResponse.json(
        {
          error: 'That two-factor code is not valid. Enter the current code from your app, or one of your recovery codes.',
          code: 'TOTP_INVALID'
        },
        { status: 401 }
      )
    }

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'LOGIN_TWO_FACTOR_VERIFIED',
      entityType: 'User',
      entityId: user.id,
      request
    })
  }

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    version: user.sessionVersion
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), lastLoginIp: ip, failedLoginAttempts: 0, lockedUntil: null }
  })

  await resetRateLimit('login:account', email)

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'LOGIN_SUCCESS',
    entityType: 'User',
    entityId: user.id,
    metadata: { ip },
    request
  })

  const response = NextResponse.json({
    ok: true,
    role: user.role,
    redirectTo: isAdmin(user.role) ? '/admin' : '/dashboard'
  })

  response.cookies.set({ ...sessionCookieOptions, value: token })
  return response
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
