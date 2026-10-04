import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { assessEmail } from '@/lib/validation/email-server'
import { checkRateLimit, clientIp, crossOriginResponse, isSameOrigin, tooManyRequests } from '@/lib/security/request'
import { humanCheckRequired, verifyHumanCheck } from '@/lib/security/human-check'
import { sendMail } from '@/lib/email/mailer'
import { CONTACT_EMAIL } from '@/lib/constants'

/**
 * Newsletter subscription — double opt-in.
 *
 * A row is created as PENDING and is only usable once the subscriber clicks the
 * confirmation link. Until then nothing is ever sent to that address, which is
 * what keeps the list clean of typo'd and third-party addresses, and what makes
 * the consent real rather than assumed.
 *
 *   POST /api/newsletter            { email, name?, interests?, humanToken, humanAnswer }
 *   GET  /api/newsletter?token=…    confirms a pending subscription
 *   GET  /api/newsletter?unsubscribe=…  removes one
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  const ip = clientIp(request)
  const limit = await checkRateLimit({ scope: 'newsletter:ip', identity: ip, limit: 8, windowSeconds: 3600 })
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds, 'Too many subscription attempts. Please try again later.')
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // Honeypot first: silently accept so a script cannot tell it was detected.
  if (String(body.companyWebsite ?? '').trim().length > 0) {
    return NextResponse.json({ ok: true, status: 'PENDING' }, { status: 201 })
  }

  if (humanCheckRequired()) {
    const human = verifyHumanCheck(body.humanToken, body.humanAnswer)
    if (!human.ok) {
      return NextResponse.json({ error: human.reason, humanCheckFailed: true }, { status: 400 })
    }
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 422 })
  }

  // Same deliverability check the contact form uses: a domain with no mail
  // exchanger is almost always a typo, and it can never receive the confirmation.
  const deliverability = await assessEmail(email, { strictDeliverability: false, allowRoleMailbox: true })
  if (!deliverability.ok) {
    return NextResponse.json({ error: deliverability.reason }, { status: 422 })
  }

  const name = String(body.name ?? '').trim().slice(0, 120) || null
  const interests = String(body.interests ?? 'newsletter').trim().slice(0, 60) || 'newsletter'
  const token = randomBytes(24).toString('base64url')

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } })

  if (existing?.status === 'CONFIRMED') {
    return NextResponse.json({
      ok: true,
      status: 'CONFIRMED',
      message: 'This address is already subscribed. Every mailing includes a one-click unsubscribe link.'
    })
  }

  const subscriber = existing
    ? await prisma.newsletterSubscriber.update({
        where: { email },
        data: { name, interests, status: 'PENDING', token }
      })
    : await prisma.newsletterSubscriber.create({ data: { email, name, interests, token, status: 'PENDING' } })

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '')
  const confirmUrl = `${appUrl}/api/newsletter?token=${token}`

  const delivery = await sendMail({
    to: email,
    subject: 'Confirm your PYPC subscription',
    text: [
      'Thank you for asking to hear from the Pakistan Youth Parliamentary Council.',
      '',
      'Confirm this address by opening the link below. Until you do, we will not send you anything:',
      confirmUrl,
      '',
      `If you did not request this, ignore this message and nothing will be sent. Questions: ${CONTACT_EMAIL}`,
      '',
      'Pakistan Youth Parliamentary Council · Islamabad'
    ].join('\n')
  }).catch(() => ({ delivered: false }))

  await recordAudit({
    actorEmail: email,
    action: 'NEWSLETTER_SUBSCRIBE_REQUESTED',
    entityType: 'NewsletterSubscriber',
    entityId: subscriber.id,
    metadata: { interests, delivered: Boolean((delivery as { delivered?: boolean })?.delivered) },
    request
  })

  return NextResponse.json(
    {
      ok: true,
      status: 'PENDING',
      message: 'Check your inbox: we have sent a confirmation link. Nothing is sent until you click it.',
      // Development convenience only — never included in production, because the
      // link must come from the mailbox to prove the mailbox exists.
      ...(process.env.NODE_ENV !== 'production' && !(delivery as { delivered?: boolean })?.delivered
        ? { devConfirmUrl: confirmUrl }
        : {})
    },
    { status: 201 }
  )
}

/** Confirmation and unsubscribe links land here. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  const unsubscribe = url.searchParams.get('unsubscribe')

  if (unsubscribe) {
    const removed = await prisma.newsletterSubscriber
      .update({ where: { token: unsubscribe }, data: { status: 'UNSUBSCRIBED' } })
      .catch(() => null)

    await recordAudit({
      actorEmail: removed?.email ?? null,
      action: 'NEWSLETTER_UNSUBSCRIBED',
      entityType: 'NewsletterSubscriber',
      entityId: removed?.id ?? null,
      request
    })

    return NextResponse.redirect(new URL(`/news?unsubscribed=1`, request.url))
  }

  if (!token) {
    return NextResponse.json({ error: 'A token is required.' }, { status: 400 })
  }

  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { token } })
  if (!subscriber) {
    return NextResponse.json({ error: 'That confirmation link is not valid or has already been used.' }, { status: 404 })
  }

  await prisma.newsletterSubscriber.update({
    where: { token },
    data: { status: 'CONFIRMED', confirmedAt: new Date() }
  })

  await recordAudit({
    actorEmail: subscriber.email,
    action: 'NEWSLETTER_CONFIRMED',
    entityType: 'NewsletterSubscriber',
    entityId: subscriber.id,
    request
  })

  return NextResponse.redirect(new URL('/news?subscribed=1', request.url))
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
