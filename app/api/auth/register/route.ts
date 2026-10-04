import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { registerSchema } from '@/lib/validations'
import { humanCheckRequired, verifyHumanCheck } from '@/lib/security/human-check'
import { notify, recordAudit } from '@/lib/audit'
import { assessEmail } from '@/lib/validation/email-server'
import { checkPhone } from '@/lib/validation/phone'
import { findCountry } from '@/lib/data/countries'
import { issueEmailVerification, devMailVisible } from '@/lib/auth/verification'
import { mailStatus } from '@/lib/email/mailer'
import { checkRateLimit, clientIp, isSameOrigin, crossOriginResponse, tooManyRequests } from '@/lib/security/request'
import { CONTACT_EMAIL } from '@/lib/constants'

/** Minimum time a human needs to fill the form; bots submit instantly. */
const MIN_FILL_MS = 2500
const MAX_FORM_AGE_MS = 6 * 60 * 60 * 1000

/**
 * POST /api/auth/register
 *
 * Creates a **pending** account and emails a verification code. No session is
 * issued and no access is granted until the email address is proven, because an
 * unverified address cannot be trusted for certificates or payment receipts.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  const ip = clientIp(request)

  // Five signups per IP per hour, and three per email address per hour.
  const ipLimit = await checkRateLimit({ scope: 'register:ip', identity: ip, limit: 5, windowSeconds: 3600 })
  if (!ipLimit.allowed) {
    return tooManyRequests(
      ipLimit.retryAfterSeconds,
      `Too many sign-up attempts from this connection. Please try again later or contact ${CONTACT_EMAIL}.`
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    const flattened = parsed.error.flatten()
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Please correct the highlighted fields.',
        fieldErrors: flattened.fieldErrors as Record<string, string[]>
      },
      { status: 422 }
    )
  }

  const data = parsed.data

  // --- Bot defences -------------------------------------------------------
  // 1. Human check: a signed, server-issued arithmetic question. See
  //    lib/security/human-check.ts for why this is self-hosted.
  if (humanCheckRequired()) {
    const raw = body as Record<string, unknown>
    const human = verifyHumanCheck(raw?.humanToken, raw?.humanAnswer)
    if (!human.ok) {
      return NextResponse.json({ error: human.reason, humanCheckFailed: true }, { status: 400 })
    }
  }

  // 2. Honeypot field: a real visitor never sees it, a naive bot fills it.
  if ((data.companyWebsite ?? '').trim().length > 0) {
    // Silently accept and discard, so scripts cannot tell they were detected.
    return NextResponse.json({ ok: true, requiresVerification: true, email: data.email }, { status: 201 })
  }

  if (data.formOpenedAt) {
    const elapsed = Date.now() - data.formOpenedAt
    if (elapsed < MIN_FILL_MS || elapsed > MAX_FORM_AGE_MS) {
      return NextResponse.json(
        { error: 'The form was submitted too quickly to be genuine. Please try again.' },
        { status: 422 }
      )
    }
  }

  const emailLimit = await checkRateLimit({
    scope: 'register:email',
    identity: data.email,
    limit: 3,
    windowSeconds: 3600
  })
  if (!emailLimit.allowed) {
    return tooManyRequests(
      emailLimit.retryAfterSeconds,
      'This email address has already been used for several sign-up attempts. Check your inbox, or request a new code from the verify page.'
    )
  }

  // --- Real email checks (syntax, policy and DNS MX) ----------------------
  const emailCheck = await assessEmail(data.email, { strictDeliverability: true })
  if (!emailCheck.ok) {
    return NextResponse.json(
      { error: emailCheck.reason ?? 'Enter a valid email address.', fieldErrors: { email: [emailCheck.reason ?? 'Invalid email address.'] } },
      { status: 422 }
    )
  }

  // --- Phone check (redundant with zod, but the route is the last line of defence)
  const phoneCheck = checkPhone(data.phone, data.phoneCountry)
  if (!phoneCheck.ok) {
    return NextResponse.json(
      { error: phoneCheck.reason, fieldErrors: { phone: [phoneCheck.reason] } },
      { status: 422 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email: emailCheck.email } })

  if (existing) {
    // An account that exists but was never verified can be re-sent instead of
    // dead-ending the visitor. The message is deliberately non-committal so the
    // endpoint cannot be used to enumerate registered addresses.
    if (!existing.emailVerifiedAt) {
      const verification = await issueEmailVerification({
        userId: existing.id,
        email: existing.email,
        firstName: existing.firstName,
        purpose: 'RESEND',
        ip,
        userAgent: request.headers.get('user-agent') ?? undefined,
        resend: true
      })

      return NextResponse.json(
        {
          ok: true,
          requiresVerification: true,
          email: existing.email,
          alreadyRegistered: true,
          message:
            'This address already has a pending account. We have emailed a fresh verification code.',
          delivery: deliveryNotice(verification.delivered),
          devCode: devMailVisible() ? verification.code : undefined,
          devLink: devMailVisible() ? verification.link : undefined
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        error:
          'An account already exists with this email address. Please sign in, or use “Forgot password” if you cannot get in.',
        fieldErrors: { email: ['This email address is already registered.'] }
      },
      { status: 409 }
    )
  }

  try {
    const country = findCountry(data.country)
    const dialCountry = findCountry(phoneCheck.countryIso)

    const user = await prisma.user.create({
      data: {
        email: emailCheck.email,
        passwordHash: hashPassword(data.password),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: phoneCheck.e164,
        phoneCountry: dialCountry?.iso2 ?? null,
        country: country?.iso2 ?? null,
        countryName: country?.name ?? null,
        city: data.city || null,
        province: data.province || null,
        institution: data.institution || null,
        profession: data.profession || null,
        role: 'MEMBER',
        // Locked until the email address is verified.
        status: 'PENDING'
      }
    })

    const verification = await issueEmailVerification({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      purpose: 'SIGNUP',
      ip,
      userAgent: request.headers.get('user-agent') ?? undefined
    })

    await notify({
      userId: user.id,
      title: 'Verify your email to activate your account',
      body: `We sent a six-digit code to ${user.email}. It expires in ${verification.expiresMinutes} minutes.`,
      type: 'INFO',
      href: '/verify-email'
    })

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'USER_REGISTERED_PENDING_VERIFICATION',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        country: country?.iso2,
        phoneCountry: dialCountry?.iso2,
        deliverability: emailCheck.deliverability,
        mailTransport: verification.transport
      },
      request
    })

    return NextResponse.json(
      {
        ok: true,
        requiresVerification: true,
        email: user.email,
        expiresMinutes: verification.expiresMinutes,
        delivery: deliveryNotice(verification.delivered),
        warnings: emailCheck.warnings,
        // Present only when SMTP is absent AND EMAIL_DEV_MODE=true (local testing).
        devCode: devMailVisible() ? verification.code : undefined,
        devLink: devMailVisible() ? verification.link : undefined
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    console.error('[register]', error)

    if (message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'That email address was registered a moment ago. Please sign in or verify your email.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Account could not be created right now. Please try again shortly.' },
      { status: 500 }
    )
  }
}

function deliveryNotice(delivered: boolean) {
  const status = mailStatus()
  if (delivered && status.transport === 'smtp') {
    return `Verification email sent from ${status.from}. Check your inbox and spam folder.`
  }
  if (delivered) {
    return 'SMTP is not configured on this deployment, so the message was stored in the outbox and logged server-side.'
  }
  return `The verification email could not be delivered — SMTP is not configured or rejected the message. Contact ${CONTACT_EMAIL}.`
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
