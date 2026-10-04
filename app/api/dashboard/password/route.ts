import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getCurrentUser,
  hashPassword,
  passwordWithinBcryptLimit,
  sessionCookieOptions,
  verifyPassword
} from '@/lib/auth'
import { passwordSchema, strongPasswordSchema } from '@/lib/validations'
import { notify, recordAudit } from '@/lib/audit'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = passwordSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the password fields.' },
      { status: 422 }
    )
  }

  const { currentPassword, newPassword } = parsed.data

  if (!passwordWithinBcryptLimit(currentPassword) || !passwordWithinBcryptLimit(newPassword)) {
    return NextResponse.json(
      { error: 'Passwords may not be longer than 72 characters (bcrypt stops reading after that).' },
      { status: 422 }
    )
  }

  const strength = strongPasswordSchema.safeParse(newPassword)
  if (!strength.success) {
    return NextResponse.json(
      { error: strength.error.issues[0]?.message ?? 'Please choose a stronger password.' },
      { status: 422 }
    )
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true }
  })

  if (!record || !verifyPassword(currentPassword, record.passwordHash)) {
    return NextResponse.json({ error: 'Your current password is incorrect.' }, { status: 400 })
  }

  if (verifyPassword(newPassword, record.passwordHash)) {
    return NextResponse.json(
      { error: 'Choose a password different from your current one.' },
      { status: 400 }
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(newPassword),
      // Invalidates every other signed-in session.
      sessionVersion: { increment: 1 }
    }
  })

  await notify({
    userId: user.id,
    title: 'Password changed',
    body: 'Your PYPC password was updated and other devices were signed out.',
    type: 'WARNING',
    href: '/dashboard/security'
  })

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: 'PASSWORD_CHANGED',
    entityType: 'User',
    entityId: user.id,
    request
  })

  const response = NextResponse.json({
    ok: true,
    message: 'Password updated. Please sign in again on your other devices.'
  })

  // Clear this device's session too — user signs in again with the new password.
  response.cookies.set({ ...sessionCookieOptions, value: '', maxAge: 0 })
  return response
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
