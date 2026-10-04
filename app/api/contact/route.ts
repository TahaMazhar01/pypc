import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { contactSchemaWithPhone } from '@/lib/validations'
import { recordAudit } from '@/lib/audit'
import { assessEmail } from '@/lib/validation/email-server'
import { checkPhone } from '@/lib/validation/phone'
import { findCountry } from '@/lib/data/countries'
import { checkRateLimit, clientIp, crossOriginResponse, isSameOrigin, tooManyRequests } from '@/lib/security/request'
import { humanCheckRequired, verifyHumanCheck } from '@/lib/security/human-check'
import { CONTACT_EMAIL } from '@/lib/constants'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  const ip = clientIp(request)
  const limit = await checkRateLimit({ scope: 'contact:ip', identity: ip, limit: 6, windowSeconds: 3600 })
  if (!limit.allowed) {
    return tooManyRequests(
      limit.retryAfterSeconds,
      `You have sent several messages already. Please wait before sending another, or email ${CONTACT_EMAIL}.`
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (typeof body === 'object' && body !== null && 'companyWebsite' in body) {
    const honeypot = String((body as Record<string, unknown>).companyWebsite ?? '')
    if (honeypot.trim().length > 0) {
      return NextResponse.json({ ok: true, id: 'discarded' }, { status: 201 })
    }
  }

  // Human check (signed, server-issued) before anything is stored or emailed.
  if (humanCheckRequired()) {
    const raw = body as Record<string, unknown>
    const human = verifyHumanCheck(raw?.humanToken, raw?.humanAnswer)
    if (!human.ok) {
      return NextResponse.json({ error: human.reason, humanCheckFailed: true }, { status: 400 })
    }
  }

  const parsed = contactSchemaWithPhone.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the form fields.' },
      { status: 422 }
    )
  }

  const data = parsed.data

  // Real address check. A domain with no mail exchanger is almost always a typo.
  const emailCheck = await assessEmail(data.email, { strictDeliverability: false, allowRoleMailbox: true })
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

  try {
    const message = await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: emailCheck.email,
        phone: phoneResult?.ok ? phoneResult.e164 : null,
        subject: data.subject,
        message: data.message,
        country: country?.name ?? null,
        countryIso: country?.iso2 ?? null
      }
    })

    await recordAudit({
      actorEmail: data.email,
      action: 'CONTACT_MESSAGE_RECEIVED',
      entityType: 'ContactMessage',
      entityId: message.id,
      request
    })

    return NextResponse.json({ ok: true, id: message.id }, { status: 201 })
  } catch (error) {
    console.error('[contact]', error)
    return NextResponse.json({ error: `Message could not be saved. Please email ${CONTACT_EMAIL}.` }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
