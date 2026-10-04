import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { prisma } from '@/lib/prisma'
import { normaliseCertificateCode, verificationUrl } from '@/lib/certificates'
import { recordAudit } from '@/lib/audit'
import { getCurrentUser, isAdmin } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/certificates/pdf?code=PYPC-XXXX-XXXX-XXXX
 *
 * Renders an A4 landscape certificate PDF with the embedded QR code.
 * Access rule: the certificate holder, an admin, or the public if the
 * certificate is VALID (public documents are meant to be verifiable).
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = normaliseCertificateCode(url.searchParams.get('code') ?? '')
  if (!code) return NextResponse.json({ error: 'Certificate code required.' }, { status: 400 })

  const certificate = await prisma.certificate.findUnique({
    where: { code },
    include: {
      programme: { select: { title: true } },
      event: { select: { title: true } },
      user: { select: { id: true } }
    }
  })

  if (!certificate) return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 })

  const viewer = await getCurrentUser()
  const isOwner = viewer && certificate.user?.id === viewer.id
  const isStaffViewer = viewer ? isAdmin(viewer.role) : false

  if (!isOwner && !isStaffViewer && certificate.status !== 'VALID') {
    return NextResponse.json(
      { error: 'This certificate is not valid. Download is restricted.' },
      { status: 403 }
    )
  }

  // QR image (PNG bytes generated server-side).
  const QRCode = (await import('qrcode')).default
  const qrDataUrl = await QRCode.toDataURL(verificationUrl(certificate.code), {
    margin: 1,
    width: 320,
    errorCorrectionLevel: 'M'
  })
  const qrBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64')

  // Official PYPC emblem, embedded on the certificate when the asset is present.
  let emblemBytes: Buffer | null = null
  try {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    emblemBytes = await fs.readFile(
      path.join(process.cwd(), 'public', 'images', 'pypc-emblem-256.png')
    )
  } catch (error) {
    console.warn('[certificates/pdf] emblem asset unavailable, rendering text header only', error)
  }

  const pdf = await PDFDocument.create()
  pdf.setTitle(`${certificate.title} — ${certificate.code}`)
  pdf.setAuthor('Pakistan Youth Parliamentary Council')
  pdf.setSubject('Certificate issued by the Pakistan Youth Parliamentary Council')

  const page = pdf.addPage([842, 595]) // A4 landscape
  const { width, height } = page.getSize()

  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const oblique = await pdf.embedFont(StandardFonts.HelveticaOblique)

  const green = rgb(0.059, 0.298, 0.227)
  const gold = rgb(0.831, 0.686, 0.216)
  const slate = rgb(0.29, 0.36, 0.4)

  // Frame
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.996, 0.996, 0.996) })
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: green, borderWidth: 3 })
  page.drawRectangle({ x: 34, y: 34, width: width - 68, height: height - 68, borderColor: gold, borderWidth: 1 })

  const centre = (text: string, y: number, size: number, font = regular, color = slate) => {
    const textWidth = font.widthOfTextAtSize(text, size)
    page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color })
  }

  if (emblemBytes) {
    try {
      const emblem = await pdf.embedPng(emblemBytes)
      const emblemSize = 96
      page.drawImage(emblem, {
        x: (width - emblemSize) / 2,
        y: height - 108,
        width: emblemSize,
        height: emblemSize
      })
    } catch (error) {
      console.warn('[certificates/pdf] could not embed emblem', error)
    }
  }

  centre('PAKISTAN YOUTH PARLIAMENTARY COUNCIL', height - 126, 15, bold, green)
  centre('National, non-partisan youth platform  ·  Lead. Innovate. Reform. Inspire.', height - 146, 9, regular, slate)

  page.drawLine({ start: { x: width / 2 - 60, y: height - 162 }, end: { x: width / 2 + 60, y: height - 162 }, color: gold, thickness: 2 })

  centre('CERTIFICATE', height - 206, 30, bold, green)
  centre(certificate.title, height - 236, 13, bold, slate)

  centre('This is to certify that', height - 272, 11, oblique, slate)

  const recipient = certificate.recipientName
  centre(recipient, height - 310, 28, bold, green)

  page.drawLine({ start: { x: width / 2 - 210, y: height - 322 }, end: { x: width / 2 + 210, y: height - 322 }, color: rgb(0.85, 0.87, 0.86), thickness: 1 })

  // Word-wrap the description.
  const maxWidth = 470
  const words = certificate.description.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (regular.widthOfTextAtSize(candidate, 11) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)

  lines.slice(0, 4).forEach((line, index) => {
    centre(line, height - 346 - index * 16, 10.5, regular, slate)
  })

  const issuedOn = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(certificate.issueDate)
  const scope = certificate.programme?.title ?? certificate.event?.title ?? 'PYPC Programme'

  page.drawText(`Programme / Activity: ${scope}`, { x: 70, y: 132, size: 10, font: regular, color: slate })
  page.drawText(`Issue date: ${issuedOn}`, { x: 70, y: 114, size: 10, font: regular, color: slate })
  if (certificate.grade) {
    page.drawText(`Grade / Distinction: ${certificate.grade}`, { x: 70, y: 96, size: 10, font: regular, color: slate })
  }
  page.drawText(`Verification code: ${certificate.code}`, { x: 70, y: 78, size: 11, font: bold, color: green })

  // QR + verification panel
  const qrImage = await pdf.embedPng(qrBytes)
  const qrSize = 118
  page.drawImage(qrImage, { x: width - 200, y: 84, width: qrSize, height: qrSize })
  page.drawText('Scan to verify', { x: width - 196, y: 66, size: 9, font: bold, color: green })

  page.drawText('Authorised signature', { x: width - 400, y: 132, size: 10, font: regular, color: slate })
  page.drawLine({ start: { x: width - 400, y: 126 }, end: { x: width - 250, y: 126 }, color: slate, thickness: 0.8 })
  page.drawText('PYPC National Secretariat', { x: width - 396, y: 110, size: 9, font: oblique, color: slate })

  if (certificate.status !== 'VALID') {
    page.drawText(`STATUS: ${certificate.status}`, {
      x: width / 2 - 70,
      y: height - 262,
      size: 12,
      font: bold,
      color: rgb(0.75, 0.16, 0.22)
    })
  }

  const pdfBytes = await pdf.save()

  await prisma.certificate.update({
    where: { id: certificate.id },
    data: { downloadCount: { increment: 1 } }
  })

  await recordAudit({
    actorId: viewer?.id ?? null,
    actorEmail: viewer?.email ?? null,
    action: 'CERTIFICATE_DOWNLOADED',
    entityType: 'Certificate',
    entityId: certificate.id,
    request
  })

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${certificate.code}.pdf"`,
      'Cache-Control': 'no-store'
    }
  })
}
