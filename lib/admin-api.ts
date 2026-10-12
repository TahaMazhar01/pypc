import 'server-only'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, type AuthenticatedUser } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/permissions'
import { clientIp, isSameOrigin } from '@/lib/security/request'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export async function authorize(request: Request, permission: Permission) {
  if (!['GET', 'HEAD'].includes(request.method) && !isSameOrigin(request)) throw new ApiError(403, 'A same-origin request is required.')
  const user = await getCurrentUser()
  if (!user) throw new ApiError(401, 'Sign in required.')
  if (!hasPermission(user, permission)) throw new ApiError(403, 'You do not have permission for this action.')
  return user
}
export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'This name or URL is already in use.' }, { status: 409 })
  if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2025', 'P2003'].includes(error.code)) return NextResponse.json({ error: 'The record was changed or is still in use. Refresh and try again.' }, { status: 409 })
  console.error('[admin] operation failed', error instanceof Error ? error.name : 'Unknown error')
  return NextResponse.json({ error: 'The operation could not be completed.' }, { status: 500 })
}
/** Serializable transactions protect last-admin and role/publish concurrency checks. */
export async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }
    catch (error) {
      if (attempt < 3 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') continue
      throw error
    }
  }
}
export async function assertActor(tx: Prisma.TransactionClient, actor: AuthenticatedUser, permission: Permission) {
  const current = await tx.user.findUnique({ where: { id: actor.id }, include: { customRole: true } })
  if (!current || current.status !== 'ACTIVE' || !current.emailVerifiedAt || current.sessionVersion !== actor.sessionVersion || !hasPermission(current, permission)) throw new ApiError(403, 'Access changed. Sign in again.')
}
/** Durable audit in the SAME transaction. Failure rolls back the administrative action.
 * These entries intentionally do not extend the legacy best-effort hash chain.
 */
export async function auditMutation(tx: Prisma.TransactionClient, actor: AuthenticatedUser, request: Request, action: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) {
  await tx.auditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action, entityType, entityId, metadata: JSON.stringify(metadata), ip: clientIp(request) } })
}
export async function readJson(request: Request, limit = 100000): Promise<unknown> {
  const reader = request.body?.getReader()
  if (!reader) throw new ApiError(400, 'Request body required.')
  const parts: Uint8Array[] = []; let size = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.length
    if (size > limit) { await reader.cancel(); throw new ApiError(413, 'Request body is too large.') }
    parts.push(value)
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')) }
  catch { throw new ApiError(400, 'Invalid JSON.') }
}
