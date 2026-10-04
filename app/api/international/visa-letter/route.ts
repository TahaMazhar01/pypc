import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { notify, recordAudit } from '@/lib/audit'
import { visaLetterSchema } from '@/lib/validations'
import { documentBelongsTo } from '@/lib/uploads'
import { checkPhone } from '@/lib/validation/phone'
import { findCountryByName } from '@/lib/data/countries'
import { checkRateLimit, clientIp, crossOriginResponse, isSameOrigin, tooManyRequests } from '@/lib/security/request'

function makeReference() {
  return `PYPC-VISA-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`
}

function parseDate(value?: string) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * POST /api/international/visa-letter
 * International delegates request an official invitation letter for visa
 * purposes. Requests are queued for the secretariat, which issues the letter on
 * letterhead — the platform never claims to guarantee a visa.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  const ip = clientIp(request)
  const limit = await checkRateLimit({ scope: 'visa-letter:ip', identity: ip, limit: 6, windowSeconds: 3600 })
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds, 'Too many requests from this connection. Please try again later.')
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Please create a free account — the invitation letter is issued in your name.' },
      { status: 401 }
    )
  }

  const parsed = visaLetterSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the form fields.' },
      { status: 422 }
    )
  }

  const data = parsed.data

  const phoneResult = checkPhone(data.phone)
  if (!phoneResult.ok) {
    return NextResponse.json({ error: phoneResult.reason }, { status: 422 })
  }

  const nationality = findCountryByName(data.nationality)

  if (data.documentUrl) {
    const storedName = data.documentUrl.split('/').pop() ?? ''
    if (!documentBelongsTo(storedName, user.id)) {
      return NextResponse.json(
        { error: 'The attached document does not belong to your account.' },
        { status: 403 }
      )
    }
  }

  const existing = await prisma.visaLetterRequest.findFirst({
    where: { userId: user.id, status: { in: ['PENDING', 'NEED_INFO'] } }
  })

  if (existing) {
    return NextResponse.json(
      {
        error: `You already have an open invitation-letter request (${existing.reference}). Track it from your dashboard.`,
        reference: existing.reference
      },
      { status: 409 }
    )
  }

  const reference = makeReference()

  try {
    const created = await prisma.visaLetterRequest.create({
      data: {
        reference,
        userId: user.id,
        fullName: data.fullName,
        email: data.email,
        phone: phoneResult.e164,
        nationality: nationality?.name ?? data.nationality,
        passportNumber: data.passportNumber || null,
        letterType: data.letterType,
        purpose: data.purpose,
        eventName: data.eventName || null,
        embassyCity: data.embassyCity || null,
        travelFrom: parseDate(data.travelFrom),
        travelTo: parseDate(data.travelTo),
        documentUrl: data.documentUrl || null,
        status: 'PENDING'
      }
    })

    await notify({
      userId: user.id,
      title: 'Visa invitation letter requested',
      body: `Your request ${reference} is with the secretariat. Expect a response within 5 working days.`,
      type: 'INFO',
      href: '/dashboard/visa-letters'
    })

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'VISA_LETTER_REQUESTED',
      entityType: 'VisaLetterRequest',
      entityId: created.id,
      metadata: { reference, letterType: data.letterType, nationality: data.nationality },
      request
    })

    return NextResponse.json({ ok: true, reference }, { status: 201 })
  } catch (error) {
    console.error('[visa-letter]', error)
    return NextResponse.json(
      { error: 'The request could not be saved. Please try again or email the secretariat.' },
      { status: 500 }
    )
  }
}

/** GET — the signed-in member's own invitation-letter requests. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const requests = await prisma.visaLetterRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({ requests })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
