import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { UserRole } from '@/lib/constants'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'pypc_session'
const SESSION_DAYS = 7

function secretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
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
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('pypc.org.pk')
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey())
}

export async function readSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: 'pypc.org.pk' })
    if (!payload.userId || !payload.email) return null
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      role: String(payload.role ?? 'MEMBER') as UserRole,
      version: Number(payload.version ?? 0)
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
  const token = cookies().get(COOKIE_NAME)?.value
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

  const user = await loadUser(session.userId)
  if (!user) return null
  if (user.status === 'SUSPENDED' || user.status === 'REJECTED') return null
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
  const user = await loadUser(session.userId)
  if (!user || user.emailVerifiedAt) return null
  return user
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user
}

export function isStaff(role: string) {
  return ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(role)
}

export function isAdmin(role: string) {
  return ['ADMIN', 'SUPER_ADMIN'].includes(role)
}

/**
 * Who may open the admin panel.
 *
 * Executives and moderators review content, applications and requests; admins and
 * super admins additionally publish, issue certificates and settle payments. A
 * plain member may not open the panel at all.
 *
 * This list is mirrored in `middleware.ts`, which enforces the same rule at the
 * edge with a real 307 redirect — see the comment there for why both exist.
 */
export const ADMIN_PANEL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'EXECUTIVE'] as const

export function canAccessAdminPanel(role: string) {
  return (ADMIN_PANEL_ROLES as readonly string[]).includes(role)
}

export async function requireAdmin() {
  const user = await requireUser()
  if (!isAdmin(user.role)) throw new Error('FORBIDDEN')
  return user
}

// ---------------------------------------------------------------------------
// Page guards for the admin area.
//
// `requireAdmin()` throws, which is right for an API route (the caller turns it
// into a JSON 403) but wrong for a page: throwing inside a page renders the
// nearest error boundary, and because Next streams the response the visitor can
// receive a `200` carrying an error panel. These two guards redirect to a page
// the visitor *can* use instead, so the panel never shows a broken screen to a
// signed-in member of staff, and no status code lies about what happened.
//
// `middleware.ts` applies the same rules at the edge, so in practice a request
// like this is refused with a real 307 before these run. They are the second
// line — defence in depth, not decoration.
// ---------------------------------------------------------------------------

/** Any staff role may open the panel; everyone else goes to their dashboard. */
export async function requireStaffPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!canAccessAdminPanel(user.role)) redirect('/dashboard')
  return user
}

/** Admin-only pages: staff below admin are sent back to the panel overview. */
export async function requireAdminPage() {
  const user = await requireStaffPage()
  if (!isAdmin(user.role)) redirect('/admin')
  return user
}

export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim()
}
