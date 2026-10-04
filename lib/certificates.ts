import 'server-only'

import crypto from 'node:crypto'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'

/**
 * Certificate + QR verification utilities.
 *
 * Every issued certificate receives a unique code in the form
 * PYPC-XXXX-XXXX-XXXX. The QR image encodes the public verification URL:
 *   {APP_URL}/verify/{CODE}
 * so scanning the printed certificate opens the live verification record.
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no confusing 0/O/1/I

export function generateCertificateCode() {
  const block = () =>
    Array.from({ length: 4 }, () => ALPHABET[crypto.randomInt(0, ALPHABET.length)]).join('')
  return `PYPC-${block()}-${block()}-${block()}`
}

export function normaliseCertificateCode(input: string) {
  const compact = input.trim().toUpperCase().replace(/[\s-]+/g, '')
  if (/^PYPC[A-Z0-9]{12}$/.test(compact)) {
    return [compact.slice(0, 4), compact.slice(4, 8), compact.slice(8, 12), compact.slice(12)].join('-')
  }
  return input.trim().toUpperCase().replace(/\s+/g, '')
}

export function verificationUrl(code: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/verify/${code}`
}

export async function certificateQrDataUrl(code: string, size = 260) {
  return QRCode.toDataURL(verificationUrl(code), {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f4c3a', light: '#ffffff' }
  })
}

export async function certificateQrSvg(code: string) {
  return QRCode.toString(verificationUrl(code), { type: 'svg', margin: 1 })
}

export type VerificationResult = {
  found: boolean
  code: string
  status?: string
  certificate?: {
    id: string
    code: string
    title: string
    recipientName: string
    description: string
    grade: string | null
    issueDate: Date
    expiresAt: Date | null
    status: string
    revokedReason: string | null
    programme: string | null
    event: string | null
    issuedBy: string | null
    verificationCount: number
  }
}

/** Public verification lookup. Increments the verification counter + timestamp. */
export async function verifyCertificate(rawCode: string): Promise<VerificationResult> {
  const code = normaliseCertificateCode(rawCode)
  if (!code) return { found: false, code }

  const certificate = await prisma.certificate.findUnique({
    where: { code },
    include: {
      programme: { select: { title: true } },
      event: { select: { title: true } },
      issuer: { select: { firstName: true, lastName: true, role: true } }
    }
  })

  if (!certificate) return { found: false, code }

  const expired =
    certificate.status === 'VALID' &&
    certificate.expiresAt !== null &&
    certificate.expiresAt.getTime() < Date.now()

  if (expired) {
    await prisma.certificate.update({
      where: { id: certificate.id },
      data: { status: 'EXPIRED' }
    })
  }

  await prisma.certificate.update({
    where: { id: certificate.id },
    data: {
      verificationCount: { increment: 1 },
      lastVerifiedAt: new Date()
    }
  })

  return {
    found: true,
    code,
    status: expired ? 'EXPIRED' : certificate.status,
    certificate: {
      id: certificate.id,
      code: certificate.code,
      title: certificate.title,
      recipientName: certificate.recipientName,
      description: certificate.description,
      grade: certificate.grade,
      issueDate: certificate.issueDate,
      expiresAt: certificate.expiresAt,
      status: expired ? 'EXPIRED' : certificate.status,
      revokedReason: certificate.revokedReason,
      programme: certificate.programme?.title ?? null,
      event: certificate.event?.title ?? null,
      issuedBy: certificate.issuer
        ? `${certificate.issuer.firstName} ${certificate.issuer.lastName}`
        : null,
      verificationCount: certificate.verificationCount + 1
    }
  }
}

export function certificateStatusTone(status: string) {
  switch (status) {
    case 'VALID':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'EXPIRED':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'REVOKED':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200'
  }
}
