import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { applicationSchemaWithPhone } from '@/lib/validations'
import { notify, recordAudit } from '@/lib/audit'
import { documentBelongsTo } from '@/lib/uploads'
import { checkPhone } from '@/lib/validation/phone'
import { findCountry } from '@/lib/data/countries'
import { crossOriginResponse, isSameOrigin } from '@/lib/security/request'

function makeReference() {
  return `PYPC-APP-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`
}

/** POST — submit an application for a programme, opportunity, event or membership. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to submit an application.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = applicationSchemaWithPhone.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the form fields.' },
      { status: 422 }
    )
  }

  const data = parsed.data

  // Normalise the phone number to E.164 with its verified dialling country.
  const phoneResult = checkPhone(data.phone, data.phoneCountry)
  if (!phoneResult.ok) {
    return NextResponse.json({ error: phoneResult.reason }, { status: 422 })
  }

  const country = data.country ? findCountry(data.country) : undefined

  // An attached CV must be a document this member actually uploaded.
  if (data.resumeUrl) {
    const storedName = data.resumeUrl.split('/').pop() ?? ''
    if (!documentBelongsTo(storedName, user.id)) {
      return NextResponse.json(
        { error: 'The attached CV does not belong to your account. Please upload it again.' },
        { status: 403 }
      )
    }
  }

  // Duplicate protection: one open application per target per member.
  const existing = await prisma.application.findFirst({
    where: {
      userId: user.id,
      status: { in: ['PENDING', 'UNDER_REVIEW', 'SHORTLISTED'] },
      programmeId: data.programmeId ?? null,
      opportunityId: data.opportunityId ?? null,
      eventId: data.eventId ?? null
    }
  })

  if (existing) {
    return NextResponse.json(
      {
        error: `You already have an open application (${existing.reference}) for this item. You can track it in your dashboard.`,
        reference: existing.reference
      },
      { status: 409 }
    )
  }

  try {
    const reference = makeReference()

    const application = await prisma.application.create({
      data: {
        reference,
        userId: user.id,
        type: data.type,
        programmeId: data.programmeId ?? null,
        opportunityId: data.opportunityId ?? null,
        eventId: data.eventId ?? null,
        fullName: data.fullName,
        email: data.email,
        phone: phoneResult.e164,
        city: data.city || null,
        motivation: data.motivation,
        experience: data.experience || null,
        resumeUrl: data.resumeUrl || null,
        country: country?.name ?? null,
        status: 'PENDING'
      }
    })

    // Event-type submissions also create a registration record.
    if (data.type === 'EVENT' && data.eventId) {
      await prisma.eventRegistration
        .create({ data: { eventId: data.eventId, userId: user.id, status: 'REGISTERED' } })
        .catch(() => undefined)
    }

    await notify({
      userId: user.id,
      title: 'Application received',
      body: `We received your application (${reference}). You will be notified when its status changes.`,
      type: 'INFO',
      href: '/dashboard/applications'
    })

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'APPLICATION_SUBMITTED',
      entityType: 'Application',
      entityId: application.id,
      metadata: { type: data.type, reference, resumeAttached: Boolean(data.resumeUrl) },
      request
    })

    return NextResponse.json({ ok: true, reference }, { status: 201 })
  } catch (error) {
    console.error('[applications]', error)
    return NextResponse.json({ error: 'Application could not be saved. Please try again.' }, { status: 500 })
  }
}

/** GET — the signed-in member's own applications. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { submittedAt: 'desc' },
    include: {
      programme: { select: { title: true, slug: true } },
      opportunity: { select: { title: true, slug: true } }
    }
  })

  return NextResponse.json({ applications })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
