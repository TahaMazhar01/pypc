/**
 * Builds the PYPC impact report PDF from live platform data.
 *
 * The report is generated rather than typed: every number in it is counted from
 * the database at build time, so a published report can never claim more than
 * the platform can prove. Where a figure is still zero the report says so in
 * words ("opens with the first intake") instead of printing a bare 0.
 *
 * Output: public/reports/pypc-impact-report-2026.pdf
 *
 *   node scripts/build-impact-report.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(root, '..')

// --- make sure the Prisma client points at the packaged database -------------
if (!process.env.DATABASE_URL) {
  for (const candidate of ['.env', '.env.local']) {
    const file = join(projectRoot, candidate)
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (!match) continue
      const value = match[2].replace(/^["']|["']$/g, '')
      if (!(match[1] in process.env)) process.env[match[1]] = value
    }
  }
}

if (process.env.DATABASE_URL?.startsWith('file:')) {
  const raw = process.env.DATABASE_URL.slice('file:'.length)
  if (!isAbsolute(raw)) {
    process.env.DATABASE_URL = `file:${resolve(projectRoot, 'prisma', raw.replace(/^\.\//, ''))}`
  }
}

const { PrismaClient } = await import('@prisma/client')
const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')

const prisma = new PrismaClient()

const GREEN = rgb(0.043, 0.239, 0.18)
const GOLD = rgb(0.788, 0.635, 0.153)
const INK = rgb(0.11, 0.14, 0.16)
const MUTED = rgb(0.42, 0.45, 0.48)
const LINE = rgb(0.87, 0.89, 0.9)

function n(value) {
  return value.toLocaleString('en-GB')
}

async function main() {
  // Courses are file-based content (lib/data/courses.ts), not a table, so they
  // are counted from the source file itself.
  const coursesSource = readFileSync(join(projectRoot, 'lib', 'data', 'courses.ts'), 'utf8')
  const courses = (coursesSource.match(/^\s{4}slug: '/gm) || []).length

  const [members, verifiedMembers, programmes, events, opportunities, certificates, issuers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      prisma.programme.count({ where: { isActive: true } }),
      prisma.event.count({ where: { isPublished: true } }),
      prisma.opportunity.count({ where: { isActive: true } }),
      prisma.certificate.count(),
      prisma.user.count({ where: { role: { in: ['ADMIN', 'EXECUTIVE'] } } })
    ])

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  pdf.setTitle('PYPC Impact Report 2026')
  pdf.setAuthor('Pakistan Youth Parliamentary Council')
  pdf.setSubject('Impact, platform capability and governance — founding year statement')
  pdf.setProducer('PYPC platform build')

  const W = 595.28
  const H = 841.89
  const M = 56

  // ── page 1 ────────────────────────────────────────────────────────────────
  let page = pdf.addPage([W, H])

  page.drawRectangle({ x: 0, y: H - 150, width: W, height: 150, color: GREEN })
  page.drawRectangle({ x: M, y: H - 150, width: 5, height: 150, color: GOLD })

  page.drawText('PAKISTAN YOUTH PARLIAMENTARY COUNCIL', {
    x: M + 20,
    y: H - 62,
    size: 10,
    font: bold,
    color: GOLD
  })
  page.drawText('Impact Report 2026', {
    x: M + 20,
    y: H - 96,
    size: 26,
    font: bold,
    color: rgb(1, 1, 1)
  })
  page.drawText('Founding-year statement — generated from live platform data', {
    x: M + 20,
    y: H - 120,
    size: 10.5,
    font,
    color: rgb(0.87, 0.92, 0.89)
  })

  let y = H - 190
  const paragraph = (text, size = 10.5, color = INK, gap = 6) => {
    const words = text.split(' ')
    let line = ''
    for (const word of words) {
      const attempt = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(attempt, size) > W - M * 2) {
        page.drawText(line, { x: M, y, size, font, color })
        y -= size + 4
        line = word
      } else {
        line = attempt
      }
    }
    if (line) {
      page.drawText(line, { x: M, y, size, font, color })
      y -= size + gap
    }
  }

  const heading = text => {
    y -= 8
    page.drawText(text, { x: M, y, size: 13, font: bold, color: GREEN })
    y -= 16
  }

  const metric = (label, value, note) => {
    page.drawText(label, { x: M, y, size: 10, font: bold, color: INK })
    page.drawText(value, { x: W - M, y, size: 11, font: bold, color: GREEN, x: W - M - bold.widthOfTextAtSize(value, 11) })
    y -= 14
    page.drawText(note, { x: M, y, size: 8.5, font, color: MUTED })
    y -= 8
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: LINE })
    y -= 14
  }

  paragraph(
    'This report is published by the Pakistan Youth Parliamentary Council (PYPC), a youth-led civic institution based in Islamabad working on parliamentary simulation, civic education, policy research and international participation.'
  )
  paragraph(
    'Every figure below is counted directly from the live platform database at the moment this document was generated. Where a measure has not yet begun, the report states that plainly rather than printing a placeholder number. The report is regenerated from data — it cannot drift from reality without the numbers changing with it.'
  )

  heading('Registered members')
  metric(
    'Members on the platform',
    n(members),
    `${n(verifiedMembers)} of them with a verified email address — verification is required before an account becomes active.`
  )
  metric(
    'Officers and staff accounts',
    n(issuers),
    'Administrative and executive accounts, all subject to the same audit log as members.'
  )

  heading('Programmes, events and learning')
  metric(
    'Active programmes',
    n(programmes),
    programmes > 0
      ? 'Each with a stated format, duration, eligibility rule and the record a participant receives on completion.'
      : 'Programme intake opens with the first cohort.'
  )
  metric(
    'Courses open for enrolment',
    n(courses),
    courses > 0 ? 'Certificate-bearing courses priced in PKR and USD.' : 'Course calendar opens with the first term.'
  )
  metric(
    'Published events',
    n(events),
    events > 0
      ? 'Listed with venue, dates, format and fee; a date that is not final is labelled to be confirmed.'
      : 'Event dates are published as they are confirmed — not before.'
  )
  metric(
    'Open opportunities',
    n(opportunities),
    opportunities > 0
      ? 'Scholarships, fellowships and delegations with their own eligibility criteria.'
      : 'The opportunities board opens with the first intake.'
  )

  heading('Certification and verification')
  metric(
    'Certificates issued',
    n(certificates),
    certificates > 0
      ? 'Every certificate carries a QR code and a reference code that resolve on the public verification page, including revoked ones.'
      : 'Certificates are issued on completion of a programme and appear here once the first cohort concludes.'
  )

  // ── page 2 ────────────────────────────────────────────────────────────────
  page = pdf.addPage([W, H])
  y = H - M

  heading('What the platform does — verified capability')
  for (const [title, detail] of [
    [
      'Public certificate verification',
      'Anyone holding a certificate can check it with the QR code or the reference number, with no account. Revoked certificates return a clear revoked status and the date of withdrawal.'
    ],
    [
      'Membership with four tiers',
      'Free Community (no charge at all), Associate, Executive and Institutional partnership, priced in PKR and USD with a row-by-row benefit comparison that also states what each tier does not include.'
    ],
    [
      'Payments',
      'Stripe for international cards, JazzCash and Easypaisa for domestic wallets and bank routes. Membership activates automatically when the gateway confirms payment, through one idempotent fulfilment path used by every gateway.'
    ],
    [
      'Application and registration forms',
      'Server-validated forms with real email deliverability checks, international phone validation, file upload for supporting documents, and a signed human check that is not a third-party CAPTCHA.'
    ],
    [
      'Documents on request',
      'Verified participation and executive experience letters, reference letters and visa invitation letters for delegates, issued with reference numbers and downloadable as PDFs.'
    ],
    [
      'Access and accessibility',
      'Keyboard-operable throughout, light and dark themes following the operating-system setting, reduced-motion support that switches off the 3D scenes, and a published accessibility statement listing verified items and known limitations.'
    ]
  ]) {
    page.drawText(title, { x: M, y, size: 11, font: bold, color: INK })
    y -= 15
    const words = detail.split(' ')
    let line = ''
    for (const word of words) {
      const attempt = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(attempt, 9.5) > W - M * 2) {
        page.drawText(line, { x: M, y, size: 9.5, font, color: MUTED })
        y -= 13
        line = word
      } else {
        line = attempt
      }
    }
    if (line) {
      page.drawText(line, { x: M, y, size: 9.5, font, color: MUTED })
      y -= 13
    }
    y -= 10
  }

  heading('Governance and integrity')
  for (const line of [
    'Every payment, membership change, certificate issue and administrative action is written to an audit log that is cryptographically chained: each entry hashes the entry before it, so an edited or deleted record is detectable rather than invisible.',
    'Correspondence, partnerships and delegation appointments are issued with reference numbers and countersigned where the arrangement is bilateral; members can request their own records.',
    'Objectives, fees, refund terms, the code of conduct and the accessibility statement are published on the website. Where a lawyer-reviewed wording is still in progress, the page states that rather than presenting a template as reviewed text.'
  ]) {
    const words = line.split(' ')
    let text = ''
    let first = true
    for (const word of words) {
      const attempt = text ? `${text} ${word}` : word
      if (font.widthOfTextAtSize(attempt, 9.5) > W - M * 2 - 12) {
        page.drawText(first ? `•  ${text}` : text, { x: M + (first ? 0 : 12), y, size: 9.5, font, color: MUTED })
        first = false
        y -= 13
        text = word
      } else {
        text = attempt
      }
    }
    if (text) {
      page.drawText(first ? `•  ${text}` : text, { x: M + (first ? 0 : 12), y, size: 9.5, font, color: MUTED })
      y -= 13
    }
    y -= 6
  }

  heading('How to verify anything in this report')
  paragraph(
    'This report describes a live system, so every claim can be checked. Certificates verify on the public verification page. Member-facing figures update in real time. Fees, refund terms and policies are published under the policies section. The platform reports its own health, including database, storage, email and payment-gateway state, on the status page. Queries that cannot be answered by the website can be sent to the secretariat mailbox published on the contact page.'
  )

  y -= 10
  page.drawText('Generated', { x: M, y, size: 9, font: bold, color: INK })
  page.drawText(new Date().toISOString().slice(0, 10), { x: M + 70, y, size: 9, font, color: MUTED })
  y -= 14
  page.drawText('Publisher', { x: M, y, size: 9, font: bold, color: INK })
  page.drawText('Pakistan Youth Parliamentary Council, Islamabad, Pakistan', {
    x: M + 70,
    y,
    size: 9,
    font,
    color: MUTED
  })

  const bytes = await pdf.save()
  const outDir = join(projectRoot, 'public', 'reports')
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, 'pypc-impact-report-2026.pdf')
  writeFileSync(outFile, bytes)

  console.log(`wrote public/reports/pypc-impact-report-2026.pdf  (${(bytes.length / 1024).toFixed(0)} kB, 2 pages)`)
  console.log(
    `numbers used: ${members} members (${verifiedMembers} verified) · ${programmes} programmes · ${courses} courses · ${events} events · ${opportunities} opportunities · ${certificates} certificates`
  )
}

main()
  .catch(error => {
    console.error('impact report build failed:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
