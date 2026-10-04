import { CONTACT_EMAIL } from '@/lib/constants'
import 'server-only'

import nodemailer, { type Transporter } from 'nodemailer'
import { prisma } from '@/lib/prisma'

/**
 * Outbound mail.
 *
 * Two transports:
 *  - `smtp`  — a real SMTP server (SMTP_HOST/USER/PASSWORD configured).
 *  - `dev`   — no SMTP configured. Mail is written to the EmailOutbox table and
 *              logged, and *only* when EMAIL_DEV_MODE=true is the content also
 *              returned to the caller so the signup flow can be exercised
 *              locally. In production with SMTP unset, verification email simply
 *              cannot be delivered and the platform says so instead of silently
 *              letting unverified accounts in.
 *
 * Every message is recorded in EmailOutbox regardless of transport, so the
 * secretariat always has an auditable trail of what the platform sent.
 */

export type MailMode = 'smtp' | 'dev'

export function mailMode(): MailMode {
  return process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD ? 'smtp' : 'dev'
}

/**
 * True only when mail falls back to dev mode AND the deployment explicitly
 * opted in. Never true on a production deployment that has SMTP configured.
 */
export function devMailVisible() {
  const flag = (process.env.EMAIL_DEV_MODE ?? '').toLowerCase() === 'true'
  return flag && process.env.NODE_ENV !== 'production' && mailMode() === 'dev'
}

let cachedTransporter: Transporter | null = null

function transporter(): Transporter | null {
  if (mailMode() !== 'smtp') return null
  if (cachedTransporter) return cachedTransporter

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
    pool: true,
    maxConnections: 3
  })

  return cachedTransporter
}

/**
 * Sender identity. Defaults to the secretariat's real mailbox so that mail sent
 * through Gmail SMTP (or any relay that enforces sender alignment) is accepted
 * and passes DMARC. Override with EMAIL_FROM when a custom domain is used.
 */
export const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? `PYPC Secretariat <${CONTACT_EMAIL}>`

export type SendMailInput = {
  to: string
  subject: string
  text: string
  html?: string
  userId?: string
}

export type SendMailResult = {
  ok: boolean
  transport: MailMode
  error?: string
  outboxId?: string
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const transport = mailMode()

  const record = await prisma.emailOutbox
    .create({
      data: {
        userId: input.userId ?? null,
        to: input.to,
        subject: input.subject,
        body: input.text,
        transport,
        status: transport === 'smtp' ? 'QUEUED' : process.env.NODE_ENV === 'production' ? 'FAILED' : 'SENT',
        sentAt: transport === 'smtp' || process.env.NODE_ENV === 'production' ? null : new Date()
      }
    })
    .catch(() => null)

  if (transport === 'dev') {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, transport, error: 'Email delivery is not configured. Please contact support.', outboxId: record?.id }
    }
    console.info(
      `[email:dev] to=${input.to} subject="${input.subject}"\n${input.text}\n--- end of message ---`
    )
    return { ok: true, transport, outboxId: record?.id }
  }

  try {
    const client = transporter()
    if (!client) throw new Error('SMTP transport unavailable')

    await client.sendMail({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? undefined
    })

    if (record) {
      await prisma.emailOutbox
        .update({ where: { id: record.id }, data: { status: 'SENT', sentAt: new Date() } })
        .catch(() => undefined)
    }

    return { ok: true, transport, outboxId: record?.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error'
    console.error('[email:smtp] delivery failed', message)

    if (record) {
      await prisma.emailOutbox
        .update({ where: { id: record.id }, data: { status: 'FAILED', error: message } })
        .catch(() => undefined)
    }

    return { ok: false, transport, error: message, outboxId: record?.id }
  }
}

/**
 * Human-readable status used by the UI and the admin panel, so nobody has to
 * guess whether verification email can actually leave the building.
 */
export function mailStatus() {
  const transport = mailMode()
  return {
    transport,
    from: FROM_ADDRESS,
    devVisible: devMailVisible(),
    message:
      transport === 'smtp'
        ? 'Verification emails are delivered by the configured SMTP server.'
        : 'SMTP is not configured on this deployment. Messages are stored in the outbox and logged.' +
          (devMailVisible()
            ? ' EMAIL_DEV_MODE is on, so the verification code is also shown on screen for local testing.'
            : ' Set SMTP_HOST/SMTP_USER/SMTP_PASSWORD (and EMAIL_DEV_MODE=false) in production.')
  }
}
