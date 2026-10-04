import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { partnershipRequestSchema } from '@/lib/validations'
import { makePartnershipReference, PARTNERSHIP_STATUS_MEANINGS } from '@/lib/partnerships'
import { recordAudit } from '@/lib/audit'
import { assessEmail } from '@/lib/validation/email-server'
import { checkPhone } from '@/lib/validation/phone'
import { findCountry } from '@/lib/data/countries'
import {
  checkRateLimit,
  clientIp,
  crossOriginResponse,
  isSameOrigin,
  tooManyRequests
} from '@/lib/security/request'
import { humanCheckRequired, verifyHumanCheck } from '@/lib/security/human-check'
import { sendMail } from '@/lib/email/mailer'
import { CONTACT_EMAIL } from '@/lib/constants'

/**
 * POST /api/partnerships/request
 *
 * The front door of the MoU / campus-chapter process described on /partnerships.
 * Order of operations mirrors the contact route, because that ordering is the
 * point: rate limit → honeypot → human check → validate → deliverability → store.
 * Nothing is written and no mail is sent until every gate has passed.
 *
 * Deliberate choices:
 *  - Role mailboxes (`info@`, `registrar@`) are accepted here. Institutions write
 *    from shared addresses far more often than individuals do, and rejecting them
 *    would lose exactly the enquiries this route exists to capture.
 *  - A repeat request from the same address for the same institution is treated as
 *    the *same* request: the original reference is returned rather than a second
 *    case being opened, so a double-click is not two entries in the register.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  const ip = clientIp(request)
  const limit = await checkRateLimit({
    scope: 'partnerships:ip',
    identity: ip,
    limit: 4,
    windowSeconds: 3600
  })
  if (!limit.allowed) {
    return tooManyRequests(
      limit.retryAfterSeconds,
      `Several partnership requests have already been sent from this connection. Please wait, or write to ${CONTACT_EMAIL} directly.`
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // Honeypot: a field no person can see or reach with a keyboard.
  if (typeof body === 'object' && body !== null && 'companyWebsite' in body) {
    const honeypot = String((body as Record<string, unknown>).companyWebsite ?? '')
    if (honeypot.trim().length > 0) {
      return NextResponse.json({ ok: true, reference: 'discarded' }, { status: 201 })
    }
  }

  if (humanCheckRequired()) {
    const raw = body as Record<string, unknown>
    const human = verifyHumanCheck(raw?.humanToken, raw?.humanAnswer)
    if (!human.ok) {
      return NextResponse.json({ error: human.reason, humanCheckFailed: true }, { status: 400 })
    }
  }

  const parsed = partnershipRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the form fields.' },
      { status: 422 }
    )
  }

  const data = parsed.data

  const emailCheck = await assessEmail(data.contactEmail, {
    strictDeliverability: false,
    allowRoleMailbox: true
  })
  if (!emailCheck.ok) {
    return NextResponse.json(
      { error: emailCheck.reason ?? 'Enter a valid email address.' },
      { status: 422 }
    )
  }

  const phoneResult = data.phone ? checkPhone(data.phone, data.phoneCountry) : null
  if (phoneResult && !phoneResult.ok) {
    return NextResponse.json({ error: phoneResult.reason }, { status: 422 })
  }

  const country = data.country ? findCountry(data.country) : undefined
  const email = emailCheck.email
  const institutionName = data.institutionName.trim()

  try {
    // One request per institution per address per day. Returning the same
    // reference keeps the register honest and the visitor's expectation intact.
    const existing = await prisma.partnershipRequest.findFirst({
      where: {
        contactEmail: email,
        institutionName: { equals: institutionName },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      select: { reference: true, status: true, createdAt: true }
    })

    if (existing) {
      return NextResponse.json({
        ok: true,
        reference: existing.reference,
        alreadyReceived: true,
        status: existing.status,
        message: `This request is already with the secretariat as ${existing.reference}. ${
          PARTNERSHIP_STATUS_MEANINGS[
            (existing.status as keyof typeof PARTNERSHIP_STATUS_MEANINGS) ?? 'SUBMITTED'
          ] ?? ''
        }`
      })
    }

    const record = await prisma.partnershipRequest.create({
      data: {
        reference: makePartnershipReference(),
        institutionName,
        institutionType: data.institutionType,
        country: country?.name ?? null,
        countryIso: country?.iso2 ?? null,
        city: data.city?.trim() ? data.city.trim() : null,
        website: data.website?.trim() ? data.website.trim() : null,
        contactName: data.contactName.trim(),
        contactRole: data.contactRole.trim(),
        contactEmail: email,
        contactPhone: phoneResult?.ok ? phoneResult.e164 : null,
        interests: JSON.stringify(data.interests),
        studentsReached: data.studentsReached?.trim() ? data.studentsReached.trim() : null,
        message: data.message.trim()
      }
    })

    await recordAudit({
      actorEmail: email,
      action: 'PARTNERSHIP_REQUEST_RECEIVED',
      entityType: 'PartnershipRequest',
      entityId: record.id,
      metadata: {
        reference: record.reference,
        institution: institutionName,
        institutionType: data.institutionType,
        interests: data.interests
      },
      request
    })

    const interests = data.interests
      .map(value => value.replace(/_/g, ' ').toLowerCase())
      .join(', ')

    // Confirmation to the institution and a copy to the secretariat. In
    // development both land in the outbox (/admin/emails) — the same path the
    // verification mails use — so the flow is testable without a live mail server.
    await sendMail({
      to: email,
      subject: `PYPC partnership request received — ${record.reference}`,
      text: [
        `Dear ${data.contactName.trim()},`,
        '',
        `Thank you for writing to the Pakistan Youth Parliamentary Council on behalf of ${institutionName}.`,
        '',
        `Your reference is ${record.reference}. Please quote it in any correspondence.`,
        `Areas you selected: ${interests}.`,
        '',
        PARTNERSHIP_STATUS_MEANINGS.SUBMITTED,
        '',
        'What happens next is set out step by step at /partnerships: review, a scope call, then a draft',
        'agreement if both sides are satisfied. Our standard MoU template is published at /records.',
        '',
        `Secretariat, Pakistan Youth Parliamentary Council`,
        CONTACT_EMAIL
      ].join('\n')
    })

    await sendMail({
      to: CONTACT_EMAIL,
      subject: `New partnership request — ${institutionName} (${record.reference})`,
      text: [
        `Reference : ${record.reference}`,
        `Institution: ${institutionName} (${data.institutionType}, ${country?.name ?? 'country not given'})`,
        `Contact    : ${data.contactName.trim()}, ${data.contactRole.trim()}`,
        `Email      : ${email}`,
        `Phone      : ${phoneResult?.ok ? phoneResult.e164 : 'not given'}`,
        `Interests  : ${interests}`,
        `Reach      : ${data.studentsReached?.trim() || 'not given'}`,
        '',
        data.message.trim(),
        '',
        'Review it at /admin/partnerships and reply within ten working days.'
      ].join('\n')
    })

    return NextResponse.json(
      {
        ok: true,
        reference: record.reference,
        status: record.status,
        message: PARTNERSHIP_STATUS_MEANINGS.SUBMITTED
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[partnerships]', error)
    return NextResponse.json(
      { error: `The request could not be saved. Please email ${CONTACT_EMAIL}.` },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
