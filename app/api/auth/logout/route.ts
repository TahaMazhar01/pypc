import { NextResponse } from 'next/server'
import { getSession, sessionCookieOptions } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'

export async function POST(request: Request) {
  const session = await getSession()

  if (session) {
    await recordAudit({
      actorId: session.userId,
      actorEmail: session.email,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: session.userId,
      request
    })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set({ ...sessionCookieOptions, value: '', maxAge: 0 })
  return response
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
