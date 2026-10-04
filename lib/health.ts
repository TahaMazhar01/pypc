/**
 * Live system health — the same picture the support desk needs when a member
 * says "the site is not working".
 *
 * Everything here is read-only and contains **no secrets**: statuses, counts and
 * booleans only. It is used by the public `/status` page, by
 * `GET /api/status`, and by `npm run check:health`.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { prisma } from '@/lib/prisma'
import { cloudUploadsConfigured } from '@/lib/uploads'
import { list } from '@vercel/blob'
import { mailStatus } from '@/lib/email/mailer'
import { getGatewayStatuses } from '@/lib/payments'

export type HealthState = 'ok' | 'warn' | 'fail'

export type HealthCheck = {
  id: string
  label: string
  state: HealthState
  /** One line a non-technical person can act on. */
  detail: string
  /** Optional extra rows (label → value). */
  facts?: { label: string; value: string }[]
}

export type HealthReport = {
  generatedAt: string
  overall: HealthState
  checks: HealthCheck[]
  environment: { label: string; value: string }[]
}

const UPLOAD_DIR = path.join(process.cwd(), 'private', 'uploads', 'resumes')
const CERT_DIR = path.join(process.cwd(), 'private', 'certificates')

function worst(states: HealthState[]): HealthState {
  if (states.includes('fail')) return 'fail'
  if (states.includes('warn')) return 'warn'
  return 'ok'
}

export async function collectSystemHealth(): Promise<HealthReport> {
  const checks: HealthCheck[] = []

  // ---------------------------------------------------------------- database
  try {
    const [users, verified, plans, programmes, events, opportunities, certificates, orders, applications] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
        prisma.membershipPlan.count({ where: { isActive: true } }),
        prisma.programme.count({ where: { isActive: true } }),
        prisma.event.count({ where: { isPublished: true } }),
        prisma.opportunity.count({ where: { isActive: true } }),
        prisma.certificate.count(),
        prisma.order.count(),
        prisma.application.count()
      ])

    const seeded = plans > 0 && programmes > 0
    checks.push({
      id: 'database',
      label: 'Database',
      state: seeded ? 'ok' : 'warn',
      detail: seeded
        ? 'Connected. The site content below is served from these records, live.'
        : 'Connected, but the content tables look empty. Run `npm run db:seed` to load the plans and programmes.',
      facts: [
        { label: 'Members', value: `${users} (${verified} verified)` },
        { label: 'Membership plans', value: String(plans) },
        { label: 'Programmes', value: String(programmes) },
        { label: 'Events', value: String(events) },
        { label: 'Opportunities', value: String(opportunities) },
        { label: 'Certificates', value: String(certificates) },
        { label: 'Orders / applications', value: `${orders} / ${applications}` }
      ]
    })
  } catch (error) {
    checks.push({
      id: 'database',
      label: 'Database',
      state: 'fail',
      detail:
        'The database could not be reached. Check DATABASE_URL in .env, then run `npx prisma db push` and `npm run db:seed`.',
      facts: [{ label: 'Error', value: error instanceof Error ? error.message.slice(0, 160) : 'unknown' }]
    })
  }

  // ------------------------------------------------------------ email delivery
  const mail = mailStatus()
  checks.push({
    id: 'email',
    label: 'Email delivery',
    state: mail.transport === 'smtp' ? 'ok' : 'warn',
    detail: mail.message,
    facts: [
      { label: 'Transport', value: mail.transport },
      { label: 'From address', value: mail.from },
      { label: 'Development codes on screen', value: mail.devVisible ? 'yes (EMAIL_DEV_MODE=true)' : 'no' }
    ]
  })

  // ------------------------------------------------------------------ storage
  try {
    if (cloudUploadsConfigured()) {
      await list({ prefix: 'resumes/', limit: 1 })
      checks.push({ id: 'storage', label: 'Private document storage', state: 'ok',
        detail: 'Private cloud storage is connected. Documents are served only to their owner or authorised staff.' })
    } else {
      if (process.env.VERCEL) throw new Error('Private cloud storage is not configured.')
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
      await fs.mkdir(CERT_DIR, { recursive: true })
      const probe = path.join(UPLOAD_DIR, `.write-test-${Date.now()}`)
      await fs.writeFile(probe, 'ok')
      await fs.unlink(probe)

      const resumes = existsSync(UPLOAD_DIR)
        ? readdirSync(UPLOAD_DIR).filter(name => !name.startsWith('.')).length
        : 0
      const certificates = existsSync(CERT_DIR) ? readdirSync(CERT_DIR).filter(n => !n.startsWith('.')).length : 0

      checks.push({
        id: 'storage',
        label: 'Private document storage',
        state: 'ok',
        detail:
          'Writable, and deliberately outside the public web root — CVs and generated certificates are only served through an authenticated route.',
        facts: [
          { label: 'Uploaded CVs', value: String(resumes) },
          { label: 'Generated certificate files', value: String(certificates) },
          { label: 'Location', value: 'private/uploads/resumes' }
        ]
      })
    }
  } catch (error) {
    checks.push({
      id: 'storage',
      label: 'Private document storage',
      state: 'fail',
      detail:
        'Private document storage is unavailable. Check the cloud storage connection or local folder permissions.',
      facts: [{ label: 'Error', value: error instanceof Error ? error.message.slice(0, 160) : 'unknown' }]
    })
  }

  // ----------------------------------------------------------------- gateways
  const gateways = getGatewayStatuses()
  const configured = gateways.filter(gateway => gateway.configured)
  checks.push({
    id: 'payments',
    label: 'Payment gateways',
    state: configured.length > 1 ? 'ok' : 'warn',
    detail:
      'A gateway is offered only when its credentials exist; otherwise checkout says exactly which variable is missing. Nothing pretends to charge.',
    facts: gateways.map(gateway => ({
      label: gateway.label,
      value: gateway.configured ? `configured · ${gateway.currencies.join('/')}` : 'add credentials in .env'
    }))
  })

  // ------------------------------------------------------------------ assets
  const emblem = path.join(process.cwd(), 'public', 'images', 'pypc-emblem.png')
  const emblemDark = path.join(process.cwd(), 'public', 'images', 'pypc-emblem-on-dark.png')
  const documents = existsSync(path.join(process.cwd(), 'public', 'documents'))
    ? readdirSync(path.join(process.cwd(), 'public', 'documents')).filter(name => name.endsWith('.pdf')).length
    : 0

  checks.push({
    id: 'assets',
    label: 'Branding and institutional documents',
    state: emblem && documents > 0 ? 'ok' : 'warn',
    detail:
      documents > 0
        ? 'The official emblem (light and dark variants) and the PYPC document library are present and downloadable.'
        : 'The emblem or the document library is missing from public/. Re-extract the package.',
    facts: [
      { label: 'Emblem (light / dark)', value: `${existsSync(emblem) ? 'present' : 'missing'} / ${existsSync(emblemDark) ? 'present' : 'missing'}` },
      { label: 'Institutional PDFs', value: String(documents) }
    ]
  })

  // ---------------------------------------------------------------- runtime
  let version = '1.0.0'
  try {
    // Read the manifest rather than require() it: this runs on the server, and a
    // plain read keeps the file out of the module graph.
    const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
      version?: string
    }
    version = manifest.version ?? version
  } catch {
    // A missing manifest is not worth failing the page over.
  }

  const environment = [
    { label: 'Application version', value: version },
    { label: 'Node.js', value: process.version },
    { label: 'Environment', value: process.env.NODE_ENV ?? 'development' },
    { label: 'Site URL', value: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000' },
    { label: 'Payment simulation', value: process.env.PAYMENTS_SIMULATION_MODE === 'true' ? 'enabled (development)' : 'disabled' },
    { label: 'Proxy header trust', value: process.env.TRUST_PROXY_HEADERS === 'false' ? 'off (direct exposure)' : 'on (behind a proxy)' }
  ]

  return {
    generatedAt: new Date().toISOString(),
    overall: worst(checks.map(check => check.state)),
    checks,
    environment
  }
}
