import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { hasPermission, type Permission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { UserRole } from '@/lib/constants'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'pypc_session'
const SESSION_DAYS = 7

function secretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Add a long random value to .env (openssl rand -base64 32).'
    )
  }
  return new TextEncoder().encode(secret)
}

export type SessionPayload = {
  userId: string
  email: string
  role: UserRole
  version: number
  sessionId?: string
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash)
}

/** Optional: reject passwords longer than bcrypt's 72-byte input limit. */
export function passwordWithinBcryptLimit(password: string) {
  return Buffer.byteLength(password, 'utf8') <= 72
}

// ---------------------------------------------------------------------------
// JWT session tokens
// ---------------------------------------------------------------------------

export async function createSessionToken(payload: SessionPayload) {
  const sessionId = randomUUID()
  const token = await new SignJWT({ ...payload, sessionId })
    .setJti(sessionId)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('pypc.org.pk')
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey())
  await prisma.authSession.create({ data: { id: sessionId, userId: payload.userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) } })
  return token
}

export async function readSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: 'pypc.org.pk', algorithms: ['HS256'] })
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string' || typeof payload.sessionId !== 'string' || payload.jti !== payload.sessionId || !Number.isSafeInteger(payload.version)) return null
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      role: String(payload.role ?? 'MEMBER') as UserRole,
      version: Number(payload.version),
      sessionId: payload.sessionId
    }
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  name: COOKIE_NAME,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DAYS * 24 * 60 * 60
}

// ---------------------------------------------------------------------------
// Reading the current user
// ---------------------------------------------------------------------------

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return null
  return readSessionToken(token)
}

export type CurrentUser = Awaited<ReturnType<typeof loadUser>>

async function loadUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      city: true,
      province: true,
      institution: true,
      fieldOfStudy: true,
      profession: true,
      bio: true,
      avatarUrl: true,
      resumeUrl: true,
      role: true,
      customRoleId: true,
      customRole: { select: { id: true, name: true, permissions: true } },
      status: true,
      cnic: true,
      dateOfBirth: true,
      sessionVersion: true,
      emailVerifiedAt: true,
      createdAt: true,
      lastLoginAt: true,
      // Two-factor state only — the secret and the recovery-code hashes are
      // deliberately never loaded into a page or a component.
      twoFactorConfirmedAt: true
    }
  })
}

/**
 * Returns the signed-in user, or null.
 *
 * Applies every gate in one place so no page or route can forget one:
 *  - session cookie must be valid and signed
 *  - account must exist
 *  - suspended / rejected accounts get nothing
 *  - **unverified email addresses get nothing** — a PENDING account has no access
 *    to the dashboard, uploads or certificates until the code is confirmed
 *  - a password change (sessionVersion bump) invalidates older tokens
 */
export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null

  const stored = await prisma.authSession.findUnique({ where: { id: session.sessionId! } })
  if (!stored || stored.userId !== session.userId || stored.expiresAt <= new Date()) return null

  const user = await loadUser(session.userId)
  if (!user) return null
  if (user.status !== 'ACTIVE') return null
  if (!user.emailVerifiedAt) return null
  // Password change / forced logout invalidates older tokens.
  if (user.sessionVersion !== session.version) return null

  return user
}

export type AuthenticatedUser = NonNullable<CurrentUser>

/** Reads the session account even when it is unverified (used by the verify flow). */
export async function getUnverifiedSessionUser() {
  const session = await getSession()
  if (!session) return null
  const stored = await prisma.authSession.findUnique({ where: { id: session.sessionId! } })
  if (!stored || stored.userId !== session.userId || stored.expiresAt <= new Date()) return null
  const user = await loadUser(session.userId)
  if (!user || user.emailVerifiedAt || user.sessionVersion !== session.version || ['SUSPENDED', 'REJECTED'].includes(user.status)) return null
  return user
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user
}

export function isAdmin(role: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

export async function requirePermissionPage(permission: Permission) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!hasPermission(user, permission)) redirect('/dashboard')
  return user
}

export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim()
}
