/**
 * Partnership / MoU request suite.
 *
 * Drives the real public API the way a university would — plain HTTP against a
 * running server — then inspects the database and the audit log to prove the
 * request was stored, referenced, emailed and made visible to staff.
 *
 *   BASE=http://127.0.0.1:3000 npm run check:partnerships
 *
 * What it proves:
 *   1. the public page renders and carries the process, the form and the honesty rule;
 *   2. a valid request is accepted, and the reference follows the PYPC-MOU- shape;
 *   3. the row is real: institution, contact, interests and status are stored as sent;
 *   4. the audit log carries PARTNERSHIP_REQUEST_RECEIVED with the reference;
 *   5. confirmation mails exist for the institution and the secretariat;
 *   6. every guard refuses correctly: honeypot, human check, bad email, missing
 *      interest, short proposal, missing consent, unverified-looking duplicates;
 *   7. a repeat request returns the same reference instead of opening a second case;
 *   8. a staff member can move the status, and the change is audited;
 *   9. an anonymous visitor cannot change a status;
 *  10. the admin console lists the request and the public page links to it.
 *
 * The account and request it creates are removed in the cleanup block, and the
 * audit rows it wrote are left in place — they are links in the hash chain and
 * are removed at packaging time by `db:clean:ship`, which rebuilds the chain.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const here = path.dirname(fileURLToPath(import.meta.url))
process.env.DATABASE_URL =
  process.env.DATABASE_URL || `file:${path.resolve(here, '..', 'prisma', 'dev.db')}`

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const prisma = new PrismaClient()

let passed = 0
let failed = 0
const failures = []

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1
    console.log(`PASS  ${name}${detail ? `  — ${detail}` : ''}`)
  } else {
    failed += 1
    failures.push(name)
    console.log(`FAIL  ${name}${detail ? `  — ${detail}` : ''}`)
  }
}

async function api(method, url, { body, cookie, headers = {} } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      origin: BASE,
      'content-type': 'application/json',
      'user-agent': 'pypc-partnerships/1.0',
      ...(cookie ? { cookie } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual'
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* not json */
  }
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  return {
    status: res.status,
    json,
    text,
    cookie: setCookie.map(c => c.split(';')[0]).join('; ') || cookie
  }
}

/** Solves the human check exactly as the browser widget does. */
async function humanCheckFields() {
  const res = await fetch(`${BASE}/api/human-check`)
  const data = await res.json()
  const match = /What is (\d+) \+ (\d+)\?/.exec(data.question)
  if (!match) throw new Error('human-check question not understood: ' + data.question)
  return { humanToken: data.token, humanAnswer: String(Number(match[1]) + Number(match[2])) }
}

const rnd = Math.random().toString(36).slice(2, 8)
const institution = `Test Institute of Policy ${rnd}`
const contactEmail = `partner.${rnd}@gmail.com`

const validRequest = {
  institutionName: institution,
  institutionType: 'UNIVERSITY',
  country: 'PK',
  city: 'Islamabad',
  website: 'https://example.edu.pk',
  contactName: 'Partnership Tester',
  contactRole: 'Registrar',
  contactEmail,
  phoneCountry: 'PK',
  phone: '+923001234567',
  interests: ['STUDENT_CHAPTER', 'MOU', 'RESEARCH'],
  studentsReached: 'about 1,200',
  message:
    'We would like to open a campus chapter and sign an MoU covering joint debates, a policy brief and summer placements for our students.',
  consent: true,
  companyWebsite: ''
}

try {
  console.log('\n== partnership / MoU request suite ==\n')
  console.log(`server  ${BASE}\n`)

  // This suite posts more often than any real visitor could, so it clears the
  // rate-limit buckets at each phase boundary — the same thing the registration
  // suite does. The limiter itself is asserted at the end, deliberately.
  const resetBuckets = async () => (await prisma.rateLimitCounter.deleteMany({})).count
  await resetBuckets()

  // ── 1. the public page ─────────────────────────────────────────────────────
  const page = await api('GET', '/partnerships')
  check('the partnerships page renders', page.status === 200, `status ${page.status}`)
  const html = page.text
  check('it names the request form', /Submit a partnership request/.test(html))
  check(
    'it publishes the five-step process with turnarounds',
    /The process, step by step/.test(html) && /Within 10 working days/.test(html)
  )
  check(
    'it states the partner-publication rule instead of showing invented logos',
    /only once an agreement has been countersigned/i.test(html)
  )
  check(
    'it links to the MoU template in the records register',
    /href="\/records"/.test(html)
  )
  check(
    'it carries structured data for the FAQ and the organisation',
    /"@type":"FAQPage"/.test(html) && /"contactType":"partnerships"/.test(html)
  )

  // ── 2. a valid request ─────────────────────────────────────────────────────
  const created = await api('POST', '/api/partnerships/request', {
    body: { ...validRequest, ...(await humanCheckFields()) }
  })
  check(
    'a valid request is accepted',
    created.status === 201 && created.json?.ok === true,
    `status ${created.status}${created.json?.error ? ` · ${created.json.error}` : ''}`
  )
  check(
    'the reference follows the PYPC-MOU- shape',
    /^PYPC-MOU-[A-Z0-9]{8,}$/.test(created.json?.reference ?? ''),
    created.json?.reference
  )
  const reference = created.json?.reference

  // ── 3. the row is real ─────────────────────────────────────────────────────
  const stored = await prisma.partnershipRequest.findUnique({ where: { reference } })
  check('the request is stored in the database', Boolean(stored))
  check(
    'the institution, contact and interests are stored as sent',
    stored?.institutionName === institution &&
      stored?.contactEmail === contactEmail &&
      stored?.institutionType === 'UNIVERSITY' &&
      JSON.parse(stored?.interests ?? '[]').includes('MOU'),
    stored ? `${stored.institutionName} · ${stored.institutionType}` : ''
  )
  check(
    'a new request starts as SUBMITTED',
    stored?.status === 'SUBMITTED',
    `status ${stored?.status}`
  )
  check(
    'the phone number is kept in international format',
    stored?.contactPhone === '+923001234567',
    stored?.contactPhone ?? '(none)'
  )

  // ── 4. the audit trail ────────────────────────────────────────────────────
  const audit = await prisma.auditLog.findFirst({
    where: { action: 'PARTNERSHIP_REQUEST_RECEIVED', entityId: stored?.id },
    orderBy: { createdAt: 'desc' }
  })
  check(
    'the audit log records the request, with its reference',
    Boolean(audit) && (audit?.metadata ?? '').includes(reference ?? 'x'),
    audit ? audit.action : 'no audit row'
  )

  // ── 5. confirmations ──────────────────────────────────────────────────────
  const outboxToInstitution = await prisma.emailOutbox.count({ where: { to: contactEmail } })
  check(
    'a confirmation is queued for the institution',
    outboxToInstitution >= 1,
    `${outboxToInstitution} mail(s)`
  )
  const secretariat = await prisma.emailOutbox.count({
    where: { OR: [{ to: { contains: 'pypcofficial' } }, { subject: { contains: reference ?? 'x' } }] }
  })
  check(
    'the secretariat is notified, quoting the same reference',
    secretariat >= 1,
    `${secretariat} mail(s)`
  )

  // ── 6. guards ─────────────────────────────────────────────────────────────
  await resetBuckets()
  await resetBuckets()
  const honeypot = await api('POST', '/api/partnerships/request', {
    body: { ...validRequest, institutionName: `Honeypot ${rnd}`, companyWebsite: 'https://spam.example' }
  })
  const honeypotRows = await prisma.partnershipRequest.count({
    where: { institutionName: `Honeypot ${rnd}` }
  })
  check(
    'the honeypot is accepted silently and stores nothing',
    honeypot.status === 201 && honeypotRows === 0,
    `status ${honeypot.status} · ${honeypotRows} row(s)`
  )

  await resetBuckets()
  const noHuman = await api('POST', '/api/partnerships/request', {
    body: { ...validRequest, institutionName: `No Human ${rnd}` }
  })
  check(
    'a request without the human check is refused',
    noHuman.status === 400 && noHuman.json?.humanCheckFailed === true,
    `status ${noHuman.status}`
  )

  await resetBuckets()
  const badEmail = await api('POST', '/api/partnerships/request', {
    body: {
      ...validRequest,
      institutionName: `Bad Email ${rnd}`,
      contactEmail: 'not-an-address',
      ...(await humanCheckFields())
    }
  })
  check(
    'a malformed contact address is refused',
    badEmail.status === 422,
    `status ${badEmail.status} · ${badEmail.json?.error ?? ''}`
  )

  await resetBuckets()
  const badMailDomain = await api('POST', '/api/partnerships/request', {
    body: {
      ...validRequest,
      institutionName: `Bad Domain ${rnd}`,
      contactEmail: `registrar@no-such-domain-${rnd}.invalid`,
      ...(await humanCheckFields())
    }
  })
  check(
    'an address on a domain that cannot receive mail is refused',
    badMailDomain.status === 422,
    `status ${badMailDomain.status} · ${badMailDomain.json?.error ?? ''}`
  )

  await resetBuckets()
  const noInterests = await api('POST', '/api/partnerships/request', {
    body: { ...validRequest, institutionName: `No Interests ${rnd}`, interests: [], ...(await humanCheckFields()) }
  })
  check(
    'a request with no area of collaboration is refused',
    noInterests.status === 422,
    `status ${noInterests.status} · ${noInterests.json?.error ?? ''}`
  )

  await resetBuckets()
  const shortProposal = await api('POST', '/api/partnerships/request', {
    body: { ...validRequest, institutionName: `Short ${rnd}`, message: 'We want to partner', ...(await humanCheckFields()) }
  })
  check(
    'a proposal too short to act on is refused',
    shortProposal.status === 422,
    `status ${shortProposal.status} · ${shortProposal.json?.error ?? ''}`
  )

  await resetBuckets()
  const noConsent = await api('POST', '/api/partnerships/request', {
    body: { ...validRequest, institutionName: `No Consent ${rnd}`, consent: false, ...(await humanCheckFields()) }
  })
  check(
    'a request without consent is refused',
    noConsent.status === 422,
    `status ${noConsent.status} · ${noConsent.json?.error ?? ''}`
  )

  const crossOrigin = await api('POST', '/api/partnerships/request', {
    body: validRequest,
    headers: { origin: 'https://evil.example' }
  })
  check(
    'a cross-origin post is refused',
    crossOrigin.status === 403 || crossOrigin.status === 400,
    `status ${crossOrigin.status}`
  )

  // ── 7. a repeat is the same case, not a second one ────────────────────────
  await resetBuckets()
  const repeat = await api('POST', '/api/partnerships/request', {
    body: { ...validRequest, ...(await humanCheckFields()) }
  })
  const duplicates = await prisma.partnershipRequest.count({
    where: { institutionName: institution, contactEmail }
  })
  check(
    'a repeat request returns the same reference and opens no second case',
    repeat.status === 200 && repeat.json?.reference === reference && duplicates === 1,
    `status ${repeat.status} · ${duplicates} row(s)`
  )

  // ── 8. the staff decision ────────────────────────────────────────────────
  const staffLogin = await api('POST', '/api/auth/login', {
    body: { email: process.env.ADMIN_EMAIL || 'admin@pypc.org.pk', password: process.env.ADMIN_PASSWORD || 'Pypc@2026' }
  })
  check('a staff member can sign in', staffLogin.status === 200 && Boolean(staffLogin.cookie), `status ${staffLogin.status}`)

  const decision = await api('PATCH', '/api/admin/partnerships', {
    cookie: staffLogin.cookie,
    body: { requestId: stored?.id, status: 'UNDER_REVIEW', adminNotes: 'Scope call to be offered this week.' }
  })
  check(
    'staff can move the request to Under review',
    decision.status === 200 && decision.json?.status === 'UNDER_REVIEW',
    `status ${decision.status} · ${decision.json?.label ?? ''}`
  )

  const changed = await prisma.partnershipRequest.findUnique({ where: { id: stored?.id } })
  check(
    'the decision is stored with the reviewer and the time',
    changed?.status === 'UNDER_REVIEW' && Boolean(changed?.reviewedById) && Boolean(changed?.reviewedAt)
  )

  const decisionAudit = await prisma.auditLog.findFirst({
    where: { action: 'PARTNERSHIP_STATUS_CHANGED', entityId: stored?.id },
    orderBy: { createdAt: 'desc' }
  })
  check(
    'the status change is audited, naming the previous and new status',
    Boolean(decisionAudit) &&
      (decisionAudit?.metadata ?? '').includes('SUBMITTED') &&
      (decisionAudit?.metadata ?? '').includes('UNDER_REVIEW'),
    decisionAudit?.action ?? 'no audit row'
  )

  const badStatus = await api('PATCH', '/api/admin/partnerships', {
    cookie: staffLogin.cookie,
    body: { requestId: stored?.id, status: 'MAYBE' }
  })
  check('an invalid status is refused', badStatus.status === 422, `status ${badStatus.status}`)

  const anonymous = await api('PATCH', '/api/admin/partnerships', {
    body: { requestId: stored?.id, status: 'APPROVED' }
  })
  check(
    'an anonymous visitor cannot change a status',
    anonymous.status === 403,
    `status ${anonymous.status}`
  )

  const stillReview = await prisma.partnershipRequest.findUnique({ where: { id: stored?.id } })
  check(
    'the refused attempts changed nothing',
    stillReview?.status === 'UNDER_REVIEW',
    `status ${stillReview?.status}`
  )

  // ── 9. the consoles ──────────────────────────────────────────────────────
  const adminPage = await api('GET', '/admin/partnerships', { cookie: staffLogin.cookie })
  check(
    'the admin console lists the request with its reference',
    adminPage.status === 200 && adminPage.text.includes(reference ?? 'x'),
    `status ${adminPage.status}`
  )

  const adminOverview = await api('GET', '/admin', { cookie: staffLogin.cookie })
  check(
    'the admin overview carries the partnership queue card',
    adminOverview.status === 200 && /Partnerships &amp; MoUs|Partnerships & MoUs/.test(adminOverview.text),
    `status ${adminOverview.status}`
  )

  const anonymousAdmin = await api('GET', '/admin/partnerships')
  check(
    'the admin console is closed to anonymous visitors',
    anonymousAdmin.status === 307 && /\/login/.test(anonymousAdmin.text + (anonymousAdmin.headers?.location ?? '')),
    `status ${anonymousAdmin.status}`
  )

  const search = await api('GET', '/search?q=MoU')
  check(
    'the site search finds the partnerships page',
    search.status === 200 && /\/partnerships/.test(search.text),
    `status ${search.status}`
  )

  // ── 10. the rate limiter, asserted rather than worked around ──────────────
  await resetBuckets()
  const burst = []
  for (let i = 0; i < 5; i += 1) {
    burst.push(
      await api('POST', '/api/partnerships/request', {
        body: { ...validRequest, institutionName: `Burst ${rnd} ${i}` }
      })
    )
  }
  check(
    'five requests in an hour from one connection: the fifth is refused',
    burst.slice(0, 4).every(x => x.status !== 429) && burst[4].status === 429,
    burst.map(x => x.status).join(', ')
  )
  check(
    'the refusal is a readable message, not a crash or a silent drop',
    burst[4].status === 429 && typeof burst[4].json?.error === 'string' && burst[4].json.error.length > 20,
    burst[4].json?.error ?? ''
  )
  const burstRows = await prisma.partnershipRequest.count({ where: { institutionName: { startsWith: `Burst ${rnd}` } } })
  check('none of the refused burst opened a request', burstRows === 0, `${burstRows} row(s)`)

  console.log('\n== cleanup ==\n')
  const removed = await prisma.partnershipRequest.deleteMany({
    where: { OR: [{ institutionName: { contains: rnd } }, { contactEmail }] }
  })
  const removedMail = await prisma.emailOutbox.deleteMany({ where: { to: contactEmail } })
  const bucketsCleared = await prisma.rateLimitCounter.deleteMany({})
  console.log(`test requests removed : ${removed.count}`)
  console.log(`test mail removed     : ${removedMail.count}`)
  console.log(`rate-limit buckets cleared : ${bucketsCleared.count}`)
  console.log('audit rows are kept on purpose — they are chain links; db:clean:ship handles them.')
} catch (error) {
  console.error('partnership suite crashed:', error)
  failures.push('crashed')
  failed += 1
} finally {
  const verdict = failed === 0 ? 'pass' : 'FAIL'
  console.log(`\npartnerships: ${passed} passed, ${failed} failed`)
  if (failures.length) {
    console.log('Failures:')
    for (const name of failures) console.log(`  - ${name}`)
  }
  console.log(`suite ${verdict}`)
  await prisma.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}
