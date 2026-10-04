import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, verifyPassword } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { checkRateLimit, clientIp, isSameOrigin, crossOriginResponse, tooManyRequests } from '@/lib/security/request'
import {
  generateRecoveryCodes,
  generateSecret,
  provisioningUri,
  readableSecret,
  verifyTotp
} from '@/lib/auth/totp'

/**
 * Two-factor authentication, self-service, from the member dashboard.
 *
 *   POST   { action: 'begin',   password }   → returns a secret + otpauth URI
 *   POST   { action: 'confirm', code }       → switches 2FA on, returns recovery codes
 *   POST   { action: 'disable', password }   → switches it off
 *   POST   { action: 'regenerate', password, code } → fresh recovery codes
 *
 * The secret is only trusted once a code generated from it has been verified —
 * so a member who closes the page mid-setup is never locked out by a half-set-up
 * second factor. Passwords are re-checked for every change because a live session
 * alone is not enough authority to weaken an account's security.
 */

async function codesAreValid(userId: string, code: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorRecoveryCodes: true }
  })
  if (!user?.twoFactorRecoveryCodes) return false

  const hashes: string[] = JSON.parse(user.twoFactorRecoveryCodes)
  const normalised = code.trim().toUpperCase().replace(/\s+/g, '')

  for (let index = 0; index < hashes.length; index += 1) {
    if (await bcrypt.compare(normalised, hashes[index])) {
      // Recovery codes are single use: the spent one is removed.
      const remaining = hashes.filter((_, position) => position !== index)
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorRecoveryCodes: JSON.stringify(remaining) }
      })
      return true
    }
  }

  return false
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const limit = await checkRateLimit({
    scope: 'two-factor',
    identity: `${user.id}:${clientIp(request)}`,
    limit: 20,
    windowSeconds: 900
  })
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds, 'Too many attempts. Please wait a few minutes.')
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const action = String(body.action ?? '')
  // The session user deliberately carries no credentials, so the columns this
  // route needs (password hash, 2FA secret, recovery hashes) are read here and
  // never leave the server.
  const account = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      email: true,
      firstName: true,
      passwordHash: true,
      twoFactorSecret: true,
      twoFactorConfirmedAt: true
    }
  })

  if (action === 'begin') {
    if (account.twoFactorConfirmedAt) {
      return NextResponse.json(
        { error: 'Two-factor authentication is already switched on. Turn it off first to set up a new device.' },
        { status: 409 }
      )
    }

    const passwordOk = await verifyPassword(String(body.password ?? ''), account.passwordHash)
    if (!passwordOk) {
      return NextResponse.json({ error: 'That password is not correct.' }, { status: 403 })
    }

    const secret = generateSecret()
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } })

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'TWO_FACTOR_SETUP_STARTED',
      entityType: 'User',
      entityId: user.id,
      request
    })

    return NextResponse.json({
      ok: true,
      secret,
      readableSecret: readableSecret(secret),
      otpauthUri: provisioningUri({ secret, accountName: account.email }),
      instructions:
        'Open your authenticator app, add an account, and scan the QR code or type the key. Then enter the six-digit code to switch 2FA on.'
    })
  }

  if (action === 'confirm') {
    if (!account.twoFactorSecret) {
      return NextResponse.json({ error: 'Start the setup first.' }, { status: 409 })
    }

    if (!verifyTotp(account.twoFactorSecret, String(body.code ?? ''))) {
      return NextResponse.json(
        { error: 'That code is not valid right now. Check your phone’s clock and try the current code.' },
        { status: 422 }
      )
    }

    const recoveryCodes = generateRecoveryCodes()
    const hashed = await Promise.all(recoveryCodes.map(code => bcrypt.hash(code, 10)))

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorConfirmedAt: new Date(),
        twoFactorRecoveryCodes: JSON.stringify(hashed)
      }
    })

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'TWO_FACTOR_ENABLED',
      entityType: 'User',
      entityId: user.id,
      request
    })

    return NextResponse.json({
      ok: true,
      recoveryCodes,
      message:
        'Two-factor authentication is on. Store these recovery codes somewhere safe — each one works once, and they are the only way in if you lose your phone.'
    })
  }

  if (action === 'regenerate') {
    if (!account.twoFactorConfirmedAt || !account.twoFactorSecret) {
      return NextResponse.json({ error: 'Two-factor authentication is not switched on.' }, { status: 409 })
    }

    const passwordOk = await verifyPassword(String(body.password ?? ''), account.passwordHash)
    if (!passwordOk) {
      return NextResponse.json({ error: 'That password is not correct.' }, { status: 403 })
    }

    const code = String(body.code ?? '')
    const valid = verifyTotp(account.twoFactorSecret, code) || (await codesAreValid(user.id, code))
    if (!valid) {
      return NextResponse.json({ error: 'Enter a current code from your app, or a recovery code.' }, { status: 422 })
    }

    const recoveryCodes = generateRecoveryCodes()
    const hashed = await Promise.all(recoveryCodes.map(item => bcrypt.hash(item, 10)))
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorRecoveryCodes: JSON.stringify(hashed) } })

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'TWO_FACTOR_RECOVERY_CODES_REGENERATED',
      entityType: 'User',
      entityId: user.id,
      request
    })

    return NextResponse.json({ ok: true, recoveryCodes })
  }

  if (action === 'disable') {
    const passwordOk = await verifyPassword(String(body.password ?? ''), account.passwordHash)
    if (!passwordOk) {
      return NextResponse.json({ error: 'That password is not correct.' }, { status: 403 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: null,
        twoFactorConfirmedAt: null,
        twoFactorRecoveryCodes: null
      }
    })

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'TWO_FACTOR_DISABLED',
      entityType: 'User',
      entityId: user.id,
      request
    })

    return NextResponse.json({
      ok: true,
      message: 'Two-factor authentication is off. Your password alone now signs you in.'
    })
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
