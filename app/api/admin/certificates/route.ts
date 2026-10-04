import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { notify, recordAudit } from '@/lib/audit'

const bodySchema = z.object({
  certificateId: z.string().min(1),
  action: z.enum(['REVOKE', 'REINSTATE', 'DELETE']),
  reason: z.string().max(500).optional()
})

/** PATCH /api/admin/certificates — revoke, reinstate or delete a certificate. */
export async function PATCH(request: Request) {
  const admin = await getCurrentUser()
  if (!admin || !isAdmin(admin.role)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'certificateId and a valid action are required.' }, { status: 422 })
  }

  const { certificateId, action, reason } = parsed.data

  const certificate = await prisma.certificate.findUnique({ where: { id: certificateId } })
  if (!certificate) return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 })

  if (action === 'DELETE') {
    if (admin.role !== 'SUPER_ADMIN') {
      // Safer default: revoke instead of destroying the audit trail.
      const revoked = await prisma.certificate.update({
        where: { id: certificateId },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedReason: reason ?? 'Revoked by administrator'
        }
      })

      await recordAudit({
        actorId: admin.id,
        actorEmail: admin.email,
        action: 'CERTIFICATE_REVOKED',
        entityType: 'Certificate',
        entityId: certificateId,
        metadata: { code: certificate.code, reason },
        request
      })

      return NextResponse.json({
        ok: true,
        certificate: revoked,
        message: 'Only a super admin can delete. The certificate was revoked instead.'
      })
    }

    await prisma.certificate.delete({ where: { id: certificateId } })

    await recordAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'CERTIFICATE_DELETED',
      entityType: 'Certificate',
      entityId: certificateId,
      metadata: { code: certificate.code },
      request
    })

    return NextResponse.json({ ok: true, deleted: true })
  }

  const revoked = action === 'REVOKE'

  const updated = await prisma.certificate.update({
    where: { id: certificateId },
    data: revoked
      ? { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason ?? 'Revoked by administrator' }
      : { status: 'VALID', revokedAt: null, revokedReason: null }
  })

  if (certificate.userId) {
    await notify({
      userId: certificate.userId,
      title: revoked ? 'Certificate revoked' : 'Certificate reinstated',
      body: revoked
        ? `Certificate ${certificate.code} (${certificate.title}) has been revoked.${reason ? ` Reason: ${reason}` : ''}`
        : `Certificate ${certificate.code} (${certificate.title}) is valid again.`,
      type: revoked ? 'WARNING' : 'SUCCESS',
      href: '/dashboard/certificates'
    })
  }

  await recordAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: revoked ? 'CERTIFICATE_REVOKED' : 'CERTIFICATE_REINSTATED',
    entityType: 'Certificate',
    entityId: certificateId,
    metadata: { code: certificate.code, reason },
    request
  })

  return NextResponse.json({ ok: true, certificate: updated })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
