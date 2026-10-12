import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorize, apiError, assertActor, auditMutation, readJson, transaction } from '@/lib/admin-api'
import { notify } from '@/lib/audit'

const bodySchema = z.object({
  certificateId: z.string().min(1),
  action: z.enum(['REVOKE', 'REINSTATE', 'DELETE', 'UPDATE']),
  reason: z.string().max(500).optional(),
  details: z.object({ title: z.string().trim().min(3).max(180), recipientName: z.string().trim().min(2).max(180), description: z.string().trim().min(10).max(5000), grade: z.string().trim().max(100).nullable() }).strict().optional()
}).strict()

/** PATCH /api/admin/certificates — revoke, reinstate or delete a certificate. */
export async function PATCH(request: Request) {
  let admin
  try { admin = await authorize(request, 'certificates.manage') } catch (error) { return apiError(error) }

  let body
  try { body = await readJson(request) } catch (error) { return apiError(error) }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'certificateId and a valid action are required.' }, { status: 422 })
  }

  const { certificateId, action, reason } = parsed.data

  const certificate = await prisma.certificate.findUnique({ where: { id: certificateId } })
  if (!certificate) return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 })

  if (action === 'UPDATE') {
    if (!parsed.data.details) return NextResponse.json({ error: 'Certificate details are required.' }, { status: 422 })
    const details = parsed.data.details
    try {
      await transaction(async tx => {
        await assertActor(tx, admin, 'certificates.manage')
        await tx.certificate.update({ where: { id: certificateId }, data: details })
        await auditMutation(tx, admin, request, 'CERTIFICATE_UPDATED', 'Certificate', certificateId, { code: certificate.code, fields: Object.keys(details) })
      })
      return NextResponse.json({ ok: true })
    } catch (error) { return apiError(error) }
  }

  if (action === 'DELETE') {
    return NextResponse.json({ error: 'Issued verification records are retained. Revoke the certificate instead; it can be reinstated later.' }, { status: 409 })
  }

  const revoked = action === 'REVOKE'

  let updated
  try { updated = await transaction(async tx => {
    await assertActor(tx, admin, 'certificates.manage')
    const result = await tx.certificate.update({
    where: { id: certificateId },
    data: revoked
      ? { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason ?? 'Revoked by administrator' }
      : { status: 'VALID', revokedAt: null, revokedReason: null }
    })
    await auditMutation(tx, admin, request, revoked ? 'CERTIFICATE_REVOKED' : 'CERTIFICATE_REINSTATED', 'Certificate', certificateId, { code: certificate.code, reason })
    return result
  }) } catch (error) { return apiError(error) }

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

  return NextResponse.json({ ok: true, certificate: updated })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
