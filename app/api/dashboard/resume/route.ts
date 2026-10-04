import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { documentBelongsTo } from '@/lib/uploads'

const bodySchema = z.object({
  resumeUrl: z.string().max(300).nullable()
})

/**
 * POST /api/dashboard/resume
 * Attaches (or clears) the CV stored on a member's profile. The URL must point
 * at a document this member actually owns.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid resumeUrl is required.' }, { status: 422 })
  }

  const { resumeUrl } = parsed.data

  if (resumeUrl) {
    const storedName = resumeUrl.split('/').pop() ?? ''
    if (!documentBelongsTo(storedName, user.id)) {
      return NextResponse.json({ error: 'That document does not belong to your account.' }, { status: 403 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { resumeUrl: resumeUrl || null },
    select: { resumeUrl: true }
  })

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: resumeUrl ? 'RESUME_ATTACHED' : 'RESUME_REMOVED',
    entityType: 'User',
    entityId: user.id,
    request
  })

  return NextResponse.json({ ok: true, resumeUrl: updated.resumeUrl })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
