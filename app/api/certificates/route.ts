import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { certificateIssueSchema } from '@/lib/validations'
import { generateCertificateCode } from '@/lib/certificates'
import { notify, recordAudit } from '@/lib/audit'

/** GET — certificates belonging to the signed-in member (admins: all). */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const url = new URL(request.url)
  const scope = url.searchParams.get('scope')

  const where =
    scope === 'all' && isAdmin(user.role)
      ? {}
      : { userId: user.id }

  const certificates = await prisma.certificate.findMany({
    where,
    orderBy: { issueDate: 'desc' },
    include: {
      programme: { select: { title: true, slug: true } },
      event: { select: { title: true, slug: true } }
    }
  })

  return NextResponse.json({ certificates })
}

/** POST — issue a certificate. ADMIN / SUPER_ADMIN only. */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = certificateIssueSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the certificate fields.' },
      { status: 422 }
    )
  }

  const data = parsed.data

  // Ensure the code is unique even in the extremely unlikely collision case.
  let code = generateCertificateCode()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clash = await prisma.certificate.findUnique({ where: { code } })
    if (!clash) break
    code = generateCertificateCode()
  }

  try {
    const certificate = await prisma.certificate.create({
      data: {
        code,
        title: data.title,
        recipientName: data.recipientName,
        description: data.description,
        grade: data.grade || null,
        userId: data.userId ?? null,
        programmeId: data.programmeId ?? null,
        eventId: data.eventId ?? null,
        issuedById: user.id,
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        status: 'VALID'
      }
    })

    if (certificate.userId) {
      await notify({
        userId: certificate.userId,
        title: 'New certificate issued',
        body: `${certificate.title} is now available in your dashboard. Verification code: ${certificate.code}.`,
        type: 'SUCCESS',
        href: '/dashboard/certificates'
      })
    }

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'CERTIFICATE_ISSUED',
      entityType: 'Certificate',
      entityId: certificate.id,
      metadata: { code, recipient: certificate.recipientName },
      request
    })

    return NextResponse.json({ ok: true, certificate }, { status: 201 })
  } catch (error) {
    console.error('[certificates] issue failed', error)
    return NextResponse.json({ error: 'Certificate could not be issued.' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
